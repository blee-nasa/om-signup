import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const swPath = fileURLToPath(new URL("../dist/sw.js", import.meta.url));
const buildId = process.env.BUILD_ID ?? Date.now().toString(36);
const stamped = readFileSync(swPath, "utf8").replaceAll("__BUILD_ID__", buildId);

writeFileSync(swPath, stamped);
console.log(`stamped sw.js cache: om-signup-${buildId}`);
