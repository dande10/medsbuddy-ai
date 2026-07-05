import { useApp, adherence } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import {
  analyzeTranscript,
  generateDoctorHandoff,
  generateVisitSummary,
  humanizePreVisitSummary,
  saveVisitMemory,
  transcribeAudio,
  type StructuredVisitSummary,
} from "@/lib/alibaba-api";
import {
  Activity,
  Calendar,
  Check,
  ClipboardList,
  FileText,
  Mic,
  Pill,
  Sparkles,
  Stethoscope,
  Volume2,
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
  const { profile, meds, doses, patientContext } = state;
  const last7 = Date.now() - 7 * 86400000;
  const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
  const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
  const structuredContext = {
    symptoms: [],
    medications: [],
    visitReason: "",
    onset: "",
    duration: "",
    patientNotes: [],
    concerns: [],
    questionsForDoctor: [],
    pregnancyContext: "",
    updatedAt: null,
    ...(patientContext ?? {}),
  };
  const medicationHistory =
    doses.length === 0
      ? "I don't have enough recent medication information yet."
      : [
          taken > 0 ? `${taken} dose${taken === 1 ? "" : "s"} marked as taken recently` : "",
          missed > 0
            ? `${missed} dose${missed === 1 ? "" : "s"} marked as missed or skipped recently`
            : "",
        ]
          .filter(Boolean)
          .join("; ") || "Recent medication details are limited.";
  const preVisitContext = normalizePreVisitContext(structuredContext, meds);

  return JSON.stringify(
    {
      instruction:
        "Generate today's patient-friendly pre-visit summary from this structured PatientContext. Do not use raw chat artifacts. Do not invent facts.",
      profile: {
        name: profile.name || "the patient",
        allergies: profile.allergies || "",
        conditions: profile.conditions || "",
      },
      patientContext: preVisitContext,
      savedMedications: preVisitContext.medications,
      medicationHistory,
    },
    null,
    2,
  );
}

function buildReadablePreVisitFallback(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, patientContext } = state;
  const rawContext = {
    symptoms: [],
    medications: [],
    visitReason: "",
    onset: "",
    duration: "",
    patientNotes: [],
    concerns: [],
    questionsForDoctor: [],
    ...(patientContext ?? {}),
  };
  const context = normalizePreVisitContext(rawContext, meds);
  const sections = [
    "Before today's appointment, here's what I'll share with your doctor after your approval.",
    `This summary is for ${profile.name || "the patient"}.`,
    "",
    "Reason for Visit",
    context.visitReason
      ? `- ${context.visitReason}`
      : "- Add the main reason for today's visit before sharing with the doctor.",
    "",
    "Current Symptoms",
    ...(context.symptoms.length
      ? context.symptoms.map((symptom) => `- ${symptom}`)
      : ["- No current symptoms captured from Talk yet."]),
    ...(context.onset || context.duration
      ? [
          "",
          "Timeline",
          ...(context.onset ? [`- Started: ${context.onset}`] : []),
          ...(context.duration ? [`- ${context.duration}`] : []),
        ]
      : []),
    "",
    "Current Medications",
    ...(context.medications.length
      ? context.medications.map((medication) => `- ${medication}`)
      : ["- I don't have enough recent medication information yet."]),
    ...(context.concerns.length
      ? ["", "Patient Concerns", ...context.concerns.map((concern) => `- ${concern}`)]
      : []),
    ...(context.questionsForDoctor.length
      ? [
          "",
          "Questions for Doctor",
          ...context.questionsForDoctor.map((question) => `- ${question}`),
        ]
      : []),
    ...(context.patientNotes.length
      ? ["", "Patient Notes", ...context.patientNotes.slice(0, 3).map((note) => `- ${note}`)]
      : []),
    ...(profile.allergies ? ["", "Allergies", `- ${profile.allergies}`] : []),
    ...(profile.conditions ? ["", "Existing Conditions", `- ${profile.conditions}`] : []),
  ];
  return sections.join("\n");
}

type PreVisitContextLike = {
  symptoms: string[];
  medications: string[];
  visitReason: string;
  onset: string;
  duration: string;
  patientNotes: string[];
  concerns: string[];
  questionsForDoctor: string[];
  pregnancyContext?: string;
  updatedAt?: number | null;
};

function normalizePreVisitContext(
  context: PreVisitContextLike,
  meds: ReturnType<typeof useApp.getState>["meds"],
): PreVisitContextLike {
  const symptoms = normalizePreVisitSymptoms(context.symptoms, context.patientNotes);
  const visitReason =
    context.visitReason?.trim() ||
    deriveReasonForVisit({
      ...context,
      symptoms,
    });
  const patientNotes = normalizePatientNotes(context.patientNotes, symptoms);

  return {
    ...context,
    symptoms,
    medications: normalizePreVisitMedications([
      ...context.medications,
      ...meds.map((med) =>
        [med.name, med.dosage, med.frequency].filter(Boolean).join(" ").replace(/\s+/g, " "),
      ),
    ]),
    visitReason,
    patientNotes,
  };
}

function deriveReasonForVisit(context: PreVisitContextLike): string {
  const combined = [
    ...context.symptoms,
    ...context.patientNotes,
    ...context.concerns,
    context.onset,
    context.duration,
  ].join(" ");

  if (
    /\buti\b|urinary tract infection|urinary infection|burning|discomfort.*urinating|urinating|urination/i.test(
      combined,
    )
  ) {
    return "Possible urinary tract infection symptoms.";
  }

  const clinicalDetails = [...context.symptoms, ...context.concerns, ...context.patientNotes]
    .map((item) =>
      item
        .replace(/^possible\s+/i, "")
        .replace(/\bsymptoms should be discussed with the doctor during the visit\.?$/i, "")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter(Boolean)
    .filter((item, index, items) => {
      const key = normalizeTranscriptText(item);
      return items.findIndex((candidate) => normalizeTranscriptText(candidate) === key) === index;
    })
    .slice(0, 4);

  if (!clinicalDetails.length) return "";

  const [primary, ...related] = clinicalDetails;
  const relatedText = related.length ? ` with ${formatNaturalList(related)}` : "";
  const timeline = context.duration || context.onset;
  const timelineText = timeline
    ? ` ${timeline
        .replace(/^started\s*/i, "starting ")
        .replace(/\.$/, "")
        .trim()}`
    : "";

  return `${primary}${relatedText}${timelineText}.`;
}

function formatNaturalList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function normalizePreVisitSymptoms(symptoms: string[], notes: string[]): string[] {
  const combined = [...symptoms, ...notes].join(" ");
  const output: string[] = [];
  if (
    /\buti\b|urinary tract infection|urinary infection|burning|discomfort.*urinating|urinating|urination/i.test(
      combined,
    )
  ) {
    output.push("Burning or discomfort while urinating.");
  }
  for (const symptom of symptoms) {
    const clean = symptom.trim().replace(/\.$/, "");
    if (!clean || /uti|urinary|urinating|urination|burning|discomfort/i.test(clean)) continue;
    output.push(`${clean}.`);
  }
  return Array.from(new Set(output));
}

function normalizePatientNotes(notes: string[], symptoms: string[]): string[] {
  const output = notes
    .map((note) => note.trim())
    .filter(Boolean)
    .filter((note) => !/burning|discomfort.*urinating|urinating|urination|uti/i.test(note));
  if (symptoms.length) {
    output.push("Symptoms should be discussed with the doctor during the visit.");
  }
  return Array.from(new Set(output));
}

function normalizePreVisitMedications(lines: string[]): string[] {
  const medsByKey = new Map<string, { name: string; frequency: string; dosage: string }>();
  for (const line of lines) {
    const parsed = parsePreVisitMedication(line);
    if (!parsed) continue;
    const existing = medsByKey.get(parsed.key);
    medsByKey.set(parsed.key, {
      name: parsed.name,
      dosage: existing?.dosage || parsed.dosage,
      frequency: existing?.frequency || parsed.frequency,
    });
  }
  return Array.from(medsByKey.values()).map((med) => {
    const suffix = [med.dosage, med.frequency].filter(Boolean).join(" — ");
    return suffix ? `${med.name} — ${suffix}` : med.name;
  });
}

function parsePreVisitMedication(line: string): {
  key: string;
  name: string;
  dosage: string;
  frequency: string;
} | null {
  const clean = line
    .replace(/\bstandard dose\b/gi, "")
    .replace(/\bone tablet\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const lower = clean.toLowerCase();
  const canonical = /\b(prenatal|prenatal vitamin)\b/i.test(lower)
    ? { key: "prenatal-vitamin", name: "Prenatal vitamin" }
    : /\b(vitamin\s*b12|b12|vb12)\b/i.test(lower)
      ? { key: "vitamin-b12", name: "Vitamin B12" }
      : /\b(vitamin\s*d|vitamin d3|d3)\b/i.test(lower)
        ? { key: "vitamin-d", name: "Vitamin D" }
        : null;
  if (!canonical) return null;
  const dosage = clean.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu)\b/i)?.[0] ?? "";
  const frequency = /\btwice\b|\b2 times\b|\btwo times\b/i.test(lower)
    ? "twice daily"
    : /\bonce\b|\b1 time\b|\bone time\b|\bdaily\b|\bevery day\b/i.test(lower)
      ? "once daily"
      : "";
  return { ...canonical, dosage, frequency };
}

function formatSymptomSeverity(severity: number): string {
  if (severity <= 3) return "Mild";
  if (severity <= 6) return "Moderate";
  return "Severe";
}

function cleanClinicalText(text: string): string {
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .replace(/\b(um|uh|like|you know|okay so|yeah|but yeah)\b/gi, " ")
        .replace(/\b(back pain.*?)\([^)]*\)/gi, "$1")
        .replace(/\bdiastolic the but\b/gi, "")
        .replace(/\bwhat happened yeah\b/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  return removeDuplicateRepeatedPhrases(lines.join("\n"));
}

