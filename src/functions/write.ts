const write = async (conn: Deno.Conn | Deno.TlsConn, data: string | Uint8Array): Promise<number> => await conn.write(data instanceof Uint8Array ? data : new TextEncoder().encode(data));

export { write };