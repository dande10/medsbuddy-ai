import { aiChat } from "@/lib/ai-chat.functions";
import { adherence, useApp } from "@/lib/store";

export function buildPatientSummary(state: ReturnType<typeof useApp.getState>): string {
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

  return [
    `Patient: ${profile.name || "Demo patient"}.`,
    `Current medications: ${medText}.`,
    `7-day adherence: ${adh} percent, with ${taken} taken and ${missed} missed or skipped doses.`,
    `Recent symptoms: ${symptomText}.`,
    profile.conditions ? `Conditions: ${profile.conditions}.` : "",
    profile.allergies ? `Allergies: ${profile.allergies}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type DemoStage = "idle" | "consent" | "active" | "summary";
export type ConversationSpeaker = "Doctor" | "Patient" | "MedsBuddy";
export type SpeakerMode = "Auto" | "Doctor" | "Patient";
export type ConversationMessage = { speaker: ConversationSpeaker; text: string };
export type DoctorVisitConsent = "pending" | "granted" | "declined";
export type AdvocateAlertTopic =
  | "patient-symptom-clarification"
  | "dizziness-after-medication"
  | "missed-medication-doses"
  | "medication-side-effects"
  | "care-plan-warning-signs"
  | "follow-up-timing"
  | "diagnosis-explanation";
export type AdvocateAlert = { topic: AdvocateAlertTopic; response: string };
export type AdvocateIntent =
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
export type SemanticIntentDecision = {
  speaker: "doctor" | "patient" | "medsbuddy" | "unknown";
  intent: AdvocateIntent;
  shouldRespond: boolean;
  response: string;
};
export type VisitSummaryData = {
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

export const WAKE_WORD_PATTERN =
  /\b(?:(?:hey|okay|ok|hello|hi)\s+)?(?:meds\s*buddy|medz\s*buddy|medsbuddy|medbuddy|miss\s*buddy|mrs\s*buddy|matt'?s?\s*body|meds\s*body|miss\s*body|it'?s\s*buddy|made\s+his\s+body)\b/i;
export const ADVOCATE_ALERT_COOLDOWN_MS = 8000;

export function cleanTranscriptInput(text: string): string {
  return text.replace(/^\s*(doctor|patient|medsbuddy)\s*:\s*/i, "").trim();
}

export function normalizeTranscriptText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function splitIntoPhrases(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+|;\s*/)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

export function removeDuplicateRepeatedPhrases(text: string): string {
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

export function isLowValueTranscript(text: string): boolean {
  const clean = normalizeTranscriptText(text)
    .replace(/[^\w\s]/g, "")
    .trim();
  if (!clean) return true;
  if (/^(doctor|patient|medsbuddy|say doctor|a doctor|the doctor)$/.test(clean)) return true;
  if (/^\d+\s*(a\s*)?doctor$/.test(clean)) return true;
  return clean.split(/\s+/).length < 3 && !WAKE_WORD_PATTERN.test(clean);
}

export function getTranscriptDelta(
  currentTranscript: string,
  lastProcessedTranscript: string,
): string {
  const current = currentTranscript.trim();
  const previous = lastProcessedTranscript.trim();
  if (!previous) return current;
  if (normalizeTranscriptText(current) === normalizeTranscriptText(previous)) return "";
  if (current.startsWith(previous)) return current.slice(previous.length).trim();
  return current;
}

export function parseTranscriptMessages(
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
      messages.push({
        speaker: inferSpeakerFromTranscript(turn, context),
        text: turn,
      });
    }
    return messages;
  }

  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? clean.length;
      const text = removeDuplicateRepeatedPhrases(clean.slice(start, end));
      const matchedSpeaker = match[1] as ConversationSpeaker;
      return text ? { speaker: matchedSpeaker, text } : null;
    })
    .filter((message): message is ConversationMessage => Boolean(message));
}

export function splitTranscriptIntoPossibleTurns(text: string): string[] {
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

export function semanticSpeakerToConversationSpeaker(
  speaker: SemanticIntentDecision["speaker"],
): ConversationSpeaker | null {
  if (speaker === "doctor") return "Doctor";
  if (speaker === "patient") return "Patient";
  if (speaker === "medsbuddy") return "MedsBuddy";
  return null;
}

export function inferSpeakerFromTranscript(
  text: string,
  existingMessages: ConversationMessage[],
): ConversationSpeaker {
  const clean = normalizeTranscriptText(text);
  const withoutWakeWord = normalizeTranscriptText(text.replace(WAKE_WORD_PATTERN, " "));
  const recentHumanMessages = [...existingMessages]
    .reverse()
    .filter((message) => message.speaker === "Doctor" || message.speaker === "Patient");
  const recentHumanMessage = recentHumanMessages[0];
  const previousHumanMessage = recentHumanMessages[1];

  if (
    /\b(i|i'm|i am|i’ve|i have|me|my|mine)\b/i.test(withoutWakeWord) &&
    /\b(have|had|feel|feeling|get|getting|missed|took|taking|hurt|hurts|pain|fever|dizzy|dizziness|tired|fatigue|nausea|vomit|headache|back pain|leg pain|sick|weak|worse|better|sleep|sleeping)\b/i.test(
      withoutWakeWord,
    )
  ) {
    return "Patient";
  }

  if (
    /\b(pain|fever|dizzy|dizziness|tired|fatigue|nausea|vomit|headache|back pain|leg pain|sick|weak|symptom|symptoms)\b/i.test(
      withoutWakeWord,
    ) &&
    !/\b(what|when|how|does she|does he|is she|is he|patient history|give me|show me|tell me|check)\b/i.test(
      withoutWakeWord,
    )
  ) {
    return "Patient";
  }

  if (/^patient\b/i.test(clean)) return "Patient";
  if (WAKE_WORD_PATTERN.test(text) || looksLikeDoctorRequestForMedsBuddy(text)) return "Doctor";

  if (recentHumanMessage?.speaker === "Doctor") {
    if (looksLikeDoctorQuestionToPatient(recentHumanMessage.text)) return "Patient";
    if (previousHumanMessage?.speaker === "Patient" && looksLikeDoctorCarePlanInstruction(text)) {
      return "Doctor";
    }
  }

  if (
    recentHumanMessage?.speaker === "Patient" &&
    (looksLikeDoctorCarePlanInstruction(text) || looksLikeDoctorQuestionToPatient(text))
  ) {
    return "Doctor";
  }

  if (
    /\b(take|continue|stop|start|prescribe|prescribed|schedule|follow up|come back|urgent care|warning signs|blood pressure|antibiotic|amoxicillin|dose|twice|daily|every day|how long|when did|what brings|symptoms|history|medication)\b/i.test(
      clean,
    )
  ) {
    return "Doctor";
  }

  if (/\?$/.test(clean)) return "Doctor";

  return recentHumanMessage?.speaker ?? "Patient";
}

export function looksLikeDoctorQuestionToPatient(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  return (
    /\?$/.test(clean) ||
    /\b(what brings|how are you|how have you|how long|when did|are you taking|do you have|any fever|any pain|tell me|describe|where is|does it|is it|have you)\b/i.test(
      clean,
    )
  );
}

export function dedupeConversation(messages: ConversationMessage[]): ConversationMessage[] {
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

export function conversationToTranscript(messages: ConversationMessage[]): string {
  return dedupeConversation(messages)
    .map((row) => `${row.speaker}: ${row.text}`)
    .join("\n");
}

export function getSpeakerLines(
  messages: ConversationMessage[],
  speaker: ConversationSpeaker,
): string[] {
  return dedupeConversation(messages)
    .filter((message) => message.speaker === speaker)
    .map((message) => message.text);
}

export function joinLines(lines: string[], fallback: string): string {
  const clean = lines.map(removeDuplicateRepeatedPhrases).filter(Boolean);
  return clean.length ? clean.join(" ") : fallback;
}

export function getPatientConcernText(messages: ConversationMessage[]): string {
  return joinLines(
    getSpeakerLines(messages, "Patient"),
    "No patient concerns have been captured yet.",
  );
}

export function getDoctorAnswerText(messages: ConversationMessage[]): string {
  return joinLines(
    getSpeakerLines(messages, "Doctor"),
    "No doctor response has been captured yet.",
  );
}

export function getWarningSignText(messages: ConversationMessage[]): string {
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

export function getLastMedicationText(state: ReturnType<typeof useApp.getState>): string {
  const lastDose = [...state.doses].sort((a, b) => b.at - a.at)[0];
  if (lastDose) {
    return `${lastDose.medName} was last marked ${lastDose.status} on ${new Date(lastDose.at).toLocaleString()}.`;
  }
  const firstMedication = state.meds[0];
  if (firstMedication) {
    return `${firstMedication.name} ${firstMedication.dosage}, ${firstMedication.frequency}. No recent dose log is available.`;
  }
  return "I do not see any medication or recent dose logged yet.";
}

export function getSleepHistoryText(state: ReturnType<typeof useApp.getState>): string {
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

export function getPatientHistoryText(state: ReturnType<typeof useApp.getState>): string {
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

export function getPatientDisplayName(state: ReturnType<typeof useApp.getState>): string {
  return state.profile.name?.trim() || "the patient";
}

export function looksLikeDoctorCarePlanInstruction(text: string): boolean {
  const clean = normalizeTranscriptText(text);
  if (/give me|tell me|show me|patient history|history|details|information/.test(clean)) {
    return false;
  }
  return /(?:i will|i'll|we will|start|prescrib|give (?:her|him|the patient|you)|take|continue|stop|finish|schedule|follow up|follow-up|twice|daily|every day|amoxicillin|antibiotic|mg|tablet|capsule)/i.test(
    clean,
  );
}

export function buildCarePlanAcknowledgement(text: string): string {
  const instruction = cleanTranscriptInput(text)
    .replace(WAKE_WORD_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return `Understood, Doctor. I captured this care instruction: ${instruction}. Please confirm the dose, timing, and duration so I can summarize it clearly for the patient.`;
}

export const AI = {
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
    const doctorCanRequest = speaker === "Doctor" && (advocateActive || calledMedsBuddy);
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
    return "none";
  },
};

export function buildIntentResponse(
  intent: AdvocateIntent,
  text: string,
  messages: ConversationMessage[],
  state: ReturnType<typeof useApp.getState>,
): string | null {
  const patientName = getPatientDisplayName(state);
  switch (intent) {
    case "patient_history_request":
      return `Yes, Doctor. On ${patientName}'s behalf, here is the relevant patient history: ${getPatientHistoryText(state)}`;
    case "medication_history_request":
      return `Yes, Doctor. On ${patientName}'s behalf, here is the medication context I found: ${getLastMedicationText(state)}`;
    case "sleep_history_request":
      return `Yes, Doctor. On ${patientName}'s behalf, here is the sleep context: ${getSleepHistoryText(state)}`;
    case "visit_summary_request":
      return `Yes, Doctor. On ${patientName}'s behalf, the main concerns captured so far are: ${getPatientConcernText(messages)}`;
    case "warning_signs_request":
      return `Doctor, for ${patientName}'s safety, the warning signs captured so far are: ${getWarningSignText(messages)}`;
    case "doctor_answers_request":
      return `Doctor, here is what I captured from your guidance so far: ${getDoctorAnswerText(messages)}`;
    case "care_plan_instruction":
      return buildCarePlanAcknowledgement(text);
    case "direct_call":
      return `Yes, Doctor. I am listening and can speak on ${patientName}'s behalf. What would you like to know?`;
    case "normal_conversation":
      return null;
    case "none":
      return null;
  }
}

