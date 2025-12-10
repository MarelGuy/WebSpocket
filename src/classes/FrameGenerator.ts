class FrameGenerator {
  private opcode: number;
  private data: Uint8Array;
  private masked: boolean = true;

  frame: Uint8Array;

  constructor(opcode: number, data: Uint8Array, masked?: boolean) {
    this.opcode = opcode;
    this.data = data;

    if (masked != undefined && masked != null && masked != this.masked) {
      this.masked = masked;
    }

    const headerLen = this.masked ? 6 : 2;
    const payloadLen = this.data.length;

    let payloadLenBytes = 0;

    if (payloadLen > 125) {
      if (payloadLen <= 65535) {
        payloadLenBytes = 2;
      } else {
        payloadLenBytes = 8;
      }
    }

    const header = new Uint8Array(headerLen + payloadLenBytes);
    header[0] = 0x80 | this.opcode;

    if (payloadLen <= 125) {
      header[1] = (masked ? 0x80 : 0x00) | payloadLen;
    } else if (payloadLen <= 65535) {
      header[1] = (masked ? 0x80 : 0x00) | 126;
      header[2] = (payloadLen >> 8) & 0xff;
      header[3] = payloadLen & 0xff;
    } else {
      header[1] = (masked ? 0x80 : 0x00) | 127;

      for (let i = 0; i < 8; i++) {
        header[2 + i] = (payloadLen >> ((7 - i) * 8)) & 0xff;
      }
    }

    let maskingKey: Uint8Array | null = null;

    if (this.masked) {
      maskingKey = new Uint8Array(4);

      crypto.getRandomValues(maskingKey);

      header.set(maskingKey, headerLen - 4);
    }

    const frame = new Uint8Array(header.length + payloadLen);

    frame.set(header);

    if (masked && maskingKey) {
      for (let i = 0; i < payloadLen; i++) {
        data[i] ^= maskingKey[i % 4];
      }
    }

    frame.set(data, header.length);

    this.frame = frame;
  }
}

export { FrameGenerator };
