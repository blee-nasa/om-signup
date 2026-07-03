import { useCallback, useEffect, useState } from "react";
import { ListMusic } from "lucide-react";
import {
  ApiError,
  createSignup,
  fetchSlots,
  type OpenMicEvent,
  type SlotEntry,
} from "../../api.ts";
import styles from "./SignupSheet.module.css";

type SignupSheetProps = {
  event?: OpenMicEvent | null;
};

type Load = "loading" | "ready" | "error";

const POLL_MS = 30_000;

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export const SignupSheet = ({ event = null }: SignupSheetProps) => {
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [act, setAct] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventId = event?.id;

  const refresh = useCallback(() => {
    if (eventId === undefined) return;
    fetchSlots(eventId)
      .then((next) => {
        setSlots(next);
        setLoad("ready");
      })
      .catch(() => {
        // Keep the last-known slots on a transient poll failure; only surface an
        // error when we never managed to load the sheet at all.
        setLoad((prev) => (prev === "loading" ? "error" : prev));
      });
  }, [eventId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // If the slot we had selected gets claimed by someone else (via the poll),
  // drop the selection so the claim form doesn't linger on a taken slot.
  useEffect(() => {
    if (selected !== null && slots.some((s) => s.slot === selected && s.signup !== null)) {
      setSelected(null);
    }
  }, [slots, selected]);

  if (!event || eventId === undefined) {
    return <section className={styles.container} aria-label="Sign-up sheet" />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending || selected === null) return;
    setPending(true);
    setError(null);
    try {
      await createSignup(eventId, { slot: selected, name: trimmed, act: act.trim() || undefined });
      setName("");
      setAct("");
      setSelected(null);
      refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 409) {
          setSelected(null);
          refresh();
        }
      } else {
        setError("Couldn't claim the slot — try again.");
      }
    } finally {
      setPending(false);
    }
  };

  const selectedEntry =
    selected === null ? null : (slots.find((s) => s.slot === selected && s.signup === null) ?? null);

  return (
    <section className={styles.container} aria-label="Sign-up sheet">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <header className="flex items-center gap-3">
          <ListMusic aria-hidden className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">{event.title} — sign-up sheet</h2>
            <p className="text-sm text-gray-500">Tap an open slot to claim it.</p>
          </div>
        </header>

        {load === "loading" && slots.length === 0 && (
          <p className="py-4 text-center text-gray-400">Loading slots…</p>
        )}
        {load === "error" && slots.length === 0 && (
          <p className="py-4 text-center text-gray-400">
            Couldn't load the sheet — it'll retry shortly.
          </p>
        )}

        {slots.length > 0 && (
          <ol className="flex flex-col gap-1">
            {slots.map((entry) => (
              <li key={entry.slot}>
                {entry.signup ? (
                  <div className="flex items-center gap-3 rounded bg-gray-50 px-3 py-2">
                    <span className="w-14 shrink-0 text-sm text-gray-400">
                      {timeLabel(entry.startsAt)}
                    </span>
                    <span className="font-medium">{entry.signup.name}</span>
                    {entry.signup.act && <span className="text-gray-500">— {entry.signup.act}</span>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(entry.slot === selected ? null : entry.slot);
                      setError(null);
                    }}
                    aria-label={`Sign up for the ${timeLabel(entry.startsAt)} slot`}
                    className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left ${
                      entry.slot === selected
                        ? "border-blue-600 bg-blue-50"
                        : "border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <span className="w-14 shrink-0 text-sm text-gray-400">
                      {timeLabel(entry.startsAt)}
                    </span>
                    <span className="text-gray-400">
                      {entry.slot === selected ? "Selected — enter your name below" : "Open"}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {selectedEntry && (
          <form onSubmit={submit} className="flex flex-col gap-2 border-t border-gray-200 pt-4">
            <p className="text-sm font-medium">
              Claiming the {timeLabel(selectedEntry.startsAt)} slot
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              maxLength={80}
              className="rounded border border-gray-300 px-3 py-2"
            />
            <input
              value={act}
              onChange={(e) => setAct(e.target.value)}
              placeholder="Your act (optional)"
              aria-label="Your act"
              maxLength={200}
              className="rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Sign me up
            </button>
          </form>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </section>
  );
};
