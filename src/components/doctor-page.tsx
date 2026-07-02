import { useApp, adherence } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { aiChat } from "@/lib/ai-chat.functions";
import {
  Activity,
  Calendar,
  Check,
  ClipboardList,
  FileText,
  Mic,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function buildPatientSummary(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms } = state;
  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
  const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
  const recentSymptoms = symptoms.filter((s) => s.at >= last7);
  const symptomText = recentSymptoms.length
    ? recentSymptoms
        .slice(0, 4)
        .map((s) => `${s.name} severity ${s.severity}`)
        .join(", ")
    : "no symptoms logged this week";
  const medText = meds.length
    ? meds.map((m) => `${m.name} ${m.dosage}`).join(", ")
    : "no medications listed";

  const adherenceText = doses.length
    ? `7-day adherence: ${adh} percent, with ${taken} taken and ${missed} missed or skipped doses.`
    : "No recent medication dose logs are available yet, so adherence cannot be calculated.";

  return [
    `Patient: ${profile.name || "Demo patient"}.`,
    `Current medications: ${medText}.`,
    adherenceText,
    `Recent symptoms: ${symptomText}.`,
    profile.conditions ? `Conditions: ${profile.conditions}.` : "",
    profile.allergies ? `Allergies: ${profile.allergies}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type DemoStage = "idle" | "consent" | "active" | "summary";
type ConversationSpeaker = "Doctor" | "Patient" | "MedsBuddy";
type SpeakerMode = "Auto" | "Doctor" | "Patient";
type SpeakerDetectionSource = "elevenlabs_label" | "local_rules" | "llm";
type SpeakerClassification = {
  speaker: ConversationSpeaker;
  confidence: number;
  reason: string;
  source: SpeakerDetectionSource;
};
type ConversationMessage = {
  speaker: ConversationSpeaker;
  text: string;
  speakerConfidence?: number;
  speakerReason?: string;
  speakerSource?: SpeakerDetectionSource;
};
type DoctorVisitConsent = "pending" | "granted" | "declined";
type AdvocateAlertTopic =
  | "patient-symptom-clarification"
  | "dizziness-after-medication"
  | "missed-medication-doses"
  | "medication-side-effects"
  | "care-plan-warning-signs"
  | "follow-up-timing"
  | "diagnosis-explanation";
type AdvocateAlert = { topic: AdvocateAlertTopic; response: string };
type AdvocateIntent =
  | "direct_call"
  | "patient_history_request"
  | "medication_history_request"
  | "sleep_history_request"
  | "visit_summary_request"
  | "warning_signs_request"
  | "doctor_answers_request"
  | "care_plan_instruction"
  | "normal_conversation"
  | "none";
type SemanticIntentDecision = {
  speaker: "doctor" | "patient" | "medsbuddy" | "unknown";
  intent: AdvocateIntent;
  shouldRespond: boolean;
  response: string;
};
type VisitSummaryData = {
  visitSummary: string;
  diagnosis: string;
  medicationChanges: string;
  followUpInstructions: string;
  nextAppointmentQuestions: string;
  patientConcerns: string;
  doctorAssessment: string;
  medsBuddyQuestions: string;
  doctorAnswers: string;
  medicationGuidance: string;
  warningSigns: string;
  followUpPlan: string;
  simpleExplanation: string;
  caregiverSummary: string;
};

const WAKE_WORD_PATTERN =
  /\b(?:(?:hey|okay|ok|hello|hi)\s+)?(?:meds\s*buddy|medz\s*buddy|medsbuddy|medbuddy|miss\s*buddy|mrs\s*buddy|matt'?s?\s*body|meds\s*body|miss\s*body|it'?s\s*buddy|made\s+his\s+body)\b/i;
const ADVOCATE_ALERT_COOLDOWN_MS = 8000;

function cleanSpeechToTextTranscript(text: string): string {
  let cleaned = text.replace(/\s+/g, " ").trim();

  // Common STT cleanup for the live doctor demo. This runs before speaker detection,
  // so a bad transcript like "listen to how is your leg pain" can still be
  // classified as Doctor instead of Patient.
  const replacements: Array<[RegExp, string]> = [
    [/\bvicente\b/gi, "Vasanthi"],
    [/\bvasanthi\b/gi, "Vasanthi"],
    [/\blike\s+banks\b/gi, "leg pain"],
    [/\blike\s+paints\b/gi, "leg pain"],
    [/\blight\s+banks\b/gi, "leg pain"],
    [/\blake\s+pain\b/gi, "leg pain"],
    [/\bleg\s+paints\b/gi, "leg pain"],
    [/\blike\s+pain\b/gi, "leg pain"],
    [/^listen to how is your leg pain[?.]?$/i, "How is your leg pain?"],
    [/^listen to how is your (.+)$/i, "How is your $1?"],
    [/^no i don't have like paints[.]?$/i, "No, I don't have leg pain."],
    [/^i know i don't have any like banks[.]?$/i, "No, I don't have any leg pain."],
  ];

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned
    .replace(/\s+([?.!,])/g, "$1")
    .replace(/\?\?+/g, "?")
    .trim();
}

function cleanTranscriptInput(text: string): string {
  return cleanSpeechToTextTranscript(text.replace(/^\s*(doctor|patient|medsbuddy)\s*:\s*/i, ""));
}

function normalizeTranscriptText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function splitIntoPhrases(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+|;\s*/)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

function removeDuplicateRepeatedPhrases(text: string): string {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (const phrase of splitIntoPhrases(text)) {
    const key = normalizeTranscriptText(phrase);
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
  }
  return phrases.join(" ");
}

function isLowValueTranscript(text: string): boolean {
  const clean = normalizeTranscriptText(text)
    .replace(/[^\w\s]/g, "")
    .trim();
  if (!clean) return true;
  if (/^(doctor|patient|medsbuddy|say doctor|a doctor|the doctor)$/.test(clean)) return true;
  if (/^\d+\s*(a\s*)?doctor$/.test(clean)) return true;
  return clean.split(/\s+/).length < 3 && !WAKE_WORD_PATTERN.test(clean);
}

function getTranscriptDelta(currentTranscript: string, lastProcessedTranscript: string): string {
  const current = currentTranscript.trim();
  const previous = lastProcessedTranscript.trim();
  if (!previous) return current;
  if (normalizeTranscriptText(current) === normalizeTranscriptText(previous)) return "";
  if (current.startsWith(previous)) return current.slice(previous.length).trim();
  return current;
}

function parseTranscriptMessages(
  transcript: string,
  selectedSpeaker: SpeakerMode,
  existingMessages: ConversationMessage[] = [],
): ConversationMessage[] {
  const clean = transcript.trim();
  if (!clean) return [];
  const speakerPattern = /(Doctor|Patient|MedsBuddy)\s*:/gi;
  const matches = [...clean.matchAll(speakerPattern)];
  if (!matches.length) {
    const cleanedText = removeDuplicateRepeatedPhrases(clean);
    if (selectedSpeaker !== "Auto") {
      return [{ speaker: selectedSpeaker, text: cleanedText }];
    }

    const turns = splitTranscriptIntoPossibleTurns(cleanedText);
    const messages: ConversationMessage[] = [];
    for (const turn of turns) {
      const context = [...existingMessages, ...messages];
      const classification = classifySpeakerFromTranscript(turn, context);
      messages.push({
        speaker: classification.speaker,
        text: turn,
        speakerConfidence: classification.confidence,
        speakerReason: classification.reason,
        speakerSource: classification.source,
      });
    }
    return messages;
  }

  const messages: ConversationMessage[] = [];
  for (const [index, match] of matches.entries()) {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? clean.length;
    const text = removeDuplicateRepeatedPhrases(clean.slice(start, end));
    if (!text) continue;
    const matchedSpeaker = match[1] as ConversationSpeaker;
    const classification = classifySpeakerFromTranscript(
      text,
      [...existingMessages, ...messages],
      matchedSpeaker,
    );
    messages.push({
      speaker: classification.speaker,
      text,
      speakerConfidence: classification.confidence,
      speakerReason: classification.reason,
      speakerSource: classification.source,
    });
  }
  return messages;
}

function splitTranscriptIntoPossibleTurns(text: string): string[] {
  const phrases = splitIntoPhrases(text);
  if (phrases.length > 1) return phrases;

  return text
    .replace(
      /\b(doctor|patient|medsbuddy)\b\s*/gi,
      (match) => `\n${match.replace(/\s+/g, " ").trim()} `,
    )
    .split(/\n+/)
    .map((turn) => turn.trim())
    .filter((turn) => turn.split(/\s+/).length >= 3 || WAKE_WORD_PATTERN.test(turn));
}

function semanticSpeakerToConversationSpeaker(
  speaker: SemanticIntentDecision["speaker"],
): ConversationSpeaker | null {
  if (speaker === "doctor") return "Doctor";
  if (speaker === "patient") return "Patient";
  if (speaker === "medsbuddy") return "MedsBuddy";
  return null;
}

function lastMedsBuddyQuestionWasForDoctor(messages: ConversationMessage[]): boolean {
  const lastMessage = [...messages].reverse().find((message) => message.speaker !== "Patient");
  if (lastMessage?.speaker !== "MedsBuddy") return false;
  return /\b(doctor|could you|can you|should she|should he|warning signs?|follow[-\s]?up|urgent care|medical attention|on .* behalf|please clarify|please confirm)\b/i.test(
    lastMessage.text,
  );
}

function looksLikeDoctorAnswerToMedsBuddy(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  return /\b(yes|no|correct|that's right|that is right|i recommend|she should|he should|the patient should|seek|urgent care|immediate medical attention|emergency|monitor|follow up|follow-up|come back|continue|start|stop|take|drink|hydrate|blood pressure|medication|side effects?|symptoms occur|watch for)\b/i.test(
    clean,
  );
}

function classifySpeakerFromTranscript(
  text: string,
  existingMessages: ConversationMessage[],
  hintedSpeaker?: ConversationSpeaker,
): SpeakerClassification {
  const clean = normalizeTranscriptText(text);
  const withoutWakeWord = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
  const recentHumanMessages = [...existingMessages]
    .reverse()
    .filter((message) => message.speaker === "Doctor" || message.speaker === "Patient");
  const recentHumanMessage = recentHumanMessages[0];
  const previousHumanMessage = recentHumanMessages[1];

  // If MedsBuddy just asked the doctor a clarification question, the next clinical answer
  // is usually the doctor. This fixes lines like "Yes, seek immediate medical attention"
  // being mislabeled as Patient.
  if (
    lastMedsBuddyQuestionWasForDoctor(existingMessages) &&
    looksLikeDoctorAnswerToMedsBuddy(text)
  ) {
    return {
      speaker: "Doctor",
      confidence: 0.96,
      reason:
        "MedsBuddy just asked the doctor a clarification question and this is medical guidance.",
      source: "local_rules",
    };
  }

  // Strong doctor/request/exam-question cues. These should be Doctor even without wake word.
  if (
    /\b(can you|could you|please|give me|show me|tell me|pull up|what medications|what medicine|patient history|medical history|medication history|current meds?|last dose|adherence|summary|main concern|chief complaint|warning signs|follow[-\s]?up plan|how is your|how are your|are you having|do you have|any chest pain|difficulty breathing|what brings you|when did|where is your pain)\b/i.test(
      withoutWakeWord,
    )
  ) {
    return {
      speaker: "Doctor",
      confidence: 0.92,
      reason: "Doctor-style request, exam question, medication question, or follow-up question.",
      source: "local_rules",
    };
  }

  if (
    /\b(i|i'm|i am|i’ve|i have|me|my|mine)\b/i.test(withoutWakeWord) &&
    /\b(have|had|feel|feeling|get|getting|missed|took|taking|hurt|hurts|pain|fever|dizzy|dizziness|tired|fatigue|nausea|vomit|headache|back pain|leg pain|sick|weak|worse|better|sleep|sleeping)\b/i.test(
      withoutWakeWord,
    )
  ) {
    return {
      speaker: "Patient",
      confidence: 0.9,
      reason: "First-person symptom, pain, feeling, or medication-experience statement.",
      source: "local_rules",
    };
  }

  if (
    /\b(pain|fever|dizzy|dizziness|tired|fatigue|nausea|vomit|headache|back pain|leg pain|sick|weak|symptom|symptoms)\b/i.test(
      withoutWakeWord,
    ) &&
    !/\b(what|when|how|does she|does he|is she|is he|patient history|give me|show me|tell me|check|seek|urgent care|medical attention|warning signs|symptoms occur|monitor|follow up|follow-up)\b/i.test(
      withoutWakeWord,
    )
  ) {
    return {
      speaker: "Patient",
      confidence: 0.82,
      reason: "Symptom report without doctor-style question or care-plan language.",
      source: "local_rules",
    };
  }

  if (/^patient\b/i.test(clean)) {
    return {
      speaker: "Patient",
      confidence: 0.78,
      reason: "Transcript explicitly starts with patient.",
      source: "local_rules",
    };
  }
  if (WAKE_WORD_PATTERN.test(text) || looksLikeDoctorRequestForMedsBuddy(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.84,
      reason: "MedsBuddy was called or the sentence requests advocate help.",
      source: "local_rules",
    };
  }

  if (recentHumanMessage?.speaker === "Doctor") {
    if (looksLikeDoctorQuestionToPatient(recentHumanMessage.text)) {
      return {
        speaker: "Patient",
        confidence: 0.72,
        reason: "Previous doctor message was a question to the patient.",
        source: "local_rules",
      };
    }
    if (previousHumanMessage?.speaker === "Patient" && looksLikeDoctorCarePlanInstruction(text)) {
      return {
        speaker: "Doctor",
        confidence: 0.78,
        reason: "Care-plan instruction after patient response.",
        source: "local_rules",
      };
    }
  }

  if (
    recentHumanMessage?.speaker === "Patient" &&
    (looksLikeDoctorCarePlanInstruction(text) || looksLikeDoctorQuestionToPatient(text))
  ) {
    return {
      speaker: "Doctor",
      confidence: 0.78,
      reason: "Doctor-style care-plan instruction or question after patient response.",
      source: "local_rules",
    };
  }

  if (
    /\b(take|continue|stop|start|prescribe|prescribed|schedule|follow up|follow-up|come back|urgent care|emergency|medical attention|seek care|seek immediate|warning signs|blood pressure|antibiotic|amoxicillin|dose|twice|daily|every day|how long|when did|what brings|symptoms|history|medication|monitor|recommend)\b/i.test(
      clean,
    )
  ) {
    return {
      speaker: "Doctor",
      confidence: 0.82,
      reason: "Diagnosis, medication instruction, warning sign, or follow-up language.",
      source: "local_rules",
    };
  }

  if (/\?$/.test(clean)) {
    return {
      speaker: "Doctor",
      confidence: 0.74,
      reason: "Question mark suggests doctor question.",
      source: "local_rules",
    };
  }

  if (hintedSpeaker && hintedSpeaker !== "MedsBuddy") {
    return {
      speaker: hintedSpeaker,
      confidence: 0.68,
      reason: "ElevenLabs diarization label used as a hint; local rules were inconclusive.",
      source: "elevenlabs_label",
    };
  }

  if (recentHumanMessage?.speaker) {
    return {
      speaker: recentHumanMessage.speaker,
      confidence: 0.58,
      reason: "Local rules were inconclusive; using recent conversation flow.",
      source: "local_rules",
    };
  }

  return {
    speaker: "Patient",
    confidence: 0.52,
    reason: "Local rules were inconclusive; defaulting to Patient.",
    source: "local_rules",
  };
}

function inferSpeakerFromTranscript(
  text: string,
  existingMessages: ConversationMessage[],
): ConversationSpeaker {
  return classifySpeakerFromTranscript(text, existingMessages).speaker;
}

function looksLikeDoctorQuestionToPatient(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  return (
    /\?$/.test(clean) ||
    /\b(what brings|how are you|how have you|how long|when did|are you taking|do you have|any fever|any pain|tell me|describe|where is|does it|is it|have you)\b/i.test(
      clean,
    )
  );
}

function dedupeConversation(messages: ConversationMessage[]): ConversationMessage[] {
  const seen = new Set<string>();
  const cleanMessages: ConversationMessage[] = [];
  for (const message of messages) {
    const text = removeDuplicateRepeatedPhrases(message.text);
    const key = `${message.speaker}:${normalizeTranscriptText(text)}`;
    if (!text || seen.has(key)) continue;
    seen.add(key);
    cleanMessages.push({ ...message, text });
  }
  return cleanMessages;
}

function conversationToTranscript(messages: ConversationMessage[]): string {
  return dedupeConversation(messages)
    .map((row) => `${row.speaker}: ${row.text}`)
    .join("\n");
}

function getSpeakerLines(messages: ConversationMessage[], speaker: ConversationSpeaker): string[] {
  return dedupeConversation(messages)
    .filter((message) => message.speaker === speaker)
    .map((message) => message.text);
}

function joinLines(lines: string[], fallback: string): string {
  const clean = lines.map(removeDuplicateRepeatedPhrases).filter(Boolean);
  return clean.length ? clean.join(" ") : fallback;
}

function getPatientConcernText(messages: ConversationMessage[]): string {
  return joinLines(
    getSpeakerLines(messages, "Patient"),
    "No patient concerns have been captured yet.",
  );
}

function getDoctorAnswerText(messages: ConversationMessage[]): string {
  return joinLines(
    getSpeakerLines(messages, "Doctor"),
    "No doctor response has been captured yet.",
  );
}

function getWarningSignText(messages: ConversationMessage[]): string {
  const warningLines = getSpeakerLines(messages, "Doctor").filter((line) =>
    /warning|urgent|emergency|103|chest pain|shortness of breath|severe|faint|confusion|worse|worsen/i.test(
      line,
    ),
  );
  return joinLines(
    warningLines,
    "Warning signs have not been discussed yet. MedsBuddy can ask the doctor to clarify them.",
  );
}

function getLastMedicationText(state: ReturnType<typeof useApp.getState>): string {
  const lastDose = [...state.doses].sort((a, b) => b.at - a.at)[0];
  if (lastDose) {
    return `${lastDose.medName} was last marked ${lastDose.status} on ${new Date(lastDose.at).toLocaleString()}.`;
  }
  const firstMedication = state.meds[0];
  if (firstMedication) {
    return `${state.meds.map((med) => `${med.name} ${med.dosage}, ${med.frequency}`).join("; ")}. I do not have enough recent dose history recorded yet to determine adherence or missed doses.`;
  }
  return "I do not see any medication or recent dose history recorded yet.";
}

function getSleepHistoryText(state: ReturnType<typeof useApp.getState>): string {
  const sleepNotes = [
    ...state.symptoms
      .filter((symptom) =>
        /sleep|insomnia|tired|fatigue|drows/i.test(`${symptom.name} ${symptom.notes ?? ""}`),
      )
      .map((symptom) => `${symptom.name}${symptom.notes ? `: ${symptom.notes}` : ""}`),
    ...state.notes
      .filter((note) => /sleep|insomnia|tired|fatigue|drows/i.test(note.text))
      .map((note) => note.text),
  ];
  if (sleepNotes.length) {
    return `Sleep-related notes I found: ${sleepNotes.slice(0, 2).join(" ")}`;
  }
  return "I do not see a sleep concern recorded yet. Doctor, you may want to ask how many hours she slept, whether sleep was interrupted, and whether medication made her drowsy.";
}

function getPatientHistoryText(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, symptoms } = state;
  const history = [
    profile.conditions ? `Conditions: ${profile.conditions}.` : "",
    profile.allergies ? `Allergies: ${profile.allergies}.` : "",
    meds.length
      ? `Current medications: ${meds.map((m) => `${m.name} ${m.dosage}`).join(", ")}.`
      : "No medications are listed.",
    symptoms.length
      ? `Recent symptoms include ${symptoms
          .slice(-4)
          .map((s) => s.name)
          .join(", ")}.`
      : "No recent symptoms are logged.",
  ].filter(Boolean);
  return history.join(" ");
}

function looksLikeDoctorCarePlanInstruction(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  if (/give me|tell me|show me|patient history|history|details|information/.test(clean)) {
    return false;
  }
  return /(?:i will|i'll|we will|start|prescrib|give (?:her|him|the patient|you)|take|continue|stop|finish|schedule|follow up|follow-up|twice|daily|every day|amoxicillin|antibiotic|mg|tablet|capsule)/i.test(
    clean,
  );
}

function buildCarePlanAcknowledgement(text: string): string {
  const instruction = cleanTranscriptInput(text)
    .replace(WAKE_WORD_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return `Understood, Doctor. I captured this care instruction: ${instruction}. Please confirm the dose, timing, and duration so I can summarize it clearly for the patient.`;
}

const AI = {
  detectIntent({
    text,
    speaker,
    advocateActive,
  }: {
    text: string;
    speaker?: ConversationSpeaker;
    advocateActive: boolean;
  }): AdvocateIntent {
    const calledMedsBuddy = WAKE_WORD_PATTERN.test(text);
    const doctorCanRequest = speaker === "Doctor";
    const clean = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));

    if (doctorCanRequest && looksLikeDoctorCarePlanInstruction(clean)) {
      return "care_plan_instruction";
    }

    if (
      doctorCanRequest &&
      /\b(history|background|previous|record|information|details)\b/i.test(clean)
    ) {
      return "patient_history_request";
    }

    if (
      doctorCanRequest &&
      /\b(last medication|last medicine|medication|medicine|dose|taking|took|current meds?|prescription)\b/i.test(
        clean,
      )
    ) {
      return "medication_history_request";
    }

    if (doctorCanRequest && /\b(sleep|sleeping|slept|drowsy|tired|fatigue)\b/i.test(clean)) {
      return "sleep_history_request";
    }

    if (
      doctorCanRequest &&
      /\b(summari[sz]e|main concerns?|chief complaint|recap)\b/i.test(clean)
    ) {
      return "visit_summary_request";
    }

    if (doctorCanRequest && /\b(warning signs?|urgent care|emergency|seek care)\b/i.test(clean)) {
      return "warning_signs_request";
    }

    if (
      doctorCanRequest &&
      /\b(doctor.*say|answer|care plan|follow[-\s]?up|instructions?|what did you capture)\b/i.test(
        clean,
      )
    ) {
      return "doctor_answers_request";
    }

    if (calledMedsBuddy) return "direct_call";

    // After visit consent, MedsBuddy should understand natural doctor requests
    // from the conversation context. It should not require the doctor to say
    // "MedsBuddy" every time. Normal conversation still returns none.
    return "none";
  },
};

function buildIntentResponse(
  intent: AdvocateIntent,
  text: string,
  messages: ConversationMessage[],
  state: ReturnType<typeof useApp.getState>,
): string | null {
  switch (intent) {
    case "patient_history_request":
      return `Yes, Doctor. On Vasanthi's behalf, here is the relevant patient history: ${getPatientHistoryText(state)}`;
    case "medication_history_request":
      return `Yes, Doctor. On Vasanthi's behalf, here is the medication context I found: ${getLastMedicationText(state)}`;
    case "sleep_history_request":
      return `Yes, Doctor. On Vasanthi's behalf, here is the sleep context: ${getSleepHistoryText(state)}`;
    case "visit_summary_request":
      return `Yes, Doctor. On Vasanthi's behalf, the main concerns captured so far are: ${getPatientConcernText(messages)}`;
    case "warning_signs_request":
      return `Doctor, for Vasanthi's safety, the warning signs captured so far are: ${getWarningSignText(messages)}`;
    case "doctor_answers_request":
      return `Doctor, here is what I captured from your guidance so far: ${getDoctorAnswerText(messages)}`;
    case "care_plan_instruction":
      return buildCarePlanAcknowledgement(text);
    case "direct_call":
      return "Yes, Doctor. I am listening and can speak on Vasanthi's behalf. What would you like to know?";
    case "normal_conversation":
      return null;
    case "none":
      return null;
  }
}

