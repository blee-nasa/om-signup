import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

// The DB client is optional: when DATABASE_URL is unset (e.g. unit tests that
// don't touch Postgres) `db` is null and DB-dependent routes degrade/skip.
const url = process.env.DATABASE_URL;

export const client = url ? postgres(url, { max: 5 }) : null;
export const db = client ? drizzle(client, { schema }) : null;
