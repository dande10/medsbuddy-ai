import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { MicButton } from "@/components/mic-button";
import { AiOrb } from "@/components/ai-orb";
import { useApp, type ChatMessage, type PatientContext } from "@/lib/store";
import {
  detectNavigationIntent,
  isHighConfidenceNavigation,
  logNavigationIntent,
} from "@/lib/nav-commands";
import {
  chatWithMedsBuddy,
  extractPatientContext,
  routeMedsBuddyAgent,
  type AgentRouterResult,
} from "@/lib/alibaba-api";
import { speak, stopSpeaking } from "@/lib/voice";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Send, Sparkles, History, Plus, X, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff } from "lucide-react";
import { useConnectivity } from "@/lib/connectivity";

export const Route = createFileRoute("/talk/$threadId")({
  head: () => ({
    meta: [
      { title: "Talk — MedsBuddy" },
      { name: "description", content: "Speak naturally with your AI patient advocate." },
    ],
  }),
  component: TalkThreadPage,
});

const SUGGESTIONS = [
  "How are you today?",
  "Who are you?",
  "I have a symptom I want to remember",
  "Help me prepare for my doctor visit",
];

function buildSystemPrompt(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms } = state;
  const recentDoses = doses
    .slice(0, 10)
    .map((d) => `${d.medName} was ${d.status}`)
    .join("; ");
  const recentSymp = symptoms
    .slice(0, 8)
    .map((s) => s.name)
    .filter((name, index, all) => all.indexOf(name) === index)
    .join("; ");
  return [
    "You are MedsBuddy, an AI Patient Advocate — a caring healthcare companion, not a chatbot, assistant, search engine, or registration form.",
    "",
    "## Identity & purpose",
    "Name: MedsBuddy. Role: AI Patient Advocate.",
    "Mission: help the patient remember important health information, track symptoms, organize medications, prepare for doctor visits, and feel supported throughout their healthcare journey.",
    "When the patient asks who or what you are, proactively explain your purpose in warm, human language.",
    "",
    "## Voice & personality",
    "Sound like a kind person talking, not a report, chart note, checklist, or medical article.",
    "Use 2–3 short sentences by default. Avoid markdown, bullet symbols, timestamps, severity labels, emojis, and long lists unless the patient asks.",
    "Start with empathy, then give one clear next step or one gentle question.",
    "Do not say you added, logged, saved, or made a note of something. The app can track quietly in the background.",
    "Never say you cannot navigate screens, pages, tabs, or the app interface. MedsBuddy is inside the app and can help the patient use app flows when asked.",
    "If the patient asks to prepare for a doctor visit, help immediately: summarize the main concern, ask one short follow-up question, and explain that the Doctor Visit page will use the approved context.",
    "",
    "## Proactive care",
    "Acknowledge symptoms warmly. If a symptom is mentioned, you may say you can help track it, but do not announce internal logging details unless the patient asks.",
    "For possible causes, give a short, careful answer and suggest checking with a clinician when symptoms are severe, new, worsening, or concerning.",
    "",
    "## Boundaries",
    "You are not a doctor. For urgent or life-threatening symptoms, kindly tell the patient to call emergency services.",
    "Use the patient context below — never invent medications or symptoms.",
    "",
    "## Patient context",
    `Patient: ${profile.name || "Unknown"}, DOB ${profile.dob || "?"}, allergies: ${profile.allergies || "none recorded"}, conditions: ${profile.conditions || "none recorded"}.`,
    `Medications: ${meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join("; ") || "none"}.`,
    `Recent doses: ${recentDoses || "none"}.`,
    `Recent symptoms: ${recentSymp || "none"}.`,
  ].join("\n");
}

function isMeaningfulPatientContextMessage(text: string): boolean {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 8) return false;
  return /\b(doctor|visit|appointment|symptom|medication|medicine|dose|started|timeline|concern|worried|question|ask|health|feel|feeling)\b/i.test(
    clean,
  );
}

