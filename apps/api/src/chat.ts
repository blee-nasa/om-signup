import { Elysia, t } from "elysia";
import { agentRegistry } from "./agents/index.ts";

export const chatRoute = new Elysia().post(
  "/chat",
  async ({ body, status }) => {
    const name = body.agent ?? "assistant";
    const make = agentRegistry[name];
    if (!make) return status(404, { error: `Unknown agent: ${name}` });
    const response = await make().respond(body.messages);
    return { response };
  },
  {
    body: t.Object({
      agent: t.Optional(t.String()),
      messages: t.Array(
        t.Object({
          role: t.Union([t.Literal("user"), t.Literal("assistant")]),
          content: t.String({ minLength: 1 }),
        }),
        { minItems: 1 },
      ),
    }),
    response: {
      200: t.Object({ response: t.String() }),
      404: t.Object({ error: t.String() }),
    },
  },
);