export async function detectSemanticIntentWithLLM({
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
              "MedsBuddy's job is to speak directly to the doctor on behalf of the patient when it would help the patient's care or understanding.",
              "When shouldRespond is true, write the response as spoken words MedsBuddy would say out loud in the exam room.",
              "Prefer doctor-facing advocacy phrasing such as: Doctor, the patient would like to clarify... or Doctor, on the patient's behalf...",
              "Return ONLY valid JSON with this exact shape:",
              '{"speaker":"doctor|patient|medsbuddy|unknown","intent":"patient_history_request|medication_history_request|sleep_history_request|visit_summary_request|warning_signs_request|doctor_answers_request|care_plan_instruction|direct_call|normal_conversation|none","shouldRespond":true|false,"response":"short spoken response or empty string"}',
              "Set shouldRespond true only when MedsBuddy should speak now.",
              "If the doctor asks for patient history in any wording, intent is patient_history_request.",
              "If the doctor asks for meds, dose, last medication, current prescriptions, or adherence, intent is medication_history_request.",
              "If the doctor asks for summary/main concerns/what has been happening, intent is visit_summary_request.",
              "If the patient reports a concerning symptom and the doctor has not yet clarified cause, severity, medication relation, warning signs, or next steps, shouldRespond true with a brief doctor-facing clarification question.",
              "If the doctor gives instructions without timing, side effects, warning signs, or follow-up details, shouldRespond true with a brief doctor-facing clarification question.",
              "If conversation is normal doctor-patient talk, shouldRespond false and intent normal_conversation.",
              "If MedsBuddy should answer, write a concise spoken response using the provided context. Do not overtalk.",
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

export function parseSemanticIntentDecision(reply: string): SemanticIntentDecision | null {
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

export function normalizeAdvocateIntent(intent: unknown): AdvocateIntent | null {
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

export function looksLikeDoctorRequestForMedsBuddy(text: string): boolean {
  return (
    AI.detectIntent({
      text,
      speaker: "Doctor",
      advocateActive: true,
    }) !== "none"
  );
}

export function analyzeTranscriptForAdvocateAlert(
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

export function getPatientFirstName(patientContext: string): string {
  const match = patientContext.match(/Patient:\s*([^.\s]+)/i);
  return match?.[1] || "the patient";
}

export function buildDoctorConsentMessage(): ConversationMessage {
  return {
    speaker: "MedsBuddy",
    text: "Hello Doctor. I am MedsBuddy, the patient's AI Patient Advocate. With the patient's permission, I would like to speak on her behalf, listen during today's visit, record this conversation, and create a visit summary for her after the appointment. Do I have your consent to participate?",
  };
}

export function buildVisitOpeningMessages(): ConversationMessage[] {
  return [
    {
      speaker: "MedsBuddy",
      text: "Thank you, Doctor. I’ll stay quiet unless you ask me a question or a care-plan detail needs clarification.",
    },
  ];
}

export function buildSummaryFromTranscript(messages: ConversationMessage[]): VisitSummaryData {
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

export function buildSpokenVisitSummary(summary: VisitSummaryData): string {
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
