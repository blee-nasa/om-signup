import { useEffect, useState } from "react";
import { fetchHealth, type Health } from "./api.ts";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ok"; health: Health };

function App() {
  const [status, setStatus] = useState<Status>({ phase: "loading" });

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

  const apiReachable = status.phase === "ok";
  const dbConnected = status.phase === "ok" && status.health.db.connected;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-4 text-center font-semibold">LaRC Open Mic</header>
      <main className="grid flex-1 place-items-center">
        {status.phase === "loading" ? (
          <p>Checking…</p>
        ) : (
          <p>
            API: {apiReachable ? "Reachable" : "Unreachable"}, DB:{" "}
            {dbConnected ? "Connected" : "Disconnected"}
          </p>
        )}
      </main>
    </div>
  );
}

export default App;
