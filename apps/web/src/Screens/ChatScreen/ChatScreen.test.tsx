import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatScreen } from "./ChatScreen.tsx";

afterEach(() => vi.restoreAllMocks());

describe("<ChatScreen />", () => {
  it("renders without props", () => {
    const { container } = render(<ChatScreen />);
    expect(container).toBeInTheDocument();
    expect(screen.queryByLabelText("Close chat")).not.toBeInTheDocument();
  });

  it("shows a close button and calls onClose when provided", () => {
    const onClose = vi.fn();
    render(<ChatScreen onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("sends a message and renders the assistant reply", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ response: "Try a tight five about wind tunnels." }), {
        headers: { "content-type": "application/json" },
      }),
    );
    render(<ChatScreen />);

    fireEvent.change(screen.getByLabelText("Chat message"), {
      target: { value: "Any set ideas?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Any set ideas?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/wind tunnels/)).toBeInTheDocument());
  });

  it("shows an error line when the chat request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    render(<ChatScreen />);

    fireEvent.change(screen.getByLabelText("Chat message"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(screen.getByText(/Something went wrong/)).toBeInTheDocument());
  });
});
