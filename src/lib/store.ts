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

export interface VisitRecord {
  id: string;
  at: number;
  doctor: string;
  specialty?: string;
  durationSec?: number;
  audioDataUrl?: string; // optional; omitted when too large
  summary: string;
  // Pre-visit context (the summary the patient brought to the doctor)
  patientSummary?: string;
  // Visit Outcome — what actually happened during the appointment
  topicsDiscussed?: string;
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
  recorded: boolean;
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
  simulateOffline: boolean;
  setProfile: (p: Partial<Profile>) => void;
  addMed: (m: Omit<Medication, "id" | "createdAt">) => void;
  removeMed: (id: string) => void;
  logDose: (medId: string, status: DoseEvent["status"]) => void;
  addSymptom: (s: Omit<Symptom, "id" | "at">) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  createThread: (title?: string) => string;
  setActiveThread: (id: string) => void;
  appendToThread: (threadId: string, m: Omit<ChatMessage, "id" | "at">) => ChatMessage;
  clearThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  renameThread: (threadId: string, title: string) => void;
  addSummary: (text: string) => DoctorSummary;
  addNote: (text: string) => HealthNote;
  removeNote: (id: string) => void;
  addQuestion: (text: string) => DoctorQuestion;
  toggleQuestion: (id: string) => void;
  removeQuestion: (id: string) => void;
  addVisit: (v: Omit<VisitRecord, "id" | "at"> & { at?: number }) => VisitRecord;
  removeVisit: (id: string) => void;
  setSimulateOffline: (v: boolean) => void;
}

const id = () => Math.random().toString(36).slice(2, 10);

const defaultProfile: Profile = {
  name: "",
  dob: "",
  bloodGroup: "",
  allergies: "",
  conditions: "",
  emergencyContacts: [],
  primaryPhysician: "",
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
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
      simulateOffline: false,
      setProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      addMed: (m) =>
        set({ meds: [...get().meds, { ...m, id: id(), createdAt: Date.now() }] }),
      removeMed: (mid) =>
        set({
          meds: get().meds.filter((m) => m.id !== mid),
          doses: get().doses.filter((d) => d.medId !== mid),
        }),
      logDose: (medId, status) => {
        const med = get().meds.find((m) => m.id === medId);
        if (!med) return;
        set({
          doses: [
            { id: id(), medId, medName: med.name, status, at: Date.now() },
            ...get().doses,
          ],
        });
      },
      addSymptom: (s) =>
        set({ symptoms: [{ ...s, id: id(), at: Date.now() }, ...get().symptoms] }),
      addAppointment: (a) =>
        set({ appointments: [...get().appointments, { ...a, id: id() }] }),
      createThread: (title) => {
        const tid = id();
        const t: ChatThread = { id: tid, title: title ?? "New chat", updatedAt: Date.now(), messages: [] };
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
        const active = get().activeThreadId === tid ? threads[0]?.id ?? null : get().activeThreadId;
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
      removeNote: (nid) => set({ notes: get().notes.filter((n) => n.id !== nid) }),
      addQuestion: (text) => {
        const q: DoctorQuestion = { id: id(), text, asked: false, at: Date.now() };
        set({ questions: [q, ...get().questions] });
        return q;
      },
      toggleQuestion: (qid) =>
        set({
          questions: get().questions.map((q) =>
            q.id === qid ? { ...q, asked: !q.asked } : q,
          ),
        }),
      removeQuestion: (qid) => set({ questions: get().questions.filter((q) => q.id !== qid) }),
      addVisit: (v) => {
        const visit: VisitRecord = { ...v, id: id(), at: v.at ?? Date.now() };
        set({ visits: [visit, ...get().visits] });
        return visit;
      },
      removeVisit: (vid) => set({ visits: get().visits.filter((v) => v.id !== vid) }),
      setSimulateOffline: (v) => set({ simulateOffline: v }),
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