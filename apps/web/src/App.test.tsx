import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

const mockHealth = (body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    }),
  );

afterEach(() => vi.restoreAllMocks());

describe("App status", () => {
  it("renders API Reachable, DB Connected when healthy", async () => {
    mockHealth({ status: "ok", db: { connected: true, result: 2 } });
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/API: Reachable, DB: Connected/)).toBeInTheDocument(),
    );
  });

  it("renders Disconnected when the DB is down but the API responds", async () => {
    mockHealth({ status: "degraded", db: { connected: false, result: null } });
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/API: Reachable, DB: Disconnected/)).toBeInTheDocument(),
    );
  });

  it("renders Unreachable when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/API: Unreachable/)).toBeInTheDocument());
  });
});
