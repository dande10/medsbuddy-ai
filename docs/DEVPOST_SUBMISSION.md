# MedsBuddy Devpost Submission

## Track

Track 4: Autopilot Agent

## Title

MedsBuddy: AI Patient Advocate for Doctor Visits

## Short Pitch

MedsBuddy is an AI Patient Advocate powered by Qwen Cloud that helps patients before, during, and after doctor visits by transforming conversations into structured patient context, supporting communication during consultations, and generating personalized care plans and visit summaries.

## Inspiration

Healthcare visits can be overwhelming. Patients often forget to mention important symptoms, misunderstand medication instructions, or leave without remembering follow-up recommendations. Existing healthcare applications often focus on reminders, symptom tracking, or after-visit notes, but very few actively support communication during a medical consultation.

We built MedsBuddy as an AI Patient Advocate that helps patients prepare before appointments, supports communication during consultations, and ensures patients leave with a clear understanding of their care plan. The goal is to use AI to strengthen, not replace, the relationship between patients and healthcare providers.

## What It Does

MedsBuddy helps patients before, during, and after healthcare visits.

Before the visit:

- Patients naturally describe symptoms, concerns, medications, and questions.
- Qwen Cloud transforms the conversation into structured clinical context.
- Patients review and approve the summary before sharing it.

During the visit:

- With doctor consent, speech-to-text transcribes the conversation.
- A Qwen-powered AI Patient Advocate listens in real time.
- MedsBuddy answers questions using only approved patient information.
- It identifies missing care-plan details and asks clarification questions only when necessary.
- It stays silent during normal patient-doctor conversation.

After the visit, MedsBuddy automatically generates:

- Structured visit summary
- Medication instructions
- Follow-up plan
- Warning signs
- Plain-language explanation
- Caregiver summary

Visit memory is stored through the Alibaba Cloud ECS backend, making future healthcare visits more personalized.

The core loop is:

Listen -> Understand -> Reason -> Retrieve patient information -> Help the doctor -> Summarize

## Emergency SOS and Offline Support

MedsBuddy includes an Emergency SOS profile containing current medications, allergies, medical conditions, emergency contacts, and recent visit summaries.

Even without internet access, patients can still access emergency profile data, current medications, visit summaries, and important healthcare information.

## Why It Matters

Patients often forget symptoms, miss medication details, misunderstand follow-up instructions, or leave the appointment without knowing warning signs. MedsBuddy acts like a calm advocate in the exam room. It helps the doctor get better context and helps the patient leave with clear, plain-language instructions.

## How MedsBuddy Is Different

| Capability | Symptom Checker Apps | Clinical Note AI | Patient Portals | MedsBuddy |
| --- | --- | --- | --- | --- |
| AI-powered pre-visit preparation | Yes | No | No | Yes |
| Structured patient context | Limited | No | Limited | Yes |
| Voice-based patient intake | Limited | No | No | Yes |
| AI participates during doctor visit with consent | No | Primarily clinician-focused | No | Yes |
| Answers using approved patient information | No | Limited | No | Yes |
| Detects missing care-plan details | No | Limited | No | Yes |
| Patient-friendly visit summary | Limited | Primarily clinician notes | Limited | Yes |
| Medication instructions and warning signs | Limited | Limited | Limited | Yes |
| Emergency SOS | No | No | Limited | Yes |
| Offline access | Limited | No | Limited | Yes |
| Visit memory | Limited | Limited | Limited | Yes |
| Complete workflow before, during, and after the visit | No | No | No | Yes |

Unlike traditional healthcare applications that focus on only one stage of the patient journey, MedsBuddy provides an end-to-end AI Patient Advocate workflow that prepares patients before appointments, supports communication during consultations, and generates structured care plans afterward.

## Qwen Cloud Use

MedsBuddy uses Qwen Cloud through Alibaba Cloud Model Studio's chat completions API. The backend sends visit transcript, patient context, medication history, and prior visit summaries to Qwen Cloud for semantic intent detection and response generation.

