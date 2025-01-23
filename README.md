# WebSpocket: A Lightweight WebSocket Client for Deno

[![License: GPL-3.0 ](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](./LICENSE)

WebSpocket is a lightweight and efficient WebSocket client library designed specifically for Deno. It provides a simple and intuitive API for establishing WebSocket connections, sending and receiving data, and handling various WebSocket events.

## Features

* **Simplicity:**  WebSpocket offers a clean and easy-to-use API, making it straightforward to integrate WebSockets into your Deno projects.
* **Efficiency:** The library is designed for performance, with optimized data handling and minimal overhead.
* **Security:** WebSpocket ensures secure communication by adhering to the WebSocket protocol and implementing frame masking.
* **Error Handling:** Built-in error handling with descriptive error types helps you gracefully manage connection issues.
* **Events:** Supports essential WebSocket events like `onReady`, `onMessage`, `onError`, and `onClose` for comprehensive connection management.
* **TLS Support:** Establish secure WebSocket connections over TLS (`wss://`).
* **Ping/Pong:** Keep-alive mechanism for persistent connections.
* **Fragmentation:** Handles fragmented messages seamlessly.
* **Frame Validation:** Validates incoming frames to ensure protocol compliance.

## Installation

Not yet available.

## Usage

```typescript
// Import the WebSpocket class
import { WebSpocket } from "webspocket";

// Create a new WebSocket connection
const ws = new WebSpocket({ url: "wss://echo.websocket.org" });

// Listen for the 'open' event
ws.onReady = () => {
  console.log("WebSocket connection opened");

  // Send a message to the server
  ws.send("Hello from WebSpocket!");
};

// Listen for incoming messages
ws.onMessage = (event) => {
  console.log("Received message:", event.data);

  // Close the connection
  ws.close(1000);
};

// Listen for errors
ws.onError = (error) => {
  console.error("WebSocket error:", error);
};

// Listen for the 'close' event
ws.onClose = () => {
  console.log("WebSocket connection closed");
};

// Establish the connection
ws.connect();
```

## Roadmap to 1.0.0

While WebSpocket already provides a solid foundation for WebSocket communication in Deno, here's what I planned for the 1.0.0 release:

**Core Enhancements**

  * **Robust Error Handling:** Expand error types for granular error reporting and provide more detailed error information in events.
  * **Performance Improvements:**  Optimize buffer management and explore zero-copy mechanisms for increased efficiency.

**Advanced Features**

  * **WebSocket Extensions:** Implement extension negotiation and support for common extensions like `permessage-deflate` for optimized communication.
  * **WebSocket Protocols:** Explore the ability to negotiate WebSocket protocols, such as `v13` for WebSocket 13.

**Developer Experience**

  * **Clear Documentation:** Create comprehensive documentation with detailed explanations.

## Contributing

Contributions are welcome\! If you find any issues or have suggestions for improvement, feel free to open an issue or submit a pull request.
