import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

afterEach(() => vi.restoreAllMocks());

describe("<App />", () => {
  it("renders the landing screen with header, dot, and schedule", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const body =
        url === "/api/events/next"
          ? { mode: "none", event: null }
          : { status: "ok", db: { connected: true, result: 2 }, anthropic: { reachable: true } };
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    });
    render(<App />);
    expect(screen.getByText("LaRC Open Mic")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "All systems operational"),
    );
    await waitFor(() => expect(screen.getByText("No open mic scheduled")).toBeInTheDocument());
  });
});
