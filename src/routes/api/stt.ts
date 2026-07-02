import { createFileRoute } from "@tanstack/react-router";

type ElevenLabsSttResponse = {
  text?: string;
  words?: {
    speaker_id?: string;
    text?: string;
    type?: string;
  }[];
};

function buildSpeakerTranscript(response: ElevenLabsSttResponse): string {
  const words = response.words?.filter((word) => word.type !== "spacing" && word.text?.trim());
  if (!words?.length) return response.text?.trim() ?? "";

  const speakerNames = new Map<string, "Doctor" | "Patient">();
  const lines: string[] = [];
  let currentSpeakerId = "";
  let currentWords: string[] = [];

  const getSpeakerName = (speakerId: string): "Doctor" | "Patient" => {
    const existing = speakerNames.get(speakerId);
    if (existing) return existing;
    const next = speakerNames.size === 0 ? "Doctor" : "Patient";
    speakerNames.set(speakerId, next);
    return next;
  };

  const flush = () => {
    const text = currentWords
      .join(" ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
    if (!text || !currentSpeakerId) return;
    lines.push(`${getSpeakerName(currentSpeakerId)}: ${text}`);
    currentWords = [];
  };

  for (const word of words) {
    const speakerId = word.speaker_id ?? "speaker_1";
    if (speakerId !== currentSpeakerId) {
      flush();
      currentSpeakerId = speakerId;
    }
    currentWords.push(word.text ?? "");
  }
  flush();

  return lines.join("\n") || response.text?.trim() || "";
}

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.ELEVENLABS_API_KEY?.trim();
        if (!key) return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });

        const incoming = await request.formData().catch(() => null);
        const audio = incoming?.get("audio");
        if (!(audio instanceof Blob)) {
          return new Response("audio file required", { status: 400 });
        }

        const form = new FormData();
        form.append("file", audio, "doctor-visit.webm");
        form.append("model_id", "scribe_v2");
        form.append("tag_audio_events", "false");
        form.append("diarize", "true");
        form.append("num_speakers", "2");

        const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: {
            "xi-api-key": key,
          },
          body: form,
        });

        if (!response.ok) {
          const error = await response.text().catch(() => "");
          return Response.json(
            { error: error || "ElevenLabs STT failed", status: response.status },
            { status: response.status },
          );
        }

        const json = (await response.json()) as ElevenLabsSttResponse;
        return Response.json({
          text: buildSpeakerTranscript(json),
          rawText: json.text?.trim() ?? "",
        });
      },
    },
  },
});
