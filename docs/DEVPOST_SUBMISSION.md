# MedsBuddy Devpost Submission

## Track

Track 4: Autopilot Agent

## Title

MedsBuddy: AI Patient Advocate for Doctor Visits

## Short Pitch

MedsBuddy is a Qwen Cloud-powered AI patient advocate that supports patients during doctor visits. With patient consent, it listens to the visit, understands patient and doctor intent, retrieves relevant patient history and medication context, speaks up when clarification is needed, and automatically generates structured visit documentation, follow-up actions, and plain-language summaries.

## What It Does

MedsBuddy helps patients who feel overwhelmed during medical appointments. In Doctor Visit mode, the patient starts an AI Patient Advocate visit, grants consent, and asks the doctor for consent. During the appointment, MedsBuddy listens to the conversation, uses Qwen Cloud to understand intent and clinical context, retrieves medication and symptom history, answers doctor questions about patient history, asks clarifying questions when important information is missing, and creates a final visit summary.

The core loop is:

Listen -> Understand -> Reason -> Retrieve patient information -> Help the doctor -> Summarize

## Why It Matters

Patients often forget symptoms, miss medication details, misunderstand follow-up instructions, or leave the appointment without knowing warning signs. MedsBuddy acts like a calm advocate in the exam room. It helps the doctor get better context and helps the patient leave with clear, plain-language instructions.

## Qwen Cloud Use

MedsBuddy uses Qwen Cloud through Alibaba Cloud Model Studio's OpenAI-compatible chat completions API. The backend sends visit transcript, patient context, medication history, and prior visit summaries to Qwen Cloud for semantic intent detection and response generation.

Proof files:

- `src/lib/qwen-cloud.ts` - Qwen Cloud client.
- `src/lib/ai-chat.functions.ts` - MedsBuddy AI server function.
- `src/routes/api/qwen-proof.ts` - judge-friendly Qwen proof endpoint.
- `docs/HACKATHON_QWEN_CLOUD_PROOF.md` - proof request and curl command.

## Voice Architecture

For the hackathon demo, MedsBuddy uses ElevenLabs speech-to-text or simulated transcript input for reliable live visit transcription, Qwen Cloud for reasoning, and ElevenLabs speech output for spoken responses.

Recommended production stack:

- ElevenLabs - speech-to-text microphone transcription and text-to-speech voice output.
- Qwen Cloud - LLM reasoning, semantic intent detection, and hackathon-required AI backend.
- Qwen-ASR - optional future speech-to-text path when the deployment should stay fully Qwen/Alibaba Cloud aligned.
- Deepgram - strong fallback for real multi-speaker visits because speaker diarization can label speaker changes.

The current app treats speaker labels as semantic detection from ElevenLabs transcript text. True automatic recognition of different people by voice requires diarization-capable STT such as Qwen-ASR with speaker labels or Deepgram diarization.

## Demo Video Script Under 3 Minutes

Use this sore-throat scenario for the recorded demo:

1. Open the Talk page.
2. Patient says: "Hi MedsBuddy. I've had a sore throat for the last four days. It hurts when I swallow, my voice has become hoarse, and I've had a mild fever since yesterday. I'm worried because it's not getting better."
3. Show MedsBuddy preparing structured patient context.
4. Open the Doctor Visit page and approve the pre-visit summary.
5. Start the live doctor visit.
6. MedsBuddy says: "Hello Doctor. I am MedsBuddy, the patient's AI advocate..."
7. Doctor gives consent.
8. Doctor asks: "Good morning, Vasanthi. Tell me what's been going on."
9. Show MedsBuddy summarizing the approved patient context.
10. Doctor asks: "Are you currently taking any medications?"
11. Show MedsBuddy answering from saved medication context.
12. Doctor says: "Your throat looks inflamed. I believe this is a bacterial throat infection."
13. Doctor says: "I'm prescribing Amoxicillin 500 milligrams. Take one capsule twice daily for seven days. Drink plenty of fluids and rest your voice."
14. Show MedsBuddy asking: "Doctor, could you also confirm when the patient should follow up and what warning signs should prompt urgent medical attention?"
15. Doctor provides follow-up and warning signs.
16. Show MedsBuddy acknowledging the updated care plan.
17. End the visit and show the structured visit summary.
18. Mention that Qwen Cloud powers patient-context extraction, doctor-intent reasoning, care-plan gap detection, and summary generation.

