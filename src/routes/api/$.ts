import { createFileRoute } from "@tanstack/react-router";

// The external stock server is not connected in this environment. Without a
// handler these paths fall through to SSR and surface as 500 runtime errors.
// Answer with a clean 503 JSON so the UI falls back to preview data.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async () => unavailable(),
      POST: async () => unavailable(),
    },
  },
});

function unavailable() {
  return Response.json({ error: "The stock server is not available." }, { status: 503 });
}
