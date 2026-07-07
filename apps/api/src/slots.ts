export const DEFAULT_SLOT_COUNT = 9;
export const DEFAULT_SLOT_MINUTES = 20;

export type SlotConfig = { startsAt: Date; slotCount: number; slotMinutes: number };

export type SlotSignup = {
  id: number;
  slot: number;
  name: string;
  act: string | null;
  createdAt: Date;
};

export const slotStartsAt = (config: SlotConfig, slot: number): Date =>
  new Date(config.startsAt.getTime() + slot * config.slotMinutes * 60_000);

export const toSlots = (
  config: SlotConfig,
  rows: SlotSignup[],
  isClaiming: (slot: number) => boolean = () => false,
) => {
  const bySlot = new Map(rows.map((row) => [row.slot, row]));
  return Array.from({ length: config.slotCount }, (_, slot) => {
    const row = bySlot.get(slot);
    return {
      slot,
      startsAt: slotStartsAt(config, slot).toISOString(),
      signup: row
        ? {
            id: row.id,
            slot: row.slot,
            name: row.name,
            act: row.act,
            createdAt: row.createdAt.toISOString(),
          }
        : null,
      claiming: row ? false : isClaiming(slot),
    };
  });
};
