import { DEFAULT_SLOT_COUNT, DEFAULT_SLOT_MINUTES } from "./slots.ts";

export const TEST_EVENT_ID = 0;

const DEFAULT_MINUTES = 30;
const MAX_MINUTES = 120;

type TestSignup = { id: number; slot: number; name: string; act: string | null; createdAt: Date };

type AddResult =
  | { ok: true; signup: TestSignup }
  | { ok: false; reason: "inactive" | "taken" };

type TestModeState = {
  startsAt: Date;
  endsAt: Date;
  slotCount: number;
  slotMinutes: number;
  signups: TestSignup[];
  nextId: number;
};

let state: TestModeState | null = null;

const expireIfPast = (now: Date) => {
  if (state && now.getTime() > state.endsAt.getTime()) state = null;
};

export const startTestMode = (minutes = DEFAULT_MINUTES, now = new Date()) => {
  const rounded = Math.round(minutes);
  const safe = Number.isFinite(rounded) ? rounded : DEFAULT_MINUTES;
  const clamped = Math.min(Math.max(safe, 1), MAX_MINUTES);
  state = {
    startsAt: now,
    endsAt: new Date(now.getTime() + clamped * 60_000),
    slotCount: DEFAULT_SLOT_COUNT,
    slotMinutes: DEFAULT_SLOT_MINUTES,
    signups: [],
    nextId: 1,
  };
  return { startsAt: state.startsAt, endsAt: state.endsAt, minutes: clamped };
};

export const stopTestMode = (): boolean => {
  const wasActive = state !== null;
  state = null;
  return wasActive;
};

export const testModeEvent = (now = new Date()) => {
  expireIfPast(now);
  if (!state) return null;
  return {
    id: TEST_EVENT_ID,
    title: "Open Mic (Test Mode)",
    startsAt: state.startsAt,
    endsAt: state.endsAt,
    slotCount: state.slotCount,
    slotMinutes: state.slotMinutes,
  };
};

export const listTestSignups = (now = new Date()): TestSignup[] => {
  expireIfPast(now);
  return state ? [...state.signups] : [];
};

export const addTestSignup = (
  slot: number,
  name: string,
  act: string | null,
  now = new Date(),
): AddResult => {
  expireIfPast(now);
  if (!state) return { ok: false, reason: "inactive" };
  if (state.signups.some((signup) => signup.slot === slot)) {
    return { ok: false, reason: "taken" };
  }
  const signup: TestSignup = { id: state.nextId++, slot, name, act, createdAt: now };
  state.signups.push(signup);
  return { ok: true, signup };
};
