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

export interface Appointment {
  id: string;
  doctor: string;
  specialty?: string;
  at: number;
  notes?: string;
}

interface State {
  profile: Profile;
  meds: Medication[];
  doses: DoseEvent[];
  symptoms: Symptom[];
  appointments: Appointment[];
  chat: ChatMessage[];
  setProfile: (p: Partial<Profile>) => void;
  addMed: (m: Omit<Medication, "id" | "createdAt">) => void;
  removeMed: (id: string) => void;
  logDose: (medId: string, status: DoseEvent["status"]) => void;
  addSymptom: (s: Omit<Symptom, "id" | "at">) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  appendChat: (m: Omit<ChatMessage, "id" | "at">) => ChatMessage;
  clearChat: () => void;
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
      chat: [],
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
      appendChat: (m) => {
        const msg: ChatMessage = { ...m, id: id(), at: Date.now() };
        set({ chat: [...get().chat, msg] });
        return msg;
      },
      clearChat: () => set({ chat: [] }),
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