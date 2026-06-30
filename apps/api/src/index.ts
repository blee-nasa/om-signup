import { createApi } from "./app.ts";

const port = Number(process.env.PORT) || 3000;

createApi().listen({ port, hostname: "0.0.0.0" });

console.log(`om-signup api listening on :${port}`);
