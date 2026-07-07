import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Profile {
  name: string;
  dob: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  emergencyContacts: { name: string; phone: string; relation: string }[];
  primaryPhysician: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g. "Twice daily"
  times: string[]; // HH:MM
  createdAt: number;
}

export interface DoseEvent {
  id: string;
  medId: string;
  medName: string;
  status: "taken" | "skipped" | "missed";
  at: number;
}

export interface Symptom {
  id: string;
  name: string;
  severity: number; // 1-10
  notes?: string;
  at: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
}

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface Appointment {
  id: string;
  doctor: string;
  specialty?: string;
  at: number;
  notes?: string;
}

export interface DoctorSummary {
  id: string;
  text: string;
  at: number;
}

export interface HealthNote {
  id: string;
  text: string;
  at: number;
}

export interface DoctorQuestion {
  id: string;
  text: string;
  asked: boolean;
  at: number;
}

export interface DoctorVisitPrepNote {
  id: string;
  reasonForVisit?: string;
  symptoms: string[];
  timeline?: string;
  context?: string;
  sourceText: string;
  at: number;
}

export interface PatientContext {
  symptoms: string[];
  medications: string[];
  visitReason: string;
  onset: string;
  duration: string;
  patientNotes: string[];
  concerns: string[];
  questionsForDoctor: string[];
  pregnancyContext?: string;
  currentVisitStartedAt: number | null;
  updatedAt: number | null;
}

export interface VisitRecord {
  id: string;
  at: number;
  doctor: string;
  specialty?: string;
  summary: string;
  // Pre-visit context (the summary the patient brought to the doctor)
  patientSummary?: string;
  // Visit Outcome — what actually happened during the appointment
  topicsDiscussed?: string;
  diagnosisOrConcerns?: string;
  medicationChanges?: string;
  newRecommendations?: string;
  testsOrdered?: string;
  followUpAppointments?: string;
  actionItems?: string;
  // Legacy / free-form
  medications?: string;
  carePlan?: string;
  followUp?: string;
  questionsAnswered?: string;
  notes?: string;
}

interface State {
  profile: Profile;
  meds: Medication[];
  doses: DoseEvent[];
  symptoms: Symptom[];
  appointments: Appointment[];
  threads: ChatThread[];
  activeThreadId: string | null;
  summaries: DoctorSummary[];
  notes: HealthNote[];
  questions: DoctorQuestion[];
  visits: VisitRecord[];
  doctorVisitPrep: DoctorVisitPrepNote[];
  patientContext: PatientContext;
  simulateOffline: boolean;
  currentVisitSummary: string | null;
  setProfile: (p: Partial<Profile>) => void;
  addMed: (m: Omit<Medication, "id" | "createdAt">) => void;
  upsertMed: (m: Omit<Medication, "id" | "createdAt">) => Medication;
  removeMed: (id: string) => void;
  logDose: (medId: string, status: DoseEvent["status"]) => void;
  addSymptom: (s: Omit<Symptom, "id" | "at">) => void;
  removeSymptom: (id: string) => void;
  removeSymptomsByKeyword: (keyword: string) => number;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  createThread: (title?: string) => string;
  setActiveThread: (id: string) => void;
  appendToThread: (threadId: string, m: Omit<ChatMessage, "id" | "at">) => ChatMessage;
  clearThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, title: string) => void;
  addSummary: (text: string) => DoctorSummary;
  addNote: (text: string) => HealthNote;
  addDoctorVisitPrep: (note: Omit<DoctorVisitPrepNote, "id" | "at">) => DoctorVisitPrepNote;
  updatePatientContext: (context: Partial<Omit<PatientContext, "updatedAt">>) => PatientContext;
  resetCurrentPatientContext: () => PatientContext;
  removeNote: (id: string) => void;
  addQuestion: (text: string) => DoctorQuestion;
  toggleQuestion: (id: string) => void;
  removeQuestion: (id: string) => void;
  addVisit: (v: Omit<VisitRecord, "id" | "at"> & { at?: number }) => VisitRecord;
  removeVisit: (id: string) => void;
  setSimulateOffline: (v: boolean) => void;
  setCurrentVisitSummary: (text: string | null) => void;
}

