import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LandingScreen } from "./LandingScreen.tsx";

const healthy = {
  status: "ok",
  db: { connected: true, result: 2 },
  anthropic: { reachable: true },
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

const emptySlots = Array.from({ length: 9 }, (_, slot) => ({
  slot,
  startsAt: new Date(Date.now() + slot * 20 * 60_000).toISOString(),
  signup: null,
}));

const mockRoutes = (nextBody: () => unknown) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === "/api/events/next") return jsonResponse(nextBody());
    if (/\/api\/events\/\d+\/signups$/.test(url)) return jsonResponse({ slots: emptySlots });
    return jsonResponse(healthy);
  });

const upcomingEvent = (startsInMs: number) => {
  const startsAt = new Date(Date.now() + startsInMs);
  return {
    id: 1,
    title: "Open Mic Night",
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 3 * 60 * 60_000).toISOString(),
    slotCount: 9,
    slotMinutes: 20,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("<LandingScreen /> status dot", () => {
  it("shows a green dot when everything is healthy", async () => {
    mockRoutes(() => ({ mode: "none", event: null }));
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "All systems operational"),
    );
  });

  it("shows a red dot when the API is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<LandingScreen />);
    await waitFor(() => expect(screen.getByRole("status").className).toContain("bg-red-500"));
  });
});

describe("<LandingScreen /> schedule", () => {
  it("shows the nothing-scheduled banner when no event is upcoming", async () => {
    mockRoutes(() => ({ mode: "none", event: null }));
    render(<LandingScreen />);
    await waitFor(() => expect(screen.getByText("No open mic scheduled")).toBeInTheDocument());
    expect(screen.getByText(/Check back later/)).toBeInTheDocument();
  });

  it("shows the next-event banner when an event is upcoming", async () => {
    const event = upcomingEvent(2 * 24 * 60 * 60_000);
    mockRoutes(() => ({ mode: "upcoming", event }));
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByText("Next up: Open Mic Night")).toBeInTheDocument(),
    );
  });

  it("shows the sign-up sheet when the event is within its window", async () => {
    const event = upcomingEvent(10 * 60_000);
    mockRoutes(() => ({ mode: "signup", event }));
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByText(/sign-up sheet/)).toBeInTheDocument(),
    );
  });

  it("shows an error line when the schedule cannot load", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === "/api/events/next") return new Response("nope", { status: 500 });
      return jsonResponse(healthy);
    });
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Couldn't load the schedule/)).toBeInTheDocument(),
    );
  });

  it("swaps from the banner to the sign-up sheet when the server flips mode at the boundary", async () => {
    vi.useFakeTimers();
    // Event opens its window (start-30m) one minute from render; the mock mirrors
    // the server: it computes mode from the (fake) clock, so the boundary refetch
    // returns "signup" once the window opens.
    const event = upcomingEvent(31 * 60_000);
    const starts = Date.parse(event.startsAt);
    mockRoutes(() => ({
      mode: Date.now() >= starts - 30 * 60_000 ? "signup" : "upcoming",
      event,
    }));
    render(<LandingScreen />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Next up: Open Mic Night")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60_000);
    });
    expect(screen.getByText(/sign-up sheet/)).toBeInTheDocument();
    expect(screen.queryByText("Next up: Open Mic Night")).not.toBeInTheDocument();
  });
});

describe("<LandingScreen /> chat", () => {
  it("opens the chat screen from the FAB and closes it again", async () => {
    mockRoutes(() => ({ mode: "none", event: null }));
    render(<LandingScreen />);
    await waitFor(() => expect(screen.getByText("No open mic scheduled")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Open chat"));
    expect(screen.getByLabelText("Chat message")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open chat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(screen.queryByLabelText("Chat message")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });
});
