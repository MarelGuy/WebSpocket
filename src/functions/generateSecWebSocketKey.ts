const generateSecWebSocketKey = (): string => {
  const key = new Uint8Array(16);
  crypto.getRandomValues(key);

  return btoa(String.fromCharCode(...key));
};

export { generateSecWebSocketKey };
