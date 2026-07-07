type JsonRecord = Record<string, unknown>;

const DEFAULT_API_BASE_URL = "";

export function getMedsBuddyApiBaseUrl(): string {
  const configured =
    (import.meta.env.VITE_MEDSBUDDY_API_BASE_URL as string | undefined)?.trim() ||
    DEFAULT_API_BASE_URL;
  const normalized = configured.replace(/\/$/, "");

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    normalized.startsWith("http://")
  ) {
    return "";
  }

  return normalized;
}

export function medsBuddyApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getMedsBuddyApiBaseUrl()}${normalizedPath}`;
}

async function postJson<T>(path: string, body: JsonRecord): Promise<T> {
  const url = medsBuddyApiUrl(path);
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    if (/^\s*<!doctype html/i.test(error) || /<html/i.test(error)) {
      throw new Error(
        `MedsBuddy backend endpoint was not found at ${url}. Check MEDSBUDDY_API_BASE_URL for Vercel proxy or VITE_MEDSBUDDY_API_BASE_URL for local/HTTPS backends, then restart the app.`,
      );
    }
    throw new Error(error || `MedsBuddy API failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function transcribeAudio(audio: Blob): Promise<{ text: string; rawText?: string }> {
  const url = medsBuddyApiUrl("/api/stt");
  const formData = new FormData();
  const extension = audio.type.includes("mp4") ? "m4a" : "webm";
  formData.append("audio", audio, `doctor-visit.${extension}`);

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 45000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || `ElevenLabs STT failed: ${response.status}`);
  }

  return (await response.json()) as { text: string; rawText?: string };
}

export type MedsBuddyApiResult<T> = {
  patientId?: string;
  qwen?: string;
  result?: T;
  summary?: T;
};

export type AnalyzeTranscriptResult = {
  speaker?: "doctor" | "patient" | "medsbuddy" | "unknown";
  intent?: string;
  confidence?: number;
  shouldRespond?: boolean;
  response?: string;
  requestedFields?: string[];
  missingFields?: string[];
  patientClarificationQuestion?: string;
  includePreviousVisitHistory?: boolean;
  memoryUsed?: boolean;
};

export type CarePlanGapResult = {
  missingFields?: string[];
  nextField?: string;
  question?: string;
  allComplete?: boolean;
  reason?: string;
};

export type StructuredVisitSummary = {
  visitSummary?: string;
  diagnosis?: string;
  medications?: string;
  medicationChanges?: string;
  allergies?: string;
  followUp?: string;
  followUpInstructions?: string;
  warningSigns?: string;
  patientFriendlyExplanation?: string;
  simpleExplanation?: string;
  caregiverShareSummary?: string;
  caregiverSummary?: string;
};

export type ExtractedPatientContext = {
  visitReason: string;
  symptoms: string[];
  medications: string[];
  onset: string;
  duration: string;
  patientNotes: string[];
  concerns: string[];
  questionsForDoctor: string[];
};

export type AgentRouterResult = {
  speaker?: "doctor" | "patient" | "medsbuddy" | "unknown";
  intent?: string;
  confidence?: number;
  action?:
    | "update_profile"
    | "add_symptom"
    | "remove_symptom"
    | "add_medication"
    | "log_dose"
    | "doctor_visit_prep"
    | "navigate"
    | "generate_qr"
    | "new_chat"
    | "open_previous_chat"
    | "generate_doctor_visit_summary"
    | "answer"
    | "ask_follow_up";
  data?: JsonRecord;
  needsSave?: boolean;
  navigateTo?: string;
  response?: string;
  requestedFields?: string[];
  missingFields?: string[];
  patientClarificationQuestion?: string;
  includePreviousVisitHistory?: boolean;
  memoryUsed?: boolean;
};

export function analyzeTranscript(payload: {
  patientId: string;
  transcript: string;
  patientContext?: string;
  medicationHistory?: string;
}) {
  return postJson<MedsBuddyApiResult<AnalyzeTranscriptResult>>(
    "/api/medsbuddy/analyze-transcript",
    payload,
  );
}

export function analyzeCarePlanGaps(payload: {
  patientId: string;
  carePlanText: string;
  transcript?: string;
  patientContext?: string;
  medicationHistory?: string;
  alreadyAskedFields?: string[];
  localMedicationComplete?: boolean;
  localMedicationNameComplete?: boolean;
  localDosageComplete?: boolean;
  localFrequencyComplete?: boolean;
  localDurationComplete?: boolean;
  localFollowUpComplete?: boolean;
  localWarningSignsComplete?: boolean;
}) {
  return postJson<MedsBuddyApiResult<CarePlanGapResult>>("/api/medsbuddy/care-plan-gap", payload);
}

export function generateVisitSummary(payload: {
  patientId: string;
  transcript: string;
  patientContext?: string;
  medicationHistory?: string;
}) {
  return postJson<MedsBuddyApiResult<StructuredVisitSummary>>(
    "/api/medsbuddy/generate-summary",
    payload,
  );
}

export function humanizePreVisitSummary(payload: { patientId: string; rawPatientContext: string }) {
  return postJson<{ patientId: string; qwen?: string; summary: string }>(
    "/api/medsbuddy/humanize-previsit-summary",
    payload,
  );
}

export function generateDoctorHandoff(payload: {
  patientId: string;
  approvedPreVisitSummary: string;
  patientContext?: JsonRecord;
  medicationHistory?: string;
}) {
  return postJson<{ patientId: string; qwen?: string; handoff: string }>(
    "/api/medsbuddy/doctor-handoff",
    payload,
  );
}

export function extractPatientContext(payload: {
  patientId: string;
  conversation: { role: "user" | "assistant"; content: string }[];
}) {
  return postJson<{ patientId: string; qwen?: string; patientContext: ExtractedPatientContext }>(
    "/api/medsbuddy/extract-patient-context",
    payload,
  );
}

export function saveVisitMemory(payload: {
  patientId: string;
  visitSummary: string;
  diagnosis?: string;
  medications?: string;
  allergies?: string;
  followUp?: string;
  warningSigns?: string;
  approvedByPatient?: boolean;
}) {
  return postJson<{ saved: boolean; memory: JsonRecord }>("/api/medsbuddy/save-memory", payload);
}

export function chatWithMedsBuddy(payload: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}) {
  return postJson<{ reply: string; qwen?: string }>("/api/medsbuddy/chat", payload);
}

export function routeMedsBuddyAgent(payload: {
  patientId: string;
  message: string;
  conversation?: { role: "user" | "assistant"; content: string }[];
  currentState?: JsonRecord;
  mode?: "app" | "doctor_visit_live";
}) {
  return postJson<MedsBuddyApiResult<AgentRouterResult>>("/api/medsbuddy/agent-router", payload);
}
