import { DataTypes } from "./enums.ts";

/**
 * Represents a WebSocket message.
 * @interface
 * @readonly
 */
interface Message {
    /**
     * The type of the message.
     * @type {DataTypes}
     */
    type: DataTypes;

    /**
     * The data of the message.
     * @type {string | Uint8Array}
     */
    data: string | Uint8Array;
}

/**
 * Options for connecting to a WebSocket server.
 * @interface
 */
interface ConnectionOptions {
    /**
     * The URL to connect to.
     * @type {string}
     * @required
     */
    url: string;

    /**
     * An array of protocols to use when connecting to the server.
     * @type {Headers}
     */
    headers?: Headers;

    /**
     * An array of extensions to use when connecting to the server.
     * @type {string[]}
     */
    protocols?: string[];

    /**
     * An array of extensions to use when connecting to the server.
     * @type {string[]}
     */
    extensions?: string[];
}

export { Message, ConnectionOptions };