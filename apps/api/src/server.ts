import { join, normalize } from "node:path";
import { Elysia } from "elysia";
import { createApi } from "./app.ts";

// Production single-app server: serves the built SPA at `/` and mounts the API
// under `/api` (so the healthcheck answers at `/api`). This is the container's
// CMD; in dev the SPA is served by Vite and proxies `/api` to the API instead.
const port = Number(process.env.PORT) || 3000;
const webDist = join(import.meta.dir, "../../web/dist");

// Return the on-disk file for `path` (resolved safely within webDist), or null.
const tryStaticFile = async (path: string) => {
  if (path === "/") return null;
  const safe = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = join(webDist, safe);
  if (!candidate.startsWith(webDist)) return null;
  const file = Bun.file(candidate);
  return (await file.exists()) ? file : null;
};

// A request whose last segment has an extension is asking for a file, not a
// client route (e.g. /assets/app-OLD.js, /favicon.ico).
const looksLikeFile = (path: string) => (path.split("/").pop() ?? "").includes(".");

new Elysia()
  .use(createApi("/api"))
  .get("/*", async ({ path, status }) => {
    if (path.startsWith("/api")) return status(404, { error: "Not found" });
    const file = await tryStaticFile(path);
    if (file) return file;
    // Do NOT fall back to the SPA shell for missing file-like requests — that
    // would serve HTML (200) under an asset URL, which the cache-first service
    // worker would then cache, poisoning it with a MIME mismatch. Only
    // navigation/extensionless routes get index.html.
    if (looksLikeFile(path)) return status(404, "Not found");
    return Bun.file(join(webDist, "index.html"));
  })
  .listen({ port, hostname: "0.0.0.0" });

console.log(`om-signup server (SPA + /api) listening on :${port}`);
