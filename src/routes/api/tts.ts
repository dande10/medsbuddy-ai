import { createFileRoute } from "@tanstack/react-router";
import { proxyEcsRequest } from "@/lib/ecs-proxy";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.ELEVENLABS_API_KEY?.trim();
        if (!key) return proxyEcsRequest(request, "/api/tts");
        const body = (await request.json().catch(() => null)) as {
          text?: string;
          voiceId?: string;
        } | null;
        const text = body?.text?.trim();
        if (!text) return new Response("text required", { status: 400 });
        const voiceId = body?.voiceId ?? "EXAVITQu4vr4xnSDxMaL"; // Sarah - warm

        const r = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          },
        );
        if (!r.ok || !r.body) {
          const err = await r.text().catch(() => "");
          return new Response(err || "TTS failed", { status: r.status });
        }
        return new Response(r.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