function getPatientId(state: ReturnType<typeof useApp.getState>): string {
  return (
    state.profile.name
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "default-patient"
  );
}

function buildMedicationHistory(state: ReturnType<typeof useApp.getState>): string {
  const medicationHistory =
    state.meds.map((med) => `${med.name} ${med.dosage} (${med.frequency})`).join("; ") ||
    "No medications listed.";
  const doseHistory =
    state.doses
      .slice(0, 8)
      .map((dose) => `${dose.medName}: ${dose.status} at ${new Date(dose.at).toLocaleString()}`)
      .join("; ") || "No recent dose history.";
  return `${medicationHistory}\nRecent dose history: ${doseHistory}`;
}

type DemoStage = "idle" | "active" | "summary";
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
  | "diagnosis-explanation"
  | "closing-additional-questions";
type AdvocateAlert = { topic: AdvocateAlertTopic; response: string };
type VisitStage =
  | "patient_history"
  | "physical_assessment"
  | "diagnosis"
  | "treatment_plan"
  | "visit_closing";
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
const TRANSCRIPT_MERGE_DELAY_MS = 2600;
const STOP_TALKING_PATTERN =
  /\b(?:meds\s*buddy\s*)?(?:please\s+)?(?:stop talking|do not speak|don't speak|be quiet|stay quiet|stop speaking)\b/i;
const START_TALKING_PATTERN =
  /\b(?:meds\s*buddy\s*)?(?:please\s+)?(?:start talking|start speaking|you can speak now|speak now|talk now|you may speak)\b/i;

function getSupportedRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) ?? ""
  );
}

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
    [/\bmiss\s+buddy\b/gi, "MedsBuddy"],
    [/\bmrs\s+buddy\b/gi, "MedsBuddy"],
    [/\bmiss\s+body\b/gi, "MedsBuddy"],
    [/\bmeds\s+body\b/gi, "MedsBuddy"],
    [/\bariana\s+grande\b/gi, ""],
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
  const commandSplit = splitTranscriptByControlCommands(text);
  if (commandSplit.length > 1) return commandSplit;

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

function splitTranscriptByControlCommands(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const commandPattern = new RegExp(
    `${STOP_TALKING_PATTERN.source}|${START_TALKING_PATTERN.source}`,
    "gi",
  );
  const matches = [...normalized.matchAll(commandPattern)];
  if (!matches.length) return [normalized].filter(Boolean);

  const turns: string[] = [];
  let cursor = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    const command = match[0].trim();
    const before = normalized.slice(cursor, start).trim();
    if (before) turns.push(before);
    if (command) turns.push(command);
    cursor = start + match[0].length;
  }
  const after = normalized.slice(cursor).trim();
  if (after) {
    turns.push(
      ...after
        .split(
          /\b(?=(?:use|take|continue|start|stop|finish|give|prescribe)\b|\b(?:one|two|\d+)\s+(?:tablet|capsule|pill|dose)s?\b)/i,
        )
        .map((turn) => turn.trim())
        .filter(Boolean),
    );
  }
  return turns.filter(Boolean);
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

function looksLikePatientFirstPersonStatement(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  return (
    /\b(i|i'm|i am|i’ve|i've|i have|i had|me|my|mine)\b/i.test(clean) &&
    /\b(have|had|feel|feeling|get|getting|missed|took|taking|hurt|hurts|pain|fever|dizzy|dizziness|tired|fatigue|nausea|vomit|headache|back pain|leg pain|sick|weak|worse|better|sleep|sleeping)\b/i.test(
      clean,
    )
  );
}

function looksLikeDoctorHistoryOrPurposeQuestion(text: string): boolean {
  const clean = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
  if (looksLikePatientFirstPersonStatement(clean)) return false;

  return /\b(can you|could you|give me|tell me|what symptoms|which symptoms|any symptoms|symptoms today|tell me about (?:the )?patient'?s? symptoms|tell me (?:the )?patient'?s? symptoms|what medications|what medicines|current medications|current medicines|current meds?|recent medications|last medication|last medicine|purpose of visit|reason for visit|reason for today'?s? visit|reason for today visit|today'?s? visit reason|today visit reason|what is the reason|what's the reason|what brings|what brought|why are you here|why are you here today|patient history|medical history|medication history|recent history|tell me her history|tell me his history|tell me the history|what has been happening|what happened last visit|any allergies|allergies|allergic|conditions|diagnoses|previous visits?|last visits?|current concerns?|questions for (?:the )?doctor|how long|when did it start|medication adherence|adherence|taking.*medication|medications?.*symptoms?|symptoms?.*medications?)\b/i.test(
    clean,
  );
}

function looksLikePatientContextRequest(text: string): boolean {
  const clean = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
  if (looksLikePatientFirstPersonStatement(clean)) return false;

  const requestCue =
    /\b(can you|could you|give me|tell me|show me|summari[sz]e|what|which|any|current|list|pull up|do we have|does (?:she|he|the patient)|patient|what brings|how long|reason for today'?s? visit|reason for today visit|today'?s? visit reason|today visit reason)\b/i.test(
      clean,
    );
  const contextCue =
    /\b(medications?|medicines?|current medications?|current medicines?|symptoms?|reason for visit|reason for today'?s? visit|reason for today visit|today'?s? visit|today visit|purpose of visit|what brings|how long|when did it start|patient history|medical history|allergies|allergic|conditions?|diagnoses|previous visits?|last visits?|current concerns?|questions for (?:the )?doctor|adherence|dose history|missed doses?)\b/i.test(
      clean,
    );

  return requestCue && contextCue;
}

function isStopTalkingCommand(text: string): boolean {
  return STOP_TALKING_PATTERN.test(text);
}

function isStartTalkingCommand(text: string): boolean {
  return START_TALKING_PATTERN.test(text);
}

