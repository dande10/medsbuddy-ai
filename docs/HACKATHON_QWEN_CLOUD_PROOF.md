# Qwen Cloud Hackathon API Proof

MedsBuddy is submitted for **Track 4: Autopilot Agent** as **MedsBuddy: AI Patient Advocate for Doctor Visits**.

The app uses Qwen Cloud to power the core agent loop:

Listen -> Understand -> Reason -> Retrieve patient information -> Help the doctor -> Summarize

This project calls Qwen Cloud from the backend only, so API keys never ship to the browser.

Primary implementation files:

- `src/lib/qwen-cloud.ts` creates OpenAI-compatible Qwen Cloud chat completion requests.
- `src/lib/ai-chat.functions.ts` routes MedsBuddy's AI Patient Advocate through Qwen Cloud.
- `src/components/doctor-page.tsx` sends doctor visit transcript, patient context, medication context, and visit summaries for AI advocate reasoning.
- `src/routes/api/qwen-proof.ts` exposes a judge-friendly proof endpoint.
- `src/routes/api/health.ts` exposes a backend health endpoint showing Qwen configuration.
- `backend/main.py` provides the Alibaba Cloud ECS FastAPI backend with Qwen reasoning, ElevenLabs STT/TTS, and SQLite visit memory.
- `backend/deploy.sh` deploys the FastAPI backend with Uvicorn, Nginx, and systemd on Alibaba Cloud ECS.

Alibaba Cloud ECS deployment guide:

- `docs/ALIBABA_ECS_FASTAPI_DEPLOYMENT.md`

Alibaba ECS MedsBuddy API surface:

- `POST /api/medsbuddy/analyze-transcript` sends the live visit transcript to Qwen Cloud for speaker, intent, and response decisions.
- `POST /api/medsbuddy/generate-summary` sends the full visit transcript to Qwen Cloud for structured documentation.
- `POST /api/medsbuddy/save-memory` stores patient-approved doctor visit memory in the ECS database.
- `GET /api/medsbuddy/memory/{patientId}` retrieves previous approved visit memories.
- `POST /api/medsbuddy/ask-memory` retrieves visit memory and asks Qwen Cloud to answer doctor questions.
- `POST /api/medsbuddy/clarification-check` asks Qwen Cloud whether MedsBuddy should ask the doctor a clarification.
- `POST /api/medsbuddy/chat` powers the general MedsBuddy Talk page through Alibaba ECS and Qwen Cloud.

Architecture proof:

```txt
MedsBuddy App -> Alibaba ECS Backend APIs -> Qwen Cloud -> Visit Memory DB -> Response
```

Environment variables:

```bash
QWEN_API_KEY=your_qwen_cloud_key
QWEN_MODEL=qwen3.7-max
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

If the hackathon workspace provides a Model Studio workspace endpoint, use that endpoint instead:

```bash
QWEN_API_KEY=your_qwen_cloud_key
QWEN_MODEL=qwen3.7-max
QWEN_API_BASE_URL=https://YOUR_WORKSPACE_ID.eu-central-1.maas.aliyuncs.com/compatible-mode/v1
```

Local proof call:

```bash
curl -sS -X POST http://localhost:5173/api/qwen-proof \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain how MedsBuddy helps a patient prepare for a doctor visit."}'
```

The backend sends this Qwen Cloud request shape:

```ts
await fetch(`${QWEN_API_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${QWEN_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: QWEN_MODEL,
    messages: [
      { role: "system", content: "You are MedsBuddy, a concise patient advocate." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 180,
  }),
});
```

Doctor Visit agent prompt data includes:

- Latest live visit transcript message.
- Full doctor, patient, and MedsBuddy transcript.
- Patient context.
- Medication history.
- Previous visit summaries.

Qwen Cloud determines whether MedsBuddy should respond, which speaker/intent is present, and what the advocate should say. This is semantic intent detection, not a simple wake-word assistant.

## Speech-To-Text and Voice Output

MedsBuddy separates the voice stack into three responsibilities:

- **Speech-to-text:** ElevenLabs speech-to-text from microphone audio, with simulated transcript input as a reliable demo fallback.
- **Reasoning:** Qwen Cloud LLM for semantic intent detection, patient context retrieval, advocacy responses, and visit summaries.
- **Text-to-speech:** ElevenLabs/browser speech output for MedsBuddy speaking to the doctor and reading summaries back to the patient.

For production multi-speaker visits, MedsBuddy should use diarization-capable STT:

- **Qwen-ASR** when the deployment should stay fully aligned with Qwen Cloud / Alibaba Cloud.
- **Deepgram** when strong speaker diarization is needed to label doctor and patient turns automatically.

The current ElevenLabs STT path receives transcript text but does not truly identify individual voices. MedsBuddy uses Qwen Cloud and transcript context to infer speaker/intent, while diarization-capable STT is the next upgrade for reliable real-world multi-speaker labeling.

Example AI advocate behavior:

- Doctor asks: "Can you tell me the patient's history?"
- Qwen Cloud classifies intent as `patient_history_request`.
- MedsBuddy responds with relevant patient history and medication context.
- If the doctor gives vague instructions like "follow up later," MedsBuddy asks for follow-up timing and warning signs.
