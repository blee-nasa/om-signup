import { join, normalize } from "node:path";
import { Elysia } from "elysia";
import { createApi } from "./app.ts";

const port = Number(process.env.PORT) || 3000;
const webDist = join(import.meta.dir, "../../web/dist");

const tryStaticFile = async (path: string) => {
  if (path === "/") return null;
  const safe = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = join(webDist, safe);
  if (!candidate.startsWith(webDist)) return null;
  const file = Bun.file(candidate);
  return (await file.exists()) ? file : null;
};

const looksLikeFile = (path: string) => (path.split("/").pop() ?? "").includes(".");

new Elysia()
  .use(createApi("/api"))
  .get("/*", async ({ path, status }) => {
    if (path.startsWith("/api")) return status(404, { error: "Not found" });
    const file = await tryStaticFile(path);
    if (file) return file;
    if (looksLikeFile(path)) return status(404, "Not found");
    return Bun.file(join(webDist, "index.html"));
  })
  .listen({ port, hostname: "0.0.0.0" });

console.log(`om-signup server (SPA + /api) listening on :${port}`);
