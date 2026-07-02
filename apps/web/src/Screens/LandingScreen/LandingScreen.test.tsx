import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LandingScreen } from "./LandingScreen.tsx";

const mockHealth = (body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    }),
  );

const healthy = { status: "ok", db: { connected: true, result: 2 }, anthropic: { reachable: true } };

afterEach(() => vi.restoreAllMocks());

describe("<LandingScreen />", () => {
  it("renders without props", () => {
    mockHealth(healthy);
    const { container } = render(<LandingScreen />);
    expect(container).toBeInTheDocument();
  });

  it("shows a grey dot while loading", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<LandingScreen />);
    const dot = screen.getByRole("status");
    expect(dot.className).toContain("bg-gray-400");
    expect(dot).toHaveAttribute("aria-label", "Checking status…");
  });

  it("shows a green dot when the DB and AI are both healthy", async () => {
    mockHealth(healthy);
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "All systems operational"),
    );
    expect(screen.getByRole("status").className).toContain("bg-green-500");
  });

  it("shows a yellow dot when the database is unreachable", async () => {
    mockHealth({ status: "degraded", db: { connected: false, result: null }, anthropic: { reachable: true } });
    render(<LandingScreen />);
    await waitFor(() => expect(screen.getByRole("status").className).toContain("bg-yellow-400"));
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Degraded — database unreachable",
    );
  });

  it("shows a yellow dot when the AI assistant is unreachable", async () => {
    mockHealth({ status: "degraded", db: { connected: true, result: 2 }, anthropic: { reachable: false } });
    render(<LandingScreen />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Degraded — AI assistant unreachable",
      ),
    );
  });

  it("shows a red dot when the API is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<LandingScreen />);
    await waitFor(() => expect(screen.getByRole("status").className).toContain("bg-red-500"));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "API unreachable");
  });

  it("opens the chat screen from the FAB and closes it again", () => {
    mockHealth(healthy);
    render(<LandingScreen />);

    expect(screen.queryByLabelText("Chat message")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open chat"));
    expect(screen.getByLabelText("Chat message")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open chat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(screen.queryByLabelText("Chat message")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open chat")).toBeInTheDocument();
  });
});
