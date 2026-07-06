import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-CNkGaKo_.js
var id = () => Math.random().toString(36).slice(2, 10);
function medicationNameKey(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
var defaultProfile = {
	name: "",
	dob: "",
	bloodGroup: "",
	allergies: "",
	conditions: "",
	emergencyContacts: [],
	primaryPhysician: ""
};
var defaultPatientContext = {
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
	updatedAt: null
};
function mergeUnique(existing, incoming) {
	const seen = /* @__PURE__ */ new Set();
	return [...existing, ...incoming ?? []].map((item) => item.trim()).filter(Boolean).filter((item) => {
		const key = item.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
function matchesHealthKeyword(text, keyword) {
	const haystack = text.toLowerCase();
	const needle = keyword.trim().toLowerCase();
	if (!needle) return false;
	return (/\buti\b|urinary tract infection|urinary infection/.test(needle) ? [
		/\buti\b/i,
		/urinary tract infection/i,
		/urinary infection/i,
		/burning while urinating/i,
		/burning or discomfort while urinating/i,
		/discomfort while urinating/i,
		/possible urinary tract infection concern/i,
		/possible urinary tract infection symptoms/i
	] : [new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")]).some((pattern) => pattern.test(haystack));
}
function filterKeywordList(values, keyword) {
	return values.filter((value) => !matchesHealthKeyword(value, keyword));
}
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
	doctorVisitPrep: [],
	patientContext: defaultPatientContext,
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
				times: m.times.length ? m.times : existing.times
			};
			set({ meds: current.map((med) => med.id === existing.id ? updated : med) });
			return updated;
		}
		const created = {
			...m,
			id: id(),
			createdAt: Date.now()
		};
		set({ meds: [...current, created] });
		return created;
	},
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
	removeSymptom: (symptomId) => set({ symptoms: get().symptoms.filter((symptom) => symptom.id !== symptomId) }),
	removeSymptomsByKeyword: (keyword) => {
		const before = get();
		const nextSymptoms = before.symptoms.filter((symptom) => !matchesHealthKeyword(`${symptom.name} ${symptom.notes ?? ""}`, keyword));
		const removedCount = before.symptoms.length - nextSymptoms.length;
		if (!removedCount) return 0;
		set({
			symptoms: nextSymptoms,
			patientContext: {
				...before.patientContext,
				symptoms: filterKeywordList(before.patientContext.symptoms ?? [], keyword),
				concerns: filterKeywordList(before.patientContext.concerns ?? [], keyword),
				patientNotes: filterKeywordList(before.patientContext.patientNotes ?? [], keyword),
				visitReason: matchesHealthKeyword(before.patientContext.visitReason, keyword) ? "" : before.patientContext.visitReason,
				onset: matchesHealthKeyword(before.patientContext.onset, keyword) ? "" : before.patientContext.onset,
				duration: matchesHealthKeyword(before.patientContext.duration, keyword) ? "" : before.patientContext.duration,
				updatedAt: Date.now()
			},
			doctorVisitPrep: before.doctorVisitPrep.map((prep) => ({
				...prep,
				symptoms: filterKeywordList(prep.symptoms, keyword),
				reasonForVisit: prep.reasonForVisit && matchesHealthKeyword(prep.reasonForVisit, keyword) ? "" : prep.reasonForVisit,
				context: prep.context && matchesHealthKeyword(prep.context, keyword) ? "" : prep.context,
				sourceText: prep.sourceText && matchesHealthKeyword(prep.sourceText, keyword) ? "" : prep.sourceText
			})).filter((prep) => prep.symptoms.length || prep.reasonForVisit || prep.timeline || prep.context || prep.sourceText)
		});
		return removedCount;
	},
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
	addDoctorVisitPrep: (note) => {
		const prep = {
			...note,
			id: id(),
			at: Date.now()
		};
		set({ doctorVisitPrep: [prep, ...get().doctorVisitPrep] });
		return prep;
	},
	updatePatientContext: (context) => {
		const current = get().patientContext ?? defaultPatientContext;
		const next = {
			symptoms: mergeUnique(current.symptoms ?? [], context.symptoms),
			medications: mergeUnique(current.medications ?? [], context.medications),
			visitReason: context.visitReason?.trim() || current.visitReason,
			onset: context.onset?.trim() || current.onset,
			duration: context.duration?.trim() || current.duration,
			patientNotes: mergeUnique(current.patientNotes ?? [], context.patientNotes),
			concerns: mergeUnique(current.concerns ?? [], context.concerns),
			questionsForDoctor: mergeUnique(current.questionsForDoctor ?? [], context.questionsForDoctor),
			pregnancyContext: context.pregnancyContext?.trim() || current.pregnancyContext,
			currentVisitStartedAt: current.currentVisitStartedAt ?? Date.now(),
			updatedAt: Date.now()
		};
		set({ patientContext: next });
		return next;
	},
	resetCurrentPatientContext: () => {
		const next = {
			...defaultPatientContext,
			currentVisitStartedAt: Date.now(),
			updatedAt: Date.now()
		};
		set({
			patientContext: next,
			doctorVisitPrep: []
		});
		return next;
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
