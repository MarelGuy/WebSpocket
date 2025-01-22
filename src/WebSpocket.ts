import * as encoding from "@std/encoding";

import { generateSecWebSocketKey } from "./functions/generateSecWebSocketKey.ts";
import { concatenateUint8Arrays } from "./functions/concatenateUint8Arrays.ts";
import { DataTypes, ErrorTypes, ReadyState } from "./enums.ts";
import { FrameGenerator } from "./Frame.ts";
import { write } from "./functions/write.ts";
import { read } from "./functions/read.ts";

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

		if (this.url.protocol !== "ws:" && this.url.protocol !== "wss:") throw new Error("Invalid protocol");
	}

	async connect(): Promise<void> {
		this.readyState = ReadyState.CONNECTING;

		let connection: Deno.TcpConn | Deno.TlsConn | null = null;

		if (this.url.protocol === "ws:")
			connection = await Deno.connect({
				hostname: this.url.hostname,
				port: parseInt(this.url.port, 10) || 80,
				transport: "tcp",
			});

		if (this.url.protocol === "wss:")
			connection = await Deno.connectTls({
				hostname: this.url.hostname,
				port: parseInt(this.url.port, 10) || 443,
			});

		if (!connection) throw new Error("Connection failed");

		const key = generateSecWebSocketKey();

		const request = [
			`GET ${this.url.pathname} HTTP/1.1`,
			`host: ${this.url.hostname}`,
			`origin: ${this.url.origin}`,
			`user-agent: WebSpocket/1.0.0`,
			`upgrade: websocket`,
			`connection: Upgrade`,
			`sec-websocket-key: ${key}`,
			`sec-websocket-version: 13`,
		];

		if (this.protocols) request.push(`sec-websocket-protocol: ${this.protocols.join(", ")}`);
		if (this.extensions) request.push(`sec-websocket-extensions: ${this.extensions.join(", ")}`);
		if (this.headers) request.push(...Array.from(this.headers.entries()).map(([key, value]) => `${key}: ${value}`));

		request.push("\r\n");

		write(connection, request.join("\r\n"));

		const response = (await read(connection)).data.split("\r\n");

		response.pop();

		const checks: boolean[] = [];

		for (let i: number = 0; i < response.length; i++) {
			if (!response[i] || response[i] === "") continue;
			const field = response[i].split(": ");

			if (field[0].startsWith("HTTP/1.1") && field[0].split(" ")[1] === "101") checks[0] = true;

			if (field[0] === "sec-websocket-accept" && encoding.encodeBase64(await crypto.subtle.digest("sha-1", new TextEncoder().encode(key.concat("258EAFA5-E914-47DA-95CA-C5AB0DC85B11")))) === field[1]) checks[1] = true;

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
			write(this.connection!, new FrameGenerator(0x1, new TextEncoder().encode(data), true).frame).then(() => this.readyState = ReadyState.CONNECTED);
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

					write(this.connection!, new FrameGenerator(0x8, errorTypeBytes, true).frame).then(() => {
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

		let messageBuffer: Uint8Array[] = [];

		while (this.readyState === ReadyState.CONNECTED) {
			const { data, buffer } = await read(this.connection!);

			if (!data) {
				this.close(ErrorTypes.INTERNAL_ERROR);
				break;
			}

			let offset = 0;

			while (offset < data.length) {
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
				await write(this.connection!, new FrameGenerator(0xA, data, true).frame);

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
