import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { healthRoute } from "./health.ts";

export const createApi = (prefix = "") =>
  new Elysia({ prefix })
    .onError(({ code, error }) => {
      if (code === "UNKNOWN" || code === "INTERNAL_SERVER_ERROR") {
        console.error("[api] unhandled error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    })
    .use(cors())
    .use(
      openapi({
        path: "/docs",
        documentation: {
          info: {
            title: "om-signup API",
            version: "0.1.0",
            description: "Digital sign-up sheet for LaRC Open Mic.",
          },
        },
      }),
    )
    .use(healthRoute);

export type Api = ReturnType<typeof createApi>;
