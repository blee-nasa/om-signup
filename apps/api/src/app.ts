import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { healthRoute } from "./health.ts";
import { signupRoutes } from "./routes/signups.ts";

/**
 * Builds the API as a fresh Elysia instance (no side effects — does not call
 * `.listen()`), so tests can drive it via `createApi().handle(new Request(...))`.
 *
 * @param prefix mount path. Empty when run standalone (health at `/`); `/api`
 *   when the single-app server serves the SPA at `/` and the API under `/api`.
 */
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
            description:
              "Digital sign-up sheet for LaRC Open Mic. `GET /` is the SELECT 1+1 healthcheck.",
          },
        },
      }),
    )
    .use(healthRoute)
    .use(signupRoutes);

export type Api = ReturnType<typeof createApi>;