function isFastLocalIntent(intent: AdvocateIntent): boolean {
  return (
    intent === "direct_call" ||
    intent === "patient_history_request" ||
    intent === "medication_history_request" ||
    intent === "sleep_history_request" ||
    intent === "visit_summary_request" ||
    intent === "warning_signs_request" ||
    intent === "doctor_answers_request" ||
    intent === "care_plan_instruction"
  );
}

async function detectSemanticIntentWithLLM({
  latestTranscript,
  currentTranscript,
  patientContext,
  state,
}: {
  latestTranscript: string;
  currentTranscript: string;
  patientContext: string;
  state: ReturnType<typeof useApp.getState>;
}): Promise<SemanticIntentDecision | null> {
  const medicationHistory =
    state.meds.map((med) => `${med.name} ${med.dosage} (${med.frequency})`).join("; ") ||
    "No medications listed.";
  const doseHistory =
    state.doses
      .slice(0, 8)
      .map((dose) => `${dose.medName}: ${dose.status} at ${new Date(dose.at).toLocaleString()}`)
      .join("; ") || "No recent dose history.";
  const previousVisitSummaries =
    state.visits
      .slice(0, 3)
      .map((visit) => `${new Date(visit.at).toLocaleDateString()}: ${visit.summary}`)
      .join("\n") || "No previous visit summaries.";

  try {
    const { reply } = await aiChat({
      data: {
        messages: [
          {
            role: "system",
            content: [
              "You are the semantic intent engine for MedsBuddy, an AI Patient Advocate in a live doctor visit.",
              "Do not behave like a wake-word assistant. Understand natural language and the visit context.",
              "After consent is granted, doctor requests should be understood even when the doctor does not say MedsBuddy.",
              "MedsBuddy's job is to speak directly to the doctor on behalf of the patient when it would help the patient's care or understanding.",
              "When shouldRespond is true, write the response as spoken words MedsBuddy would say out loud in the exam room.",
              "Prefer doctor-facing advocacy phrasing such as: Doctor, Vasanthi would like to clarify... or Doctor, on Vasanthi's behalf...",
              "Return ONLY compact valid JSON. No markdown. No explanation.",
              '{"speaker":"doctor|patient|medsbuddy|unknown","intent":"patient_history_request|medication_history_request|sleep_history_request|visit_summary_request|warning_signs_request|doctor_answers_request|care_plan_instruction|direct_call|normal_conversation|none","shouldRespond":true|false,"response":"short spoken response or empty string"}',
              "Speaker rules: doctor usually asks questions, gives diagnosis, medication instructions, warning signs, and follow-up. Patient usually reports symptoms, pain, feelings, and medication experience.",
              "If MedsBuddy just asked the doctor a clarification question, the next medical guidance should usually be speaker doctor.",
              "Set shouldRespond true only when MedsBuddy should speak now. Do not require a wake word if the doctor is clearly asking for patient history, medications, symptoms, summary, warning signs, or care-plan clarification.",
              "If the doctor asks for patient history in any wording, intent is patient_history_request.",
              "If the doctor asks for meds, dose, last medication, current prescriptions, or adherence, intent is medication_history_request.",
              "If the doctor asks for summary/main concerns/what has been happening, intent is visit_summary_request.",
              "If the patient reports a concerning symptom and the doctor has not yet clarified cause, severity, medication relation, warning signs, or next steps, shouldRespond true with a brief doctor-facing clarification question.",
              "If the doctor gives instructions without timing, side effects, warning signs, or follow-up details, shouldRespond true with a brief doctor-facing clarification question.",
              "If conversation is normal doctor-patient talk, shouldRespond false and intent normal_conversation.",
              "If MedsBuddy should answer, keep response under 25 words. Do not overtalk.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Patient context:\n${patientContext}`,
              `Medication history:\n${medicationHistory}`,
              `Dose history:\n${doseHistory}`,
              `Previous visit summaries:\n${previousVisitSummaries}`,
              `Current visit transcript:\n${currentTranscript || "No transcript yet."}`,
              `Latest transcript message:\n${latestTranscript}`,
            ].join("\n\n"),
          },
        ],
      },
    });
    return parseSemanticIntentDecision(reply);
  } catch {
    return null;
  }
}