const id = () => Math.random().toString(36).slice(2, 10);

function medicationNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const defaultProfile: Profile = {
  name: "Vasanthi Dande",
  dob: "1992-04-12",
  bloodGroup: "O+",
  allergies: "No known drug allergies",
  conditions: "Pregnancy",
  emergencyContacts: [
    {
      name: "Dande Family Contact",
      phone: "+1 555-010-2026",
      relation: "Family",
    },
  ],
  primaryPhysician: "Dr. Rao",
};

function withDemoProfileDefaults(profile?: Partial<Profile>): Profile {
  return {
    ...defaultProfile,
    ...(profile ?? {}),
    name: profile?.name?.trim() || defaultProfile.name,
    dob: profile?.dob?.trim() || defaultProfile.dob,
    bloodGroup: profile?.bloodGroup?.trim() || defaultProfile.bloodGroup,
    allergies: profile?.allergies?.trim() || defaultProfile.allergies,
    conditions: profile?.conditions?.trim() || defaultProfile.conditions,
    emergencyContacts: profile?.emergencyContacts?.length
      ? profile.emergencyContacts
      : defaultProfile.emergencyContacts,
    primaryPhysician: profile?.primaryPhysician?.trim() || defaultProfile.primaryPhysician,
  };
}

const defaultPatientContext: PatientContext = {
  symptoms: [],
  medications: [],
  visitReason: "",
  onset: "",
  duration: "",
  patientNotes: [],
  concerns: [],
  questionsForDoctor: [],
  pregnancyContext: "",
  currentVisitStartedAt: null,
  updatedAt: null,
};

