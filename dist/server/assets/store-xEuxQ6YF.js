import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
//#region src/lib/store.ts
var id = () => Math.random().toString(36).slice(2, 10);
var defaultProfile = {
	name: "",
	dob: "",
	bloodGroup: "",
	allergies: "",
	conditions: "",
	emergencyContacts: [],
	primaryPhysician: ""
};
var useApp = create()(persist((set, get) => ({
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
	currentVisitSummary: null,
	setProfile: (p) => set({ profile: {
		...get().profile,
		...p
	} }),
	addMed: (m) => set({ meds: [...get().meds, {
		...m,
		id: id(),
		createdAt: Date.now()
	}] }),
	removeMed: (mid) => set({
		meds: get().meds.filter((m) => m.id !== mid),
		doses: get().doses.filter((d) => d.medId !== mid)
	}),
	logDose: (medId, status) => {
		const med = get().meds.find((m) => m.id === medId);
		if (!med) return;
		set({ doses: [{
			id: id(),
			medId,
			medName: med.name,
			status,
			at: Date.now()
		}, ...get().doses] });
	},
	addSymptom: (s) => set({ symptoms: [{
		...s,
		id: id(),
		at: Date.now()
	}, ...get().symptoms] }),
	addAppointment: (a) => set({ appointments: [...get().appointments, {
		...a,
		id: id()
	}] }),
	createThread: (title) => {
		const tid = id();
		set({
			threads: [{
				id: tid,
				title: title ?? "New chat",
				updatedAt: Date.now(),
				messages: []
			}, ...get().threads],
			activeThreadId: tid
		});
		return tid;
	},
	setActiveThread: (tid) => set({ activeThreadId: tid }),
	appendToThread: (tid, m) => {
		const msg = {
			...m,
			id: id(),
			at: Date.now()
		};
		set({ threads: get().threads.map((t) => {
			if (t.id !== tid) return t;
			const messages = [...t.messages, msg];
			const title = t.title === "New chat" && msg.role === "user" ? msg.content.slice(0, 40) + (msg.content.length > 40 ? "…" : "") : t.title;
			return {
				...t,
				messages,
				updatedAt: Date.now(),
				title
			};
		}) });
		return msg;
	},
	clearThread: (tid) => set({ threads: get().threads.map((t) => t.id === tid ? {
		...t,
		messages: [],
		title: "New chat",
		updatedAt: Date.now()
	} : t) }),
	deleteThread: (tid) => {
		const threads = get().threads.filter((t) => t.id !== tid);
		set({
			threads,
			activeThreadId: get().activeThreadId === tid ? threads[0]?.id ?? null : get().activeThreadId
		});
	},
	renameThread: (tid, title) => set({ threads: get().threads.map((t) => t.id === tid ? {
		...t,
		title
	} : t) }),
	addSummary: (text) => {
		const s = {
			id: id(),
			text,
			at: Date.now()
		};
		set({ summaries: [s, ...get().summaries] });
		return s;
	},
	addNote: (text) => {
		const n = {
			id: id(),
			text,
			at: Date.now()
		};
		set({ notes: [n, ...get().notes] });
		return n;
	},
	removeNote: (nid) => set({ notes: get().notes.filter((n) => n.id !== nid) }),
	addQuestion: (text) => {
		const q = {
			id: id(),
			text,
			asked: false,
			at: Date.now()
		};
		set({ questions: [q, ...get().questions] });
		return q;
	},
	toggleQuestion: (qid) => set({ questions: get().questions.map((q) => q.id === qid ? {
		...q,
		asked: !q.asked
	} : q) }),
	removeQuestion: (qid) => set({ questions: get().questions.filter((q) => q.id !== qid) }),
	addVisit: (v) => {
		const visit = {
			...v,
			id: id(),
			at: v.at ?? Date.now()
		};
		set({ visits: [visit, ...get().visits] });
		return visit;
	},
	removeVisit: (vid) => set({ visits: get().visits.filter((v) => v.id !== vid) }),
	setSimulateOffline: (v) => set({ simulateOffline: v }),
	setCurrentVisitSummary: (text) => set({ currentVisitSummary: text })
}), {
	name: "medsbuddy-v1",
	storage: createJSONStorage(() => {
		if (typeof window === "undefined") return {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {}
		};
		return localStorage;
	}),
	skipHydration: true
}));
function adherence(doses, days = 7) {
	const cutoff = Date.now() - days * 24 * 60 * 60 * 1e3;
	const recent = doses.filter((d) => d.at >= cutoff);
	if (!recent.length) return 0;
	const taken = recent.filter((d) => d.status === "taken").length;
	return Math.round(taken / recent.length * 100);
}
//#endregion
export { useApp as n, adherence as t };
