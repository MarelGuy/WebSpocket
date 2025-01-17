enum ReadyState {
    CONNECTING = 0,
    CONNECTED = 1,
    OPEN = 2,
    CLOSING = 3,
    CLOSED = 4,
}

enum ErrorTypes {
    NONE = 0,                     // No error
    PROTOCOL_ERROR = 1002,        // Protocol error (e.g., invalid frame, unexpected opcode)
    INVALID_OPCODE = 1003,        // Received an invalid opcode
    UNSUPPORTED_DATA = 1007,      // Received data of an unsupported type
    POLICY_VIOLATION = 1008,      // Message violated policy (e.g., too large)
    MESSAGE_TOO_BIG = 1009,       // Received a message that is too big
    MANDATORY_EXTENSION = 1010,   // Missing a mandatory extension
    INTERNAL_ERROR = 1011,        // Server encountered an internal error
    SERVICE_RESTART = 1012,       // Service is restarting
    TRY_AGAIN_LATER = 1013,       // Temporary server error, try again later
    TLS_HANDSHAKE_FAILURE = 1015, // TLS handshake failed (for secure connections)
}

enum DataTypes {
    TEXT = "string",
    BINARY = "Uint8Array",
}

export { ReadyState, ErrorTypes, DataTypes };