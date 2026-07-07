import { useCallback, useEffect, useRef, useState } from "react";
import { ListMusic, X } from "lucide-react";
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

const POLL_MS = 10_000;

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
  const nameRef = useRef<HTMLInputElement>(null);
  const eventId = event?.id;

  const refresh = useCallback(() => {
    if (eventId === undefined) return;
    fetchSlots(eventId)
      .then((next) => {
        setSlots(next);
        setLoad("ready");
      })
      .catch(() => {
        setLoad((prev) => (prev === "loading" ? "error" : prev));
      });
  }, [eventId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (
      error === null &&
      selected !== null &&
      slots.some((s) => s.slot === selected && s.signup !== null)
    ) {
      setSelected(null);
    }
  }, [slots, selected, error]);

  const closeModal = useCallback(() => {
    setSelected(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (selected === null) return;
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, closeModal]);

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
        refresh();
      } else {
        setError("Couldn't claim the slot — try again.");
      }
    } finally {
      setPending(false);
    }
  };

  const selectedEntry = selected === null ? null : (slots.find((s) => s.slot === selected) ?? null);

  return (
    <section className={styles.container} aria-label="Sign-up sheet">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
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
                ) : entry.claiming && entry.slot !== selected ? (
                  <div
                    aria-label={`${timeLabel(entry.startsAt)} slot is being claimed by someone else`}
                    className="flex w-full items-center gap-3 rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-left"
                  >
                    <span className="w-14 shrink-0 text-sm text-gray-400">
                      {timeLabel(entry.startsAt)}
                    </span>
                    <span className="text-amber-600">Someone's claiming this…</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(entry.slot);
                      setError(null);
                    }}
                    aria-label={`Sign up for the ${timeLabel(entry.startsAt)} slot`}
                    className="flex w-full items-center gap-3 rounded border border-dashed border-gray-300 px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50"
                  >
                    <span className="w-14 shrink-0 text-sm text-gray-400">
                      {timeLabel(entry.startsAt)}
                    </span>
                    <span className="text-gray-400">Open</span>
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Claim the ${timeLabel(selectedEntry.startsAt)} slot`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">
                Claiming the {timeLabel(selectedEntry.startsAt)} slot
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="rounded p-1 text-gray-500 hover:text-gray-800"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-2">
              <input
                ref={nameRef}
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
              {error && <p className="text-red-600">{error}</p>}
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
