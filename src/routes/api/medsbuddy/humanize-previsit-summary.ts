import { createFileRoute } from "@tanstack/react-router";
import { proxyEcsJson } from "@/lib/ecs-proxy";

export const Route = createFileRoute("/api/medsbuddy/humanize-previsit-summary")({
  server: {
    handlers: {
      POST: ({ request }) => proxyEcsJson(request, "/api/medsbuddy/humanize-previsit-summary"),
    },
  },
});
