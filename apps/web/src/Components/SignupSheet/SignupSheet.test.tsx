import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupSheet } from "./SignupSheet.tsx";

const event = {
  id: 7,
  title: "Open Mic Night",
  startsAt: "2026-07-10T23:00:00.000Z",
  endsAt: "2026-07-11T02:00:00.000Z",
  slotCount: 9,
  slotMinutes: 20,
};

const makeSlots = (taken: Record<number, { name: string; act: string | null }> = {}) =>
  Array.from({ length: event.slotCount }, (_, slot) => ({
    slot,
    startsAt: new Date(Date.parse(event.startsAt) + slot * event.slotMinutes * 60_000).toISOString(),
    signup: taken[slot]
      ? { id: slot + 1, slot, ...taken[slot], createdAt: event.startsAt }
      : null,
  }));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => vi.restoreAllMocks());

describe("<SignupSheet />", () => {
  it("renders without props", () => {
    const { container } = render(<SignupSheet />);
    expect(container).toBeInTheDocument();
  });

  it("renders one open slot per configured slot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ slots: makeSlots() }));
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ })).toHaveLength(9),
    );
    expect(screen.getAllByText("Open")).toHaveLength(9);
  });

  it("shows taken slots with the performer instead of a button", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ slots: makeSlots({ 0: { name: "Ada", act: "standup" } }) }),
    );
    render(<SignupSheet event={event} />);

    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.getByText("— standup")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sign up for the/ })).toHaveLength(8);
  });

  it("claims a slot through the per-slot form", async () => {
    let taken: Record<number, { name: string; act: string | null }> = {};
    const posts: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { slot: number; name: string };
        posts.push(body);
        taken = { ...taken, [body.slot]: { name: body.name, act: null } };
        return jsonResponse(
          { signup: { id: 9, slot: body.slot, name: body.name, act: null, createdAt: event.startsAt } },
          201,
        );
      }
      return jsonResponse({ slots: makeSlots(taken) });
    });
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[2]!);
    expect(screen.getByText(/Claiming the/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Brandon" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign me up" }));

    await waitFor(() => expect(screen.getByText("Brandon")).toBeInTheDocument());
    expect(posts).toEqual([expect.objectContaining({ slot: 2, name: "Brandon" })]);
    expect(screen.queryByText(/Claiming the/)).not.toBeInTheDocument();
  });

  it("surfaces the server's message when the slot is already taken", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) =>
      init?.method === "POST"
        ? jsonResponse({ error: "That slot is already taken" }, 409)
        : jsonResponse({ slots: makeSlots() }),
    );
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Brandon" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign me up" }));

    await waitFor(() =>
      expect(screen.getByText("That slot is already taken")).toBeInTheDocument(),
    );
  });

  it("keeps the modal and its error visible after a refresh shows the slot as taken", async () => {
    let claimedByOther = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        claimedByOther = true;
        return jsonResponse({ error: "That slot is already taken" }, 409);
      }
      return jsonResponse({
        slots: makeSlots(claimedByOther ? { 0: { name: "Someone Else", act: null } } : {}),
      });
    });
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Brandon" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign me up" }));

    await waitFor(() =>
      expect(screen.getByText("That slot is already taken")).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("Someone Else")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("That slot is already taken")).toBeInTheDocument();
  });

  it("surfaces the window-closed message distinctly from slot-taken", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) =>
      init?.method === "POST"
        ? jsonResponse({ error: "Sign-ups are not open for this event" }, 409)
        : jsonResponse({ slots: makeSlots() }),
    );
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Brandon" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign me up" }));

    await waitFor(() =>
      expect(screen.getByText("Sign-ups are not open for this event")).toBeInTheDocument(),
    );
  });

  it("opens a claim modal dialog when an open slot is clicked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ slots: makeSlots() }));
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Claiming the/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Your name")).toBeInTheDocument();
  });

  it("closes the claim modal via the close button without signing up", async () => {
    const posts: unknown[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (init?.method === "POST") {
        posts.push(init.body);
        return jsonResponse({}, 201);
      }
      return jsonResponse({ slots: makeSlots() });
    });
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(posts).toHaveLength(0);
  });

  it("closes the claim modal on Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ slots: makeSlots() }));
    render(<SignupSheet event={event} />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Sign up for the/ }).length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Sign up for the/ })[0]!);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows a loading state before the first slot fetch resolves", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<SignupSheet event={event} />);
    expect(screen.getByText("Loading slots…")).toBeInTheDocument();
  });

  it("shows an error state when the sheet never loads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    render(<SignupSheet event={event} />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the sheet/)).toBeInTheDocument());
  });
});
