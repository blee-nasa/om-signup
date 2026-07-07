// Tracks in-flight slot claims so other clients can see "someone's claiming this" while
// a POST /signups is outstanding, even though the actual reservation is all-or-nothing at
// commit time. Entries expire on their own so a crashed/hung request can't wedge a slot.
const CLAIM_TTL_MS = 15_000;

type ClaimKey = `${number}:${number}`;

const claims = new Map<ClaimKey, number>();

const key = (eventId: number, slot: number): ClaimKey => `${eventId}:${slot}`;

export const beginClaim = (eventId: number, slot: number, now = Date.now()): void => {
  claims.set(key(eventId, slot), now + CLAIM_TTL_MS);
};

export const endClaim = (eventId: number, slot: number): void => {
  claims.delete(key(eventId, slot));
};

export const isClaiming = (eventId: number, slot: number, now = Date.now()): boolean => {
  const expiresAt = claims.get(key(eventId, slot));
  if (expiresAt === undefined) return false;
  if (expiresAt <= now) {
    claims.delete(key(eventId, slot));
    return false;
  }
  return true;
};