function normalizeClinicalText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getClinicalKeywords(text: string): string[] {
  const stopWords = new Set([
    "about",
    "concern",
    "concerns",
    "discomfort",
    "possible",
    "patient",
    "symptom",
    "symptoms",
    "while",
    "with",
  ]);
  return normalizeClinicalText(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

function clinicalTextMentionsItem(text: string, item: string): boolean {
  const cleanText = normalizeClinicalText(text);
  const cleanItem = normalizeClinicalText(item);
  if (!cleanText || !cleanItem) return false;
  if (cleanText.includes(cleanItem)) return true;

  const keywords = getClinicalKeywords(item);
  if (!keywords.length) return false;
  const matches = keywords.filter((word) => cleanText.includes(word)).length;
  return matches >= Math.min(2, keywords.length);
}

function getCurrentVisitConversationText(
  state: ReturnType<typeof useApp.getState>,
  extraText = "",
): string {
  const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
  const currentMessages = state.threads.flatMap((thread) =>
    thread.messages
      .filter((message) => message.role === "user" && message.at >= currentVisitStartedAt)
      .map((message) => message.content),
  );
  return [...currentMessages, extraText].join(" ");
}

function getSavedVisitSummaryText(state: ReturnType<typeof useApp.getState>): string {
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

function filterCurrentVisitPatientContext(
  context: Partial<Omit<PatientContext, "updatedAt">>,
  state: ReturnType<typeof useApp.getState>,
  latestText = "",
): Partial<Omit<PatientContext, "updatedAt">> {
  const currentConversationText = getCurrentVisitConversationText(state, latestText);
  const savedVisitSummaryText = getSavedVisitSummaryText(state);

  return {
    ...context,
    symptoms: context.symptoms?.filter((symptom) => {
      if (clinicalTextMentionsItem(currentConversationText, symptom)) return true;
      return !clinicalTextMentionsItem(savedVisitSummaryText, symptom);
    }),
  };
}

function getPatientIdForContext(state: ReturnType<typeof useApp.getState>): string {
  return (
    state.profile.name
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "default-patient"
  );
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function humanizeAssistantReply(reply: string): string {
  const withoutNoteLanguage = reply
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^Of course\s+[—-]\s*/i, "")
    .replace(
      /\b(?:just to clarify,?\s*)?I\s+(?:do not|don't)\s+navigate\s+(?:screens|pages|tabs|the app interface)[^.!?]*(?:[.!?]\s*)?/gi,
      "",
    )
    .replace(/\bWhat I can do is\s+help you prepare\b/gi, "I can help you prepare")
    .replace(
      /\b(?:I[’']ve|I have)\s+(?:added|logged|saved|made a note of)\b[^.!?]*(?:[.!?]\s*)?/gi,
      "",
    )
    .replace(/\(?\b\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}\s*(?:AM|PM)?[^)]*\)?/gi, "")
    .replace(/\bseverity\s+\d+\s*(?:\([^)]+\))?/gi, "")
    .replace(/(?:^|\n)\s*(?:-|◆|🔹)\s*/gu, " ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = withoutNoteLanguage.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [withoutNoteLanguage];
  const shortReply = sentences.slice(0, 3).join(" ").trim();
  const words = shortReply.split(/\s+/).filter(Boolean);
  if (words.length <= 85) return shortReply;
  return `${words.slice(0, 85).join(" ")}.`;
}

function buildOfflineReply(text: string, state: ReturnType<typeof useApp.getState>): string {
  const lower = text.toLowerCase();
  const { meds, symptoms, visits } = state;

  if (/\b(symptom|symptoms|health concern|concern|feel|feeling)\b/i.test(text)) {
    return "I'm offline, but I can still keep this health concern available on this device for your doctor visit.";
  }

  if (/med|medicine|dose|pill|take|taken/i.test(lower)) {
    if (!meds.length) {
      return "I can still show your medication list offline, but no medications are saved yet.";
    }
    return `I can still help offline. Your saved medications are ${meds
      .slice(0, 3)
      .map((med) => `${med.name} ${med.dosage}`)
      .join(", ")}.`;
  }

  if (/doctor|visit|summary/i.test(lower)) {
    if (!visits.length) {
      return "I can open doctor visit summaries offline, but there are no saved visit summaries yet.";
    }
    return "Your saved doctor visit summaries are available offline in the Visits tab.";
  }

  if (/sos|emergency|qr/i.test(lower)) {
    return "Your SOS emergency QR works offline. Open the SOS tab to show, save, share, or print the emergency card.";
  }

  if (symptoms.length) {
    return `I'm offline, but I can still talk and use saved information on this device. Your recent symptoms include ${symptoms
      .slice(0, 3)
      .map((symptom) => symptom.name)
      .join(", ")}.`;
  }

  return "I'm offline, but I can still talk. I can help with saved medications, symptoms, SOS QR, and doctor visit summaries on this device.";
}

function buildFastLocalReply(text: string): string | null {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
  if (
    /^(hi|hello|hey|how are you|how are you today|good morning|good afternoon)$/.test(normalized)
  ) {
    return "I'm here and ready to help. I can support medication questions, symptoms, doctor visits, and visit summaries.";
  }
  if (/\b(who are you|what are you|what can you do|help me)\b/.test(normalized)) {
    return "I'm MedsBuddy, your AI Patient Advocate. I help remember health details, prepare for doctor visits, and summarize care instructions.";
  }
  if (/\b(prepare|prep|ready).*\b(doctor|visit|appointment)\b|\bdoctor visit\b/.test(normalized)) {
    return "I can help prepare for the visit. Tell me the main symptom, when it started, current medications, and the top question you want the doctor to answer.";
  }
  if (/\b(thank you|thanks)\b/.test(normalized)) {
    return "You're welcome. I'm here whenever you need help with medications, symptoms, or doctor visit notes.";
  }
  return null;
}

function isAcknowledgementOnly(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return false;
  return /^(ok|okay|awesome|great|sounds good|good|nice|perfect|cool|got it|thank you|thanks|yes|yeah|yep|sure|alright|all right)(\s+(ok|okay|awesome|great|good|nice|perfect|cool|thanks|thank you))*$/.test(
    normalized,
  );
}

type AgentDataRecord = Record<string, unknown>;

function asRecord(value: unknown): AgentDataRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AgentDataRecord)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSeverity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(10, Math.max(1, Math.round(value)));
  }
  const text = stringValue(value).toLowerCase();
  if (text === "mild") return 3;
  if (text === "moderate") return 5;
  if (text === "severe") return 8;
  return 5;
}

function normalizeFrequency(value: unknown): string {
  const text = stringValue(value);
  if (!text) return "";
  if (/\btwice|2 times|two times\b/i.test(text)) return "Twice daily";
  if (/\bonce|1 time|one time\b/i.test(text)) return "Once daily";
  if (/\bdaily|every day\b/i.test(text)) return "Daily";
  return text;
}

function normalizeMedicationText(name: string, dosage: string, frequency: string): string {
  return [name, dosage, frequency].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function medicationDisplay(name: string, dosage: string, frequency: string): string {
  const label = [name, dosage].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return frequency ? `${label} — ${frequency.toLowerCase()}` : label;
}

function looksLikeDoseTaken(text: string): boolean {
  return /\b(already\s+)?(taken|took|take|had|completed)\b/i.test(text);
}

function findMedicationMention(
  medications: ReturnType<typeof useApp.getState>["meds"],
  text: string,
) {
  const clean = text.toLowerCase();
  return medications.find((med) => {
    const name = med.name.toLowerCase();
    if (name && clean.includes(name)) return true;
    const words = name.split(/\s+/).filter((word) => word.length > 3);
    return words.length > 0 && words.some((word) => clean.includes(word));
  });
}

function normalizeAgentSymptomItems(items: unknown[], fallbackText: string) {
  return items
    .map((item) => asRecord(item))
    .map((record) => ({
      name: stringValue(record.name || record.symptomName),
      notes: stringValue(record.notes || fallbackText),
      severity: normalizeSeverity(record.severity),
    }))
    .filter((symptom) => symptom.name);
}

function buildAgentRouterState(state: ReturnType<typeof useApp.getState>) {
  return {
    profile: state.profile,
    medications: state.meds.map((med) => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      times: med.times,
    })),
    symptoms: state.symptoms.slice(0, 12).map((symptom) => ({
      name: symptom.name,
      severity: symptom.severity,
      notes: symptom.notes,
    })),
    patientContext: state.patientContext,
    latestVisits: state.visits.slice(0, 4).map((visit) => ({
      summary: visit.summary,
      diagnosisOrConcerns: visit.diagnosisOrConcerns,
      medicationChanges: visit.medicationChanges,
      actionItems: visit.actionItems,
    })),
  };
}

