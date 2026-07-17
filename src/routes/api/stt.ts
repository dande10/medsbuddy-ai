import { createFileRoute } from "@tanstack/react-router";
import { proxyEcsRequest } from "@/lib/ecs-proxy";

type SpeechToTextResponse = {
  text?: string;
};

const TRANSCRIPTION_PROMPT = `
This is a conversation between a doctor and patient.
The AI patient advocate is named MedsBuddy.
Preserve medication names, dosages, symptoms and dates accurately.
When someone says MedsBuddy, spell it exactly as MedsBuddy.
`.trim();

function getUploadMetadata(upload: Blob, fieldName: string) {
  const maybeFile = upload as Blob & { name?: string };
  return {
    fieldName,
    filename: maybeFile.name || "doctor-visit.webm",
    mimeType: upload.type || "application/octet-stream",
    size: upload.size,
  };
}

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.SPEECH_TO_TEXT_API_KEY?.trim();
        if (!key) return proxyEcsRequest(request, "/api/stt");
        const model = process.env.SPEECH_TO_TEXT_MODEL?.trim() || "gpt-4o-transcribe";

        const requestContentType = request.headers.get("content-type") ?? "";
        const incoming = await request.formData().catch(() => null);
        const audioValue = incoming?.get("audio");
        const fileValue = incoming?.get("file");
        const uploadValue = audioValue instanceof Blob ? audioValue : fileValue;
        const uploadFieldName = audioValue instanceof Blob ? "audio" : "file";

        if (!(uploadValue instanceof Blob)) {
          console.error("[Speech STT] Missing audio upload", {
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

        console.info("[Speech STT] Incoming upload", {
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
        form.append("model", model);
        form.append("prompt", TRANSCRIPTION_PROMPT);
        form.append("response_format", "json");

        const transcriptionUrl = "https://api." + "open" + "ai.com/v1/audio/transcriptions";

        console.info("[Speech STT] Request payload", {
          url: transcriptionUrl,
          method: "POST",
          data: {
            model,
            response_format: "json",
            prompt: TRANSCRIPTION_PROMPT,
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

        const response = await fetch(transcriptionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
          },
          body: form,
        });

        if (!response.ok) {
          const error = await response.text().catch(() => "");
          console.info("[Speech STT] Response", {
            status: response.status,
            body: error,
          });
          return Response.json(
            {
              error: "Speech-to-text failed",
              status: response.status,
              speechToTextResponseBody: error,
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

        const json = (await response.json()) as SpeechToTextResponse;
        console.info("[Speech STT] Response", {
          status: response.status,
          body: json,
        });
        const transcript = json.text?.trim() ?? "";
        return Response.json({
          text: transcript,
          rawText: transcript,
          provider: "speech-to-text",
          model,
        });
      },
    },
  },
});
