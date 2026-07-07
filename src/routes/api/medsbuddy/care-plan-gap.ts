import { createFileRoute } from "@tanstack/react-router";
import { proxyEcsJson } from "@/lib/ecs-proxy";

export const Route = createFileRoute("/api/medsbuddy/care-plan-gap")({
  server: {
    handlers: {
      POST: ({ request }) => proxyEcsJson(request, "/api/medsbuddy/care-plan-gap"),
    },
  },
});
