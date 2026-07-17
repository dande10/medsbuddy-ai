# LinkedIn Post Draft

I built MedsBuddy, an AI Patient Advocate for doctor visits, for the Global AI Hackathon Series with Qwen Cloud.

The idea came from a simple problem: healthcare visits can be overwhelming. Patients often forget symptoms, miss medication details, or leave without fully understanding follow-up instructions. I wanted to build something that supports communication during the visit, not just after-visit notes.

MedsBuddy helps patients before, during, and after an appointment:

Before the visit, the patient describes symptoms naturally. Qwen Cloud turns that conversation into structured clinical context: symptoms, medications, concerns, timeline, and questions for the doctor.

During the visit, with doctor consent, MedsBuddy listens as an AI Patient Advocate. It stays quiet during normal conversation, answers doctor questions from approved patient information, and asks clarification questions only when important care-plan details are missing.

After the visit, MedsBuddy generates a structured summary, medication instructions, follow-up plan, warning signs, plain-language explanation, and caregiver summary.

The architecture uses:

- Qwen Cloud for patient context extraction, doctor intent reasoning, care-plan gap detection, and structured summary generation.
- Alibaba Cloud ECS for backend APIs and visit memory.
- React, TypeScript, and Vite for the frontend.
- FastAPI and SQLite for the backend proof deployment.
- Speech-to-text for live transcription and ElevenLabs for spoken responses.
- Offline support for Emergency SOS, medications, visit summaries, and key health profile information.

What I learned: healthcare AI is not just about answering questions. It is about context, privacy, timing, and knowing when not to speak. The hardest part was designing the AI to be helpful without interrupting the doctor-patient relationship.

I’m proud that MedsBuddy now supports an end-to-end healthcare workflow: prepare before the visit, advocate during the visit, and remember the care plan afterward.

Repo: https://github.com/dande10/medsbuddy-ai
Demo: https://medsbuddy-ai-9lnv.vercel.app

#AI #QwenCloud #AlibabaCloud #HealthTech #React #FastAPI #VoiceAI #Hackathon
