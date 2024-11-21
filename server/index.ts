import app from "./app";

Bun.serve({
  fetch: app.fetch,
  idleTimeout: 255, // this might be a problem, need more time
});

console.log("Server is running");
