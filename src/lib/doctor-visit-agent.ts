import { useApp } from "@/lib/store";
import {
  analyzeCarePlanGaps,
  routeMedsBuddyAgent,
  type CarePlanGapResult,
  type StructuredVisitSummary,
} from "@/lib/alibaba-api";

function buildPatientSummary(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, patientContext, symptoms } = state;
  const last7 = Date.now() - 7 * 86400000;
  const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
  const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
  const structuredContext = filterCurrentVisitPreVisitContext(
    withDefaultPreVisitContext(patientContext),
    state,
  );
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
  const recentSavedSymptoms = symptoms
    .slice(0, 6)
    .map((symptom) => symptom.name)
    .filter(Boolean);
  const patientContextForSummary = {
    ...preVisitContext,
    symptoms: preVisitContext.symptoms.length ? preVisitContext.symptoms : recentSavedSymptoms,
    visitReason:
      preVisitContext.visitReason || preVisitContext.symptoms[0] || recentSavedSymptoms[0] || "",
  };

  return JSON.stringify(
    {
      instruction:
        "Generate today's patient-friendly pre-visit summary from this structured PatientContext. Do not use raw chat artifacts. Do not invent facts.",
      profile: {
        name: profile.name || "the patient",
        allergies: profile.allergies || "",
        conditions: profile.conditions || "",
      },
      patientContext: patientContextForSummary,
      savedMedications: patientContextForSummary.medications,
      medicationHistory,
    },
    null,
    2,
  );
}