Qwen Cloud powers patient context extraction, doctor-intent reasoning, care-plan gap detection, doctor handoff generation, and structured visit summary generation.

## Voice Architecture

MedsBuddy uses speech-to-text for live doctor-visit transcription and ElevenLabs Text-to-Speech for voice responses. Qwen Cloud performs semantic reasoning on the approved patient context and live consultation transcript to generate context-aware responses and structured visit summaries.

## Demo

The demonstration showcases the complete workflow:

- Patient conversation
- AI-generated pre-visit summary
- Live doctor consultation
- AI Patient Advocate responses
- Care-plan clarification
- Structured visit summary
- Emergency SOS
- Offline support

## Architecture Diagram

Upload `docs/architecture-diagram.pdf` for the required architecture diagram. Use the in-app `/architecture` page during judging, and include this flow in the written submission:

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
Speech-to-Text
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

- Speech-to-Text
- ElevenLabs Text-to-Speech

Deployment:

- Vercel for the frontend
- Alibaba Cloud ECS for backend APIs, Qwen calls, and visit memory

## Judging Map

### Innovation and AI Creativity

MedsBuddy is not just a chatbot. It acts inside the doctor visit as an AI Patient Advocate: it listens, detects intent, retrieves context, speaks up, and summarizes.

### Technical Depth and Engineering

The app combines React, TanStack Start backend routes, Qwen Cloud chat completions, semantic intent detection, visit transcript cleaning, speech output, local patient context, visit summaries, and judge-friendly API proof endpoints.

### Problem Value and Impact

MedsBuddy addresses a real healthcare communication gap: patients often forget what to say, miss warning signs, or misunderstand medication instructions. The app improves patient confidence and doctor context.

### Presentation

The repo includes a Dockerfile, MIT license, Qwen proof endpoint, architecture diagram, README, and demo script.

## Challenges We Ran Into

Building a real-time AI Patient Advocate presented several engineering challenges:

- Designing natural conversations between patients, doctors, and AI.
- Integrating speech recognition with AI reasoning.
- Preventing hallucinations by restricting responses to approved patient information.
- Building structured healthcare summaries instead of transcript dumps.
- Detecting missing follow-up instructions and warning signs.
- Supporting offline access for emergency situations.
- Integrating Qwen Cloud, ElevenLabs, Vercel, and Alibaba Cloud ECS into one workflow.

## Accomplishments

- Built a complete AI Patient Advocate workflow.
- Created an end-to-end healthcare experience covering before, during, and after a doctor visit.
- Developed a Qwen-powered Doctor Agent for live consultation support.
- Generated structured care plans instead of raw transcript summaries.
- Added Emergency SOS with offline healthcare access.
- Deployed the frontend on Vercel.
- Deployed the backend on Alibaba Cloud ECS.
- Integrated real-time voice interaction using ElevenLabs.
- Built reusable AI workflows that can extend to many healthcare scenarios.

## What We Learned

Healthcare AI is not simply about answering questions. It is about understanding context, respecting privacy, communicating naturally, and supporting collaboration between patients and healthcare providers.

We also learned how to build production-style AI agents using Qwen Cloud, integrate real-time voice technologies with ElevenLabs, deploy backend services on Alibaba Cloud ECS, and design AI systems for real-world healthcare communication challenges.

## What's Next

Future plans include:

- Electronic Health Record integration
- Multi-language support
- Smart appointment preparation
- Medication adherence coaching
- Wearable device integration
- Remote patient monitoring
- Personalized preventive healthcare recommendations
- Family caregiver collaboration
- Hospital and clinic integrations
- HIPAA-compliant enterprise deployment
- Support for additional medical specialties
- Expanded offline emergency capabilities

## Built With

AI, Alibaba Cloud, Alibaba Cloud ECS, API, clinical workflows, ElevenLabs, FastAPI, Framer Motion, GitHub, healthcare, healthtech, LLMs, patient advocacy, Python, Qwen Cloud, React, REST APIs, speech-to-text, SQLite, text-to-speech, TypeScript, Vercel, voice AI, workflow automation.