function routeFromAgent(path: string) {
  const allowed = new Set([
    "/",
    "/talk",
    "/reminders",
    "/doctor",
    "/memory",
    "/emergency",
    "/profile",
  ]);
  return allowed.has(path)
    ? (path as "/" | "/talk" | "/reminders" | "/doctor" | "/memory" | "/emergency" | "/profile")
    : null;
}

function TalkThreadPage() {
  const { threadId } = useParams({ from: "/talk/$threadId" });
  const navigate = useNavigate();
  const {
    threads,
    appendToThread,
    clearThread,
    deleteThread,
    createThread,
    setActiveThread,
    setProfile,
    addMed,
    logDose,
    addSymptom,
    removeSymptomsByKeyword,
    addDoctorVisitPrep,
    addNote,
    updatePatientContext,
  } = useApp();

  const thread = threads.find((t) => t.id === threadId);
  const messages: ChatMessage[] = thread?.messages ?? [];

  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const patientContextExtractionAvailableRef = useRef(true);
  const { offline } = useConnectivity();

  const updateCurrentVisitPatientContext = (
    context: Partial<Omit<PatientContext, "updatedAt">>,
    latestText = "",
  ) => {
    const state = useApp.getState();
    return updatePatientContext(filterCurrentVisitPatientContext(context, state, latestText));
  };

  // Mark this thread active when it loads
  useEffect(() => {
    if (thread) setActiveThread(thread.id);
  }, [thread, setActiveThread]);

  // Wait for the persisted store to hydrate before deciding anything.
  useEffect(() => {
    const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
    if (useApp.persist.hasHydrated()) setHydrated(true);
    return () => unsub();
  }, []);

  // If, after hydration, the thread still doesn't exist, bounce back to /talk
  // so the index route can create or pick a valid one.
  useEffect(() => {
    if (hydrated && !thread) navigate({ to: "/talk", replace: true });
  }, [hydrated, thread, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [threads],
  );

  const handleNewChat = () => {
    stopSpeaking();
    setSpeaking(false);
    const tid = createThread();
    setDrawerOpen(false);
    navigate({ to: "/talk/$threadId", params: { threadId: tid } });
  };

  const handleSwitchThread = (tid: string) => {
    stopSpeaking();
    setSpeaking(false);
    setDrawerOpen(false);
    navigate({ to: "/talk/$threadId", params: { threadId: tid } });
  };

  const handleDeleteThread = (tid: string) => {
    deleteThread(tid);
    if (tid === threadId) {
      const next = threads.find((t) => t.id !== tid);
      if (next) navigate({ to: "/talk/$threadId", params: { threadId: next.id }, replace: true });
      else navigate({ to: "/talk", replace: true });
    }
  };

  const handleUtterance = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || !thread) return;
    setAutoListen(false);

    appendToThread(thread.id, { role: "user", content: text });
    setBusy(true);

    const speakAndContinue = async (reply: string) => {
      appendToThread(thread.id, { role: "assistant", content: reply });
      setBusy(false);
      setSpeaking(true);
      await speak(reply, () => {
        setSpeaking(false);
        setAutoListen(true);
      });
    };

    const applyAgentAction = async (decision: AgentRouterResult) => {
      const action = decision.action || "answer";
      const data = asRecord(decision.data);
      const saved: string[] = [];
      let reply = stringValue(decision.response);

      if (action === "update_profile") {
        const profilePatch: Record<string, unknown> = {};
        for (const key of [
          "name",
          "dob",
          "bloodGroup",
          "allergies",
          "conditions",
          "primaryPhysician",
        ]) {
          const value = stringValue(data[key]);
          if (value) profilePatch[key] = value;
        }
        if (Array.isArray(data.emergencyContacts)) {
          profilePatch.emergencyContacts = data.emergencyContacts
            .map((contact) => {
              const record = asRecord(contact);
              return {
                name: stringValue(record.name),
                phone: stringValue(record.phone),
                relation: stringValue(record.relation),
              };
            })
            .filter((contact) => contact.name || contact.phone);
        }
        if (Object.keys(profilePatch).length) {
          setProfile(profilePatch);
          const updatedProfile = useApp.getState().profile;
          if (profilePatch.name) saved.push(`name: ${updatedProfile.name}`);
          if (profilePatch.dob) saved.push(`DOB: ${updatedProfile.dob}`);
          if (profilePatch.bloodGroup) saved.push(`blood group: ${updatedProfile.bloodGroup}`);
          if (profilePatch.allergies) saved.push(`allergies: ${updatedProfile.allergies}`);
          if (profilePatch.conditions) saved.push(`conditions: ${updatedProfile.conditions}`);
          if (profilePatch.primaryPhysician) {
            saved.push(`primary physician: ${updatedProfile.primaryPhysician}`);
          }
          if (profilePatch.emergencyContacts) saved.push("emergency contact");
          reply = `Got it. I updated your profile${saved.length ? ` — ${saved.join(", ")}` : ""}.`;
        }
      }

      if (action === "add_medication") {
        const existingMedicationForDose = looksLikeDoseTaken(text)
          ? findMedicationMention(useApp.getState().meds, text)
          : null;
        if (existingMedicationForDose) {
          logDose(existingMedicationForDose.id, "taken");
          reply = `Got it. I logged ${existingMedicationForDose.name} as taken.`;
          await speakAndContinue(reply);
          return;
        }

        const medicationItems = arrayValue(data.medications).length
          ? arrayValue(data.medications)
          : [data];
        const stateBefore = useApp.getState();
        const existingKeys = new Set(
          stateBefore.meds.map((med) =>
            normalizeMedicationText(med.name, med.dosage, med.frequency).toLowerCase(),
          ),
        );
        const savedMeds: string[] = [];
        const existingMeds: string[] = [];

        for (const item of medicationItems) {
          const med = asRecord(item);
          const name = stringValue(med.name || med.medicationName || item);
          if (!name) continue;
          const dosage = stringValue(med.dosage || med.dose);
          const frequency = normalizeFrequency(med.frequency || med.timing || med.schedule);
          const key = normalizeMedicationText(name, dosage, frequency).toLowerCase();
          if (!existingKeys.has(key)) {
            addMed({ name, dosage, frequency, times: [] });
            existingKeys.add(key);
            savedMeds.push(medicationDisplay(name, dosage, frequency));
          } else {
            existingMeds.push(medicationDisplay(name, dosage, frequency));
          }
        }

        if (savedMeds.length) {
          updateCurrentVisitPatientContext({ medications: savedMeds }, text);
          const updated = useApp.getState().patientContext.medications;
          reply =
            "I've updated your medication list and will include this in today's doctor visit.";
          console.info("Agent saved medications", updated);
        } else if (existingMeds.length) {
          reply = `I already have ${existingMeds.join(", ")} in your medication list.`;
        }
      }

      if (action === "log_dose") {
        const medicationName = stringValue(data.medicationName || data.name || data.medication);
        const medication =
          findMedicationMention(useApp.getState().meds, medicationName || text) ||
          findMedicationMention(useApp.getState().meds, text);
        if (medication) {
          logDose(medication.id, "taken");
          reply = `Got it. I logged ${medication.name} as taken.`;
        } else {
          reply = "Which medication did you take?";
        }
      }

      if (action === "add_symptom") {
        const rawSymptomItems = arrayValue(data.symptoms).length
          ? arrayValue(data.symptoms)
          : [data];
        const symptomItems = normalizeAgentSymptomItems(rawSymptomItems, text);
        const existingKeys = new Set(
          useApp.getState().symptoms.map((symptom) => symptom.name.toLowerCase()),
        );
        const savedSymptoms: string[] = [];

        for (const item of symptomItems) {
          const symptom = asRecord(item);
          const name = stringValue(symptom.name);
          if (!name) continue;
          const notes = stringValue(symptom.notes || data.notes || text);
          const severity = normalizeSeverity(symptom.severity || data.severity);
          if (!existingKeys.has(name.toLowerCase())) {
            addSymptom({ name, severity, notes });
            existingKeys.add(name.toLowerCase());
          }
          savedSymptoms.push(name);
        }

        if (savedSymptoms.length) {
          updateCurrentVisitPatientContext(
            {
              symptoms: savedSymptoms,
              visitReason: stringValue(data.visitReason || data.reasonForVisit),
              onset: stringValue(data.onset),
              duration: stringValue(data.duration),
              patientNotes: [stringValue(data.notes)].filter(Boolean),
            },
            text,
          );
          reply =
            "I've updated your health summary and will include these symptoms in today's doctor visit.";
        }
      }

      if (action === "remove_symptom") {
        const keyword =
          stringValue(data.keyword) ||
          stringValue(data.symptomName) ||
          stringValue(data.name) ||
          stringValue(data.symptom) ||
          text;
        const beforeCount = useApp.getState().symptoms.length;
        const removedCount = removeSymptomsByKeyword(keyword);
        const afterState = useApp.getState();
        const changed = removedCount > 0 && afterState.symptoms.length < beforeCount;

        if (changed) {
          reply = `Done — I removed ${keyword} from your symptom notes.`;
        } else {
          reply = `I checked your notes, but I did not find ${keyword} in your symptoms.`;
        }
      }

      if (action === "doctor_visit_prep") {
        const prepSymptoms = unique(arrayValue(data.symptoms).map((item) => stringValue(item)));
        const concerns = unique(arrayValue(data.concerns).map((item) => stringValue(item)));
        const questionsForDoctor = unique(
          arrayValue(data.questionsForDoctor).map((item) => stringValue(item)),
        );
        const visitReason = stringValue(data.visitReason || data.reasonForVisit);
        const timeline = stringValue(data.timeline || data.onset || data.duration);
        const patientNotes = unique(arrayValue(data.patientNotes).map((item) => stringValue(item)));

        updateCurrentVisitPatientContext(
          {
            symptoms: prepSymptoms,
            visitReason,
            onset: stringValue(data.onset),
            duration: stringValue(data.duration || data.timeline),
            patientNotes,
            concerns,
            questionsForDoctor,
          },
          text,
        );
        addDoctorVisitPrep({
          reasonForVisit: visitReason,
          symptoms: prepSymptoms,
          timeline,
          context: [...concerns, ...patientNotes].join(" "),
          sourceText: text,
        });

        const context = useApp.getState().patientContext;
        const savedPrep = [
          context.visitReason,
          ...prepSymptoms,
          ...concerns,
          ...questionsForDoctor,
        ].filter(Boolean);
        reply = savedPrep.length
          ? "I've updated your pre-visit summary and will use it for today's doctor visit."
          : "I've updated your doctor-visit summary with that information.";
      }

      if (action === "generate_doctor_visit_summary") {
        addNote(`Doctor visit summary request: ${text}`);
        reply = "I’ll generate the visit summary from the cleaned doctor visit information.";
      }

      if (action === "generate_qr") {
        navigate({ to: "/emergency" });
        reply = "Opening your emergency QR card now.";
      }

      if (action === "navigate") {
        const to = routeFromAgent(stringValue(decision.navigateTo || data.navigateTo));
        if (to) {
          navigate({ to });
          reply =
            to === "/doctor"
              ? "Opening Doctor Visit now."
              : to === "/reminders"
                ? "Opening Medications now."
                : to === "/emergency"
                  ? "Opening your emergency QR card now."
                  : "Opening that page now.";
        }
      }

      if (action === "new_chat") {
        const tid = createThread();
        navigate({ to: "/talk/$threadId", params: { threadId: tid } });
        reply = "Opening a new chat now.";
      }

      if (action === "open_previous_chat") {
        setDrawerOpen(true);
        reply = "Opening your previous chats now.";
      }

      await speakAndContinue(reply || "Done. I took care of that.");
    };

    const stateBeforeContextUpdate = useApp.getState();
    if (isAcknowledgementOnly(text)) {
      await speakAndContinue("Great. I’ll keep that ready for your doctor visit.");
      return;
    }

    if (!offline) {
      try {
        const current = stateBeforeContextUpdate.threads.find(
          (candidate) => candidate.id === thread.id,
        );
        const conversation = (current?.messages ?? []).slice(-8).map((message) => ({
          role: message.role,
          content: message.content,
        }));
        const routed = await routeMedsBuddyAgent({
          patientId: getPatientIdForContext(stateBeforeContextUpdate),
          message: text,
          conversation,
          currentState: buildAgentRouterState(stateBeforeContextUpdate),
        });
        await applyAgentAction(routed.result ?? { action: "answer", response: "" });
        return;
      } catch (error) {
        console.info("Agent router unavailable, using fallback chat.", error);
      }
    }

    const nav = detectNavigationIntent(text);
    if (isHighConfidenceNavigation(nav)) {
      logNavigationIntent(nav);
      console.info("Structured Action:", {
        action: nav.action,
        screen: nav.screen,
      });
      if (nav.appAction === "OPEN_CHAT_DRAWER") {
        setDrawerOpen(true);
        await speakAndContinue("Opening your previous chats now.");
        return;
      }
      navigate({ to: nav.to });
      await speakAndContinue(
        nav.to === "/doctor" ? "Opening Doctor Visit now." : "Opening that page now.",
      );
      return;
    }

    if (patientContextExtractionAvailableRef.current && isMeaningfulPatientContextMessage(text)) {
      const state = useApp.getState();
      const current = state.threads.find((candidate) => candidate.id === thread.id);
      const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
      const conversation = [
        ...(current?.messages ?? [])
          .filter((message) => message.at >= currentVisitStartedAt)
          .slice(-10)
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
        { role: "user" as const, content: text },
      ];
      void extractPatientContext({
        patientId: getPatientIdForContext(state),
        conversation,
      })
        .then((result) => {
          updateCurrentVisitPatientContext(result.patientContext, text);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          if (/405|method not allowed|endpoint was not found|not found/i.test(message)) {
            patientContextExtractionAvailableRef.current = false;
          }
          console.info("Patient context extraction unavailable.");
        });
    }

    const fastReply = buildFastLocalReply(text);
    if (fastReply) {
      await speakAndContinue(fastReply);
      return;
    }

    if (offline) {
      const offlineReply = buildOfflineReply(text, useApp.getState());
      await speakAndContinue(offlineReply);
      return;
    }

    try {
      const state = useApp.getState();
      const sys = buildSystemPrompt(state);
      const current = state.threads.find((t) => t.id === thread.id);
      const history = (current?.messages ?? []).slice(-6).map((m) => ({
        role: m.role,
        content: m.role === "assistant" ? humanizeAssistantReply(m.content) : m.content,
      }));
      const { reply } = await chatWithMedsBuddy({
        messages: [
          { role: "system" as const, content: sys },
          ...history,
          { role: "user" as const, content: text },
        ],
      });
      const finalReply = humanizeAssistantReply(reply);
      await speakAndContinue(finalReply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach the AI.";
      appendToThread(thread.id, { role: "assistant", content: `Sorry — ${msg}` });
      setBusy(false);
    }
  };

  if (!hydrated || !thread) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Opening MedsBuddy…</div>
    );
  }

  return (
    <>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* AI header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="size-10 rounded-full bg-card border grid place-items-center text-muted-foreground hover:bg-secondary transition shrink-0"
            aria-label="Chat history"
          >
            <History className="size-4" />
          </button>
          <AiOrb size={56} speaking={speaking} listening={autoListen} thinking={busy} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium truncate">
              {thread?.title || "MedsBuddy AI"}
            </div>
            <div className="text-base font-semibold tracking-tight leading-tight">
              {busy ? "Thinking…" : speaking ? "Speaking…" : "How can I help?"}
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 shadow-elegant shrink-0"
            aria-label="New chat"
          >
            <Plus className="size-3.5" /> New
          </button>
        </div>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 -mx-1 px-1">
          {offline && (
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-3.5">
              <div className="flex items-center gap-2 font-semibold text-primary text-[14px]">
                <CloudOff className="size-4" /> Limited Offline Mode
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px] mt-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                    Available
                  </div>
                  <div>· Health notes</div>
                  <div>· Symptoms</div>
                  <div>· Doctor Summary</div>
                  <div>· Emergency QR</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                    Unavailable
                  </div>
                  <div className="text-muted-foreground">· AI Patient Advocate</div>
                  <div className="text-muted-foreground">· Medical search</div>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="py-6">
              <div className="text-center text-sm text-muted-foreground mb-4 inline-flex items-center gap-1.5 mx-auto w-full justify-center">
                <Sparkles className="size-4 text-primary" />
                Try one of these
              </div>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUtterance(s)}
                    className="text-left rounded-2xl border bg-card hover:bg-secondary/50 shadow-card px-4 py-3 text-[15px] transition active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary typing-dot" />
                <span
                  className="size-2 rounded-full bg-primary typing-dot"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="size-2 rounded-full bg-primary typing-dot"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="pt-4 mt-3">
          <div className="flex items-center justify-center mb-4">
            <MicButton
              onTranscript={handleUtterance}
              busy={busy}
              speaking={speaking}
              autoStart={autoListen}
              size="xl"
            />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = input.trim();
              if (!t) return;
              setInput("");
              handleUtterance(t);
            }}
            className="flex gap-2 items-center bg-card border shadow-card rounded-full px-2 py-1.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Or type a message…"
              className="flex-1 bg-transparent px-3 py-2 text-[15px] outline-none"
            />
            <button
              type="submit"
              className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
              disabled={!input.trim()}
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
          {messages.length > 0 && (
            <button
              onClick={() => {
                stopSpeaking();
                if (thread) clearThread(thread.id);
              }}
              className="mt-3 mx-auto block text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Clear this conversation
            </button>
          )}
        </div>
      </div>

      {/* History drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-background border-r shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground font-medium">Conversations</div>
                  <h2 className="text-lg font-semibold">Chat history</h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="size-9 rounded-full bg-card border grid place-items-center"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={handleNewChat}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant"
                >
                  <Plus className="size-4" /> New chat
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {sortedThreads.length === 0 && (
                  <li className="text-sm text-muted-foreground text-center py-10">
                    No conversations yet.
                  </li>
                )}
                {sortedThreads.map((t) => {
                  const active = t.id === threadId;
                  const preview =
                    t.messages[t.messages.length - 1]?.content?.slice(0, 60) ?? "Empty chat";
                  return (
                    <li
                      key={t.id}
                      className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 transition ${
                        active ? "bg-primary/10 border-primary/40" : "bg-card hover:bg-secondary/50"
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSwitchThread(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSwitchThread(t.id);
                        }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="text-[14px] font-medium truncate inline-flex items-center gap-1.5">
                          <MessageCircle className="size-3.5 text-primary shrink-0" />
                          {t.title}
                        </div>
                        <div className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {preview}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(t.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteThread(t.id)}
                        className="size-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