function parseSemanticIntentDecision(reply: string): SemanticIntentDecision | null {
  const jsonText = reply.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Partial<SemanticIntentDecision>;
    const intent = normalizeAdvocateIntent(parsed.intent);
    if (!intent) return null;
    const speaker =
      parsed.speaker === "doctor" ||
      parsed.speaker === "patient" ||
      parsed.speaker === "medsbuddy" ||
      parsed.speaker === "unknown"
        ? parsed.speaker
        : "unknown";
    return {
      speaker,
      intent,
      shouldRespond: Boolean(parsed.shouldRespond),
      response: typeof parsed.response === "string" ? parsed.response.trim() : "",
    };
  } catch {
    return null;
  }
}

function normalizeAdvocateIntent(intent: unknown): AdvocateIntent | null {
  const value = String(intent ?? "").trim() as AdvocateIntent;
  const allowed = new Set<AdvocateIntent>([
    "direct_call",
    "patient_history_request",
    "medication_history_request",
    "sleep_history_request",
    "visit_summary_request",
    "warning_signs_request",
    "doctor_answers_request",
    "care_plan_instruction",
    "normal_conversation",
    "none",
  ]);
  return allowed.has(value) ? value : null;
}

function looksLikeDoctorRequestForMedsBuddy(text: string): boolean {
  return (
    AI.detectIntent({
      text,
      speaker: "Doctor",
      advocateActive: true,
    }) !== "none"
  );
}

