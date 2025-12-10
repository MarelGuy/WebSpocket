const read = async (
  conn: Deno.Conn | Deno.TlsConn,
): Promise<{ bytesRead: number | null; buffer: Uint8Array }> => {
  const buffer = new Uint8Array(65536);

  const bytesRead = await conn.read(buffer);

  return { bytesRead, buffer };
};

export { read };
