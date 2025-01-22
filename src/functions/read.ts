const read = async (conn: Deno.Conn | Deno.TlsConn): Promise<{ data: string, buffer: Uint8Array; }> => {
    const buffer = new Uint8Array(65536);

    const bytesRead = await conn.read(buffer);
    const decoded = new TextDecoder().decode(buffer.slice(0, bytesRead || 0));

    return { data: decoded.trim(), buffer };
};

export { read };