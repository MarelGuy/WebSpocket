/**
 * Enumeration of WebSocket ready states. These states indicate the current status of the WebSocket connection.
 * @enum {number}
 * @readonly
 */
enum ReadyState {
    /**
     * The connection is not yet open. The WebSocket is still in the process of establishing a connection to the server.
     */
    CONNECTING = 0,

    /**
     * The connection is open and ready to communicate. Data can now be sent and received.
     */
    OPEN = 1,

    /**
     * The connection is in the process of closing.  
     */
    CLOSING = 2,

    /**
     * The connection is closed or couldn't be opened. No further data can be sent or received.
     */
    CLOSED = 3,

    /**
     * The connection is connected.
     */
    CONNECTED = 4
}

/**
 * Enumeration of WebSocket error types. These codes provide information about why a WebSocket connection closed or failed.
 * @enum {number}
 * @readonly
 */
enum ErrorTypes {
    /** 
     * No error.
     */
    NONE = 0,

    /** 
     * Protocol error (e.g., invalid frame, unexpected opcode). The server or client encountered a violation of the WebSocket protocol.
     */
    PROTOCOL_ERROR = 1002,

    /** 
     * Received an invalid opcode. An opcode was received that is not defined by the WebSocket protocol.
     */
    INVALID_OPCODE = 1003,

    /** 
     * Received data of an unsupported type. The server or client received data in a format it cannot handle.
     */
    UNSUPPORTED_DATA = 1007,

    /** 
     * Message violated policy (e.g., too large). A message was received that violates a policy set by the server, such as exceeding a size limit.
     */
    POLICY_VIOLATION = 1008,

    /** 
     * Received a message that is too big. The server or client received a message larger than it can handle.
     */
    MESSAGE_TOO_BIG = 1009,

    /** 
     * Missing a mandatory extension. The server requires an extension that the client does not support.
     */
    MANDATORY_EXTENSION = 1010,

    /** 
     * Server encountered an internal error. An unexpected error occurred on the server side.
     */
    INTERNAL_ERROR = 1011,

    /** 
     * Service is restarting. The server is restarting and cannot currently handle connections.
     */
    SERVICE_RESTART = 1012,

    /** 
     * Temporary server error, try again later.  A temporary error occurred on the server. The client can try to connect again later.
     */
    TRY_AGAIN_LATER = 1013,

    /** 
     * TLS handshake failed (for secure connections). The TLS handshake required for a secure WebSocket connection (wss://) failed.
     */
    TLS_HANDSHAKE_FAILURE = 1015,
}

/**
 * Enumeration of WebSocket data types. These types specify the kind of data that can be sent or received over a WebSocket connection.
 * @enum {string}
 * @readonly
 */
enum DataTypes {
    /** 
     * Text data, represented as a JavaScript string.
     */
    TEXT = "string",

    /** 
     * Binary data, represented as a Uint8Array.
     */
    BINARY = "Uint8Array",
}

export { ReadyState, ErrorTypes, DataTypes };