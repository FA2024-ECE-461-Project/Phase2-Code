import app from "./app";

const server = Bun.serve({
  fetch: app.fetch,
  idleTimeout: 255, // this might be a problem, need more time
});

console.log(`Server is running on port ${server.port}`);