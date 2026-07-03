import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";
import { startTestMode, stopTestMode } from "../../../../test-mode.ts";

const startSchema = z.object({
  minutes: z
    .number()
    .int()
    .min(1)
    .max(120)
    .optional()
    .describe("How long test mode stays active, in minutes. Defaults to 30."),
});

export const startTestModeTool: ToolSpec<z.infer<typeof startSchema>> = {
  name: "start_test_mode",
  description:
    "Put the app into test mode: the landing screen automatically swaps to a live sign-up sheet for a synthetic 'Open Mic (Test Mode)' event, exactly as if an open mic were happening right now. Sign-ups made during test mode are kept in memory only and discarded when it ends. Call this when the user asks to run, start, or enter test mode.",
  schema: startSchema,
  run: (input) => {
    const { endsAt, minutes } = startTestMode(input.minutes);
    return Promise.resolve(
      `Test mode is active for ${minutes} minutes (until ${endsAt.toISOString()}). The landing screen now shows the sign-up sheet for a synthetic event and will revert automatically when test mode ends.`,
    );
  },
};

const stopSchema = z.object({});

export const stopTestModeTool: ToolSpec<z.infer<typeof stopSchema>> = {
  name: "stop_test_mode",
  description:
    "End test mode immediately and return the landing screen to the real schedule. Call this when the user asks to stop, end, or exit test mode.",
  schema: stopSchema,
  run: () =>
    Promise.resolve(
      stopTestMode()
        ? "Test mode stopped. The app is back on the real schedule."
        : "Test mode was not active.",
    ),
};