Keep the video under 3 minutes. Focus on the agent acting during the visit, not on every page in the app.

## Architecture Diagram

Use the in-app `/architecture` page during judging, and include this diagram in the written submission:

```text
Patient
  ↓
Talk Page
  ↓
Qwen Patient Context Agent
  ↓
Structured Patient Context
  ↓
Doctor Visit
  ↓
ElevenLabs Speech-to-Text
  ↓
Qwen Doctor Agent
  ↓
AI Patient Advocate
  ↓
Structured Visit Summary
  ↓
Alibaba Cloud ECS Visit Memory
```

## How We Built It

MedsBuddy was built with an AI-first architecture that connects patient preparation, live doctor-visit support, and post-visit memory.

Frontend:

- React
- TypeScript
- Vite
- Framer Motion

Backend:

- Python
- FastAPI
- Alibaba Cloud ECS
- SQLite for demo visit memory

AI:

- Qwen Cloud through Alibaba Cloud Model Studio
- Patient Context Agent
- Doctor Agent
- Care Plan Reasoning
- Structured Visit Summary Generation

Voice:

- ElevenLabs Speech-to-Text
- ElevenLabs Text-to-Speech

Deployment:

- Vercel for the frontend
- Alibaba Cloud ECS for backend APIs, Qwen calls, and visit memory

## Required Submission Assets

Code repository:

```text
https://github.com/dande10/medsbuddy-ai
```

The repository is public, includes all source code and deployment instructions, and includes an MIT license at the repository root.

Video demo:

- 1 to 3 minutes maximum.
- Show the agent in action during the sore-throat doctor visit flow.

Architecture:

- Use `docs/architecture.mmd`.
- Use the in-app `/architecture` page.

Written summary:

MedsBuddy is an AI patient advocate that helps patients prepare for doctor visits, assists during live appointments, and creates structured visit summaries afterward. Patients can describe symptoms in natural language, and Qwen Cloud extracts structured patient context such as symptoms, medications, concerns, timelines, and questions for the doctor.

During the doctor visit, MedsBuddy listens through speech-to-text, uses Qwen Cloud to understand doctor intent, answers questions using approved patient context, detects missing care-plan details, and asks concise clarification questions when needed. After the visit, it generates a patient-friendly summary and stores approved visit memory through the Alibaba Cloud ECS backend.

Proof of Alibaba Cloud deployment:

- Screenshot the Alibaba Cloud ECS instance page showing the running instance and public IP.
- Screenshot the backend health endpoint:

```text
http://YOUR_ECS_PUBLIC_IP/health
```

- Screenshot the Qwen proof endpoint:

```text
http://YOUR_ECS_PUBLIC_IP/api/qwen-proof
```

Open-source note:

MedsBuddy uses open-source frameworks including React, TypeScript, Vite, TanStack Start, FastAPI, and SQLite. The project is an original implementation and should not be submitted as a direct clone of another repository.

## Judging Map

### Innovation and AI Creativity

MedsBuddy is not just a chatbot. It acts inside the doctor visit as an AI Patient Advocate: it listens, detects intent, retrieves context, speaks up, and summarizes.

### Technical Depth and Engineering

The app combines React, TanStack Start backend routes, Qwen Cloud chat completions, semantic intent detection, visit transcript cleaning, speech output, local patient context, visit summaries, and judge-friendly API proof endpoints. The voice architecture is ready to upgrade from browser STT to Qwen-ASR or Deepgram diarization for true multi-speaker transcription.

### Problem Value and Impact

MedsBuddy addresses a real healthcare communication gap: patients often forget what to say, miss warning signs, or misunderstand medication instructions. The app improves patient confidence and doctor context.

### Presentation and Documentation

The repo includes a Dockerfile, MIT license, Qwen proof endpoint, architecture diagram, README, Devpost submission guide, and demo script.

## Submission Checklist

- Public GitHub repository.
- MIT license included.
- README explains Qwen Cloud integration.
- Devpost description uses Track 4: Autopilot Agent.
- Architecture diagram included.
- Qwen proof endpoint works.
- Alibaba Cloud deployment URL included.
- Demo video is public and under 3 minutes.
- Demo video shows the Doctor Visit AI Patient Advocate flow.
- Submission links directly to `src/lib/qwen-cloud.ts` and `src/routes/api/qwen-proof.ts`.