function analyzeTranscriptForAdvocateAlert(
  transcript: string,
  patientContext: string,
): AdvocateAlert | null {
  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const latestLine = [...lines].reverse().find((line) => /^(Doctor|Patient):/i.test(line));
  if (!latestLine) return null;

  const [, rawSpeaker = "", rawText = ""] = latestLine.match(/^(Doctor|Patient):\s*(.+)$/i) ?? [];
  const speaker = rawSpeaker as "Doctor" | "Patient";
  const latest = normalizeTranscriptText(rawText);
  const full = normalizeTranscriptText(transcript);
  const patientName = getPatientFirstName(patientContext);

  if (
    speaker === "Patient" &&
    /\b(fever|pain|dizzy|dizziness|fatigue|tired|weak|nausea|vomit|headache|back|leg|chest|shortness of breath)\b/i.test(
      latest,
    ) &&
    !/\b(warning signs?|urgent care|side effects?|follow up|follow-up|why|because|could be|related)\b/i.test(
      full,
    )
  ) {
    return {
      topic: "patient-symptom-clarification",
      response: `Doctor, on ${patientName}'s behalf, could you clarify what might be causing these symptoms, what she should watch for, and when she should seek urgent care?`,
    };
  }

  if (
    speaker === "Patient" &&
    /\b(dizzy|dizziness|lightheaded|light headed)\b/i.test(latest) &&
    /\b(after|evening|when|taking|took|medication|medicine|pill|dose)\b/i.test(latest)
  ) {
    return {
      topic: "dizziness-after-medication",
      response: `Doctor, ${patientName} would like to clarify whether the evening dizziness could be related to medication timing, blood pressure changes, or side effects.`,
    };
  }

  if (
    speaker === "Patient" &&
    /\b(missed|forgot|skipped|did not take|didn't take)\b/i.test(latest) &&
    /\b(dose|doses|medication|medicine|pill|antibiotic)\b/i.test(latest)
  ) {
    return {
      topic: "missed-medication-doses",
      response: `Doctor, should ${patientName} restart the missed doses, continue the remaining course, or follow a different plan?`,
    };
  }

  if (
    speaker === "Doctor" &&
    /\b(follow up|follow-up|come back|see me again|see us again|later)\b/i.test(latest) &&
    !/\b(tomorrow|today|in \d+|within \d+|next week|this week|\d+\s*(day|days|week|weeks|month|months)|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
      latest,
    )
  ) {
    return {
      topic: "follow-up-timing",
      response: `Doctor, could you clarify when ${patientName} should follow up and what symptoms should make her seek urgent care sooner?`,
    };
  }

  if (
    speaker === "Doctor" &&
    looksLikeDoctorCarePlanInstruction(latest) &&
    /\b(medication|medicine|pill|dose|antibiotic|amoxicillin|tablet|capsule|take|continue|start|finish)\b/i.test(
      latest,
    ) &&
    !/\b(side effect|side effects|watch for|dizzy|dizziness|rash|nausea|vomit|diarrhea|allergic|reaction)\b/i.test(
      latest,
    ) &&
    !/\b(side effect|side effects)\b/i.test(full)
  ) {
    return {
      topic: "medication-side-effects",
      response: `Doctor, could you explain the most important side effects or medication reactions ${patientName} should watch for?`,
    };
  }

  if (
    speaker === "Doctor" &&
    /\b(continue|monitor|hydrate|hydration|rest|care plan|plan|instructions|take|finish|start)\b/i.test(
      latest,
    ) &&
    !/\b(warning signs?|urgent care|emergency|seek care|call us|go to the er|chest pain|shortness of breath|severe|worse|worsening|faint)\b/i.test(
      latest,
    ) &&
    !/\b(warning signs?|urgent care|emergency|seek care|go to the er)\b/i.test(full)
  ) {
    return {
      topic: "care-plan-warning-signs",
      response: `Doctor, what warning signs should make ${patientName} seek urgent care or call your office?`,
    };
  }

  if (
    speaker === "Doctor" &&
    /\b(diagnosis|diagnosed|you have|it is|it's|looks like|infection|viral|bacterial|flu|pneumonia|strep|uti)\b/i.test(
      latest,
    ) &&
    !/\b(means|in simple terms|simple terms|because|explain|caused by|this happens)\b/i.test(latest)
  ) {
    return {
      topic: "diagnosis-explanation",
      response: `Doctor, could you explain that diagnosis in simple patient-friendly terms for ${patientName}?`,
    };
  }

  return null;
}

function getPatientFirstName(patientContext: string): string {
  const match = patientContext.match(/Patient:\s*([^.\s]+)/i);
  return match?.[1] || "the patient";
}

function buildDoctorConsentMessage(): ConversationMessage {
  return {
    speaker: "MedsBuddy",
    text: "Hello Doctor. I am MedsBuddy, Vasanthi's AI Patient Advocate. With the patient's permission, I would like to speak on her behalf, listen during today's visit, record this conversation, and create a visit summary for her after the appointment. Do I have your consent to participate?",
  };
}

function buildVisitOpeningMessages(): ConversationMessage[] {
  return [
    {
      speaker: "MedsBuddy",
      text: "Thank you, Doctor. Vasanthi has been experiencing a fever around 101.3°F, evening dizziness after taking medication, fatigue, and leg and lower back pain for the past four to five days. She is concerned these symptoms may be related to medication timing or side effects.",
    },
    {
      speaker: "MedsBuddy",
      text: "I will continue listening and may briefly speak directly to you on Vasanthi's behalf if she needs an important clarification. You can also ask me for patient history, medication details, symptom timeline, or previous visit information at any time.",
    },
  ];
}

function buildSummaryFromTranscript(messages: ConversationMessage[]): VisitSummaryData {
  const transcript = normalizeTranscriptText(conversationToTranscript(messages));
  const includes = (pattern: RegExp) => pattern.test(transcript);
  const patientLines = getSpeakerLines(messages, "Patient");
  const doctorLines = getSpeakerLines(messages, "Doctor");
  const medsBuddyLines = getSpeakerLines(messages, "MedsBuddy");
  const patientConcernText = getPatientConcernText(messages);
  const doctorAnswerText = getDoctorAnswerText(messages);
  const warningSignText = getWarningSignText(messages);
  const medicationFacts = [
    includes(/missed.*dose|missed.*medication|missed.*medicine/) && "missed doses",
    includes(/antibiotic/) && "antibiotic use",
    includes(/blood pressure/) && "blood pressure medication or blood pressure changes",
    includes(/side effect/) && "possible side effects",
  ].filter(Boolean);
  const followUpLines = doctorLines.filter((line) =>
    /follow[-\s]?up|continue|monitor|schedule|hydration|instructions|next step|plan/i.test(line),
  );
  const diagnosisLines = doctorLines.filter((line) =>
    /diagnos|you have|looks like|infection|viral|bacterial|flu|pneumonia|strep|uti|concern|assessment/i.test(
      line,
    ),
  );
  const visitSummaryText = patientLines.length
    ? `Patient discussed: ${patientConcernText} Doctor guidance captured: ${doctorAnswerText}`
    : "MedsBuddy captured the doctor visit conversation and generated a structured summary.";
  const diagnosisText = diagnosisLines.length
    ? diagnosisLines.join(" ")
    : "No diagnosis was clearly discussed during this visit.";
  const medicationChangesText = medicationFacts.length
    ? `Medication discussion included ${medicationFacts.join(", ")}. Follow the doctor's medication instructions from the visit.`
    : "No clear medication changes were captured.";
  const followUpText = followUpLines.length
    ? followUpLines.join(" ")
    : "No specific follow-up instructions were captured. Ask the doctor when to follow up and what symptoms should prompt urgent care.";
  const nextQuestions = [
    !diagnosisLines.length && "What is the likely diagnosis or main concern?",
    !medicationFacts.length &&
      "Are there any medication changes, side effects, or missed-dose instructions?",
    !followUpLines.length && "When should the patient follow up?",
    warningSignText.includes("not been discussed") &&
      "What warning signs should prompt urgent care?",
  ].filter(Boolean);

  return {
    visitSummary: visitSummaryText,
    diagnosis: diagnosisText,
    medicationChanges: medicationChangesText,
    followUpInstructions: followUpText,
    nextAppointmentQuestions: nextQuestions.length
      ? nextQuestions.join(" ")
      : "No additional next-appointment questions were identified from this visit.",
    patientConcerns: patientLines.length
      ? patientConcernText
      : "Patient concerns were discussed during the visit.",
    doctorAssessment: doctorLines.length
      ? doctorAnswerText
      : "No doctor assessment was captured yet.",
    medsBuddyQuestions: medsBuddyLines.length
      ? medsBuddyLines.join(" ")
      : "MedsBuddy did not need to ask an additional question.",
    doctorAnswers: doctorLines.length ? doctorAnswerText : "No doctor answers were captured.",
    medicationGuidance: medicationChangesText,
    warningSigns: warningSignText,
    followUpPlan: followUpText,
    simpleExplanation: patientLines.length
      ? `The visit focused on: ${patientConcernText} The doctor said: ${doctorAnswerText}`
      : "MedsBuddy summarized the visit conversation and doctor instructions.",
    caregiverSummary: patientLines.length
      ? `Patient concerns: ${patientConcernText} Doctor guidance: ${doctorAnswerText}`
      : "Share the visit summary with a caregiver so they can help monitor next steps.",
  };
}

function buildSpokenVisitSummary(summary: VisitSummaryData): string {
  return [
    "Here is your visit summary.",
    summary.visitSummary,
    summary.diagnosis && !summary.diagnosis.startsWith("No diagnosis")
      ? `Diagnosis discussed: ${summary.diagnosis}`
      : "",
    summary.medicationChanges && !summary.medicationChanges.startsWith("No clear")
      ? `Medication guidance: ${summary.medicationChanges}`
      : "",
    summary.warningSigns && !summary.warningSigns.includes("not been discussed")
      ? `Warning signs: ${summary.warningSigns}`
      : "",
    summary.followUpInstructions && !summary.followUpInstructions.startsWith("No specific")
      ? `Follow up: ${summary.followUpInstructions}`
      : "Please ask the doctor when to follow up and what warning signs should prompt urgent care.",
    "This is a summary to help you remember the visit. Follow your doctor's instructions.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function DoctorPage() {
  const state = useApp();
  const { profile, meds, doses, symptoms, appointments, addSummary, addVisit, addNote } = state;
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<DemoStage>("idle");
  const [patientConsent, setPatientConsent] = useState(false);
  const [doctorConsent, setDoctorConsent] = useState(false);
  const [patientSummaryApproved, setPatientSummaryApproved] = useState(false);
  const [doctorVisitConsent, setDoctorVisitConsent] = useState<DoctorVisitConsent>("pending");
  const [summarySaved, setSummarySaved] = useState(false);
  const [visitMessages, setVisitMessages] = useState<ConversationMessage[]>([]);
  const [wakeStatus, setWakeStatus] = useState("MedsBuddy is listening");
  const [simulatedTranscript, setSimulatedTranscript] = useState("");
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [summarySpeaking, setSummarySpeaking] = useState(false);
  const [advocateActive, setAdvocateActive] = useState(false);
  const [visitSummary, setVisitSummary] = useState<VisitSummaryData>(() =>
    buildSummaryFromTranscript([]),
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const visitMessagesRef = useRef<ConversationMessage[]>([]);
  const voiceSpeakingRef = useRef(false);
  const advocateActiveRef = useRef(false);
  const spokenMedsBuddyKeysRef = useRef<Set<string>>(new Set());
  const alertedTopicsRef = useRef<Set<AdvocateAlertTopic>>(new Set());
  const lastAdvocateAlertAtRef = useRef(0);
  const semanticRequestIdRef = useRef(0);
  const patientSummary = useMemo(() => buildPatientSummary(state), [state]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    visitMessagesRef.current = visitMessages;
  }, [visitMessages]);

  useEffect(() => {
    advocateActiveRef.current = advocateActive;
  }, [advocateActive]);

  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const recentSymptoms = symptoms.filter((s) => s.at >= last7);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];

  const startVisit = () => {
    setPatientConsent(false);
    setDoctorConsent(false);
    setPatientSummaryApproved(false);
    setStage("consent");
  };

  const beginVisit = () => {
    addSummary(patientSummary);
    stopSpeaking();
    spokenMedsBuddyKeysRef.current.clear();
    alertedTopicsRef.current.clear();
    lastAdvocateAlertAtRef.current = 0;
    setDoctorVisitConsent("pending");
    setVisitMessages([buildDoctorConsentMessage()]);
    setVisitSummary(buildSummaryFromTranscript([]));
    setWakeStatus("Waiting for doctor consent");
    setSimulatedTranscript("");
    setLastProcessedTranscript("");
    setSummarySaved(false);
    setAdvocateActive(false);
    setStage("active");
    toast.success("AI Patient Advocate visit started");
  };

  useEffect(() => {
    if (stage !== "active") return;

    const unsaidMessages = visitMessages.filter((message, index) => {
      if (message.speaker !== "MedsBuddy") return false;
      const key = `${index}:${normalizeTranscriptText(message.text)}`;
      if (spokenMedsBuddyKeysRef.current.has(key)) return false;
      spokenMedsBuddyKeysRef.current.add(key);
      return true;
    });

    if (!unsaidMessages.length) return;

    const textToSpeak = unsaidMessages.map((message) => message.text).join(" ");
    voiceSpeakingRef.current = true;
    recognitionRef.current?.stop();
    setVoiceListening(false);
    setVoiceSpeaking(true);
    void speak(textToSpeak, () => {
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
    }).catch(() => {
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
    });
  }, [stage, visitMessages]);

  const handleDoctorConsents = () => {
    const openingMessages = buildVisitOpeningMessages();
    setDoctorVisitConsent("granted");
    setWakeStatus("MedsBuddy is listening");
    // Once doctor consent is granted, MedsBuddy can respond from conversation context
    // without requiring the doctor to repeat the wake word.
    setAdvocateActive(true);
    advocateActiveRef.current = true;
    setVisitMessages((messages) => dedupeConversation([...messages, ...openingMessages]));
    setVisitSummary(buildSummaryFromTranscript(openingMessages));
  };

  const handleDoctorDeclines = () => {
    setDoctorVisitConsent("declined");
    setWakeStatus("Doctor did not consent");
    setVisitMessages((messages) =>
      dedupeConversation([
        ...messages,
        {
          speaker: "MedsBuddy",
          text: "Understood. MedsBuddy will not participate in this visit or record the conversation.",
        },
      ]),
    );
  };

  const addTranscriptMessages = useCallback(
    (transcript: string, speaker: SpeakerMode): boolean => {
      if (!transcript.trim() || isLowValueTranscript(transcript)) return false;

      const cleanedTranscript = cleanSpeechToTextTranscript(transcript);
      if (process.env.NODE_ENV !== "production") {
        console.log("RAW_STT_TRANSCRIPT:", transcript);
        console.log("CLEANED_STT_TRANSCRIPT:", cleanedTranscript);
      }

      const currentMessages = visitMessagesRef.current;
      const parsedMessages = parseTranscriptMessages(cleanedTranscript, speaker, currentMessages)
        .map((message) => ({
          ...message,
          text: cleanTranscriptInput(message.text),
        }))
        .filter((message) => !isLowValueTranscript(message.text));
      if (!parsedMessages.length) return false;
      for (const message of parsedMessages) {
        console.info("[MedsBuddy speaker detection]", {
          rawTranscript: transcript,
          cleanedTranscript,
          messageText: message.text,
          detectedSpeaker: message.speaker,
          confidence: message.speakerConfidence ?? null,
          source: message.speakerSource ?? "local_rules",
          reason: message.speakerReason ?? "No speaker reason recorded.",
        });
      }

      const nextMessages = dedupeConversation([...currentMessages, ...parsedMessages]);
      visitMessagesRef.current = nextMessages;
      setVisitMessages(nextMessages);
      setWakeStatus("MedsBuddy is understanding the conversation");

      const latestMessage = parsedMessages[parsedMessages.length - 1];
      const latestText = parsedMessages.map((message) => message.text).join(" ");
      const latestTurnText = latestMessage?.text ?? latestText;
      const latestSpeaker = latestMessage?.speaker;
      const latestSpeakerConfidence = latestMessage?.speakerConfidence ?? 0.75;
      const needsLlmSpeakerClassification = latestSpeakerConfidence < 0.72;
      const requestId = semanticRequestIdRef.current + 1;
      semanticRequestIdRef.current = requestId;
      const currentTranscript = conversationToTranscript(nextMessages);
      const fastIntent = AI.detectIntent({
        text: latestText,
        speaker: latestSpeaker,
        advocateActive: advocateActiveRef.current,
      });
      const fastResponse =
        !needsLlmSpeakerClassification &&
        isFastLocalIntent(fastIntent) &&
        buildIntentResponse(fastIntent, latestText, nextMessages, state);

      if (fastResponse) {
        if (fastIntent === "direct_call") {
          setAdvocateActive(true);
          advocateActiveRef.current = true;
        }
        setWakeStatus(
          fastIntent === "direct_call"
            ? "MedsBuddy was called"
            : "MedsBuddy answered from patient context",
        );
        setVisitMessages((messages) => {
          const withResponse = dedupeConversation([
            ...messages,
            { speaker: "MedsBuddy", text: fastResponse },
          ]);
          visitMessagesRef.current = withResponse;
          return withResponse;
        });
        return true;
      }

      const fastAlert = analyzeTranscriptForAdvocateAlert(currentTranscript, patientSummary);
      const now = Date.now();
      if (
        !needsLlmSpeakerClassification &&
        fastAlert &&
        !alertedTopicsRef.current.has(fastAlert.topic) &&
        now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
      ) {
        alertedTopicsRef.current.add(fastAlert.topic);
        lastAdvocateAlertAtRef.current = now;
        setWakeStatus("MedsBuddy noticed a clarification");
        setVisitMessages((messages) => {
          const withAlert = dedupeConversation([
            ...messages,
            { speaker: "MedsBuddy", text: fastAlert.response },
          ]);
          visitMessagesRef.current = withAlert;
          return withAlert;
        });
        return true;
      }

      void (async () => {
        const semanticDecision = await detectSemanticIntentWithLLM({
          latestTranscript: `${latestSpeaker}: ${latestText}`,
          currentTranscript,
          patientContext: patientSummary,
          state,
        });
        if (requestId !== semanticRequestIdRef.current) return;
        if (semanticDecision) {
          console.info("[MedsBuddy LLM speaker/intent classification]", {
            rawTranscript: transcript,
            cleanedTranscript,
            messageText: latestTurnText,
            previousSpeaker: latestSpeaker,
            localConfidence: latestSpeakerConfidence,
            llmSpeaker: semanticDecision.speaker,
            intent: semanticDecision.intent,
            shouldRespond: semanticDecision.shouldRespond,
          });
        }

        const fallbackIntent = AI.detectIntent({
          text: latestText,
          speaker: latestSpeaker,
          advocateActive: advocateActiveRef.current,
        });

        const decision: SemanticIntentDecision = semanticDecision ?? {
          speaker: latestSpeaker
            ? (latestSpeaker.toLowerCase() as SemanticIntentDecision["speaker"])
            : "unknown",
          intent: fallbackIntent,
          shouldRespond: fallbackIntent !== "none" && fallbackIntent !== "normal_conversation",
          response: "",
        };
        const correctedSpeaker = semanticSpeakerToConversationSpeaker(decision.speaker);
        const ignorePatientCorrectionAfterMedsBuddyQuestion =
          correctedSpeaker === "Patient" &&
          latestSpeaker === "Doctor" &&
          lastMedsBuddyQuestionWasForDoctor(visitMessagesRef.current) &&
          looksLikeDoctorAnswerToMedsBuddy(latestTurnText);

        if (
          correctedSpeaker &&
          correctedSpeaker !== "MedsBuddy" &&
          latestSpeaker &&
          correctedSpeaker !== latestSpeaker &&
          !ignorePatientCorrectionAfterMedsBuddyQuestion
        ) {
          setVisitMessages((messages) => {
            const lastIndex = messages.findLastIndex(
              (message) => message.speaker === latestSpeaker && message.text === latestTurnText,
            );
            if (lastIndex < 0) return messages;
            const corrected = [...messages];
            corrected[lastIndex] = { ...corrected[lastIndex], speaker: correctedSpeaker };
            visitMessagesRef.current = corrected;
            return corrected;
          });
        }

        if (decision.intent === "direct_call") {
          setAdvocateActive(true);
          advocateActiveRef.current = true;
        }

        const localIntentResponse = buildIntentResponse(
          decision.intent,
          latestText,
          visitMessagesRef.current,
          state,
        );
        const shouldPreferLocalResponse =
          decision.intent === "medication_history_request" ||
          decision.intent === "patient_history_request" ||
          /\b0 percent|zero taken|zero missed\b/i.test(decision.response);

        const intentResponse =
          decision.shouldRespond &&
          (shouldPreferLocalResponse
            ? localIntentResponse
            : decision.response || localIntentResponse);

        if (intentResponse) {
          setWakeStatus(
            decision.intent === "direct_call"
              ? "MedsBuddy was called"
              : "MedsBuddy is answering the doctor",
          );
          setVisitMessages((messages) => {
            const withResponse = dedupeConversation([
              ...messages,
              { speaker: "MedsBuddy", text: intentResponse },
            ]);
            visitMessagesRef.current = withResponse;
            return withResponse;
          });
        } else {
          const alert = analyzeTranscriptForAdvocateAlert(
            conversationToTranscript(visitMessagesRef.current),
            patientSummary,
          );
          const now = Date.now();
          if (
            alert &&
            !alertedTopicsRef.current.has(alert.topic) &&
            now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
          ) {
            alertedTopicsRef.current.add(alert.topic);
            lastAdvocateAlertAtRef.current = now;
            setWakeStatus("MedsBuddy noticed a clarification");
            setVisitMessages((messages) => {
              const withAlert = dedupeConversation([
                ...messages,
                { speaker: "MedsBuddy", text: alert.response },
              ]);
              visitMessagesRef.current = withAlert;
              return withAlert;
            });
          } else {
            setWakeStatus(
              advocateActiveRef.current
                ? "MedsBuddy is ready for follow-up questions"
                : "MedsBuddy is listening",
            );
          }
        }
      })();

      return true;
    },
    [patientSummary, state],
  );

  const handleSimulatedTranscript = () => {
    const delta = getTranscriptDelta(simulatedTranscript, lastProcessedTranscript);
    const added = addTranscriptMessages(delta, "Auto");
    if (!added) return;
    setLastProcessedTranscript(simulatedTranscript.trim());
    setSimulatedTranscript("");
  };

  useEffect(() => {
    if (!mounted) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(Recognition));

    if (
      stage !== "active" ||
      doctorVisitConsent !== "granted" ||
      voiceSpeaking ||
      voiceSpeakingRef.current ||
      !Recognition
    ) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setVoiceListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const finalText: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) finalText.push(result[0].transcript);
      }
      const transcript = finalText.join(" ").trim();
      if (transcript) {
        addTranscriptMessages(transcript, "Auto");
      }
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setWakeStatus("Microphone permission is blocked");
        toast.error("Microphone permission is blocked. Use the transcript box instead.");
      }
    };

    recognition.onend = () => {
      if (stage === "active" && doctorVisitConsent === "granted" && !voiceSpeakingRef.current) {
        try {
          recognition.start();
          setVoiceListening(true);
        } catch {
          setVoiceListening(false);
        }
      }
    };

    try {
      recognition.start();
      setVoiceListening(true);
    } catch {
      setVoiceListening(false);
    }

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [addTranscriptMessages, doctorVisitConsent, mounted, stage, voiceSpeaking]);

  const endVisit = () => {
    const cleanedMessages = dedupeConversation(visitMessages);
    const cleanedSummary = buildSummaryFromTranscript(cleanedMessages);
    setVisitSummary(cleanedSummary);
    if (!summarySaved) {
      addVisit({
        doctor: upcoming?.doctor || "Demo doctor",
        specialty: upcoming?.specialty || "Primary care",
        summary: cleanedSummary.visitSummary,
        patientSummary,
        topicsDiscussed: cleanedSummary.patientConcerns,
        diagnosisOrConcerns: cleanedSummary.diagnosis,
        medicationChanges: cleanedSummary.medicationChanges,
        actionItems: cleanedSummary.followUpInstructions,
        questionsAnswered: cleanedSummary.doctorAnswers,
        carePlan: cleanedSummary.nextAppointmentQuestions,
        notes: conversationToTranscript(cleanedMessages),
      });
      addNote(`AI Patient Advocate follow-up: ${cleanedSummary.followUpInstructions}`);
      setSummarySaved(true);
    }
    setStage("summary");
    toast.success("AI Patient Advocate summary ready");
  };

  const speakVisitSummary = () => {
    stopSpeaking();
    const spokenSummary = buildSpokenVisitSummary(visitSummary);
    setSummarySpeaking(true);
    void speak(spokenSummary, () => setSummarySpeaking(false)).catch(() => {
      setSummarySpeaking(false);
      toast.error("Voice summary is not available in this browser.");
    });
  };

  if (!mounted) {
    return (
      <div className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 min-h-[180px]" />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Stethoscope className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-80 font-medium">AI Patient Advocate</div>
            <h1 className="text-primary-foreground text-2xl">AI Patient Advocate</h1>
          </div>
        </div>
        {stage !== "idle" && (
          <p className="text-sm opacity-90 mt-3">
            MedsBuddy listens after consent, speaks directly to the doctor on behalf of the patient
            when clinically useful, lets the doctor respond, and summarizes the whole visit.
          </p>
        )}
      </motion.div>

      <>
        <AIAdvocateDemo
          stage={stage}
          patientSummary={patientSummary}
          messages={visitMessages}
          wakeStatus={wakeStatus}
          simulatedTranscript={simulatedTranscript}
          onSimulatedTranscriptChange={setSimulatedTranscript}
          onSubmitTranscript={handleSimulatedTranscript}
          onStartVisit={startVisit}
          onEndVisit={endVisit}
          doctorVisitConsent={doctorVisitConsent}
          onDoctorConsents={handleDoctorConsents}
          onDoctorDeclines={handleDoctorDeclines}
          voiceSupported={voiceSupported}
          voiceListening={voiceListening}
          voiceSpeaking={voiceSpeaking}
        />

        {stage === "summary" && (
          <VisitSummary
            summary={visitSummary}
            onSpeakSummary={speakVisitSummary}
            summarySpeaking={summarySpeaking}
          />
        )}

        {stage !== "idle" && (
          <>
            <Section icon={FileText} title="AI Patient Advocate patient snapshot" tint="primary">
              <p className="text-[14px] leading-relaxed text-muted-foreground">{patientSummary}</p>
            </Section>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricSection
                icon={Pill}
                title="Medications"
                value={`${adh}%`}
                label="7-day adherence"
              >
                {meds.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No medications listed.</div>
                ) : (
                  <ul className="space-y-1.5 text-[14px]">
                    {meds.slice(0, 4).map((m) => (
                      <li
                        key={m.id}
                        className="flex justify-between gap-3 border-t pt-1.5 first:border-0"
                      >
                        <span className="font-medium">
                          {m.name}{" "}
                          <span className="text-muted-foreground font-normal">{m.dosage}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">{m.frequency}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </MetricSection>

              <Section icon={Activity} title="Recent symptoms" tint="warning">
                {recentSymptoms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">None reported this week.</div>
                ) : (
                  <ul className="space-y-1.5 text-[14px]">
                    {recentSymptoms.slice(0, 4).map((s) => (
                      <li
                        key={s.id}
                        className="flex justify-between gap-3 border-t pt-1.5 first:border-0"
                      >
                        <span className="capitalize font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">Severity {s.severity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            <Section icon={Calendar} title="AI Patient Advocate appointment" tint="success">
              {upcoming ? (
                <div>
                  <div className="font-medium text-[15px]">{upcoming.doctor}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(upcoming.at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Visit ready without an appointment.
                </div>
              )}
            </Section>
          </>
        )}
      </>

      {stage === "consent" && (
        <ConsentModal
          patientSummary={patientSummary}
          patientConsent={patientConsent}
          doctorConsent={doctorConsent}
          patientSummaryApproved={patientSummaryApproved}
          onPatientConsentChange={setPatientConsent}
          onDoctorConsentChange={setDoctorConsent}
          onPatientSummaryApprovedChange={setPatientSummaryApproved}
          onBeginVisit={beginVisit}
          onClose={() => setStage("idle")}
        />
      )}
    </>
  );
}

function AIAdvocateDemo({
  stage,
  patientSummary,
  messages,
  wakeStatus,
  simulatedTranscript,
  onSimulatedTranscriptChange,
  onSubmitTranscript,
  onStartVisit,
  onEndVisit,
  doctorVisitConsent,
  onDoctorConsents,
  onDoctorDeclines,
  voiceSupported,
  voiceListening,
  voiceSpeaking,
}: {
  stage: DemoStage;
  patientSummary: string;
  messages: ConversationMessage[];
  wakeStatus: string;
  simulatedTranscript: string;
  onSimulatedTranscriptChange: (value: string) => void;
  onSubmitTranscript: () => void;
  onStartVisit: () => void;
  onEndVisit: () => void;
  doctorVisitConsent: DoctorVisitConsent;
  onDoctorConsents: () => void;
  onDoctorDeclines: () => void;
  voiceSupported: boolean;
  voiceListening: boolean;
  voiceSpeaking: boolean;
}) {
  const active = stage === "active";
  const visitCanListen = doctorVisitConsent === "granted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      {stage === "idle" && (
        <>
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">Patient context</div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{patientSummary}</p>
          </div>
          <button
            onClick={onStartVisit}
            className="w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant"
          >
            <Sparkles className="size-6" /> Start Live Visit
          </button>
        </>
      )}

      {active && (
        <>
          <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 mb-3 flex items-center gap-3">
            <span className="relative grid place-items-center size-10 rounded-full bg-primary/20">
              {visitCanListen && (
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              )}
              <Mic className="size-5 text-primary relative" />
            </span>
            <div>
              <div className="font-semibold text-primary">{wakeStatus}</div>
              <div className="text-[12px] text-muted-foreground">
                {!visitCanListen
                  ? voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : doctorVisitConsent === "declined"
                      ? "MedsBuddy is not participating because the doctor did not consent."
                      : "MedsBuddy is waiting for the doctor's consent before listening."
                  : voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : voiceSupported
                      ? voiceListening
                        ? "Microphone is listening. MedsBuddy will speak to the doctor for the patient when needed."
                        : "Microphone is not active yet. Use the transcript box if permission is blocked."
                      : "This browser does not support speech recognition. Use the transcript box below."}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">
              AI Patient Advocate patient context
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{patientSummary}</p>
          </div>
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                Start speaking. MedsBuddy will label the speaker automatically.
              </div>
            ) : (
              messages.map((row, index) => (
                <ConversationRow
                  key={`${row.speaker}-${index}`}
                  speaker={row.speaker}
                  text={row.text}
                />
              ))
            )}
          </div>
          {doctorVisitConsent === "pending" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={onDoctorConsents}
                className="rounded-2xl bg-primary text-primary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor consents
              </button>
              <button
                onClick={onDoctorDeclines}
                className="rounded-2xl bg-secondary text-secondary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor does not consent
              </button>
            </div>
          )}
          {visitCanListen && (
            <div className="mt-4 rounded-2xl border bg-background p-3">
              <label htmlFor="wake-transcript" className="text-[12px] font-semibold text-primary">
                Simulate live transcript
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="wake-transcript"
                  value={simulatedTranscript}
                  onChange={(e) => onSimulatedTranscriptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitTranscript();
                  }}
                  placeholder='Try: "Doctor, can you explain if this dizziness is from medication?"'
                  className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={onSubmitTranscript}
                  disabled={!simulatedTranscript.trim()}
                  className="rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Add to visit
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                MedsBuddy listens for clinical context and speaks to the doctor on the patient's
                behalf when an important clarification is missing.
              </p>
            </div>
          )}
          <button
            onClick={onEndVisit}
            className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="size-5" /> End Visit
          </button>
        </>
      )}

      {stage === "summary" && (
        <div className="rounded-2xl bg-success/10 border border-success/30 p-4 flex items-start gap-3">
          <div className="size-10 rounded-xl bg-success/20 text-success grid place-items-center shrink-0">
            <Check className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-success">AI Patient Advocate visit completed</div>
            <p className="text-[13px] text-muted-foreground mt-1">
              The structured visit summary is ready below and saved to patient history.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ConsentModal({
  patientSummary,
  patientConsent,
  doctorConsent,
  patientSummaryApproved,
  onPatientConsentChange,
  onDoctorConsentChange,
  onPatientSummaryApprovedChange,
  onBeginVisit,
  onClose,
}: {
  patientSummary: string;
  patientConsent: boolean;
  doctorConsent: boolean;
  patientSummaryApproved: boolean;
  onPatientConsentChange: (value: boolean) => void;
  onDoctorConsentChange: (value: boolean) => void;
  onPatientSummaryApprovedChange: (value: boolean) => void;
  onBeginVisit: () => void;
  onClose: () => void;
}) {
  const ready = patientConsent && doctorConsent && patientSummaryApproved;
  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-2xl gradient-hero grid place-items-center text-primary-foreground shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted-foreground font-medium">Consent required</div>
            <h2 className="text-[18px] font-semibold">Start AI Patient Advocate visit</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary grid place-items-center"
            aria-label="Close consent modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border bg-background p-4">
          <div className="text-[12px] font-semibold text-primary mb-1">
            Review patient summary before live visit
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{patientSummary}</p>
        </div>

        <div className="space-y-3 mt-4">
          <ConsentCheck
            checked={patientSummaryApproved}
            label="Patient approval: I reviewed this patient summary and approve MedsBuddy to use it during the live visit."
            onChange={onPatientSummaryApprovedChange}
          />
          <ConsentCheck
            checked={patientConsent}
            label="Patient consent: MedsBuddy may listen and speak on my behalf."
            onChange={onPatientConsentChange}
          />
          <ConsentCheck
            checked={doctorConsent}
            label="Doctor consent: MedsBuddy may participate in this visit."
            onChange={onDoctorConsentChange}
          />
        </div>

        <button
          onClick={onBeginVisit}
          disabled={!ready}
          className="mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold disabled:opacity-50"
        >
          {ready ? "Begin Live Visit" : "Approve summary and consent to continue"}
        </button>
      </motion.div>
    </div>
  );
}

function ConsentCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border bg-background p-4 text-[15px] font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-primary"
      />
      {label}
    </label>
  );
}

function ConversationRow({ speaker, text }: { speaker: string; text: string }) {
  const isAdvocate = speaker === "MedsBuddy";
  return (
    <div
      className={`rounded-xl border p-3 ${
        isAdvocate ? "bg-primary/5 border-primary/20" : "bg-background"
      }`}
    >
      <div
        className={`text-[12px] font-semibold ${isAdvocate ? "text-primary" : "text-muted-foreground"}`}
      >
        {speaker}
      </div>
      <div className="text-[14px] leading-relaxed mt-1">{text}</div>
    </div>
  );
}

function VisitSummary({
  summary,
  onSpeakSummary,
  summarySpeaking,
}: {
  summary: VisitSummaryData;
  onSpeakSummary: () => void;
  summarySpeaking: boolean;
}) {
  return (
    <Section icon={ClipboardList} title="Visit Summary" tint="success">
      <div className="space-y-3">
        <button
          onClick={onSpeakSummary}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Volume2 className="size-4" />
          {summarySpeaking ? "Speaking visit summary..." : "Speak Brief Summary"}
        </button>
        <SummaryBlock title="Visit summary" body={summary.visitSummary} />
        <SummaryBlock title="Diagnosis" body={summary.diagnosis} />
        <SummaryBlock title="Medication changes" body={summary.medicationChanges} />
        <SummaryBlock title="Follow-up instructions" body={summary.followUpInstructions} />
        <SummaryBlock
          title="Questions for next appointment"
          body={summary.nextAppointmentQuestions}
        />
        <SummaryBlock title="Patient concerns" body={summary.patientConcerns} />
        <SummaryBlock title="Doctor assessment" body={summary.doctorAssessment} />
        <SummaryBlock
          title="MedsBuddy questions asked on behalf of patient"
          body={summary.medsBuddyQuestions}
        />
        <SummaryBlock title="Doctor answers" body={summary.doctorAnswers} />
        <SummaryBlock title="Medication guidance" body={summary.medicationGuidance} />
        <SummaryBlock title="Warning signs" body={summary.warningSigns} />
        <SummaryBlock title="Follow-up plan" body={summary.followUpPlan} />
        <SummaryBlock
          title="Simple patient-friendly explanation"
          body={summary.simpleExplanation}
        />
        <SummaryBlock title="Caregiver share summary" body={summary.caregiverSummary} />
      </div>
    </Section>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-[12px] font-semibold text-primary mb-1">{title}</div>
      <div className="text-[14px] leading-relaxed">{body}</div>
    </div>
  );
}

function MetricSection({
  icon,
  title,
  value,
  label,
  children,
}: {
  icon: typeof Pill;
  title: string;
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Section icon={icon} title={title} tint="primary">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mb-3">{label}</div>
      {children}
    </Section>
  );
}

function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: typeof Pill;
  title: string;
  tint: "primary" | "success" | "warning";
  children: React.ReactNode;
}) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-8 rounded-lg grid place-items-center ${tintClass}`}>
          <Icon className="size-4" />
        </div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
