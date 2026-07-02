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

1. Open MedsBuddy and show the bottom navigation.
2. Go to Doctor Visit and show "AI Patient Advocate".
3. Click Start Live Visit.
4. Show patient consent and doctor consent.
5. Let MedsBuddy introduce itself to the doctor and ask consent to participate.
6. Add patient concern: fever, dizziness after medication, fatigue, leg and lower back pain.
7. Add doctor question: "Can you tell me the patient's history and medication context?"
8. Show MedsBuddy answering with patient history and medication context.
9. Add doctor instruction: "Continue the medication and follow up later."
10. Show MedsBuddy asking for follow-up timing and warning signs.
11. End Visit.
12. Show structured Visit Summary with concerns, doctor assessment, medication guidance, warning signs, follow-up plan, and caregiver summary.
13. Click Speak Brief Summary so MedsBuddy reads a short patient-friendly recap out loud.
14. Mention Qwen Cloud powers semantic understanding and advocate responses.

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
