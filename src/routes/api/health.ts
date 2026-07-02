import { createFileRoute } from "@tanstack/react-router";
import { getQwenConfig } from "@/lib/qwen-cloud";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const qwen = getQwenConfig();

        return Response.json({
          ok: true,
          service: "medsbuddy-ai-backend",
          deploymentTarget: "Alibaba Cloud",
          qwen: {
            configured: qwen.hasApiKey,
            model: qwen.model,
            baseUrl: qwen.baseUrl,
          },
          database: {
            configured: Boolean(process.env.DATABASE_URL),
            provider: process.env.DATABASE_PROVIDER ?? "local-browser-store",
          },
        });
      },
    },
  },
});