function isTalkingControlCommand(text: string): boolean {
  return isStopTalkingCommand(text) || isStartTalkingCommand(text);
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

  if (looksLikePatientContextRequest(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.97,
      reason:
        "Doctor-style request for approved patient context such as symptoms, medications, history, allergies, or concerns.",
      source: "local_rules",
    };
  }

  if (looksLikeDoctorHistoryOrPurposeQuestion(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.96,
      reason:
        "Doctor-style question asking for symptoms, medications, visit purpose, or patient history.",
      source: "local_rules",
    };
  }

  // Strong doctor/request/exam-question cues. These should be Doctor even without wake word.
  if (
    /\b(can you|could you|please|give me|show me|tell me|pull up|what medications|what medicine|recent medications|purpose of visit|why are you here today|patient history|medical history|medication history|current meds?|last dose|adherence|summary|main concern|chief complaint|warning signs|follow[-\s]?up plan|how is your|how are your|are you having|do you have|any chest pain|difficulty breathing|what brings you|when did|where is your pain)\b/i.test(
      withoutWakeWord,
    ) &&
    !looksLikePatientFirstPersonStatement(withoutWakeWord)
  ) {
    return {
      speaker: "Doctor",
      confidence: 0.92,
      reason: "Doctor-style request, exam question, medication question, or follow-up question.",
      source: "local_rules",
    };
  }

  if (looksLikePatientFirstPersonStatement(withoutWakeWord)) {
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

function mergeAdjacentConversationMessages(messages: ConversationMessage[]): ConversationMessage[] {
  const merged: ConversationMessage[] = [];
  for (const message of messages) {
    const text = removeDuplicateRepeatedPhrases(message.text).trim();
    if (!text) continue;
    const previous = merged[merged.length - 1];
    if (
      previous?.speaker === message.speaker &&
      message.speaker !== "MedsBuddy" &&
      !isTalkingControlCommand(previous.text) &&
      !isTalkingControlCommand(text)
    ) {
      previous.text = removeDuplicateRepeatedPhrases(`${previous.text} ${text}`);
      previous.speakerConfidence = Math.min(
        previous.speakerConfidence ?? 1,
        message.speakerConfidence ?? previous.speakerConfidence ?? 1,
      );
      previous.speakerReason = [previous.speakerReason, message.speakerReason]
        .filter(Boolean)
        .join(" ");
      continue;
    }
    merged.push({ ...message, text });
  }
  return merged;
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

function buildDoctorPatientContextAnswer(
  state: ReturnType<typeof useApp.getState>,
  approvedPreVisitSummary?: string,
): string {
  const { profile, meds, patientContext } = state;
  const rawContext = {
    symptoms: [],
    medications: [],
    visitReason: "",
    onset: "",
    duration: "",
    patientNotes: [],
    concerns: [],
    questionsForDoctor: [],
    ...(patientContext ?? {}),
  };
  const context = normalizePreVisitContext(rawContext, meds);
  const reason = context.visitReason || "The patient has not approved a reason for today yet.";
  const symptoms = context.symptoms.length
    ? context.symptoms
    : approvedPreVisitSummary
      ? [approvedPreVisitSummary.replace(/\s+/g, " ").slice(0, 120)]
      : ["No current symptoms captured yet."];
  const timeline =
    context.onset || context.duration
      ? [
          context.onset ? `Started ${context.onset.replace(/\.$/, "")}.` : "",
          context.duration ? context.duration.replace(/\.$/, ".") : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "";
  const medications = context.medications.length
    ? context.medications
    : ["No current medications are listed yet."];
  const allergies = profile.allergies
    ? `Allergies: ${profile.allergies}.`
    : "No known allergies have been recorded.";
  const conditions = profile.conditions ? `Conditions: ${profile.conditions}.` : "";

  return [
    "Yes, Doctor.",
    "",
    "Based on the patient's approved pre-visit summary:",
    "",
    "Reason for today's visit:",
    `• ${reason}`,
    "",
    "Current symptoms:",
    ...symptoms.slice(0, 3).map((symptom) => `• ${symptom.replace(/\.$/, ".")}`),
    ...(timeline ? [`• ${timeline}`] : []),
    "",
    "Current medications:",
    ...medications.slice(0, 4).map((medication) => `• ${medication.replace(/\.$/, ".")}`),
    "",
    allergies,
    conditions,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildPreviousVisitHistorySection(state: ReturnType<typeof useApp.getState>): string {
  const visitLines = state.visits
    .slice(0, 3)
    .map((visit) =>
      [
        visit.summary,
        visit.diagnosisOrConcerns ? `Diagnosis or concern: ${visit.diagnosisOrConcerns}` : "",
        visit.medicationChanges ? `Medication changes: ${visit.medicationChanges}` : "",
        visit.actionItems ? `Action items: ${visit.actionItems}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean);

  if (!visitLines.length) {
    return "Previous Visit History:\n• No previous visit history is saved yet.";
  }

  return [
    "Previous Visit History:",
    ...visitLines.map((line) => `• ${removeDuplicateRepeatedPhrases(line)}`),
  ].join("\n");
}

function shouldIncludePreviousVisitHistory(text: string): boolean {
  return getRequestedPatientContextFields(text).some((field) => field === "medical history");
}

type PatientContextRequestField =
  | "reason for visit"
  | "symptoms"
  | "medications"
  | "allergies"
  | "medical history"
  | "duration"
  | "concerns"
  | "questions for doctor";

function getRequestedPatientContextFields(text: string): PatientContextRequestField[] {
  const clean = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
  const fields = new Set<PatientContextRequestField>();

  if (
    /\b(reason for visit|reason for today'?s? visit|reason for today visit|today'?s? visit reason|today visit reason|what is the reason|what's the reason|purpose of visit|what brings|what brought|why (?:is|are).*(?:here|in)|chief complaint|main concern)\b/i.test(
      clean,
    )
  ) {
    fields.add("reason for visit");
  }
  if (/\b(symptoms?|pain|complaints?|what is she feeling|what is he feeling)\b/i.test(clean)) {
    fields.add("symptoms");
  }
  if (
    /\b(medications?|medicines?|current meds?|dose history|adherence|missed doses?)\b/i.test(clean)
  ) {
    fields.add("medications");
  }
  if (/\b(allergies|allergic)\b/i.test(clean)) {
    fields.add("allergies");
  }
  if (
    /\b(medical history|patient history|conditions?|diagnoses|previous visits?|last visits?)\b/i.test(
      clean,
    )
  ) {
    fields.add("medical history");
  }
  if (/\b(how long|duration|onset|when did it start|started when|timeline)\b/i.test(clean)) {
    fields.add("duration");
  }
  if (/\b(concerns?|worried|worries)\b/i.test(clean)) {
    fields.add("concerns");
  }
  if (
    /\b(questions? for (?:the )?doctor|patient questions?|anything she wants to ask|anything he wants to ask)\b/i.test(
      clean,
    )
  ) {
    fields.add("questions for doctor");
  }

  if (
    !fields.size &&
    /\b(patient details|patient information|patient context|approved summary|summary|handoff|tell me about (?:the )?patient|give me (?:the )?patient)\b/i.test(
      clean,
    )
  ) {
    fields.add("reason for visit");
    fields.add("symptoms");
    fields.add("medications");
  }

  return Array.from(fields);
}

function approvedContextHasField(
  field: PatientContextRequestField,
  state: ReturnType<typeof useApp.getState>,
): boolean {
  const context = normalizePreVisitContext(
    {
      symptoms: [],
      medications: [],
      visitReason: "",
      onset: "",
      duration: "",
      patientNotes: [],
      concerns: [],
      questionsForDoctor: [],
      ...(state.patientContext ?? {}),
    },
    state.meds,
  );

  switch (field) {
    case "reason for visit":
      return Boolean(context.visitReason?.trim());
    case "symptoms":
      return context.symptoms.length > 0;
    case "medications":
      return context.medications.length > 0;
    case "allergies":
      return Boolean(state.profile.allergies?.trim());
    case "medical history":
      return Boolean(
        state.profile.conditions?.trim() ||
        state.profile.allergies?.trim() ||
        state.visits.length ||
        context.visitReason?.trim() ||
        context.symptoms.length,
      );
    case "duration":
      return Boolean(context.onset?.trim() || context.duration?.trim());
    case "concerns":
      return context.concerns.length > 0;
    case "questions for doctor":
      return context.questionsForDoctor.length > 0;
  }
}

function getPatientClarificationQuestion(field: PatientContextRequestField): string {
  switch (field) {
    case "reason for visit":
      return "Vasanthi, what is the main reason for today's visit?";
    case "symptoms":
      return "Vasanthi, what symptoms would you like me to share with the doctor?";
    case "medications":
      return "Vasanthi, can you confirm your current medications and how often you take them?";
    case "allergies":
      return "Vasanthi, do you have any allergies I should record?";
    case "medical history":
      return "Vasanthi, are there any medical conditions or previous visit details you want me to share?";
    case "duration":
      return "Vasanthi, when did this start and how long has it been happening?";
    case "concerns":
      return "Vasanthi, what are you most concerned about today?";
    case "questions for doctor":
      return "Vasanthi, what questions would you like the doctor to answer today?";
  }
}

function buildMissingApprovedContextResponse(
  text: string,
  state: ReturnType<typeof useApp.getState>,
): string | null {
  const requestedFields = getRequestedPatientContextFields(text);
  if (!requestedFields.length) return null;

  const missingFields = requestedFields.filter((field) => !approvedContextHasField(field, state));
  if (!missingFields.length) return null;

  const missingText =
    missingFields.length === 1
      ? missingFields[0]
      : `${missingFields.slice(0, -1).join(", ")} and ${missingFields[missingFields.length - 1]}`;

  return [
    `Doctor, I do not have approved ${missingText} information yet.`,
    getPatientClarificationQuestion(missingFields[0]),
  ].join(" ");
}

function looksLikeDoctorCarePlanInstruction(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  if (/give me|tell me|show me|patient history|history|details|information/.test(clean)) {
    return false;
  }
  if (
    /\b(where does it hurt|where is the pain|how severe|does walking|does movement|when did|how long|what brings you|do you have|are you having|any pain|describe)\b/i.test(
      clean,
    )
  ) {
    return false;
  }
  return (
    /(?:i will|i'll|we will|start|prescrib|give (?:her|him|the patient|you)|take|continue|stop|finish|schedule|follow up|follow-up|twice|daily|every day|amoxicillin|antibiotic|mg|tablet|capsule)/i.test(
      clean,
    ) ||
    /\b(?:in|within|after)\s+(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\b/i.test(
      clean,
    ) ||
    /\b(?:if|watch for|seek care|urgent care|emergency|worsening|worse|warning signs?)\b/i.test(
      clean,
    )
  );
}

type MedicationInstructionDetails = {
  medication: string;
  dose: string;
  frequency: string;
  timing: string;
  duration: string;
  interval: string;
};

function mergeRecentDoctorCarePlan(messages: ConversationMessage[], fallbackText: string): string {
  const merged: string[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.speaker !== "Doctor" || !looksLikeDoctorCarePlanInstruction(message.text)) break;
    merged.unshift(message.text);
  }
  return (merged.length ? merged.join(" ") : fallbackText)
    .replace(WAKE_WORD_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectDoctorCarePlan(messages: ConversationMessage[], fallbackText: string): string {
  const doctorCarePlanLines = messages
    .filter((message) => message.speaker === "Doctor")
    .map((message) => message.text)
    .filter((line) => looksLikeDoctorCarePlanInstruction(line));
  const lines = [...doctorCarePlanLines, fallbackText]
    .map((line) => cleanTranscriptInput(line).replace(WAKE_WORD_PATTERN, " ").trim())
    .filter(Boolean);

  return removeDuplicateRepeatedPhrases(lines.slice(-8).join(" ")).replace(/\s+/g, " ").trim();
}

function extractMedicationInstructionDetails(text: string): MedicationInstructionDetails {
  const clean = cleanTranscriptInput(text).replace(WAKE_WORD_PATTERN, " ").replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const knownMedication = lower.match(
    /\b(amoxicillin|azithromycin|ibuprofen|acetaminophen|tylenol|advil|metformin|lisinopril|atorvastatin|omeprazole|antibiotic|[a-z]+(?:cillin|mycin|prazole|sartan|pril|statin))\b/i,
  )?.[0];
  const afterAction = lower.match(
    /\b(?:start|prescribe|prescribed|give|take|continue|finish|stop)\s+(?:her|him|the patient|you|the)?\s*([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/i,
  )?.[1];
  const dose =
    clean.match(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|tablets?|tabs?|capsules?|caps?|pills?|puffs?|drops?)\b/i,
    )?.[0] ||
    clean.match(
      /\b(?:one|two|three|four|five|[1-5])\s+(?:tablets?|tabs?|capsules?|caps?|pills?|doses?)\b/i,
    )?.[0];
  const interval = clean.match(/\b(?:every|q)\s*\d+\s*(?:hours?|hrs?|h|days?|d)\b/i)?.[0];
  const frequency = clean.match(
    /\b(?:once|twice|three times|four times|[1-4] times)\s+(?:a|per)\s+day\b|\b(?:daily|bid|tid|qid)\b/i,
  )?.[0];
  const timing = clean.match(
    /\b(?:morning|afternoon|evening|night|bedtime|breakfast|lunch|dinner|with food|after food|before food|with meals?|after meals?|before meals?|empty stomach)\b/i,
  )?.[0];
  const duration = clean.match(
    /\bfor\s+(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\b|\b(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\s*(?:course)?\b/i,
  )?.[0];

  return {
    medication: knownMedication || afterAction || "",
    dose: dose || "",
    frequency: frequency || "",
    timing: timing || "",
    duration: duration || "",
    interval: interval || "",
  };
}

function getMissingMedicationInstructionFields(details: MedicationInstructionDetails): string[] {
  return [
    isMissingMedicationName(details) && "medication name",
    !hasMedicationDose(details) && "dosage",
    !hasMedicationFrequency(details) && "frequency",
    !details.duration && "duration",
  ].filter(Boolean) as string[];
}

function carePlanKey(text: string, details: MedicationInstructionDetails): string {
  return normalizeTranscriptText(
    [
      details.medication,
      details.dose,
      details.frequency || details.interval,
      details.timing,
      details.duration,
      text,
    ]
      .filter(Boolean)
      .join(" "),
  ).slice(0, 180);
}

function isMissingMedicationName(details: MedicationInstructionDetails): boolean {
  return (
    !details.medication ||
    /\b(antibiotic|medication|medicine|tablet|tablets|capsule|capsules|pill|pills|those|that|these|this)\b/i.test(
      details.medication,
    )
  );
}

function hasMedicationDose(details: MedicationInstructionDetails): boolean {
  return Boolean(details.dose);
}

function hasMedicationFrequency(details: MedicationInstructionDetails): boolean {
  return Boolean(details.frequency || details.interval || details.timing);
}

function hasCarePlanFollowUp(messages: ConversationMessage[]): boolean {
  return messages.some(
    (message) =>
      message.speaker === "Doctor" &&
      /\b(follow up|follow-up|come back|return|see me|see us|appointment|schedule|check in|recheck|in (?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(days?|weeks?|months?)|next week|tomorrow)\b/i.test(
        message.text,
      ),
  );
}

function hasCarePlanWarningSigns(messages: ConversationMessage[]): boolean {
  return messages.some(
    (message) =>
      message.speaker === "Doctor" &&
      /\b(warning signs?|urgent care|emergency|er|seek care|call|worse|worsening|fever|chest pain|shortness of breath|difficulty breathing|faint|confusion|severe|rash|swelling)\b/i.test(
        message.text,
      ),
  );
}

function getCarePlanClarificationQuestion(
  missingFields: string[],
  instruction: string,
  messages: ConversationMessage[],
  handledCarePlanKeys?: Set<string>,
): string | null {
  const cleanInstruction = normalizeTranscriptText(instruction);
  const askOnce = (key: string, question: string) => {
    if (handledCarePlanKeys?.has(key)) return null;
    handledCarePlanKeys?.add(key);
    return question;
  };

  if (missingFields.includes("medication name")) {
    const key = "care-plan-ask:medication-name";
    if (/\bantibiotics?\b/i.test(cleanInstruction)) {
      return askOnce(key, "Doctor, could you confirm the antibiotic name?");
    }
    return askOnce(key, "Doctor, could you confirm the medication name?");
  }

  if (missingFields.includes("dosage")) {
    return askOnce("care-plan-ask:dosage", "Doctor, could you confirm the dose?");
  }

  if (missingFields.includes("frequency")) {
    return askOnce(
      "care-plan-ask:frequency",
      "Doctor, could you confirm how often the patient should take it?",
    );
  }

  if (missingFields.includes("duration")) {
    return askOnce(
      "care-plan-ask:duration",
      "Doctor, could you confirm how many days the patient should take it?",
    );
  }

  if (!hasCarePlanFollowUp(messages)) {
    return askOnce(
      "care-plan-ask:follow-up",
      "Doctor, when would you like the patient to schedule a follow-up appointment?",
    );
  }

  if (!hasCarePlanWarningSigns(messages)) {
    return askOnce(
      "care-plan-ask:warning-signs",
      "Doctor, are there any warning signs the patient should watch for?",
    );
  }

  return null;
}

function buildCarePlanAcknowledgement(
  text: string,
  messages: ConversationMessage[],
  handledCarePlanKeys?: Set<string>,
): string | null {
  const instruction = collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text));
  const details = extractMedicationInstructionDetails(instruction);
  const missingFields = getMissingMedicationInstructionFields(details);

  const hasUsableInstruction =
    Boolean(details.medication) ||
    Boolean(details.dose) ||
    Boolean(details.frequency) ||
    Boolean(details.interval) ||
    Boolean(details.timing) ||
    /\b(antibiotics?|tablet|capsule|pill|take|use|continue|finish)\b/i.test(instruction);
  if (!hasUsableInstruction) return null;

  const clarification = getCarePlanClarificationQuestion(
    missingFields,
    instruction,
    messages,
    handledCarePlanKeys,
  );
  if (clarification) return clarification;

  const key = carePlanKey(instruction, details);
  if (handledCarePlanKeys?.has(key)) return null;
  handledCarePlanKeys?.add(key);
  return "Thank you, Doctor. I’ve updated the patient’s care plan.";
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
    const clean = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
    const patientContextRequest = looksLikePatientContextRequest(clean);
    const doctorCanRequest = speaker === "Doctor" || patientContextRequest;

    if (doctorCanRequest && looksLikeDoctorCarePlanInstruction(clean)) {
      return "care_plan_instruction";
    }

    if (doctorCanRequest && patientContextRequest) {
      return "patient_history_request";
    }

    if (
      doctorCanRequest &&
      (looksLikeDoctorHistoryOrPurposeQuestion(clean) ||
        /\b(history|background|previous|record|information|details|purpose of visit|reason for visit|what brings|why are you here|what has been happening)\b/i.test(
          clean,
        ))
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
  handledCarePlanKeys?: Set<string>,
  approvedPreVisitSummary?: string,
): string | null {
  switch (intent) {
    case "patient_history_request": {
      const currentContextResponse =
        buildMissingApprovedContextResponse(text, state) ||
        buildDoctorPatientContextAnswer(state, approvedPreVisitSummary);
      return shouldIncludePreviousVisitHistory(text)
        ? `${currentContextResponse}\n\n${buildPreviousVisitHistorySection(state)}`
        : currentContextResponse;
    }
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
      return buildCarePlanAcknowledgement(text, messages, handledCarePlanKeys);
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
  try {
    const result = await analyzeTranscript({
      patientId: getPatientId(state),
      patientContext,
      medicationHistory: buildMedicationHistory(state),
      transcript: [
        `Current visit transcript:\n${currentTranscript || "No transcript yet."}`,
        `Latest transcript message:\n${latestTranscript}`,
      ].join("\n\n"),
    });
    return parseSemanticIntentDecision(JSON.stringify(result.result ?? {}));
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

function detectVisitStage(transcript: string): VisitStage {
  const doctorText = transcript
    .split("\n")
    .filter((line) => /^Doctor:/i.test(line))
    .join(" ");
  const clean = normalizeTranscriptText(doctorText);

  if (
    /\b(any questions|do you have questions|before you go|before we finish|that is all|that's all|we are done|we're done|see you next|front desk|checkout|take care|summary)\b/i.test(
      clean,
    )
  ) {
    return "visit_closing";
  }

  if (
    /\b(take|start|continue|stop|finish|prescribe|prescribed|follow up|follow-up|come back|schedule|urgent care|emergency|warning signs?|monitor|hydrate|rest|care plan|plan is|instructions?)\b/i.test(
      clean,
    )
  ) {
    return "treatment_plan";
  }

  if (
    /\b(my diagnosis is|the diagnosis is|i think this is|i believe this is|this looks like|it looks like|you have|she has|he has|this is likely|most likely|muscle strain|infection|viral|bacterial|flu|pneumonia|strep|uti)\b/i.test(
      clean,
    )
  ) {
    return "diagnosis";
  }

  if (
    /\b(where does it hurt|where is the pain|how severe|does walking|does movement|range of motion|press here|tender|swelling|exam|examine|look at|move your|bend|raise your)\b/i.test(
      clean,
    )
  ) {
    return "physical_assessment";
  }

  return "patient_history";
}

function canMedsBuddyRespondInStage(stage: VisitStage, intent: AdvocateIntent): boolean {
  if (
    intent === "patient_history_request" ||
    intent === "medication_history_request" ||
    intent === "sleep_history_request" ||
    intent === "visit_summary_request" ||
    intent === "direct_call"
  ) {
    return true;
  }

  if (stage === "patient_history" || stage === "physical_assessment") {
    return false;
  }

  if (stage === "diagnosis") {
    return (
      intent === "direct_call" ||
      intent === "visit_summary_request" ||
      intent === "doctor_answers_request" ||
      intent === "warning_signs_request"
    );
  }

  if (stage === "treatment_plan") {
    return (
      intent === "direct_call" ||
      intent === "care_plan_instruction" ||
      intent === "medication_history_request" ||
      intent === "warning_signs_request" ||
      intent === "doctor_answers_request" ||
      intent === "visit_summary_request"
    );
  }

  return true;
}

function shouldUseLlmVisitReasoning({
  latestText,
  latestSpeaker,
  latestSpeakerConfidence,
  fastIntent,
}: {
  latestText: string;
  latestSpeaker?: ConversationSpeaker;
  latestSpeakerConfidence: number;
  fastIntent: AdvocateIntent;
}): boolean {
  if (fastIntent !== "none" && fastIntent !== "normal_conversation") return true;
  if (WAKE_WORD_PATTERN.test(latestText)) return true;
  if (latestSpeaker !== "Doctor") return false;
  if (latestSpeakerConfidence >= 0.72) return false;

  return /\b(patient|medications?|medicines?|symptoms?|history|allergies|conditions?|previous visits?|reason for visit|current concerns?|adherence|summary|diagnosis|care plan|follow[-\s]?up|warning signs?|what|which|why|how|can you|could you|give me|tell me|show me)\b/i.test(
    latestText,
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
  const visitStage = detectVisitStage(transcript);

  // During history taking and physical assessment, the doctor is still gathering facts.
  // MedsBuddy should not interrupt with premature diagnosis, warning-sign, or
  // care-plan questions unless directly asked.
  if (visitStage === "patient_history" || visitStage === "physical_assessment") {
    return null;
  }

  if (
    visitStage === "visit_closing" &&
    speaker === "Doctor" &&
    /\b(any questions|do you have questions|before you go|before we finish|that is all|that's all|we are done|we're done)\b/i.test(
      latest,
    )
  ) {
    return {
      topic: "closing-additional-questions",
      response:
        "Before we conclude today's visit, would you like me to clarify any medications, follow-up instructions, or warning signs for the patient?",
    };
  }

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
    visitStage === "treatment_plan" &&
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
    visitStage === "diagnosis" &&
    /\b(diagnosis|diagnosed|you have|she has|he has|i think this is|i believe this is|this looks like|it looks like|muscle strain|infection|viral|bacterial|flu|pneumonia|strep|uti)\b/i.test(
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
  const match =
    patientContext.match(/Patient:\s*([^.\s]+)/i) ||
    patientContext.match(/summary is for\s+([^.\s]+)/i);
  const name = match?.[1]?.trim();
  if (!name || /^the$/i.test(name)) return "the patient";
  return name;
}

function buildDoctorConsentMessage(
  _patientContext: string,
  _patientName: string,
): ConversationMessage {
  return {
    speaker: "MedsBuddy",
    text: "Hello Doctor. I am MedsBuddy, the patient's AI advocate. With the patient's permission, I can listen during today's visit, answer questions from the approved patient context, and create a visit summary after the appointment. Do I have your consent to participate?",
  };
}

function buildVisitOpeningMessages(): ConversationMessage[] {
  return [
    {
      speaker: "MedsBuddy",
      text: "Thank you, Doctor. I'll monitor today's conversation and automatically assist whenever I can answer using the patient's approved information or help clarify the care plan.",
    },
  ];
}

function cleanVisitLine(text: string): string {
  return cleanSpeechToTextTranscript(text)
    .replace(STOP_TALKING_PATTERN, " ")
    .replace(START_TALKING_PATTERN, " ")
    .replace(WAKE_WORD_PATTERN, " ")
    .replace(/\bariana\s+grande\b/gi, " ")
    .replace(/\bplease\s+be\s+quiet\b/gi, " ")
    .replace(/\bstop\s+talking\b/gi, " ")
    .replace(/\bdo\s+not\s+speak\b/gi, " ")
    .replace(/\bdon't\s+speak\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isConsentOrIntroMessage(message: ConversationMessage): boolean {
  if (message.speaker !== "MedsBuddy") return false;
  return /\b(i am medsbuddy|ai advocate|permission|consent|participate|thank you, doctor|keep listening|speak when it helps|talking is on)\b/i.test(
    message.text,
  );
}

function cleanVisitTranscript(messages: ConversationMessage[]): ConversationMessage[] {
  return dedupeConversation(
    messages
      .filter((message) => !isConsentOrIntroMessage(message))
      .map((message) => ({
        ...message,
        text: cleanVisitLine(message.text),
      }))
      .filter((message) => message.text && !isLowValueTranscript(message.text)),
  );
}

function extractMedicationGuidanceFromDoctorLines(doctorLines: string[]): string {
  const instruction = doctorLines.find((line) =>
    /\b(tablet|capsule|pill|dose|morning|evening|night|daily|twice|once|one week|for \d+ days?|antibiotic|amoxicillin|take|use|continue|finish)\b/i.test(
      line,
    ),
  );
  if (!instruction) return "";

  const clean = normalizeTranscriptText(instruction);
  const details = extractMedicationInstructionDetails(instruction);
  const medicationCandidate = details.medication.trim();
  const medication =
    medicationCandidate &&
    !/\b(those|that|these|this)\s+(tablet|tablets|capsule|capsules|pill|pills)\b/i.test(
      medicationCandidate,
    )
      ? `${medicationCandidate}: `
      : "";
  const duration = /\bone week\b/i.test(clean)
    ? "for one week"
    : details.duration
      ? details.duration
      : "";

  if (/\bone tablet\b/i.test(clean) && /\bmorning\b/i.test(clean) && /\bevening\b/i.test(clean)) {
    return `Medication instructions: ${medication}Take one tablet in the morning and one tablet in the evening${duration ? ` ${duration}` : ""}.`;
  }

  const dose = details.dose || (/\bone tablet\b/i.test(clean) ? "one tablet" : "");
  const timing = [
    /\bmorning\b/i.test(clean) && "in the morning",
    /\bevening\b/i.test(clean) && "in the evening",
    /\bnight\b/i.test(clean) && "at night",
    details.timing,
  ].filter(Boolean);
  const frequency = details.frequency || details.interval;
  const pieces = [
    medication ? medication.trim() : "Medication instructions:",
    "Take",
    dose,
    frequency,
    timing.join(" and "),
    duration,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return pieces.endsWith(".") ? pieces : `${pieces}.`;
}

function getContextConcernText(patientContext: string): string {
  const context = patientContext.toLowerCase();
  const concerns: string[] = [];
  if (/\buti|urinary tract infection|urinary infection\b/i.test(patientContext)) {
    concerns.push("possible urinary tract infection symptoms");
  }
  if (/\bburning|discomfort while urinating|urinating|urination\b/i.test(patientContext)) {
    concerns.push("burning or discomfort while urinating");
  }
  if (/\byesterday\b/i.test(patientContext)) {
    concerns.push("symptoms that started yesterday");
  }
  if (!concerns.length && context.trim()) {
    const reason = patientContext.match(/Reason for Visit\s*-?\s*([^\n]+)/i)?.[1]?.trim();
    if (reason) concerns.push(reason);
  }
  return concerns.length ? Array.from(new Set(concerns)).join(", ") : "";
}

function buildSummaryFromTranscript(
  messages: ConversationMessage[],
  patientContext = "",
): VisitSummaryData {
  const cleanMessages = cleanVisitTranscript(messages);
  const transcript = normalizeTranscriptText(conversationToTranscript(cleanMessages));
  const includes = (pattern: RegExp) => pattern.test(transcript);
  const patientLines = getSpeakerLines(cleanMessages, "Patient");
  const doctorLines = getSpeakerLines(cleanMessages, "Doctor");
  const medsBuddyLines = getSpeakerLines(cleanMessages, "MedsBuddy");
  const contextConcernText = getContextConcernText(patientContext);
  const patientConcernText = patientLines.length
    ? getPatientConcernText(cleanMessages)
    : contextConcernText || "No patient concerns were captured in the visit transcript.";
  const doctorAnswerText = getDoctorAnswerText(cleanMessages);
  const warningSignText = getWarningSignText(cleanMessages);
  const medicationGuidanceText = extractMedicationGuidanceFromDoctorLines(doctorLines);
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
  const visitSummaryText = contextConcernText
    ? `The visit focused on ${contextConcernText}.`
    : patientLines.length
      ? `The visit focused on ${patientConcernText}.`
      : "MedsBuddy captured the doctor visit conversation and generated a structured summary.";
  const diagnosisText = diagnosisLines.length
    ? diagnosisLines.join(" ")
    : "No confirmed diagnosis was documented during this demo visit.";
  const patientFriendlyMedicationGuidance = medicationGuidanceText
    ? medicationGuidanceText
        .replace(/^Medication instructions:\s*Take\s+/i, "The doctor advised taking ")
        .replace(/^Medication instructions:\s*/i, "The doctor advised ")
    : "";
  const medicationChangesText = medicationGuidanceText
    ? patientFriendlyMedicationGuidance
    : medicationFacts.length
      ? `Medication discussion included ${medicationFacts.join(", ")}. Follow the doctor's medication instructions from the visit.`
      : "No medication instructions were captured.";
  const followUpText = followUpLines.length
    ? "Follow the doctor's instructions. Ask the doctor when to follow up and what warning signs require urgent care."
    : "Follow the doctor’s instructions. Ask the doctor when to follow up and what warning signs require urgent care.";
  const nextQuestions = [
    !diagnosisLines.length && "What is the likely diagnosis or main concern?",
    !medicationGuidanceText &&
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
      : contextConcernText || "Patient concerns were discussed during the visit.",
    doctorAssessment: medicationGuidanceText
      ? "The doctor reviewed the symptom timeline and provided medication instructions."
      : doctorLines.length
        ? doctorAnswerText
        : "No doctor assessment was captured yet.",
    medsBuddyQuestions: medsBuddyLines.length
      ? medsBuddyLines.join(" ")
      : /approved pre-visit|based on the approved|patient is currently taking/i.test(transcript)
        ? "MedsBuddy provided the approved pre-visit context when the doctor asked."
        : "MedsBuddy did not need to ask an additional question.",
    doctorAnswers: doctorLines.length ? doctorAnswerText : "No doctor assessment was captured yet.",
    medicationGuidance: medicationGuidanceText || medicationChangesText,
    warningSigns: warningSignText,
    followUpPlan: followUpText,
    simpleExplanation:
      contextConcernText || patientLines.length
        ? `The visit focused on ${contextConcernText || patientConcernText}. ${medicationGuidanceText || ""}`.trim()
        : "MedsBuddy summarized the visit conversation and doctor instructions.",
    caregiverSummary:
      contextConcernText || patientLines.length
        ? `Patient concerns: ${contextConcernText || patientConcernText}. Doctor guidance: ${medicationGuidanceText || doctorAnswerText}`
        : "Share the visit summary with a caregiver so they can help monitor next steps.",
  };
}

function mergeRemoteSummary(
  fallback: VisitSummaryData,
  remote?: StructuredVisitSummary,
): VisitSummaryData {
  if (!remote) return fallback;
  return {
    ...fallback,
    visitSummary: remote.visitSummary?.trim() || fallback.visitSummary,
    diagnosis: remote.diagnosis?.trim() || fallback.diagnosis,
    medicationChanges:
      remote.medicationChanges?.trim() || remote.medications?.trim() || fallback.medicationChanges,
    followUpInstructions:
      remote.followUpInstructions?.trim() ||
      remote.followUp?.trim() ||
      fallback.followUpInstructions,
    medicationGuidance:
      remote.medicationChanges?.trim() || remote.medications?.trim() || fallback.medicationGuidance,
    warningSigns: remote.warningSigns?.trim() || fallback.warningSigns,
    followUpPlan:
      remote.followUp?.trim() || remote.followUpInstructions?.trim() || fallback.followUpPlan,
    simpleExplanation:
      remote.simpleExplanation?.trim() ||
      remote.patientFriendlyExplanation?.trim() ||
      fallback.simpleExplanation,
    caregiverSummary:
      remote.caregiverSummary?.trim() ||
      remote.caregiverShareSummary?.trim() ||
      fallback.caregiverSummary,
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
  const {
    profile,
    meds,
    doses,
    symptoms,
    appointments,
    addSummary,
    addVisit,
    addNote,
    resetCurrentPatientContext,
  } = state;
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<DemoStage>("idle");
  const [patientSummaryApproved, setPatientSummaryApproved] = useState(false);
  const [patientContextDraft, setPatientContextDraft] = useState("");
  const [approvedPatientContext, setApprovedPatientContext] = useState("");
  const [preVisitSummaryPreparing, setPreVisitSummaryPreparing] = useState(false);
  const [doctorVisitConsent, setDoctorVisitConsent] = useState<DoctorVisitConsent>("pending");
  const [summarySaved, setSummarySaved] = useState(false);
  const [visitMessages, setVisitMessages] = useState<ConversationMessage[]>([]);
  const [wakeStatus, setWakeStatus] = useState("MedsBuddy is listening");
  const [simulatedTranscript, setSimulatedTranscript] = useState("");
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [medsBuddyTalking, setMedsBuddyTalking] = useState(true);
  const [summarySpeaking, setSummarySpeaking] = useState(false);
  const [advocateActive, setAdvocateActive] = useState(false);
  const [visitSummary, setVisitSummary] = useState<VisitSummaryData>(() =>
    buildSummaryFromTranscript([], ""),
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const elevenLabsSttUnavailableRef = useRef(false);
  const sttRequestChainRef = useRef<Promise<void>>(Promise.resolve());
  const visitMessagesRef = useRef<ConversationMessage[]>([]);
  const voiceSpeakingRef = useRef(false);
  const medsBuddyTalkingRef = useRef(true);
  const advocateActiveRef = useRef(false);
  const spokenMedsBuddyKeysRef = useRef<Set<string>>(new Set());
  const alertedTopicsRef = useRef<Set<AdvocateAlertTopic>>(new Set());
  const handledCarePlanKeysRef = useRef<Set<string>>(new Set());
  const lastAdvocateAlertAtRef = useRef(0);
  const semanticRequestIdRef = useRef(0);
  const humanizedSummaryCacheRef = useRef<Map<string, string>>(new Map());
  const humanizeInFlightKeyRef = useRef<string | null>(null);
  const transcriptBufferRef = useRef("");
  const transcriptBufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBufferStartedAtRef = useRef<number | null>(null);
  const structuredPatientContextForQwen = useMemo(() => buildPatientSummary(state), [state]);
  const readablePreVisitFallback = useMemo(() => buildReadablePreVisitFallback(state), [state]);
  const patientId = useMemo(() => getPatientId(state), [state]);
  const patientContextForVisit =
    approvedPatientContext || patientContextDraft || "Preparing your pre-visit summary...";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!patientSummaryApproved) {
      const summaryKey = `${patientId}:${structuredPatientContextForQwen}`;
      const cachedSummary = humanizedSummaryCacheRef.current.get(summaryKey);

      setPatientContextDraft(cachedSummary || readablePreVisitFallback);

      if (cachedSummary) {
        setPreVisitSummaryPreparing(false);
        return;
      }

      if (humanizeInFlightKeyRef.current === summaryKey) {
        setPreVisitSummaryPreparing(false);
        return;
      }

      let active = true;
      humanizeInFlightKeyRef.current = summaryKey;
      setPreVisitSummaryPreparing(false);

      void humanizePreVisitSummary({
        patientId,
        rawPatientContext: structuredPatientContextForQwen,
      })
        .then((result) => {
          if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
          const summary = result.summary || readablePreVisitFallback;
          humanizedSummaryCacheRef.current.set(summaryKey, summary);
          setPatientContextDraft(summary);
        })
        .catch(() => {
          if (!active || humanizeInFlightKeyRef.current !== summaryKey) return;
          setPatientContextDraft(readablePreVisitFallback);
        })
        .finally(() => {
          if (humanizeInFlightKeyRef.current === summaryKey) {
            humanizeInFlightKeyRef.current = null;
          }
          if (active) setPreVisitSummaryPreparing(false);
        });

      return () => {
        active = false;
      };
    }
  }, [
    structuredPatientContextForQwen,
    readablePreVisitFallback,
    patientId,
    patientSummaryApproved,
  ]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    visitMessagesRef.current = visitMessages;
  }, [visitMessages]);

  useEffect(() => {
    advocateActiveRef.current = advocateActive;
  }, [advocateActive]);

  useEffect(() => {
    medsBuddyTalkingRef.current = medsBuddyTalking;
    if (!medsBuddyTalking) {
      stopSpeaking();
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
    }
  }, [medsBuddyTalking]);

  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const recentSymptoms = symptoms.filter((s) => s.at >= last7);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];

  const startVisit = () => {
    if (!patientSummaryApproved) {
      toast.error("Please approve the pre-visit summary before starting the live visit.");
      return;
    }
    beginVisit();
  };

  const beginVisit = () => {
    const approvedContext = patientContextForVisit.trim() || readablePreVisitFallback;
    addSummary(approvedContext);
    stopSpeaking();
    if (transcriptBufferTimerRef.current) {
      clearTimeout(transcriptBufferTimerRef.current);
      transcriptBufferTimerRef.current = null;
    }
    transcriptBufferRef.current = "";
    transcriptBufferStartedAtRef.current = null;
    spokenMedsBuddyKeysRef.current.clear();
    alertedTopicsRef.current.clear();
    handledCarePlanKeysRef.current.clear();
    lastAdvocateAlertAtRef.current = 0;
    setDoctorVisitConsent("pending");
    setVisitMessages([buildDoctorConsentMessage(approvedContext, profile.name || "Vasanthi")]);
    setVisitSummary(buildSummaryFromTranscript([], approvedContext));
    setWakeStatus("Waiting for doctor consent");
    setSimulatedTranscript("");
    setLastProcessedTranscript("");
    setSummarySaved(false);
    setAdvocateActive(false);
    setMedsBuddyTalking(true);
    setStage("active");
    toast.success("AI Patient Advocate visit started");
  };

  useEffect(() => {
    if (stage !== "active") return;
    if (!medsBuddyTalking) return;

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
    setVoiceSpeaking(true);
    const returnToListening = () => {
      voiceSpeakingRef.current = false;
      setVoiceSpeaking(false);
      if (stage === "active" && doctorVisitConsent === "granted") {
        setWakeStatus("MedsBuddy is listening");
      }
    };
    void speak(textToSpeak, () => {
      returnToListening();
    }).catch(() => {
      returnToListening();
    });
  }, [doctorVisitConsent, medsBuddyTalking, stage, visitMessages]);

  const handleDoctorConsents = () => {
    const openingMessages = buildVisitOpeningMessages();
    setDoctorVisitConsent("granted");
    setWakeStatus("MedsBuddy is listening");
    // Once doctor consent is granted, MedsBuddy can respond from conversation context
    // without requiring the doctor to repeat the wake word.
    setAdvocateActive(true);
    advocateActiveRef.current = true;
    setVisitMessages((messages) => dedupeConversation([...messages, ...openingMessages]));
    setVisitSummary(buildSummaryFromTranscript(openingMessages, patientContextForVisit));
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

  const addMedsBuddyVisitMessage = useCallback((text: string, status: string): boolean => {
    if (!medsBuddyTalkingRef.current) {
      setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
      return false;
    }
    setWakeStatus(status);
    setVisitMessages((messages) => {
      const withResponse = dedupeConversation([...messages, { speaker: "MedsBuddy", text }]);
      visitMessagesRef.current = withResponse;
      return withResponse;
    });
    return true;
  }, []);

  const addTranscriptMessages = useCallback(
    (transcript: string, speaker: SpeakerMode): boolean => {
      if (!transcript.trim() || isLowValueTranscript(transcript)) return false;

      const cleanedTranscript = cleanSpeechToTextTranscript(transcript);
      if (process.env.NODE_ENV !== "production") {
        console.log("RAW_STT_TRANSCRIPT:", transcript);
        console.log("CLEANED_STT_TRANSCRIPT:", cleanedTranscript);
      }

      const currentMessages = visitMessagesRef.current;
      const parsedMessages = mergeAdjacentConversationMessages(
        parseTranscriptMessages(cleanedTranscript, speaker, currentMessages)
          .map((message) => ({
            ...message,
            text: cleanTranscriptInput(message.text),
          }))
          .filter((message) => !isLowValueTranscript(message.text)),
      );
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

      const nextMessages = dedupeConversation(
        mergeAdjacentConversationMessages([...currentMessages, ...parsedMessages]),
      );
      visitMessagesRef.current = nextMessages;
      setVisitMessages(nextMessages);
      setWakeStatus("MedsBuddy is understanding the conversation");

      const latestMessage = nextMessages[nextMessages.length - 1];
      const latestText =
        latestMessage?.text ?? parsedMessages.map((message) => message.text).join(" ");
      const latestTurnText = latestText;
      const latestSpeaker = latestMessage?.speaker;
      const latestSpeakerConfidence = latestMessage?.speakerConfidence ?? 0.75;
      const needsLlmSpeakerClassification = latestSpeakerConfidence < 0.72;
      const requestId = semanticRequestIdRef.current + 1;
      semanticRequestIdRef.current = requestId;
      const currentTranscript = conversationToTranscript(nextMessages);
      const currentVisitStage = detectVisitStage(currentTranscript);
      console.info("[MedsBuddy visit stage]", {
        stage: currentVisitStage,
        latestSpeaker,
        latestText,
      });

      const hasStopTalkingCommand = parsedMessages.some((message) =>
        isStopTalkingCommand(message.text),
      );
      const hasStartTalkingCommand = parsedMessages.some((message) =>
        isStartTalkingCommand(message.text),
      );

      if (hasStopTalkingCommand) {
        setMedsBuddyTalking(false);
        medsBuddyTalkingRef.current = false;
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (hasStartTalkingCommand) {
        setMedsBuddyTalking(true);
        medsBuddyTalkingRef.current = true;
        addMedsBuddyVisitMessage(
          "MedsBuddy Talking is on. I’ll speak when it helps the visit.",
          "MedsBuddy Talking is ON",
        );
        return true;
      }

      if (isStopTalkingCommand(latestText)) {
        setMedsBuddyTalking(false);
        medsBuddyTalkingRef.current = false;
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (isStartTalkingCommand(latestText)) {
        setMedsBuddyTalking(true);
        medsBuddyTalkingRef.current = true;
        addMedsBuddyVisitMessage(
          "MedsBuddy Talking is on. I’ll speak when it helps the visit.",
          "MedsBuddy Talking is ON",
        );
        return true;
      }

      const fastIntent = AI.detectIntent({
        text: latestText,
        speaker: latestSpeaker,
        advocateActive: advocateActiveRef.current,
      });

      if (
        !needsLlmSpeakerClassification &&
        fastIntent === "patient_history_request" &&
        canMedsBuddyRespondInStage(currentVisitStage, fastIntent)
      ) {
        if (!medsBuddyTalkingRef.current) {
          setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
          return true;
        }

        const missingContextResponse = buildMissingApprovedContextResponse(latestText, state);
        if (missingContextResponse) {
          addMedsBuddyVisitMessage(
            missingContextResponse,
            "MedsBuddy asked the patient for missing approved information",
          );
          return true;
        }

        const fallbackHandoff = buildDoctorPatientContextAnswer(state, patientContextForVisit);
        setWakeStatus("MedsBuddy is preparing a concise doctor handoff");
        void generateDoctorHandoff({
          patientId: getPatientId(state),
          approvedPreVisitSummary: patientContextForVisit,
          patientContext: state.patientContext as unknown as Record<string, unknown>,
          medicationHistory: buildMedicationHistory(state),
        })
          .then((result) => {
            const handoff = result.handoff?.trim() || fallbackHandoff;
            addMedsBuddyVisitMessage(handoff, "MedsBuddy answered from the pre-visit summary");
          })
          .catch(() => {
            addMedsBuddyVisitMessage(
              fallbackHandoff,
              "MedsBuddy answered from the pre-visit summary",
            );
          });
        return true;
      }

      const fastResponse =
        !needsLlmSpeakerClassification &&
        isFastLocalIntent(fastIntent) &&
        canMedsBuddyRespondInStage(currentVisitStage, fastIntent) &&
        buildIntentResponse(
          fastIntent,
          latestText,
          nextMessages,
          state,
          handledCarePlanKeysRef.current,
          patientContextForVisit,
        );

      if (fastResponse) {
        if (fastIntent === "direct_call") {
          setAdvocateActive(true);
          advocateActiveRef.current = true;
        }
        setWakeStatus(
          fastIntent === "direct_call"
            ? "MedsBuddy was called"
            : "MedsBuddy answered from the pre-visit summary",
        );
        addMedsBuddyVisitMessage(
          fastResponse,
          fastIntent === "direct_call"
            ? "MedsBuddy was called"
            : "MedsBuddy answered from the pre-visit summary",
        );
        return true;
      }

      const fastAlert = analyzeTranscriptForAdvocateAlert(
        currentTranscript,
        patientContextForVisit,
      );
      const now = Date.now();
      if (
        !needsLlmSpeakerClassification &&
        fastAlert &&
        !alertedTopicsRef.current.has(fastAlert.topic) &&
        now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
      ) {
        alertedTopicsRef.current.add(fastAlert.topic);
        lastAdvocateAlertAtRef.current = now;
        addMedsBuddyVisitMessage(fastAlert.response, "MedsBuddy noticed a clarification");
        return true;
      }

      if (!medsBuddyTalkingRef.current) {
        setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        return true;
      }

      if (
        !shouldUseLlmVisitReasoning({
          latestText,
          latestSpeaker,
          latestSpeakerConfidence,
          fastIntent,
        })
      ) {
        setWakeStatus(
          advocateActiveRef.current
            ? "MedsBuddy is ready for follow-up questions"
            : "MedsBuddy is listening",
        );
        return true;
      }

      void (async () => {
        const semanticDecision = await detectSemanticIntentWithLLM({
          latestTranscript: `${latestSpeaker}: ${latestText}`,
          currentTranscript,
          patientContext: patientContextForVisit,
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
        const asyncVisitStage = detectVisitStage(
          conversationToTranscript(visitMessagesRef.current),
        );
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

        const stageAllowsResponse = canMedsBuddyRespondInStage(asyncVisitStage, decision.intent);
        const localIntentResponse = stageAllowsResponse
          ? buildIntentResponse(
              decision.intent,
              latestText,
              visitMessagesRef.current,
              state,
              handledCarePlanKeysRef.current,
              patientContextForVisit,
            )
          : null;
        const shouldPreferLocalResponse =
          decision.intent === "medication_history_request" ||
          /\b0 percent|zero taken|zero missed\b/i.test(decision.response);

        const intentResponse =
          decision.shouldRespond &&
          stageAllowsResponse &&
          (shouldPreferLocalResponse
            ? localIntentResponse
            : decision.response || localIntentResponse);

        if (intentResponse) {
          addMedsBuddyVisitMessage(
            intentResponse,
            decision.intent === "direct_call"
              ? "MedsBuddy was called"
              : "MedsBuddy is answering the doctor",
          );
        } else {
          const alert = analyzeTranscriptForAdvocateAlert(
            conversationToTranscript(visitMessagesRef.current),
            patientContextForVisit,
          );
          const now = Date.now();
          if (
            alert &&
            !alertedTopicsRef.current.has(alert.topic) &&
            now - lastAdvocateAlertAtRef.current >= ADVOCATE_ALERT_COOLDOWN_MS
          ) {
            alertedTopicsRef.current.add(alert.topic);
            lastAdvocateAlertAtRef.current = now;
            addMedsBuddyVisitMessage(alert.response, "MedsBuddy noticed a clarification");
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
    [addMedsBuddyVisitMessage, patientContextForVisit, state],
  );

  const handleSimulatedTranscript = () => {
    const delta = getTranscriptDelta(simulatedTranscript, lastProcessedTranscript);
    const added = addTranscriptMessages(delta, "Auto");
    if (!added) return;
    setLastProcessedTranscript(simulatedTranscript.trim());
    setSimulatedTranscript("");
  };

  const flushBufferedTranscript = useCallback((): boolean => {
    if (transcriptBufferTimerRef.current) {
      clearTimeout(transcriptBufferTimerRef.current);
      transcriptBufferTimerRef.current = null;
    }
    const mergedTranscript = transcriptBufferRef.current.replace(/\s+/g, " ").trim();
    const waitMs = transcriptBufferStartedAtRef.current
      ? Date.now() - transcriptBufferStartedAtRef.current
      : 0;
    transcriptBufferRef.current = "";
    transcriptBufferStartedAtRef.current = null;
    if (!mergedTranscript) return false;
    console.info("[MedsBuddy transcript pipeline]", {
      finalMergedTranscript: mergedTranscript,
      timeWaitingBeforeReasoningMs: waitMs,
    });
    return addTranscriptMessages(mergedTranscript, "Auto");
  }, [addTranscriptMessages]);

  const queueTranscriptChunk = useCallback(
    (transcript: string) => {
      const cleanedChunk = cleanSpeechToTextTranscript(transcript);
      if (!cleanedChunk) return;

      if (voiceSpeakingRef.current) {
        if (isStopTalkingCommand(cleanedChunk)) {
          stopSpeaking();
          voiceSpeakingRef.current = false;
          setVoiceSpeaking(false);
          setMedsBuddyTalking(false);
          medsBuddyTalkingRef.current = false;
          transcriptBufferRef.current = "";
          transcriptBufferStartedAtRef.current = null;
          if (transcriptBufferTimerRef.current) {
            clearTimeout(transcriptBufferTimerRef.current);
            transcriptBufferTimerRef.current = null;
          }
          setWakeStatus("MedsBuddy Talking is OFF. Still listening and capturing the visit.");
        }
        return;
      }

      if (isLowValueTranscript(cleanedChunk)) return;

      if (!transcriptBufferRef.current) {
        transcriptBufferStartedAtRef.current = Date.now();
      }
      transcriptBufferRef.current = [transcriptBufferRef.current, cleanedChunk]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      console.info("[MedsBuddy transcript pipeline]", {
        rawSttTranscript: transcript,
        bufferedTranscript: transcriptBufferRef.current,
        timeWaitingBeforeReasoningMs: transcriptBufferStartedAtRef.current
          ? Date.now() - transcriptBufferStartedAtRef.current
          : 0,
      });
      setWakeStatus("MedsBuddy is listening and combining the full thought");

      if (transcriptBufferTimerRef.current) {
        clearTimeout(transcriptBufferTimerRef.current);
      }
      transcriptBufferTimerRef.current = setTimeout(() => {
        flushBufferedTranscript();
      }, TRANSCRIPT_MERGE_DELAY_MS);
    },
    [flushBufferedTranscript],
  );

  useEffect(() => {
    if (!mounted) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canRecordForElevenLabs =
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined" &&
      !elevenLabsSttUnavailableRef.current;
    setVoiceSupported(canRecordForElevenLabs || Boolean(Recognition));

    const stopElevenLabsRecorder = () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };

    const stopBrowserRecognition = () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };

    const startBrowserRecognition = () => {
      if (!Recognition) return false;

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
          queueTranscriptChunk(transcript);
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
        setWakeStatus("Browser speech recognition is listening");
        return true;
      } catch {
        setVoiceListening(false);
        return false;
      }
    };

    if (stage !== "active" || doctorVisitConsent !== "granted") {
      stopElevenLabsRecorder();
      stopBrowserRecognition();
      setVoiceListening(false);
      return;
    }

    let cancelled = false;

    if (!canRecordForElevenLabs) {
      const started = startBrowserRecognition();
      if (!started) {
        setWakeStatus("Microphone is unavailable. Use the transcript box instead.");
      }
      return () => {
        stopBrowserRecognition();
      };
    }

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const mimeType = getSupportedRecordingMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (cancelled || !event.data || event.data.size < 1200) return;
          const audioChunk = event.data;
          sttRequestChainRef.current = sttRequestChainRef.current
            .catch(() => undefined)
            .then(async () => {
              try {
                const result = await transcribeAudio(audioChunk);
                const transcript = result.text?.trim();
                if (transcript && !cancelled) {
                  queueTranscriptChunk(transcript);
                }
              } catch (error) {
                console.warn("[MedsBuddy STT] ElevenLabs STT failed. Falling back.", error);
                elevenLabsSttUnavailableRef.current = true;
                setWakeStatus("ElevenLabs STT unavailable. Falling back to browser speech.");
                stopElevenLabsRecorder();
                startBrowserRecognition();
              }
            });
        };

        recorder.onerror = () => {
          elevenLabsSttUnavailableRef.current = true;
          setWakeStatus("ElevenLabs STT recorder failed. Falling back to browser speech.");
          stopElevenLabsRecorder();
          startBrowserRecognition();
        };

        recorder.start(4500);
        setVoiceListening(true);
        setWakeStatus("ElevenLabs STT is listening");
      })
      .catch(() => {
        if (cancelled) return;
        elevenLabsSttUnavailableRef.current = true;
        setVoiceListening(false);
        setWakeStatus("Microphone permission is blocked");
        toast.error("Microphone permission is blocked. Use the transcript box instead.");
        startBrowserRecognition();
      });

    return () => {
      cancelled = true;
      stopElevenLabsRecorder();
      stopBrowserRecognition();
      if (transcriptBufferTimerRef.current) {
        clearTimeout(transcriptBufferTimerRef.current);
        transcriptBufferTimerRef.current = null;
      }
    };
  }, [doctorVisitConsent, mounted, queueTranscriptChunk, stage]);

  const endVisit = async () => {
    flushBufferedTranscript();
    const cleanedMessages = cleanVisitTranscript(visitMessagesRef.current);
    const closingMessage = "Thank you, Doctor. I've updated the patient's care plan.";
    const summaryMessages = dedupeConversation([
      ...cleanedMessages,
      { speaker: "MedsBuddy", text: closingMessage },
    ]);
    const localSummary = buildSummaryFromTranscript(cleanedMessages, patientContextForVisit);
    const transcript = conversationToTranscript(summaryMessages);

    setVisitSummary(localSummary);
    setStage("summary");
    toast.success("Care plan updated. AI Patient Advocate summary ready");
    setSummarySpeaking(true);
    void speak(closingMessage, () => setSummarySpeaking(false)).catch(() => {
      setSummarySpeaking(false);
    });

    if (!summarySaved) {
      addVisit({
        doctor: upcoming?.doctor || "Demo doctor",
        specialty: upcoming?.specialty || "Primary care",
        summary: localSummary.visitSummary,
        patientSummary: patientContextForVisit,
        topicsDiscussed: localSummary.patientConcerns,
        diagnosisOrConcerns: localSummary.diagnosis,
        medicationChanges: localSummary.medicationChanges,
        actionItems: localSummary.followUpInstructions,
        questionsAnswered: localSummary.doctorAnswers,
        carePlan: localSummary.nextAppointmentQuestions,
        notes: transcript,
      });
      addNote(`AI Patient Advocate follow-up: ${localSummary.followUpInstructions}`);
      if (localSummary.medicationGuidance) {
        addNote(`Medication schedule: ${localSummary.medicationGuidance}`);
      }
      if (localSummary.warningSigns && !localSummary.warningSigns.includes("not been discussed")) {
        addNote(`Warning signs: ${localSummary.warningSigns}`);
      }
      void saveVisitMemory({
        patientId: getPatientId(state),
        visitSummary: localSummary.visitSummary,
        diagnosis: localSummary.diagnosis,
        medications: localSummary.medicationChanges,
        allergies: state.profile.allergies || "No allergies recorded.",
        followUp: localSummary.followUpInstructions,
        warningSigns: localSummary.warningSigns,
        approvedByPatient: true,
      }).catch(() => {
        toast.error("Could not save visit memory to Alibaba ECS.");
      });
      resetCurrentPatientContext();
      setSummarySaved(true);
    }

    void generateVisitSummary({
      patientId: getPatientId(state),
      patientContext: patientContextForVisit,
      medicationHistory: buildMedicationHistory(state),
      transcript,
    })
      .then((remoteSummary) => {
        setVisitSummary(mergeRemoteSummary(localSummary, remoteSummary.summary));
      })
      .catch(() => {
        toast.info("Alibaba ECS summary unavailable. Showing local visit summary.");
      });
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

  const approvePatientContext = () => {
    const approvedContext = patientContextDraft.trim() || readablePreVisitFallback;
    setPatientContextDraft(approvedContext);
    setApprovedPatientContext(approvedContext);
    setPatientSummaryApproved(true);
    toast.success("Pre-visit summary approved");
  };

  const editPatientContext = () => {
    setPatientSummaryApproved(false);
    setApprovedPatientContext("");
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
          patientSummary={patientContextForVisit}
          patientContextDraft={patientContextDraft}
          patientSummaryApproved={patientSummaryApproved}
          preVisitSummaryPreparing={preVisitSummaryPreparing}
          onPatientContextDraftChange={(value) => {
            setPatientContextDraft(value);
            setPatientSummaryApproved(false);
            setApprovedPatientContext("");
          }}
          onApprovePatientContext={approvePatientContext}
          onEditPatientContext={editPatientContext}
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
          medsBuddyTalking={medsBuddyTalking}
          onMedsBuddyTalkingChange={setMedsBuddyTalking}
        />

        {stage === "summary" && (
          <VisitSummary
            summary={visitSummary}
            onSpeakSummary={speakVisitSummary}
            summarySpeaking={summarySpeaking}
          />
        )}
      </>
    </>
  );
}

function AIAdvocateDemo({
  stage,
  patientSummary,
  patientContextDraft,
  patientSummaryApproved,
  preVisitSummaryPreparing,
  onPatientContextDraftChange,
  onApprovePatientContext,
  onEditPatientContext,
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
  medsBuddyTalking,
  onMedsBuddyTalkingChange,
}: {
  stage: DemoStage;
  patientSummary: string;
  patientContextDraft: string;
  patientSummaryApproved: boolean;
  preVisitSummaryPreparing: boolean;
  onPatientContextDraftChange: (value: string) => void;
  onApprovePatientContext: () => void;
  onEditPatientContext: () => void;
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
  medsBuddyTalking: boolean;
  onMedsBuddyTalkingChange: (value: boolean) => void;
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
            <div className="text-[12px] font-semibold text-primary mb-1">
              Review Before Your Appointment
            </div>
            <textarea
              value={patientContextDraft}
              onChange={(event) => onPatientContextDraftChange(event.target.value)}
              className="min-h-[260px] w-full resize-none rounded-xl border bg-card px-3 py-3 text-[13px] leading-relaxed text-foreground"
              aria-label="Pre-visit summary for doctor visit"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={onApprovePatientContext}
                disabled={!patientContextDraft.trim()}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {patientSummaryApproved ? "Approved" : "Approve Summary"}
              </button>
              <button
                onClick={onEditPatientContext}
                className="rounded-xl bg-secondary text-secondary-foreground px-4 py-3 text-sm font-semibold"
              >
                Edit
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {preVisitSummaryPreparing
                ? "MedsBuddy is refining this summary in the background. You can approve and start now."
                : "Patient reviews and approves this summary before MedsBuddy uses it in the visit."}
            </p>
          </div>
          <button
            onClick={onStartVisit}
            disabled={!patientSummaryApproved}
            className="w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant disabled:opacity-50"
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
          {visitCanListen && (
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => onMedsBuddyTalkingChange(true)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  medsBuddyTalking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                MedsBuddy Talking: ON
              </button>
              <button
                onClick={() => onMedsBuddyTalkingChange(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  !medsBuddyTalking
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                MedsBuddy Talking: OFF
              </button>
            </div>
          )}
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">Pre-Visit Summary</div>
            <p className="whitespace-pre-line text-[13px] text-muted-foreground leading-relaxed">
              {patientSummary}
            </p>
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
        <SummaryBlock title="Reason for Visit" body={summary.visitSummary} />
        <SummaryBlock title="Patient Symptoms" body={summary.patientConcerns} />
        <SummaryBlock title="Doctor Assessment" body={summary.doctorAssessment} />
        <SummaryBlock title="Diagnosis" body={summary.diagnosis} />
        <SummaryBlock title="Medication Instructions" body={summary.medicationGuidance} />
        <SummaryBlock title="Follow-up Plan" body={summary.followUpPlan} />
        <SummaryBlock title="Warning Signs" body={summary.warningSigns} />
        <SummaryBlock title="Questions Asked by MedsBuddy" body={summary.medsBuddyQuestions} />
        <SummaryBlock title="Doctor Responses (Summarized)" body={summary.doctorAnswers} />
        <SummaryBlock title="Plain-language Explanation" body={summary.simpleExplanation} />
        <SummaryBlock title="Caregiver Summary" body={summary.caregiverSummary} />
        <SummaryBlock title="Next Appointment Checklist" body={summary.nextAppointmentQuestions} />
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
