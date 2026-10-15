// Test process only: the actual paid endpoint is never contacted by integration tests.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  if (url === "https://api.deepseek.com/chat/completions") {
    return originalFetch("http://127.0.0.1:3102/mock/deepseek", init);
  }
  return originalFetch(input, init);
};
