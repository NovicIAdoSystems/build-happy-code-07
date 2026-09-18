import { createFileRoute } from "@tanstack/react-router";

import {
  sampleActor,
  sampleDeleted,
  sampleLedger,
  sampleStock,
} from "@/lib/noviciado-api";

// The external stock server is not connected in this environment. These stub
// handlers serve the same preview data with a normal 200 so the app loads
// cleanly instead of reporting failed requests.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = params._splat ?? "";
        const url = new URL(request.url);
        if (path === "me") return Response.json(sampleActor);
        if (path === "stock") {
          return Response.json(url.searchParams.get("deleted") ? sampleDeleted : sampleStock);
        }
        if (path === "products") return Response.json(sampleStock.map((p) => p.name));
        if (path === "ledger") {
          return Response.json(sampleLedger.filter((row) => !row.voided_at));
        }
        return Response.json([]);
      },
      POST: async () => Response.json({ ok: true }),
    },
  },
});
