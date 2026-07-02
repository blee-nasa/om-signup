import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

afterEach(() => vi.restoreAllMocks());

describe("<App />", () => {
  it("renders the landing screen with a health status dot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          db: { connected: true, result: 2 },
          anthropic: { reachable: true },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    render(<App />);
    expect(screen.getByText("LaRC Open Mic")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "All systems operational"),
    );
  });
});
