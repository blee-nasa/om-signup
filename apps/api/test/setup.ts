import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Load the monorepo-root .env so integration tests pick up DATABASE_URL.
// Tests that need the DB gate on `process.env.DATABASE_URL`.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
