import { createFileRoute } from "@tanstack/react-router";
import { getQwenConfig, qwenChatCompletion } from "@/lib/qwen-cloud";

export const Route = createFileRoute("/api/qwen-proof")({
  server: {
    handlers: {
      GET: async () => {
        const qwen = getQwenConfig();

        return Response.json({
          purpose: "Proof endpoint for Alibaba Cloud / Qwen Cloud API usage.",
          provider: "Alibaba Cloud Model Studio / Qwen Cloud",
          endpoint: `${qwen.baseUrl}/chat/completions`,
          model: qwen.model,
          apiKeyEnv: "QWEN_API_KEY or DASHSCOPE_API_KEY",
          usage: {
            method: "POST",
            body: {
              prompt: "Explain MedsBuddy in one sentence.",
            },
          },
        });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { prompt?: string } | null;
        const prompt = body?.prompt?.trim() || "Explain MedsBuddy in one sentence.";

        const reply = await qwenChatCompletion({
          messages: [
            {
              role: "system",
              content:
                "You are MedsBuddy, a concise patient advocate. Mention that this response is powered by Qwen Cloud.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          maxTokens: 180,
        });

        return Response.json({
          provider: "Alibaba Cloud Model Studio / Qwen Cloud",
          model: getQwenConfig().model,
          prompt,
          reply,
        });
      },
    },
  },
});