function mergeUnique(existing: string[], incoming?: string[]): string[] {
  const seen = new Set<string>();
  return [...existing, ...(incoming ?? [])]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function matchesHealthKeyword(text: string, keyword: string): boolean {
  const haystack = text.toLowerCase();
  const needle = keyword.trim().toLowerCase();
  if (!needle) return false;

  const keywordPatterns = /\buti\b|urinary tract infection|urinary infection/.test(needle)
    ? [
        /\buti\b/i,
        /urinary tract infection/i,
        /urinary infection/i,
        /burning while urinating/i,
        /burning or discomfort while urinating/i,
        /discomfort while urinating/i,
        /possible urinary tract infection concern/i,
        /possible urinary tract infection symptoms/i,
      ]
    : [new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")];

  return keywordPatterns.some((pattern) => pattern.test(haystack));
}

function filterKeywordList(values: string[], keyword: string): string[] {
  return values.filter((value) => !matchesHealthKeyword(value, keyword));
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      profile: withDemoProfileDefaults(),
      meds: [],
      doses: [],
      symptoms: [],
      appointments: [],
      threads: [],
      activeThreadId: null,
      summaries: [],
      notes: [],
      questions: [],
      visits: [],
      doctorVisitPrep: [],
      patientContext: defaultPatientContext,
      simulateOffline: false,
      currentVisitSummary: null,
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      addMed: (m) => set({ meds: [...get().meds, { ...m, id: id(), createdAt: Date.now() }] }),
      upsertMed: (m) => {
        const incomingKey = medicationNameKey(m.name);
        const current = get().meds;
        const existing = current.find((med) => medicationNameKey(med.name) === incomingKey);
        if (existing) {
          const updated = {
            ...existing,
            name: m.name || existing.name,
            dosage: m.dosage || existing.dosage,
            frequency: m.frequency || existing.frequency,
            times: m.times.length ? m.times : existing.times,
          };
          set({ meds: current.map((med) => (med.id === existing.id ? updated : med)) });
          return updated;
        }

        const created = { ...m, id: id(), createdAt: Date.now() };
        set({ meds: [...current, created] });
        return created;
      },
      removeMed: (mid) =>
        set({
          meds: get().meds.filter((m) => m.id !== mid),
          doses: get().doses.filter((d) => d.medId !== mid),
        }),
      logDose: (medId, status) => {
        const med = get().meds.find((m) => m.id === medId);
        if (!med) return;
        set({
          doses: [{ id: id(), medId, medName: med.name, status, at: Date.now() }, ...get().doses],
        });
      },
      addSymptom: (s) => set({ symptoms: [{ ...s, id: id(), at: Date.now() }, ...get().symptoms] }),
      removeSymptom: (symptomId) =>
        set({
          symptoms: get().symptoms.filter((symptom) => symptom.id !== symptomId),
        }),
      removeSymptomsByKeyword: (keyword) => {
        const before = get();
        const nextSymptoms = before.symptoms.filter(
          (symptom) => !matchesHealthKeyword(`${symptom.name} ${symptom.notes ?? ""}`, keyword),
        );
        const removedCount = before.symptoms.length - nextSymptoms.length;
        if (!removedCount) return 0;

        const nextPatientContext: PatientContext = {
          ...before.patientContext,
          symptoms: filterKeywordList(before.patientContext.symptoms ?? [], keyword),
          concerns: filterKeywordList(before.patientContext.concerns ?? [], keyword),
          patientNotes: filterKeywordList(before.patientContext.patientNotes ?? [], keyword),
          visitReason: matchesHealthKeyword(before.patientContext.visitReason, keyword)
            ? ""
            : before.patientContext.visitReason,
          onset: matchesHealthKeyword(before.patientContext.onset, keyword)
            ? ""
            : before.patientContext.onset,
          duration: matchesHealthKeyword(before.patientContext.duration, keyword)
            ? ""
            : before.patientContext.duration,
          updatedAt: Date.now(),
        };

        set({
          symptoms: nextSymptoms,
          patientContext: nextPatientContext,
          doctorVisitPrep: before.doctorVisitPrep
            .map((prep) => ({
              ...prep,
              symptoms: filterKeywordList(prep.symptoms, keyword),
              reasonForVisit:
                prep.reasonForVisit && matchesHealthKeyword(prep.reasonForVisit, keyword)
                  ? ""
                  : prep.reasonForVisit,
              context:
                prep.context && matchesHealthKeyword(prep.context, keyword) ? "" : prep.context,
              sourceText:
                prep.sourceText && matchesHealthKeyword(prep.sourceText, keyword)
                  ? ""
                  : prep.sourceText,
            }))
            .filter(
              (prep) =>
                prep.symptoms.length ||
                prep.reasonForVisit ||
                prep.timeline ||
                prep.context ||
                prep.sourceText,
            ),
        });
        return removedCount;
      },
      addAppointment: (a) => set({ appointments: [...get().appointments, { ...a, id: id() }] }),
      createThread: (title) => {
        const tid = id();
        const t: ChatThread = {
          id: tid,
          title: title ?? "New chat",
          updatedAt: Date.now(),
          messages: [],
        };
        set({ threads: [t, ...get().threads], activeThreadId: tid });
        return tid;
      },
      setActiveThread: (tid) => set({ activeThreadId: tid }),
      appendToThread: (tid, m) => {
        const msg: ChatMessage = { ...m, id: id(), at: Date.now() };
        const threads = get().threads.map((t) => {
          if (t.id !== tid) return t;
          const messages = [...t.messages, msg];
          // Auto-title from the first user message
          const title =
            t.title === "New chat" && msg.role === "user"
              ? msg.content.slice(0, 40) + (msg.content.length > 40 ? "…" : "")
              : t.title;
          return { ...t, messages, updatedAt: Date.now(), title };
        });
        set({ threads });
        return msg;
      },
      clearThread: (tid) =>
        set({
          threads: get().threads.map((t) =>
            t.id === tid ? { ...t, messages: [], title: "New chat", updatedAt: Date.now() } : t,
          ),
        }),
      deleteThread: (tid) => {
        const threads = get().threads.filter((t) => t.id !== tid);
        const active =
          get().activeThreadId === tid ? (threads[0]?.id ?? null) : get().activeThreadId;
        set({ threads, activeThreadId: active });
      },
      renameThread: (tid, title) =>
        set({ threads: get().threads.map((t) => (t.id === tid ? { ...t, title } : t)) }),
      addSummary: (text) => {
        const s: DoctorSummary = { id: id(), text, at: Date.now() };
        set({ summaries: [s, ...get().summaries] });
        return s;
      },
      addNote: (text) => {
        const n: HealthNote = { id: id(), text, at: Date.now() };
        set({ notes: [n, ...get().notes] });
        return n;
      },
      addDoctorVisitPrep: (note) => {
        const prep: DoctorVisitPrepNote = { ...note, id: id(), at: Date.now() };
        set({ doctorVisitPrep: [prep, ...get().doctorVisitPrep] });
        return prep;
      },
      updatePatientContext: (context) => {
        const current = get().patientContext ?? defaultPatientContext;
        const next: PatientContext = {
          symptoms: mergeUnique(current.symptoms ?? [], context.symptoms),
          medications: mergeUnique(current.medications ?? [], context.medications),
          visitReason: context.visitReason?.trim() || current.visitReason,
          onset: context.onset?.trim() || current.onset,
          duration: context.duration?.trim() || current.duration,
          patientNotes: mergeUnique(current.patientNotes ?? [], context.patientNotes),
          concerns: mergeUnique(current.concerns ?? [], context.concerns),
          questionsForDoctor: mergeUnique(
            current.questionsForDoctor ?? [],
            context.questionsForDoctor,
          ),
          pregnancyContext: context.pregnancyContext?.trim() || current.pregnancyContext,
          currentVisitStartedAt: current.currentVisitStartedAt ?? Date.now(),
          updatedAt: Date.now(),
        };
        set({ patientContext: next });
        return next;
      },
      resetCurrentPatientContext: () => {
        const next: PatientContext = {
          ...defaultPatientContext,
          currentVisitStartedAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({ patientContext: next, doctorVisitPrep: [] });
        return next;
      },
      removeNote: (nid) => set({ notes: get().notes.filter((n) => n.id !== nid) }),
      addQuestion: (text) => {
        const q: DoctorQuestion = { id: id(), text, asked: false, at: Date.now() };
        set({ questions: [q, ...get().questions] });
        return q;
      },
      toggleQuestion: (qid) =>
        set({
          questions: get().questions.map((q) => (q.id === qid ? { ...q, asked: !q.asked } : q)),
        }),
      removeQuestion: (qid) => set({ questions: get().questions.filter((q) => q.id !== qid) }),
      addVisit: (v) => {
        const visit: VisitRecord = { ...v, id: id(), at: v.at ?? Date.now() };
        set({ visits: [visit, ...get().visits] });
        return visit;
      },
      removeVisit: (vid) => set({ visits: get().visits.filter((v) => v.id !== vid) }),
      setSimulateOffline: (v) => set({ simulateOffline: v }),
      setCurrentVisitSummary: (text) => set({ currentVisitSummary: text }),
    }),
    {
      name: "medsbuddy-v1",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      merge: (persisted, current) => {
        const persistedState =
          persisted && typeof persisted === "object" ? (persisted as Partial<State>) : {};
        return {
          ...current,
          ...persistedState,
          profile: withDemoProfileDefaults(persistedState.profile),
        };
      },
      skipHydration: true,
    },
  ),
);

// Helpers
export function adherence(doses: DoseEvent[], days = 7): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = doses.filter((d) => d.at >= cutoff);
  if (!recent.length) return 0;
  const taken = recent.filter((d) => d.status === "taken").length;
  return Math.round((taken / recent.length) * 100);
}
