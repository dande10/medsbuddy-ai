import { createFileRoute } from "@tanstack/react-router";

type ElevenLabsSttResponse = {
  text?: string;
  words?: {
    speaker_id?: string;
    text?: string;
    type?: string;
  }[];
};

function getUploadMetadata(upload: Blob, fieldName: string) {
  const maybeFile = upload as Blob & { name?: string };
  return {
    fieldName,
    filename: maybeFile.name || "doctor-visit.webm",
    mimeType: upload.type || "application/octet-stream",
    size: upload.size,
  };
}

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

        const requestContentType = request.headers.get("content-type") ?? "";
        const incoming = await request.formData().catch(() => null);
        const audioValue = incoming?.get("audio");
        const fileValue = incoming?.get("file");
        const uploadValue = audioValue instanceof Blob ? audioValue : fileValue;
        const uploadFieldName = audioValue instanceof Blob ? "audio" : "file";

        if (!(uploadValue instanceof Blob)) {
          console.error("[ElevenLabs STT] Missing audio upload", {
            "request.content_type": requestContentType,
            acceptedFields: ["audio", "file"],
          });
          return Response.json(
            {
              error: "audio file required",
              requestContentType,
              acceptedFields: ["audio", "file"],
            },
            { status: 400 },
          );
        }

        const metadata = getUploadMetadata(uploadValue, uploadFieldName);
        const audioBytes = await uploadValue.arrayBuffer();
        const first20Bytes = Array.from(new Uint8Array(audioBytes.slice(0, 20)))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

        console.info("[ElevenLabs STT] Incoming upload", {
          "request.content_type": requestContentType,
          uploaded_field_name: metadata.fieldName,
          uploaded_filename: metadata.filename,
          uploaded_mime_type: metadata.mimeType,
          uploaded_file_size: metadata.size,
          first_20_bytes: first20Bytes,
        });

        if (metadata.size === 0) {
          return Response.json(
            {
              error: "uploaded audio file is empty",
              requestContentType,
              uploadedFieldName: metadata.fieldName,
              uploadedFilename: metadata.filename,
              uploadedMimeType: metadata.mimeType,
              uploadedFileSize: metadata.size,
              first20Bytes,
            },
            { status: 400 },
          );
        }

        const upload = new Blob([audioBytes], { type: metadata.mimeType });

        const form = new FormData();
        form.append("file", upload, metadata.filename);
        form.append("model_id", "scribe_v2");
        form.append("tag_audio_events", "false");
        form.append("diarize", "true");
        form.append("num_speakers", "2");

        console.info("[ElevenLabs STT] Request payload", {
          url: "https://api.elevenlabs.io/v1/speech-to-text",
          method: "POST",
          data: {
            model_id: "scribe_v2",
            tag_audio_events: "false",
            diarize: "true",
            num_speakers: "2",
          },
          files: {
            file: {
              filename: metadata.filename,
              incoming_field_name: metadata.fieldName,
              content_type: metadata.mimeType,
              size: metadata.size,
              first_20_bytes: first20Bytes,
            },
          },
        });

        const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: {
            "xi-api-key": key,
          },
          body: form,
        });

        if (!response.ok) {
          const error = await response.text().catch(() => "");
          console.info("[ElevenLabs STT] Response", {
            status: response.status,
            body: error,
          });
          return Response.json(
            {
              error: "ElevenLabs STT failed",
              status: response.status,
              elevenLabsResponseBody: error,
              requestContentType,
              uploadedFieldName: metadata.fieldName,
              uploadedFilename: metadata.filename,
              uploadedMimeType: metadata.mimeType,
              uploadedFileSize: metadata.size,
              first20Bytes,
            },
            { status: response.status },
          );
        }

        const json = (await response.json()) as ElevenLabsSttResponse;
        console.info("[ElevenLabs STT] Response", {
          status: response.status,
          body: json,
        });
        return Response.json({
          text: buildSpeakerTranscript(json),
          rawText: json.text?.trim() ?? "",
        });
      },
    },
  },
});
