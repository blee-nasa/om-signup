import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const url = process.env.DATABASE_URL;

export const client = url ? postgres(url, { max: 5 }) : null;
export const db = client ? drizzle(client, { schema }) : null;
