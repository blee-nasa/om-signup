import { useCallback, useEffect, useRef, useState } from "react";
import { BotMessageSquare } from "lucide-react";
import { NextEventBanner, SignupSheet } from "@Components";
import { fetchHealth, fetchNextEvent, type Health, type NextEvent } from "../../api.ts";
import { ChatScreen } from "../ChatScreen/index.ts";
import styles from "./LandingScreen.module.css";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ok"; health: Health };

type Schedule =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ok"; next: NextEvent };

type DotColor = "grey" | "red" | "yellow" | "green";

const dotClass: Record<DotColor, string> = {
  grey: "bg-gray-400",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
};

const healthDot = (status: Status): { color: DotColor; label: string } => {
  if (status.phase === "loading") return { color: "grey", label: "Checking status…" };
  if (status.phase === "error") return { color: "red", label: "API unreachable" };
  const { db, anthropic } = status.health;
  if (db.connected && anthropic.reachable) {
    return { color: "green", label: "All systems operational" };
  }
  const down = [!db.connected && "database", !anthropic.reachable && "AI assistant"].filter(
    (x): x is string => Boolean(x),
  );
  return { color: "yellow", label: `Degraded — ${down.join(" and ")} unreachable` };
};

const SIGNUP_WINDOW_MS = 30 * 60 * 1000;
const POLL_MS = 60_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export const LandingScreen = () => {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [schedule, setSchedule] = useState<Schedule>({ phase: "loading" });
  const [chatOpen, setChatOpen] = useState(false);
  const scheduleReq = useRef(0);

  useEffect(() => {
    let alive = true;
    fetchHealth()
      .then((health) => {
        if (alive) setStatus({ phase: "ok", health });
      })
      .catch(() => {
        if (alive) setStatus({ phase: "error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadSchedule = useCallback(async () => {
    const req = ++scheduleReq.current;
    try {
      const next = await fetchNextEvent();
      if (req === scheduleReq.current) setSchedule({ phase: "ok", next });
    } catch {
      // Keep the last good schedule; only show an error if we never loaded one.
      if (req === scheduleReq.current) {
        setSchedule((prev) => (prev.phase === "ok" ? prev : { phase: "error" }));
      }
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
    const id = setInterval(() => void loadSchedule(), POLL_MS);
    return () => clearInterval(id);
  }, [loadSchedule]);

  // Refetch exactly at the server-side transition points so the banner/sheet swap
  // happens on time without depending on the device clock for the decision itself.
  // Candidates: window opens (start-30m), a test event ends (endsAt), a real event's
  // grace closes (end+30m). Extra fetches that don't apply just return the same mode.
  useEffect(() => {
    if (schedule.phase !== "ok" || !schedule.next.event) return;
    const starts = Date.parse(schedule.next.event.startsAt);
    const ends = Date.parse(schedule.next.event.endsAt);
    const now = Date.now();
    const boundaries = [starts - SIGNUP_WINDOW_MS, ends, ends + SIGNUP_WINDOW_MS].filter(
      (b) => b > now,
    );
    if (boundaries.length === 0) return;
    const delay = Math.min(Math.min(...boundaries) - now + 250, MAX_TIMEOUT_MS);
    const id = setTimeout(() => void loadSchedule(), delay);
    return () => clearTimeout(id);
  }, [schedule, loadSchedule]);

  const dot = healthDot(status);

  return (
    <div className={styles.container}>
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="font-semibold">LaRC Open Mic</span>
        <span
          role="status"
          aria-label={dot.label}
          title={dot.label}
          className={`h-3 w-3 rounded-full ${dotClass[dot.color]}`}
        />
      </header>

      <main className="grid flex-1 place-items-center p-4">
        {schedule.phase === "loading" && <p className="text-gray-400">Loading schedule…</p>}
        {schedule.phase === "error" && (
          <p className="text-gray-400">Couldn't load the schedule — try again later.</p>
        )}
        {schedule.phase === "ok" &&
          (schedule.next.mode === "signup" && schedule.next.event ? (
            <SignupSheet key={schedule.next.event.id} event={schedule.next.event} />
          ) : (
            <NextEventBanner
              event={schedule.next.mode === "upcoming" ? schedule.next.event : null}
            />
          ))}
      </main>

      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        >
          <BotMessageSquare aria-hidden className="h-6 w-6" />
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 flex h-128 max-h-[80vh] w-[calc(100vw-3rem)] max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <ChatScreen
            onClose={() => setChatOpen(false)}
            onAssistantReply={() => void loadSchedule()}
          />
        </div>
      )}
    </div>
  );
};
