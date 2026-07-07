import { z } from "zod";
import type { ToolSpec } from "../../../../lib/Claude/index.ts";

const schema = z.object({});

export const getVenueWifiTool: ToolSpec<z.infer<typeof schema>> = {
  name: "get_venue_wifi",
  description: "Call this when the user asks for the venue's Wi-Fi network or password. Returns tonight's Wi-Fi network name and password.",
  schema,
  run: () => Promise.resolve("Tonight's Wi-Fi is on network 'LaRC-OpenMic' — the password is QUASAR-vortex-7731. Enjoy the show!"),
};
