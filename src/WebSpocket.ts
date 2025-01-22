import * as encoding from "@std/encoding";

import { generateSecWebSocketKey } from "./functions/generateSecWebSocketKey.ts";
import { concatenateUint8Arrays } from "./functions/concatenateUint8Arrays.ts";
import { DataTypes, ErrorTypes, ReadyState } from "./enums.ts";
import { FrameGenerator } from "./Frame.ts";

class WebSpocket {
	url: URL;
	protocols?: string[];
	headers?: Headers;
	extensions?: string[];

	readyState: ReadyState;
	connection?: Deno.Conn;

	e?: {
		type: DataTypes;
		data: string | Uint8Array;
	};

	onReady?: () => void;
	onMessage?: (e: { type: DataTypes; data: string | Uint8Array; }) => void;
	onError?: (error: ErrorTypes) => void;
	onClose?: (errorType: ErrorTypes) => void;

	constructor(connectOptions: { url: string, protocols?: string[], headers?: Headers; extensions?: string[]; }) {
		this.readyState = ReadyState.CLOSED;

		this.url = new URL(connectOptions.url);

		this.protocols = connectOptions.protocols;
		this.headers = connectOptions.headers;
		this.extensions = connectOptions.extensions;
	}

	async connect(headers?: Headers): Promise<void> {
		this.readyState = ReadyState.CONNECTING;

		if (headers) this.headers = headers;

		const connection: Deno.TcpConn = await Deno.connect({
			hostname: this.url.hostname,
			port: parseInt(this.url.port, 10),
			transport: "tcp",
		});

		const key = generateSecWebSocketKey();
		const magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

		const request = [
			`GET ${this.url.pathname} HTTP/1.1`,
			`host: ${this.url.hostname}`,
			`origin: ${this.url.origin}`,
			`upgrade: websocket`,
			`connection: Upgrade`,
			`sec-websocket-key: ${key}`,
			`sec-websocket-version: 13`,
			`user-agent: WebSpocket/1.0.0`,
			...Array.from((this.headers ? this.headers.entries() : [])).map(([key, value]) => `${key}: ${value}`)
		];

		if (this.protocols) request.push(`sec-websocket-protocol: ${this.protocols.join(", ")}`);
		if (this.extensions) request.push(`sec-websocket-extensions: ${this.extensions.join(", ")}`);

		request.push("\r\n");

		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		await connection.write(encoder.encode(request.join("\r\n")));

		const buffer = new Uint8Array(1024);

		await connection.read(buffer);

		const response = decoder.decode(buffer).split("\r\n");

		response.pop();

		const checks: boolean[] = [false, false, false, false];

		for (let i: number = 0; i < response.length; i++) {
			if (!response[i] || response[i] === "") continue;
			const field = response[i].split(": ");

			if (field[0].startsWith("HTTP/1.1") && field[0].split(" ")[1] === "101") checks[0] = true;

			if (field[0] === "sec-websocket-accept" && encoding.encodeBase64(await crypto.subtle.digest("sha-1", encoder.encode(key.concat(magicString)))) === field[1]) checks[1] = true;

			if (field[0] === "connection" && field[1].trim() === "Upgrade") checks[2] = true;
			if (field[0] === "upgrade" && field[1].trim() === "websocket") checks[3] = true;
		}

		if (checks.filter((check) => !check).length === 0) {
			this.readyState = ReadyState.CONNECTED;
			this.connection = connection;
		} else this.readyState = ReadyState.CLOSED;

		this.listenForFrames();
		this.onReady?.();
	}

	send(data: string): void {
		if (this.readyState === ReadyState.OPEN || this.readyState === ReadyState.CONNECTED) {
			if (!data) return;

			this.readyState = ReadyState.OPEN;
			this.connection?.write(new FrameGenerator(0x1, new TextEncoder().encode(data), true).frame).then(() => this.readyState = ReadyState.CONNECTED);
		}
	}

	close(errorType: ErrorTypes): void {
		if (this.readyState !== ReadyState.CLOSED && this.readyState !== ReadyState.CLOSING) {
			this.readyState = ReadyState.CLOSING;

			if (this.connection) {
				try {
					const errorTypeBytes = new Uint8Array(2);

					errorTypeBytes[0] = (errorType >> 8) & 0xFF;
					errorTypeBytes[1] = errorType & 0xFF;

					this.connection.write(new FrameGenerator(0x8, errorTypeBytes, true).frame).then(() => {
						this.connection!.close();
						this.readyState = ReadyState.CLOSED;
					});
				} catch (error) {
					console.error("Error sending close frame:", error);
				}
				this.connection = undefined;
			}
		}
	}

	private async listenForFrames(): Promise<void> {
		if (!this.connection) throw new Error("Connection not established");

		const buffer = new Uint8Array(65536);

		let messageBuffer: Uint8Array[] = [];

		while (this.readyState === ReadyState.CONNECTED) {
			const readBytes = await this.connection?.read(buffer);

			if (!readBytes) {
				this.close(ErrorTypes.INTERNAL_ERROR);
				break;
			}

			let offset = 0;

			while (offset < readBytes) {
				const fin = (buffer[offset] & 0x80) >> 7;
				const opcode = (buffer[offset] & 0x0f);
				const mask = (buffer[offset + 1] & 0x80) >> 7;

				if (mask) {
					this.close(ErrorTypes.PROTOCOL_ERROR);
					break;
				}

				let payloadLen = (buffer[offset + 1] & 0x7f);

				offset += 2;

				if (payloadLen === 126) {
					payloadLen = (buffer[offset] << 8) | buffer[offset + 1];
					offset += 2;
				} else if (payloadLen === 127) {
					let longPayloadLen = 0;

					for (let i = 0; i < 8; i++)
						longPayloadLen = (longPayloadLen << 8) | buffer[offset + i];

					payloadLen = longPayloadLen;

					offset += 8;
				}

				const payload = buffer.subarray(offset, offset + payloadLen);

				if (fin !== 0)
					if (messageBuffer.length > 0) {
						messageBuffer.push(payload);

						const completePayload = concatenateUint8Arrays(messageBuffer);

						this.handleFrame(opcode, completePayload);

						messageBuffer = [];
					} else this.handleFrame(opcode, payload);
				else messageBuffer.push(payload);

				offset += payloadLen;
			}
		}
	}

	private async handleFrame(opcode: number, data: Uint8Array): Promise<void> {
		switch (opcode) {
			case 0x1: // Text
				this.onMessage?.({ data: new TextDecoder().decode(data), type: DataTypes.TEXT });

				break;
			case 0x2: // Binary
				this.onMessage?.({ data, type: DataTypes.BINARY });

				break;
			case 0x9: // Ping
				await this.connection?.write(new FrameGenerator(0xA, data, true).frame);

				break;
			case 0x8: // Close
				this.readyState = ReadyState.CLOSED;
				this.onClose?.((data[0] << 8) | data[1]);

				break;
			default:
				this.close(ErrorTypes.INVALID_OPCODE);

				break;
		}
	}
}

export { WebSpocket, ReadyState };
