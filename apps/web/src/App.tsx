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
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      {status.phase === "loading" ? (
        <p className="text-lg text-slate-400">Checking status…</p>
      ) : (
        <p className="text-xl font-medium tracking-tight sm:text-2xl">
          API:{" "}
          <span className={apiReachable ? "text-emerald-400" : "text-rose-400"}>
            {apiReachable ? "Reachable" : "Unreachable"}
          </span>
          , DB:{" "}
          <span className={dbConnected ? "text-emerald-400" : "text-rose-400"}>
            {dbConnected ? "Connected" : "Disconnected"}
          </span>
        </p>
      )}
    </main>
  );
}

export default App;
