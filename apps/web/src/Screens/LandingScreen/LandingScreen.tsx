import { useEffect, useState } from "react";
import { BotMessageSquare } from "lucide-react";
import { fetchHealth, type Health } from "../../api.ts";
import { ChatScreen } from "../ChatScreen/index.ts";
import styles from "./LandingScreen.module.css";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ok"; health: Health };

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

export const LandingScreen = () => {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [chatOpen, setChatOpen] = useState(false);

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

      <main className="flex-1" />

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
          <ChatScreen onClose={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  );
};
