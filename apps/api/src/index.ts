import { createApi } from "./app.ts";

// Standalone API entry (dev + tests reach the same routes). Health lives at `/`.
const port = Number(process.env.PORT) || 3000;

createApi().listen({ port, hostname: "0.0.0.0" });

console.log(`om-signup api listening on :${port}`);
