import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ShareModal } from "./ShareModal.tsx";

describe("<ShareModal />", () => {
  it("renders without props", () => {
    const { container } = render(<ShareModal />);
    expect(container).toBeInTheDocument();
  });

  it("shows a QR code linking to the prod url when open", () => {
    render(<ShareModal open />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("https://nasa-om.fly.dev")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<ShareModal open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
