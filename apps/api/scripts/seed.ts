import { db, client } from "../src/db/index.ts";
import { events } from "../src/db/schema.ts";
import { DEFAULT_SLOT_COUNT, DEFAULT_SLOT_MINUTES } from "../src/slots.ts";

if (!db || !client) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const rawArg = (flag: string): string | undefined => {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const intArg = (flag: string): number | undefined => {
  const raw = rawArg(flag);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`Invalid ${flag}: ${raw} (expected a positive integer)`);
    process.exit(1);
  }
  return value;
};

const slotCount = intArg("--slots") ?? DEFAULT_SLOT_COUNT;
const slotMinutes = intArg("--slot-minutes") ?? DEFAULT_SLOT_MINUTES;
const showMinutes = intArg("--show-minutes") ?? slotCount * slotMinutes;

const nextFriday = (from = new Date()): Date => {
  const date = new Date(from);
  date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7 || 7));
  date.setHours(19, 0, 0, 0);
  return date;
};

const atRaw = rawArg("--at");
const startsAt = atRaw ? new Date(atRaw) : nextFriday();
if (Number.isNaN(startsAt.getTime())) {
  console.error(`Invalid --at: ${atRaw} (expected an ISO date-time)`);
  process.exit(1);
}
const endsAt = new Date(startsAt.getTime() + showMinutes * 60_000);

const [row] = await db
  .insert(events)
  .values({ title: "Open Mic Night", startsAt, endsAt, slotCount, slotMinutes })
  .returning();

console.log(
  `Seeded event #${row?.id}: ${startsAt.toLocaleString()} – ${endsAt.toLocaleString()} (${slotCount} slots × ${slotMinutes} min)`,
);
await client.end();