function buildReadablePreVisitFallback(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, patientContext, symptoms } = state;
  const rawContext = filterCurrentVisitPreVisitContext(
    withDefaultPreVisitContext(patientContext),
    state,
  );
  const context = normalizePreVisitContext(rawContext, meds);
  const recentSavedSymptoms = symptoms
    .slice(0, 6)
    .map((symptom) => symptom.name)
    .filter(Boolean);
  const currentSymptoms = context.symptoms.length ? context.symptoms : recentSavedSymptoms;
  const visitReason = context.visitReason || currentSymptoms[0] || "";
  const sections = [
    "Before today's appointment, here's what I'll share with your doctor after your approval.",
    `This summary is for ${profile.name || "the patient"}.`,
    "",
    "Reason for Visit",
    visitReason
      ? `- ${visitReason}`
      : "- Add the main reason for today's visit before sharing with the doctor.",
    "",
    "Current Symptoms",
    ...(currentSymptoms.length
      ? currentSymptoms.map((symptom) => `- ${symptom}`)
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

function withDefaultPreVisitContext(
  context?: Partial<PreVisitContextLike> | null,
): PreVisitContextLike {
  return Object.assign(
    {
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
    },
    context ?? {},
  );
}

type ApprovedSummarySections = {
  reason: string;
  symptoms: string[];
  medications: string[];
  allergies: string;
  conditions: string;
  timeline: string[];
  concerns: string[];
};

function cleanApprovedSummaryItem(line: string): string {
  return line
    .replace(/^[\s•*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmptyApprovedSummaryItem(text: string): boolean {
  return (
    !text ||
    /^(add the main reason|no current symptoms|not clearly captured|i don't have enough|no current medications|not recorded)$/i.test(
      text,
    )
  );
}

function parseApprovedPreVisitSummary(summary = ""): ApprovedSummarySections {
  const sections: ApprovedSummarySections = {
    reason: "",
    symptoms: [],
    medications: [],
    allergies: "",
    conditions: "",
    timeline: [],
    concerns: [],
  };
  const headingMap: Record<string, keyof ApprovedSummarySections> = {
    "reason for visit": "reason",
    "current symptoms": "symptoms",
    symptoms: "symptoms",
    timeline: "timeline",
    "current medications": "medications",
    medications: "medications",
    allergies: "allergies",
    "existing conditions": "conditions",
    conditions: "conditions",
    "patient concerns": "concerns",
    concerns: "concerns",
  };
  let currentSection: keyof ApprovedSummarySections | "" = "";

  for (const rawLine of summary.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingKey = line.toLowerCase().replace(/:$/, "");
    if (headingMap[headingKey]) {
      currentSection = headingMap[headingKey];
      continue;
    }
    if (!currentSection) continue;

    const item = cleanApprovedSummaryItem(line);
    if (isEmptyApprovedSummaryItem(item)) continue;

    if (currentSection === "reason") {
      sections.reason ||= item;
    } else if (currentSection === "allergies") {
      sections.allergies ||= item;
    } else if (currentSection === "conditions") {
      sections.conditions ||= item;
    } else {
      sections[currentSection].push(item);
    }
  }

  return sections;
}

function normalizeClinicalTextForVisit(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getClinicalKeywordsForVisit(text: string): string[] {
  const stopWords = new Set([
    "about",
    "and",
    "for",
    "patient",
    "that",
    "the",
    "this",
    "while",
    "with",
  ]);
  return normalizeClinicalTextForVisit(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

function currentTalkMentionsClinicalItem(text: string, item: string): boolean {
  const cleanText = normalizeClinicalTextForVisit(text);
  const cleanItem = normalizeClinicalTextForVisit(item);
  if (!cleanText || !cleanItem) return false;
  if (cleanText.includes(cleanItem)) return true;

  const keywords = getClinicalKeywordsForVisit(item);
  if (!keywords.length) return false;
  const matches = keywords.filter((word) => cleanText.includes(word)).length;
  return matches >= Math.min(2, keywords.length);
}

function getCurrentTalkConversationText(state: ReturnType<typeof useApp.getState>): string {
  const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
  const activeThread = state.threads.find((thread) => thread.id === state.activeThreadId);
  const threads = activeThread ? [activeThread] : state.threads.slice(0, 1);
  return threads
    .flatMap((thread) =>
      thread.messages
        .filter((message) => message.role === "user" && message.at >= currentVisitStartedAt)
        .map((message) => message.content),
    )
    .join(" ");
}

function getSavedVisitSummaryTextForVisit(state: ReturnType<typeof useApp.getState>): string {
  return [
    ...state.visits.flatMap((visit) => [
      visit.summary,
      visit.patientSummary,
      visit.topicsDiscussed,
      visit.diagnosisOrConcerns,
      visit.notes,
    ]),
    ...state.summaries.map((summary) => summary.text),
  ]
    .filter(Boolean)
    .join(" ");
}

function filterCurrentVisitPreVisitContext(
  context: PreVisitContextLike,
  state: ReturnType<typeof useApp.getState>,
): PreVisitContextLike {
  const currentTalkText = getCurrentTalkConversationText(state);
  const historyText = getSavedVisitSummaryTextForVisit(state);
  const keepCurrentField = (value: string) => {
    if (!value.trim()) return "";
    if (currentTalkMentionsClinicalItem(currentTalkText, value)) return value;
    if (currentTalkText.trim() && !currentTalkMentionsClinicalItem(historyText, value))
      return value;
    return "";
  };
  const keepCurrentList = (values: string[]) =>
    values.filter((value) => {
      if (currentTalkMentionsClinicalItem(currentTalkText, value)) return true;
      if (currentTalkText.trim() && !currentTalkMentionsClinicalItem(historyText, value)) {
        return true;
      }
      return false;
    });

  return {
    ...context,
    symptoms: keepCurrentList(context.symptoms),
    visitReason: keepCurrentField(context.visitReason),
    onset: keepCurrentField(context.onset),
    duration: keepCurrentField(context.duration),
    patientNotes: keepCurrentList(context.patientNotes),
    concerns: keepCurrentList(context.concerns),
    questionsForDoctor: keepCurrentList(context.questionsForDoctor),
  };
}

function normalizePreVisitContext(
  context: PreVisitContextLike,
  meds: ReturnType<typeof useApp.getState>["meds"],
): PreVisitContextLike {
  const symptoms = normalizePreVisitSymptoms(context.symptoms);
  const visitReason = context.visitReason?.trim() || deriveReasonForVisit({ ...context, symptoms });
  const patientNotes = normalizePatientNotes(context.patientNotes);

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
  const clinicalDetails = [...context.symptoms, ...context.concerns, ...context.patientNotes]
    .map((item) =>
      item
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

function normalizePreVisitSymptoms(symptoms: string[]): string[] {
  const output: string[] = [];
  for (const symptom of symptoms) {
    const clean = symptom.trim().replace(/\.$/, "");
    if (!clean) continue;
    output.push(`${clean}.`);
  }
  return Array.from(new Set(output));
}

function normalizePatientNotes(notes: string[]): string[] {
  const output = notes.map((note) => note.trim()).filter(Boolean);
  return Array.from(new Set(output));
}

function normalizePreVisitMedications(lines: string[]): string[] {
  const medications: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    medications.push(clean);
  }
  return medications;
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
type ConversationSpeaker = "Doctor" | "Patient" | "MedsBuddy" | "Unknown";
type SpeakerMode = "Auto" | "Doctor" | "Patient";
type SpeakerDetectionSource = "elevenlabs_label" | "local_rules" | "llm" | "qwen_pending";
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
  | "visit_summary_request"
  | "warning_signs_request"
  | "doctor_answers_request"
  | "care_plan_instruction"
  | "normal_conversation"
  | "none";
type PatientContextRequestField =
  | "reason for visit"
  | "symptoms"
  | "medications"
  | "allergies"
  | "medical history"
  | "duration"
  | "concerns"
  | "questions for doctor";
type SemanticIntentDecision = {
  speaker: "doctor" | "patient" | "medsbuddy" | "unknown";
  intent: AdvocateIntent;
  shouldRespond: boolean;
  response: string;
  requestedFields: PatientContextRequestField[];
  missingFields: PatientContextRequestField[];
  patientClarificationQuestion: string;
  includePreviousVisitHistory: boolean;
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

  // Normalize common wake-word transcription variants without changing clinical content.
  const replacements: Array<[RegExp, string]> = [
    [/\bmiss\s+buddy\b/gi, "MedsBuddy"],
    [/\bmrs\s+buddy\b/gi, "MedsBuddy"],
    [/\bmiss\s+body\b/gi, "MedsBuddy"],
    [/\bmeds\s+body\b/gi, "MedsBuddy"],
    [/\bam\s+excellent\b/gi, "Amoxicillin"],
    [/\bmilk\s+slim\b/gi, "Amoxicillin"],
    [/\bmilk\s+sim\b/gi, "Amoxicillin"],
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

    return [
      {
        speaker: "Unknown",
        text: cleanedText,
        speakerConfidence: 0,
        speakerReason: "Awaiting Qwen speaker classification.",
        speakerSource: "qwen_pending",
      },
    ];
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

  return [text].filter((turn) => turn.split(/\s+/).length >= 3 || WAKE_WORD_PATTERN.test(turn));
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

function lastMedsBuddyQuestionWasForPatient(messages: ConversationMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.speaker !== "MedsBuddy") return false;
  if (!/\?/.test(lastMessage.text)) return false;
  return (
    /\b(vasanthi|patient)\b/i.test(lastMessage.text) &&
    /\b(what|when|how|which|can you|could you|do you|are you|would you|confirm|tell me)\b/i.test(
      lastMessage.text,
    )
  );
}

function looksLikePatientFirstPersonStatement(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  if (/\?$/.test(clean)) return false;
  return /\b(i|i'm|i am|i’ve|i've|i have|i had|me|my|mine)\b/i.test(clean);
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
  return /^(yes|no|correct|that's right|that is right)\b/i.test(clean);
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

  if (
    lastMedsBuddyQuestionWasForPatient(existingMessages) &&
    looksLikePatientFirstPersonStatement(text)
  ) {
    return {
      speaker: "Patient",
      confidence: 0.97,
      reason: "MedsBuddy just asked the patient a clarification question.",
      source: "local_rules",
    };
  }

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

  if (WAKE_WORD_PATTERN.test(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.72,
      reason: "MedsBuddy was called.",
      source: "local_rules",
    };
  }

  if (looksLikePatientFirstPersonStatement(withoutWakeWord)) {
    return {
      speaker: "Patient",
      confidence: 0.72,
      reason: "First-person patient statement.",
      source: "local_rules",
    };
  }

  if (/^doctor\b/i.test(clean)) {
    return {
      speaker: "Doctor",
      confidence: 0.78,
      reason: "Transcript explicitly starts with doctor.",
      source: "local_rules",
    };
  }

  if (looksLikeDoctorQuestionToPatient(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.74,
      reason: "Doctor-style question or prompt to the patient.",
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
  if (recentHumanMessage?.speaker === "Doctor") {
    if (looksLikeDoctorQuestionToPatient(recentHumanMessage.text)) {
      return {
        speaker: "Patient",
        confidence: 0.62,
        reason: "Previous doctor message was a question to the patient.",
        source: "local_rules",
      };
    }
  }

  if (recentHumanMessage?.speaker === "Patient" && looksLikeDoctorQuestionToPatient(text)) {
    return {
      speaker: "Doctor",
      confidence: 0.62,
      reason: "Question after patient response.",
      source: "local_rules",
    };
  }

  if (/\?$/.test(clean)) {
    return {
      speaker: "Doctor",
      confidence: 0.62,
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
    /\b(what|when|where|why|how|tell me|describe|do you|are you|have you)\b/i.test(clean)
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
    /warning|urgent|emergency|severe|worse|worsen/i.test(line),
  );
  return joinLines(
    warningLines,
    "Warning signs have not been discussed yet. MedsBuddy can ask the doctor to clarify them.",
  );
}

function getDiagnosisText(messages: ConversationMessage[]): string {
  const doctorLines = getSpeakerLines(messages, "Doctor");
  const diagnosisLine = doctorLines.find((line) =>
    /\b(bacterial|viral|infection|strep|inflamed|diagnosis|looks like|seems like|believe this is|assessment)\b/i.test(
      line,
    ),
  );
  if (!diagnosisLine) return "No confirmed diagnosis was documented during this demo visit.";
  if (/\bbacterial\b/i.test(diagnosisLine) && /\b(throat|infection)\b/i.test(diagnosisLine)) {
    return "Bacterial throat infection.";
  }
  if (/\binflamed\b/i.test(diagnosisLine) && /\bthroat\b/i.test(diagnosisLine)) {
    return "Inflamed throat; see doctor's assessment for final diagnosis.";
  }
  return removeDuplicateRepeatedPhrases(diagnosisLine);
}

function formatMedicationInstruction(details: MedicationInstructionDetails): string {
  const name = formatMedicationName(details.medication);
  const dose = details.dose;
  const frequency = details.frequency || details.interval || details.timing;
  const duration = details.duration;
  return [name && dose ? `${name} ${dose}` : name || dose, frequency, duration]
    .filter(Boolean)
    .join("\n");
}

function getMedicationGuidanceText(messages: ConversationMessage[]): string {
  const instruction = collectDoctorCarePlan(messages, conversationToTranscript(messages));
  const details = extractMedicationInstructionDetails(instruction);
  const medicationInstruction = formatMedicationInstruction(details);
  if (medicationInstruction) return medicationInstruction;
  return "No medication changes were captured in the visit transcript.";
}

function getFollowUpText(messages: ConversationMessage[]): string {
  const followUpLine = getSpeakerLines(messages, "Doctor").find((line) =>
    /\b(follow up|follow-up|come back|return|see me|see us|appointment|schedule|check in|recheck|next week|tomorrow)\b/i.test(
      line,
    ),
  );
  return followUpLine
    ? removeDuplicateRepeatedPhrases(followUpLine)
    : "No specific follow-up instructions were captured yet.";
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

function buildDoctorPatientContextAnswer(
  state: ReturnType<typeof useApp.getState>,
  approvedPreVisitSummary?: string,
): string {
  const { profile, meds, patientContext } = state;
  const approved = parseApprovedPreVisitSummary(approvedPreVisitSummary);
  const rawContext = withDefaultPreVisitContext(patientContext);
  const context = normalizePreVisitContext(rawContext, meds);
  const reason = approved.reason || context.visitReason;
  const symptoms = approved.symptoms.length ? approved.symptoms : context.symptoms;
  const timeline =
    approved.timeline.length > 0
      ? approved.timeline.join(" ")
      : context.onset || context.duration
        ? [
            context.onset ? `Started ${context.onset.replace(/\.$/, "")}.` : "",
            context.duration ? context.duration.replace(/\.$/, ".") : "",
          ]
            .filter(Boolean)
            .join(" ")
        : "";
  const medications = approved.medications.length ? approved.medications : context.medications;
  const concerns = approved.concerns.length ? approved.concerns : context.concerns;
  const allergies = approved.allergies || profile.allergies;
  const conditions = approved.conditions || profile.conditions;
  const responseParts = [
    reason ? `the reason for today's visit is ${reason}` : "",
    symptoms.length ? `current symptoms include ${symptoms.slice(0, 3).join(", ")}` : "",
    timeline ? `timeline: ${timeline.replace(/\.$/, "")}` : "",
    medications.length ? `current medications include ${medications.slice(0, 4).join(", ")}` : "",
    allergies ? `allergies: ${allergies}` : "",
    conditions ? `existing conditions: ${conditions}` : "",
    concerns.length ? `patient concerns include ${concerns.slice(0, 2).join(", ")}` : "",
  ].filter(Boolean);

  if (!responseParts.length) {
    return "Yes, Doctor. I do not have enough approved patient context yet.";
  }

  return `Yes, Doctor. Based on the approved pre-visit summary, ${responseParts.join("; ")}.`;
}

function buildDoctorVisitReasonAnswer(
  state: ReturnType<typeof useApp.getState>,
  approvedPreVisitSummary?: string,
): string {
  const { meds, patientContext } = state;
  const approved = parseApprovedPreVisitSummary(approvedPreVisitSummary);
  const context = normalizePreVisitContext(withDefaultPreVisitContext(patientContext), meds);
  const reason = approved.reason || context.visitReason;
  const symptoms = approved.symptoms.length ? approved.symptoms : context.symptoms;
  const timeline =
    approved.timeline.length > 0
      ? approved.timeline.join(" ")
      : context.onset || context.duration
        ? [
            context.onset ? `Started ${context.onset.replace(/\.$/, "")}.` : "",
            context.duration ? context.duration.replace(/\.$/, ".") : "",
          ]
            .filter(Boolean)
            .join(" ")
        : "";
  const parts = [
    reason ? `the reason for today's visit is ${reason}` : "",
    symptoms.length ? `symptoms include ${symptoms.slice(0, 3).join(", ")}` : "",
    timeline ? `timeline: ${timeline.replace(/\.$/, "")}` : "",
  ].filter(Boolean);

  if (!parts.length) {
    return "Yes, Doctor. I do not have an approved reason for today's visit yet.";
  }

  return `Yes, Doctor. ${parts.join("; ")}.`;
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

function approvedContextHasField(
  field: PatientContextRequestField,
  state: ReturnType<typeof useApp.getState>,
): boolean {
  const context = normalizePreVisitContext(
    withDefaultPreVisitContext(state.patientContext),
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

function getPatientDisplayName(state: ReturnType<typeof useApp.getState>): string {
  return state.profile.name?.trim() || "the patient";
}

function getPatientClarificationQuestion(
  field: PatientContextRequestField,
  state: ReturnType<typeof useApp.getState>,
): string {
  const patientName = getPatientDisplayName(state);
  switch (field) {
    case "reason for visit":
      return `${patientName}, what is the main reason for today's visit?`;
    case "symptoms":
      return `${patientName}, what symptoms should I share with the doctor?`;
    case "medications":
      return `${patientName}, can you confirm your current medications and how often you take them?`;
    case "allergies":
      return `${patientName}, do you have any allergies I should record?`;
    case "medical history":
      return `${patientName}, are there any medical conditions or previous visit details you want me to share?`;
    case "duration":
      return `${patientName}, when did this start and how long has it been happening?`;
    case "concerns":
      return `${patientName}, what are you most concerned about today?`;
    case "questions for doctor":
      return `${patientName}, what questions would you like the doctor to answer today?`;
  }
}

function buildMissingApprovedContextResponse(
  decision: SemanticIntentDecision,
  state: ReturnType<typeof useApp.getState>,
): string | null {
  const missingFields = decision.missingFields.filter((field) =>
    approvedContextHasField(field, state) ? false : true,
  );
  if (!missingFields.length) return null;

  const missingText =
    missingFields.length === 1
      ? missingFields[0]
      : `${missingFields.slice(0, -1).join(", ")} and ${missingFields[missingFields.length - 1]}`;

  return [
    `Doctor, I do not have approved ${missingText} information yet.`,
    decision.patientClarificationQuestion ||
      getPatientClarificationQuestion(missingFields[0], state),
  ].join(" ");
}

function looksLikeDoctorCarePlanInstruction(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  if (/give me|tell me|show me|patient history|history|details|information/.test(clean)) {
    return false;
  }
  if (/\b(where|how|when|what|why|describe|do you|are you|does it)\b/i.test(clean)) {
    return false;
  }
  return (
    /(?:i will|i'll|we will|start|prescrib|give (?:her|him|the patient|you)|take|continue|stop|finish|schedule|follow up|follow-up|mg|mcg|ml|tablet|capsule|dose)/i.test(
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
type PrescribedMedication = {
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
};
type CarePlanField =
  | "medication name"
  | "dosage"
  | "frequency"
  | "duration"
  | "follow-up"
  | "warning signs";
type CarePlanCompletion = {
  medicationComplete: boolean;
  medicationNameComplete: boolean;
  dosageComplete: boolean;
  frequencyComplete: boolean;
  durationComplete: boolean;
  followUpComplete: boolean;
  warningSignsComplete: boolean;
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
  const afterAction = lower.match(
    /\b(?:start|prescribe|prescribed|prescribing|give|take|continue|finish|stop)\s+(?:her|him|the patient|you|the)?\s*([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})/i,
  )?.[1];
  const beforeDose = clean.match(
    /\b([a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2})\s+\d+(?:\.\d+)?\s*(?:mg|milligrams?|mcg|micrograms?|g|grams?|ml|units?)\b/i,
  )?.[1];
  const dose =
    clean.match(
      /\b\d+(?:\.\d+)?\s*(?:mg|milligrams?|mcg|micrograms?|g|grams?|ml|units?|tablets?|tabs?|capsules?|caps?|pills?|puffs?|drops?)\b/i,
    )?.[0] ||
    clean.match(
      /\b\d+(?:\.\d+)?\s+(?:hundred\s+)?(?:mg|milligrams?|mcg|micrograms?|g|grams?|ml|units?)\b/i,
    )?.[0] ||
    clean.match(
      /\b(?:one|two|three|four|five|[1-5])\s+(?:tablets?|tabs?|capsules?|caps?|pills?|doses?)\b/i,
    )?.[0];
  const interval = clean.match(/\b(?:every|q)\s*\d+\s*(?:hours?|hrs?|h|days?|d)\b/i)?.[0];
  const frequency = clean.match(
    /\b(?:once|twice|three times|four times|[1-4] times)\s+(?:(?:a|per)\s+day|daily)\b|\b(?:daily|bid|tid|qid)\b/i,
  )?.[0];
  const timing = clean.match(
    /\b(?:morning|afternoon|evening|night|bedtime|breakfast|lunch|dinner|with food|after food|before food|with meals?|after meals?|before meals?|empty stomach)\b/i,
  )?.[0];
  const duration = clean.match(
    /\bfor\s+(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\b|\b(?:one|two|three|four|five|seven|ten|fourteen|\d+)\s*(?:days?|weeks?|months?)\s*(?:course)?\b/i,
  )?.[0];

  return {
    medication: afterAction || beforeDose || "",
    dose: dose || "",
    frequency: frequency || "",
    timing: timing || "",
    duration: duration || "",
    interval: interval || "",
  };
}

function formatMedicationName(name: string): string {
  return name
    .replace(/\b(?:her|him|the patient|you|the)\b/gi, " ")
    .replace(/\bamoxicil+in\b/gi, "amoxicillin")
    .replace(/\bamoxycillin\b/gi, "amoxicillin")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeMedicationFrequency(details: MedicationInstructionDetails): string {
  const schedule = details.frequency || details.interval || details.timing;
  const parts = [schedule, details.duration].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractPrescribedMedicationFromCarePlan(
  text: string,
  messages: ConversationMessage[],
): PrescribedMedication | null {
  const instruction = collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text));
  const details = extractMedicationInstructionDetails(instruction);
  if (
    isMissingMedicationName(details) ||
    !hasMedicationDose(details) ||
    !hasMedicationFrequency(details)
  ) {
    return null;
  }

  const name = formatMedicationName(details.medication);
  const frequency = normalizeMedicationFrequency(details);
  if (!name || !details.dose || !frequency) return null;

  return {
    name,
    dosage: details.dose,
    frequency,
    times: [],
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
    /\b(medication|medicine|tablet|tablets|capsule|capsules|pill|pills|dose|doses|those|that|these|this)\b/i.test(
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

function getCarePlanCompletion(
  details: MedicationInstructionDetails,
  messages: ConversationMessage[],
): CarePlanCompletion {
  const medicationNameComplete = !isMissingMedicationName(details);
  const dosageComplete = hasMedicationDose(details);
  const frequencyComplete = hasMedicationFrequency(details);
  const durationComplete = Boolean(details.duration);
  return {
    medicationComplete:
      medicationNameComplete && dosageComplete && frequencyComplete && durationComplete,
    medicationNameComplete,
    dosageComplete,
    frequencyComplete,
    durationComplete,
    followUpComplete: hasCarePlanFollowUp(messages),
    warningSignsComplete: hasCarePlanWarningSigns(messages),
  };
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
      /\b(warning signs?|urgent care|emergency|er|seek care|call|worse|worsening|severe)\b/i.test(
        message.text,
      ),
  );
}

function normalizeCarePlanField(field: unknown): CarePlanField | null {
  const clean = String(field ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
  if (/medication.*name|medicine.*name|drug.*name/.test(clean)) return "medication name";
  if (/dosage|dose|amount/.test(clean)) return "dosage";
  if (/frequency|how often|timing|schedule/.test(clean)) return "frequency";
  if (/duration|how long|days|course/.test(clean)) return "duration";
  if (/follow/.test(clean)) return "follow-up";
  if (/warning|urgent|emergency|watch/.test(clean)) return "warning signs";
  return null;
}

function carePlanFieldIsComplete(field: CarePlanField, completion: CarePlanCompletion): boolean {
  switch (field) {
    case "medication name":
      return completion.medicationNameComplete;
    case "dosage":
      return completion.dosageComplete;
    case "frequency":
      return completion.frequencyComplete;
    case "duration":
      return completion.durationComplete;
    case "follow-up":
      return completion.followUpComplete;
    case "warning signs":
      return completion.warningSignsComplete;
  }
}

function carePlanFieldFromQuestion(question: string): CarePlanField | null {
  if (/medication name|medicine name|which medication|what medication/i.test(question)) {
    return "medication name";
  }
  if (/\bdose|dosage|mg|how much/i.test(question)) return "dosage";
  if (/how often|frequency|when should|what time|timing/i.test(question)) return "frequency";
  if (/how many days|how long|duration|course/i.test(question)) return "duration";
  if (/follow[-\s]?up|come back|return|appointment/i.test(question)) return "follow-up";
  if (/warning signs?|urgent|emergency|watch for|seek care/i.test(question)) {
    return "warning signs";
  }
  return null;
}

function getAskedCarePlanFields(handledCarePlanKeys?: Set<string>): CarePlanField[] {
  if (!handledCarePlanKeys) return [];
  return Array.from(handledCarePlanKeys)
    .map((key) => key.match(/^care-plan-ask:(.+)$/)?.[1])
    .map(normalizeCarePlanField)
    .filter(Boolean) as CarePlanField[];
}

function markCarePlanFieldAsked(field: CarePlanField, handledCarePlanKeys?: Set<string>): void {
  handledCarePlanKeys?.add(`care-plan-ask:${field}`);
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
    return askOnce(
      "care-plan-ask:medication-name",
      "Doctor, could you confirm the medication name?",
    );
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

  if (!hasCarePlanFollowUp(messages) && !hasCarePlanWarningSigns(messages)) {
    const followUpKey = "care-plan-ask:follow-up";
    const warningSignsKey = "care-plan-ask:warning-signs";
    if (handledCarePlanKeys?.has(followUpKey) || handledCarePlanKeys?.has(warningSignsKey)) {
      return null;
    }
    handledCarePlanKeys?.add(followUpKey);
    handledCarePlanKeys?.add(warningSignsKey);
    return "Doctor, could you confirm when the patient should follow up and what warning signs should prompt urgent medical attention?";
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
    /\b(tablet|capsule|pill|dose|take|use|continue|finish|start|stop|prescribe)\b/i.test(
      instruction,
    );
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

function buildValidatedCarePlanGapResponse(
  result: CarePlanGapResult | undefined,
  instruction: string,
  completion: CarePlanCompletion,
  handledCarePlanKeys?: Set<string>,
): string | null {
  if (!result) return null;
  if (result.allComplete) {
    const locallyComplete =
      completion.medicationComplete &&
      completion.followUpComplete &&
      completion.warningSignsComplete;
    return locallyComplete ? "Thank you, Doctor. I’ve updated the patient’s care plan." : null;
  }

  const question = result.question?.trim();
  if (!question) return null;
  if (
    /\b(would you like|drug interactions?|no known|side effects?|rash|itching|diarrhea)\b/i.test(
      question,
    )
  ) {
    return null;
  }

  const requestedField =
    normalizeCarePlanField(result.nextField) || carePlanFieldFromQuestion(question);
  if (!requestedField) return null;
  if (carePlanFieldIsComplete(requestedField, completion)) return null;
  if (getAskedCarePlanFields(handledCarePlanKeys).includes(requestedField)) return null;

  markCarePlanFieldAsked(requestedField, handledCarePlanKeys);
  return question;
}

async function buildCarePlanResponseWithQwen({
  text,
  messages,
  state,
  patientContext,
  handledCarePlanKeys,
}: {
  text: string;
  messages: ConversationMessage[];
  state: ReturnType<typeof useApp.getState>;
  patientContext: string;
  handledCarePlanKeys?: Set<string>;
}): Promise<string | null> {
  const instruction = collectDoctorCarePlan(messages, mergeRecentDoctorCarePlan(messages, text));
  const details = extractMedicationInstructionDetails(instruction);
  const completion = getCarePlanCompletion(details, messages);
  const hasUsableInstruction =
    Boolean(details.medication) ||
    Boolean(details.dose) ||
    Boolean(details.frequency) ||
    Boolean(details.interval) ||
    Boolean(details.timing) ||
    /\b(tablet|capsule|pill|dose|take|use|continue|finish|start|stop|prescribe|follow[-\s]?up|warning signs?|urgent care|emergency|watch for|seek care)\b/i.test(
      instruction,
    );
  if (!hasUsableInstruction) return null;

  const askedFields = getAskedCarePlanFields(handledCarePlanKeys);
  if (
    completion.medicationComplete &&
    !completion.followUpComplete &&
    !completion.warningSignsComplete &&
    !askedFields.includes("follow-up") &&
    !askedFields.includes("warning signs")
  ) {
    markCarePlanFieldAsked("follow-up", handledCarePlanKeys);
    markCarePlanFieldAsked("warning signs", handledCarePlanKeys);
    return "Doctor, could you confirm when the patient should follow up and what warning signs should prompt urgent medical attention?";
  }

  try {
    const result = await analyzeCarePlanGaps({
      patientId: getPatientId(state),
      carePlanText: instruction,
      transcript: conversationToTranscript(messages),
      patientContext,
      medicationHistory: buildMedicationHistory(state),
      alreadyAskedFields: getAskedCarePlanFields(handledCarePlanKeys),
      localMedicationComplete: completion.medicationComplete,
      localMedicationNameComplete: completion.medicationNameComplete,
      localDosageComplete: completion.dosageComplete,
      localFrequencyComplete: completion.frequencyComplete,
      localDurationComplete: completion.durationComplete,
      localFollowUpComplete: completion.followUpComplete,
      localWarningSignsComplete: completion.warningSignsComplete,
    });
    const qwenResponse = buildValidatedCarePlanGapResponse(
      result.result,
      instruction,
      completion,
      handledCarePlanKeys,
    );
    if (qwenResponse) return qwenResponse;
  } catch {
    // The local care-plan checker below keeps the visit flowing if Qwen is unavailable.
  }

  return buildCarePlanAcknowledgement(text, messages, handledCarePlanKeys);
}

const AI = {
  detectIntent({
    text,
    speaker: _speaker,
    advocateActive: _advocateActive,
  }: {
    text: string;
    speaker?: ConversationSpeaker;
    advocateActive: boolean;
  }): AdvocateIntent {
    const calledMedsBuddy = WAKE_WORD_PATTERN.test(text);

    if (calledMedsBuddy) return "direct_call";
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
  semanticDecision?: SemanticIntentDecision,
): string | null {
  const patientName = getPatientDisplayName(state);
  switch (intent) {
    case "patient_history_request": {
      const currentContextResponse =
        (semanticDecision ? buildMissingApprovedContextResponse(semanticDecision, state) : null) ||
        buildDoctorPatientContextAnswer(state, approvedPreVisitSummary);
      return semanticDecision?.includePreviousVisitHistory
        ? `${currentContextResponse}\n\n${buildPreviousVisitHistorySection(state)}`
        : currentContextResponse;
    }
    case "medication_history_request":
      return `Yes, Doctor. On ${patientName}'s behalf, here is the medication context I found: ${getLastMedicationText(state)}`;
    case "visit_summary_request":
      return buildDoctorVisitReasonAnswer(state, approvedPreVisitSummary);
    case "warning_signs_request":
      return `Doctor, for ${patientName}'s safety, the warning signs captured so far are: ${getWarningSignText(messages)}`;
    case "doctor_answers_request":
      return `Doctor, here is what I captured from your guidance so far: ${getDoctorAnswerText(messages)}`;
    case "care_plan_instruction":
      return buildCarePlanAcknowledgement(text, messages, handledCarePlanKeys);
    case "direct_call":
      return `Yes, Doctor. I am listening and can speak on ${patientName}'s behalf. What would you like to know?`;
    case "normal_conversation":
      return null;
    case "none":
      return null;
  }
}

function isFastLocalIntent(intent: AdvocateIntent): boolean {
  return intent === "direct_call";
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
    const result = await routeMedsBuddyAgent({
      patientId: getPatientId(state),
      message: latestTranscript,
      mode: "doctor_visit_live",
      conversation: currentTranscript
        .split("\n")
        .filter(Boolean)
        .slice(-12)
        .map((line) => ({ role: "user", content: line })),
      currentState: {
        approvedPreVisitSummary: patientContext,
        currentVisitTranscript: currentTranscript || "No transcript yet.",
        medicationHistory: buildMedicationHistory(state),
        patientContext: state.patientContext,
        profile: {
          name: state.profile.name,
          allergies: state.profile.allergies,
          conditions: state.profile.conditions,
        },
      },
    });
    const decision = parseSemanticIntentDecision(JSON.stringify(result.result ?? {}));
    if (!decision) {
      console.info("[MedsBuddy agent-router] No doctor-visit decision parsed", result.result);
    }
    return decision;
  } catch (error) {
    console.warn("[MedsBuddy agent-router] Doctor visit routing failed", error);
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
    const response = typeof parsed.response === "string" ? parsed.response.trim() : "";
    return {
      speaker,
      intent,
      shouldRespond: Boolean(parsed.shouldRespond),
      response: sanitizeDoctorVisitAgentResponse(response, intent),
      requestedFields: normalizePatientContextRequestFields(parsed.requestedFields),
      missingFields: normalizePatientContextRequestFields(parsed.missingFields),
      patientClarificationQuestion:
        typeof parsed.patientClarificationQuestion === "string"
          ? parsed.patientClarificationQuestion.trim()
          : "",
      includePreviousVisitHistory: Boolean(parsed.includePreviousVisitHistory),
    };
  } catch {
    return null;
  }
}

function sanitizeDoctorVisitAgentResponse(response: string, intent: AdvocateIntent): string {
  if (!response) return "";
  if (
    /\b(would you like(?: me)?|drug interactions?|no known|side effects?|contraindications?|rash|itching|diarrhea)\b/i.test(
      response,
    )
  ) {
    return "";
  }
  if (intent === "care_plan_instruction") {
    const allowedCarePlanResponse =
      /^Doctor, could you confirm\b/i.test(response) ||
      /^Thank you, Doctor\. I[’']ve updated the patient[’']s care plan\.?$/i.test(response) ||
      /^No further questions, Doctor\./i.test(response);
    return allowedCarePlanResponse ? response : "";
  }
  return response;
}

function normalizePatientContextRequestFields(fields: unknown): PatientContextRequestField[] {
  if (!Array.isArray(fields)) return [];
  const allowedFields = new Set<PatientContextRequestField>([
    "reason for visit",
    "symptoms",
    "medications",
    "allergies",
    "medical history",
    "duration",
    "concerns",
    "questions for doctor",
  ]);
  const normalized: PatientContextRequestField[] = [];
  for (const field of fields) {
    const clean = String(field).toLowerCase().trim();
    if (!allowedFields.has(clean as PatientContextRequestField)) continue;
    const typedField = clean as PatientContextRequestField;
    if (!normalized.includes(typedField)) normalized.push(typedField);
  }
  return normalized;
}

function normalizeAdvocateIntent(intent: unknown): AdvocateIntent | null {
  const value = String(intent ?? "").trim() as AdvocateIntent;
  const allowed = new Set<AdvocateIntent>([
    "direct_call",
    "patient_history_request",
    "medication_history_request",
    "visit_summary_request",
    "warning_signs_request",
    "doctor_answers_request",
    "care_plan_instruction",
    "normal_conversation",
    "none",
  ]);
  return allowed.has(value) ? value : null;
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
    /\b(take|start|continue|stop|finish|prescribe|prescribed|follow up|follow-up|come back|schedule|urgent care|emergency|warning signs?|monitor|care plan|plan is|instructions?)\b/i.test(
      clean,
    )
  ) {
    return "treatment_plan";
  }

  if (
    /\b(my diagnosis is|the diagnosis is|diagnosis|diagnosed|assessment|i think this is|i believe this is|this looks like|it looks like|this is likely|most likely)\b/i.test(
      clean,
    )
  ) {
    return "diagnosis";
  }

  if (/\b(exam|examine|assessment|look at|check|move your|range of motion)\b/i.test(clean)) {
    return "physical_assessment";
  }

  return "patient_history";
}

function canMedsBuddyRespondInStage(stage: VisitStage, intent: AdvocateIntent): boolean {
  if (
    intent === "patient_history_request" ||
    intent === "medication_history_request" ||
    intent === "visit_summary_request" ||
    intent === "direct_call"
  ) {
    return true;
  }

  if (stage === "patient_history" || stage === "physical_assessment") {
    return false;
  }

  if (stage === "diagnosis") {
    return intent === "doctor_answers_request" || intent === "warning_signs_request";
  }

  if (stage === "treatment_plan") {
    return (
      intent === "care_plan_instruction" ||
      intent === "warning_signs_request" ||
      intent === "doctor_answers_request"
    );
  }

  return true;
}

function shouldUseLlmVisitReasoning({
  latestText: _latestText,
  latestSpeaker: _latestSpeaker,
  latestSpeakerConfidence: _latestSpeakerConfidence,
  fastIntent: _fastIntent,
}: {
  latestText: string;
  latestSpeaker?: ConversationSpeaker;
  latestSpeakerConfidence: number;
  fastIntent: AdvocateIntent;
}): boolean {
  return true;
}

function analyzeTranscriptForAdvocateAlert(
  _transcript: string,
  _patientContext: string,
): AdvocateAlert | null {
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
      text: "Thank you, Doctor. I’ll stay quiet unless you ask me a question or a care-plan detail needs clarification.",
    },
  ];
}

function cleanVisitLine(text: string): string {
  return cleanSpeechToTextTranscript(text)
    .replace(STOP_TALKING_PATTERN, " ")
    .replace(START_TALKING_PATTERN, " ")
    .replace(WAKE_WORD_PATTERN, " ")
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

function getContextConcernText(patientContext: string): string {
  const reason = patientContext.match(/Reason for Visit\s*-?\s*([^\n]+)/i)?.[1]?.trim();
  if (reason) return reason;
  const firstLine = patientContext
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !/^before today's appointment/i.test(line));
  return firstLine ?? "";
}

function buildSummaryFromTranscript(
  messages: ConversationMessage[],
  patientContext = "",
): VisitSummaryData {
  const cleanMessages = cleanVisitTranscript(messages);
  const patientLines = getSpeakerLines(cleanMessages, "Patient");
  const doctorLines = getSpeakerLines(cleanMessages, "Doctor");
  const medsBuddyLines = getSpeakerLines(cleanMessages, "MedsBuddy");
  const contextConcernText = getContextConcernText(patientContext);
  const patientConcernText = patientLines.length
    ? getPatientConcernText(cleanMessages)
    : contextConcernText || "No patient concerns were captured in the visit transcript.";
  const doctorAnswerText = getDoctorAnswerText(cleanMessages);
  const warningSignText = getWarningSignText(cleanMessages);
  const diagnosisText = getDiagnosisText(cleanMessages);
  const medicationChangesText = getMedicationGuidanceText(cleanMessages);
  const followUpText = getFollowUpText(cleanMessages);
  const visitSummaryText = contextConcernText
    ? `The visit focused on ${contextConcernText}.`
    : patientLines.length
      ? `The visit focused on ${patientConcernText}.`
      : "MedsBuddy captured the doctor visit conversation and generated a structured summary.";
  const nextQuestions = [
    diagnosisText.startsWith("No confirmed") && "What is the likely diagnosis or main concern?",
    medicationChangesText.startsWith("No medication") &&
      "Are there any medication changes or missed-dose instructions?",
    followUpText.startsWith("No specific") && "When should the patient follow up?",
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
    doctorAssessment: doctorLines.length
      ? doctorAnswerText
      : "No doctor assessment was captured yet.",
    medsBuddyQuestions: medsBuddyLines.length
      ? medsBuddyLines.join(" ")
      : "MedsBuddy did not need to ask an additional question.",
    doctorAnswers: doctorLines.length ? doctorAnswerText : "No doctor assessment was captured yet.",
    medicationGuidance: medicationChangesText,
    warningSigns: warningSignText,
    followUpPlan: followUpText,
    simpleExplanation:
      contextConcernText || patientLines.length
        ? `The visit focused on ${contextConcernText || patientConcernText}.`
        : "MedsBuddy summarized the visit conversation and doctor instructions.",
    caregiverSummary:
      contextConcernText || patientLines.length
        ? `Patient concerns: ${contextConcernText || patientConcernText}. Doctor guidance: ${medicationChangesText || doctorAnswerText}`
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

export {
  AI,
  ADVOCATE_ALERT_COOLDOWN_MS,
  TRANSCRIPT_MERGE_DELAY_MS,
  analyzeTranscriptForAdvocateAlert,
  buildCarePlanResponseWithQwen,
  buildDoctorConsentMessage,
  buildDoctorPatientContextAnswer,
  buildIntentResponse,
  buildMedicationHistory,
  buildPatientSummary,
  buildReadablePreVisitFallback,
  buildSpokenVisitSummary,
  buildSummaryFromTranscript,
  buildVisitOpeningMessages,
  canMedsBuddyRespondInStage,
  cleanSpeechToTextTranscript,
  cleanTranscriptInput,
  cleanVisitTranscript,
  conversationToTranscript,
  dedupeConversation,
  detectSemanticIntentWithLLM,
  detectVisitStage,
  extractPrescribedMedicationFromCarePlan,
  getPatientId,
  getSupportedRecordingMimeType,
  getTranscriptDelta,
  isFastLocalIntent,
  isLowValueTranscript,
  isStartTalkingCommand,
  isStopTalkingCommand,
  lastMedsBuddyQuestionWasForDoctor,
  lastMedsBuddyQuestionWasForPatient,
  looksLikeDoctorAnswerToMedsBuddy,
  looksLikePatientFirstPersonStatement,
  mergeAdjacentConversationMessages,
  mergeRemoteSummary,
  normalizeTranscriptText,
  parseTranscriptMessages,
  semanticSpeakerToConversationSpeaker,
  shouldUseLlmVisitReasoning,
};

export type {
  AdvocateAlertTopic,
  AdvocateIntent,
  ConversationMessage,
  ConversationSpeaker,
  DemoStage,
  DoctorVisitConsent,
  SemanticIntentDecision,
  SpeakerMode,
  VisitStage,
  VisitSummaryData,
};
