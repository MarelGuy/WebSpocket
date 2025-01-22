import { generateSecWebSocketKey } from "./functions/generateSecWebSocketKey.ts";
import { concatenateUint8Arrays } from "./functions/concatenateUint8Arrays.ts";
import { DataTypes, ErrorTypes, ReadyState } from "./enums.ts";
import { FrameGenerator } from "./Frame.ts";

class WebSpocket {
	url: URL;
	readyState: ReadyState;
	protocols?: string | string[];
	headers: Headers = new Headers();
	connection?: Deno.Conn;
	e?: {
		type: DataTypes;
		data: string | Uint8Array;
	};

	onReady?: () => void;
	onMessage?: (e: { type: DataTypes; data: string | Uint8Array; }) => void;
	onError?: (error: ErrorTypes) => void;
	onClose?: (errorType: ErrorTypes) => void;

	constructor(connectOptions: { url: string, protocols?: string | string[], headers?: Headers; }) {
		this.url = new URL(connectOptions.url);
		this.readyState = ReadyState.CLOSED;
		this.protocols = connectOptions.protocols;

		if (connectOptions.headers) this.headers = connectOptions.headers;
	}

	async connect(headers?: Headers): Promise<void> {
		this.readyState = ReadyState.CONNECTING;

		if (headers) this.headers = headers;

		const connection: Deno.TcpConn = await Deno.connect({
			hostname: this.url.hostname,
			port: parseInt(this.url.port, 10),
			transport: "tcp",
		});

		const request = [
			`GET ${this.url.pathname} HTTP/1.1`,
			`host: ${this.url.hostname}`,
			`upgrade: websocket`,
			`connection: Upgrade`,
			`sec-websocket-key: ${generateSecWebSocketKey()}`,
			`sec-websocket-version: 13`,
			'user-agent: WebSpocket',
			...Array.from(this.headers.entries()).map(([key, value]) => `${key}: ${value}`),
			`\r\n`
		].join("\r\n");

		await connection.write(new TextEncoder().encode(request));

		const buffer = new Uint8Array(1024);

		await connection.read(buffer);

		if (new TextDecoder().decode(buffer).split("\r\n")[0].split(" ")[1] == "101") {
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
