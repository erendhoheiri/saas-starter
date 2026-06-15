import { app } from "./app";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`API listening on http://localhost:${server.port}`);
