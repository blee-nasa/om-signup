import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NextEventBanner } from "./NextEventBanner.tsx";

describe("<NextEventBanner />", () => {
  it("renders without props as the nothing-scheduled banner", () => {
    const { container } = render(<NextEventBanner />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText("No open mic scheduled")).toBeInTheDocument();
    expect(screen.getByText(/Check back later/)).toBeInTheDocument();
  });

  it("renders the event title and formatted date", () => {
    render(
      <NextEventBanner
        event={{
          id: 1,
          title: "Open Mic Night",
          startsAt: "2026-07-10T23:00:00.000Z",
          endsAt: "2026-07-11T02:00:00.000Z",
          slotCount: 9,
          slotMinutes: 20,
        }}
      />,
    );
    expect(screen.getByText("Next up: Open Mic Night")).toBeInTheDocument();
    expect(screen.getByText(/Sign-ups open 30 minutes before/)).toBeInTheDocument();
  });
});
