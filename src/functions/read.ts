import { Buffer } from "@std/io/buffer";

const read = async (
  conn: Deno.Conn | Deno.TlsConn,
): Promise<{ bytesRead: number | null; buffer: Uint8Array }> => {
  const buf = new Buffer();
  const tempChunk = new Uint8Array(4096);

  const bytesRead = await conn.read(tempChunk);

  if (bytesRead !== null) {
    await buf.write(tempChunk.subarray(0, bytesRead));
  }

  return {
    bytesRead,
    buffer: buf.bytes(),
  };
};

export { read };
