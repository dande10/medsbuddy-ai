import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { c as speak, i as getRecognition, l as stopSpeaking, n as extractPatientContext, o as routeMedsBuddyAgent } from "./voice-CdDuvBHY.mjs";
import { t as useConnectivity } from "./connectivity-ClLUgQVv.mjs";
import { _ as useNavigate, v as useParams } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { D as History, F as CloudOff, S as MessageCircle, T as LoaderCircle, b as Mic, c as Sparkles, g as Plus, o as Trash2, p as Send, r as Volume2, t as X, x as MicOff } from "../_libs/lucide-react.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { t as AiOrb } from "./ai-orb-CbPIJWSf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/talk._threadId-CtRQST8F.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MicButton({ onTranscript, busy, speaking, size = "xl", autoStart }) {
	const [listening, setListening] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const recRef = (0, import_react.useRef)(null);
	const start = () => {
		setError(null);
		const rec = getRecognition();
		if (!rec) {
			setError("Voice not supported in this browser");
			return;
		}
		recRef.current = rec;
		rec.onresult = (e) => {
			const t = e.results[0]?.[0]?.transcript ?? "";
			if (t) onTranscript(t);
		};
		rec.onerror = () => setError("Could not hear you. Try again.");
		rec.onend = () => setListening(false);
		try {
			rec.start();
			setListening(true);
		} catch {
			setListening(false);
		}
	};
	const stop = () => {
		recRef.current?.stop();
		setListening(false);
	};
	(0, import_react.useEffect)(() => {
		if (autoStart && !busy && !speaking && !listening) {
			const t = setTimeout(() => start(), 400);
			return () => clearTimeout(t);
		}
	}, [
		autoStart,
		busy,
		speaking
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: listening ? stop : start,
				disabled: busy,
				"aria-label": listening ? "Stop listening" : "Tap to speak",
				className: `${size === "xl" ? "size-32" : "size-24"} rounded-full grid place-items-center text-primary-foreground transition-all
          ${busy ? "bg-muted-foreground" : listening ? "bg-destructive mic-pulse" : speaking ? "bg-primary speaking-glow" : "bg-primary hover:scale-105 active:scale-95"}
        `,
				children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-12 animate-spin" }) : speaking ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-14" }) : listening ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "size-14" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-14" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground min-h-5",
				children: busy ? "Thinking…" : speaking ? "Speaking…" : listening ? "Listening — tap to stop" : "Tap to speak"
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-destructive",
				children: error
			})
		]
	});
}
var commandWords = /\b(open|show|view|go|navigate|take me|switch|move|pull up|bring up|display|launch|start|schedule)\b/i;
var navigationIntents = [
	{
		action: "OPEN_CHART_HISTORY",
		screen: "ChartHistory",
		to: "/memory",
		label: "Chart History",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(chart|health|medical)\s+(history|timeline|memory|record)s?\b/i, /\b(chart|health|medical)\s+(history|timeline|memory|record)s?\b/i],
		fuzzy: [/\b(history|timeline|memory|record)s?\b/i]
	},
	{
		action: "OPEN_CHAT_HISTORY",
		screen: "ChatHistory",
		to: "/talk",
		label: "Chat History",
		appAction: "OPEN_CHAT_DRAWER",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(chat|conversation)\s+history\b/i],
		fuzzy: [/\b(chat|conversation)s?\b/i, /\bhistory\b/i]
	},
	{
		action: "OPEN_MEDICATION_HISTORY",
		screen: "MedicationHistory",
		to: "/reminders",
		label: "Medication History",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(medication|medicine|med|pill)s?\s+(history|log|timeline)\b/i, /\b(medication|medicine|med|pill)s?\s+(history|log|timeline)\b/i],
		fuzzy: [/\b(medication|medicine|med|pill)s?\b/i, /\b(history|log|timeline)\b/i]
	},
	{
		action: "OPEN_MEDICATIONS",
		screen: "Medications",
		to: "/reminders",
		label: "Medications",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(medication|medicine|med|pill)s?\b/i],
		fuzzy: [/\b(medication|medicine|med|pill)s?\b/i]
	},
	{
		action: "OPEN_PROFILE",
		screen: "Profile",
		to: "/profile",
		label: "Profile",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(profile|account|personal info|details)\b/i],
		fuzzy: [/\b(profile|account)\b/i]
	},
	{
		action: "OPEN_EMERGENCY_PROFILE",
		screen: "EmergencyProfile",
		to: "/emergency",
		label: "Emergency Profile",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(emergency|medical)\s+(profile|info|information)\b/i, /\b(emergency|medical)\s+(profile|info|information)\b/i],
		fuzzy: [/\bemergency\b/i, /\b(profile|info|information)\b/i]
	},
	{
		action: "OPEN_QR_CODE",
		screen: "EmergencyQRCode",
		to: "/emergency",
		label: "QR Code",
		exact: [/\b(open|show|view|pull up|bring up|display)\s+(my\s+)?(qr|qr code|emergency qr|emergency card|sos card)\b/i, /\b(qr|qr code|emergency qr|emergency card|sos card)\b/i],
		fuzzy: [/\b(qr|code|card)\b/i, /\b(emergency|sos)\b/i]
	},
	{
		action: "OPEN_REMINDERS",
		screen: "Reminders",
		to: "/reminders",
		label: "Reminders",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?reminders?\b/i],
		fuzzy: [/\breminders?\b/i]
	},
	{
		action: "OPEN_SETTINGS",
		screen: "Settings",
		to: "/profile",
		label: "Settings",
		exact: [/\b(open|show|view|pull up|bring up)\s+(settings|preferences)\b/i],
		fuzzy: [/\b(settings|preferences)\b/i]
	},
	{
		action: "GO_HOME",
		screen: "Home",
		to: "/",
		label: "Home",
		exact: [/\b(go|navigate|take me|bring me|send me)\s+home\b/i, /\b(open|show)\s+(home|main|start)\b/i],
		fuzzy: [/\b(home|main|start)\b/i]
	},
	{
		action: "OPEN_CAREGIVER_SUMMARY",
		screen: "CaregiverSummary",
		to: "/caregiver",
		label: "Caregiver Summary",
		exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(caregiver|family)\s+(summary|dashboard|view)\b/i, /\b(caregiver|family)\s+(summary|dashboard|view)\b/i],
		fuzzy: [/\b(caregiver|family)\b/i, /\b(summary|dashboard|view)\b/i]
	},
	{
		action: "SCHEDULE_DOCTOR_VISIT",
		screen: "DoctorVisitScheduler",
		to: "/doctor",
		label: "Doctor Visit",
		exact: [
			/\b(schedule|book|plan|start|open)\s+(a\s+)?(doctor|physician|clinic)\s+(visit|appointment)\b/i,
			/\b(go|navigate|take me|bring me|send me)\s+(to\s+)?(the\s+)?doctor\s+(page|tab|screen)\b/i,
			/\b(open|show)\s+(the\s+)?doctor\s+(page|tab|screen)\b/i,
			/\b(doctor|physician|clinic)\s+(visit|appointment)\b/i
		],
		fuzzy: [/\b(schedule|book|plan|go|navigate|open|show)\b/i, /\b(doctor|physician|clinic|appointment|visit|page|tab)\b/i]
	}
];
function normalize(text) {
	return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
function scoreIntent(text, exact, fuzzy) {
	if (exact.some((rx) => rx.test(text))) return 95;
	const matches = fuzzy.filter((rx) => rx.test(text)).length;
	if (matches === 0) return 0;
	const base = commandWords.test(text) ? 58 : 38;
	return Math.min(base + matches * 14, 79);
}
function detectNavigationIntent(text) {
	const t = normalize(text);
	if (!t) return null;
	const best = navigationIntents.map((intent) => ({
		...intent,
		confidence: scoreIntent(t, intent.exact, intent.fuzzy)
	})).sort((a, b) => b.confidence - a.confidence)[0];
	if (!best || best.confidence === 0) return null;
	return {
		action: best.action,
		screen: best.screen,
		to: best.to,
		label: best.label,
		confidence: best.confidence,
		route: "Local Navigation",
		appAction: best.appAction
	};
}
function isHighConfidenceNavigation(intent) {
	return Boolean(intent && intent.confidence > 80);
}
function logNavigationIntent(intent) {
	console.info(`Detected Intent: ${intent.action}`);
	console.info(`Confidence: ${intent.confidence}%`);
	console.info(`Route: ${intent.route}`);
}
var SUGGESTIONS = [
	"How are you today?",
	"Who are you?",
	"I have a symptom I want to remember",
	"Help me prepare for my doctor visit"
];
function isMeaningfulPatientContextMessage(text) {
	const clean = text.replace(/\s+/g, " ").trim();
	if (clean.length < 8) return false;
	return /\b(doctor|visit|appointment|symptom|medication|medicine|dose|started|timeline|concern|worried|question|ask|health|feel|feeling)\b/i.test(clean);
}
function normalizeClinicalText(text) {
	return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function getClinicalKeywords(text) {
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
		"with"
	]);
	return normalizeClinicalText(text).split(" ").filter((word) => word.length >= 4 && !stopWords.has(word));
}
function clinicalTextMentionsItem(text, item) {
	const cleanText = normalizeClinicalText(text);
	const cleanItem = normalizeClinicalText(item);
	if (!cleanText || !cleanItem) return false;
	if (cleanText.includes(cleanItem)) return true;
	const keywords = getClinicalKeywords(item);
	if (!keywords.length) return false;
	return keywords.filter((word) => cleanText.includes(word)).length >= Math.min(2, keywords.length);
}
function getCurrentVisitConversationText(state, extraText = "") {
	const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
	return [...state.threads.flatMap((thread) => thread.messages.filter((message) => message.role === "user" && message.at >= currentVisitStartedAt).map((message) => message.content)), extraText].join(" ");
}
function getSavedVisitSummaryText(state) {
	return [...state.visits.flatMap((visit) => [
		visit.summary,
		visit.patientSummary,
		visit.topicsDiscussed,
		visit.diagnosisOrConcerns,
		visit.notes
	]), ...state.summaries.map((summary) => summary.text)].filter(Boolean).join(" ");
}
function filterCurrentVisitPatientContext(context, state, latestText = "") {
	const currentConversationText = getCurrentVisitConversationText(state, latestText);
	const savedVisitSummaryText = getSavedVisitSummaryText(state);
	return {
		...context,
		symptoms: context.symptoms?.filter((symptom) => {
			if (clinicalTextMentionsItem(currentConversationText, symptom)) return true;
			return !clinicalTextMentionsItem(savedVisitSummaryText, symptom);
		})
	};
}
function getPatientIdForContext(state) {
	return state.profile.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "default-patient";
}
function unique(values) {
	const seen = /* @__PURE__ */ new Set();
	const result = [];
	for (const value of values) {
		const cleaned = value.replace(/\s+/g, " ").trim();
		const key = cleaned.toLowerCase();
		if (!cleaned || seen.has(key)) continue;
		seen.add(key);
		result.push(cleaned);
	}
	return result;
}
function buildOfflineReply(text, state) {
	const lower = text.toLowerCase();
	const { meds, symptoms, visits } = state;
	if (/\b(symptom|symptoms|health concern|concern|feel|feeling)\b/i.test(text)) return "I'm offline, but I can still keep this health concern available on this device for your doctor visit.";
	if (/med|medicine|dose|pill|take|taken/i.test(lower)) {
		if (!meds.length) return "I can still show your medication list offline, but no medications are saved yet.";
		return `I can still help offline. Your saved medications are ${meds.slice(0, 3).map((med) => `${med.name} ${med.dosage}`).join(", ")}.`;
	}
	if (/doctor|visit|summary/i.test(lower)) {
		if (!visits.length) return "I can open doctor visit summaries offline, but there are no saved visit summaries yet.";
		return "Your saved doctor visit summaries are available offline in the Visits tab.";
	}
	if (/sos|emergency|qr/i.test(lower)) return "Your SOS emergency QR works offline. Open the SOS tab to show, save, share, or print the emergency card.";
	if (symptoms.length) return `I'm offline, but I can still talk and use saved information on this device. Your recent symptoms include ${symptoms.slice(0, 3).map((symptom) => symptom.name).join(", ")}.`;
	return "I'm offline, but I can still talk. I can help with saved medications, symptoms, SOS QR, and doctor visit summaries on this device.";
}
function asRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringValue(value) {
	return typeof value === "string" ? value.trim() : "";
}
function arrayValue(value) {
	return Array.isArray(value) ? value : [];
}
function normalizeSeverity(value) {
	if (typeof value === "number" && Number.isFinite(value)) return Math.min(10, Math.max(1, Math.round(value)));
	const text = stringValue(value).toLowerCase();
	if (text === "mild") return 3;
	if (text === "moderate") return 5;
	if (text === "severe") return 8;
	return 5;
}
function normalizeFrequency(value) {
	const text = stringValue(value);
	if (!text) return "";
	if (/\btwice|2 times|two times\b/i.test(text)) return "Twice daily";
	if (/\bonce|1 time|one time\b/i.test(text)) return "Once daily";
	if (/\bdaily|every day\b/i.test(text)) return "Daily";
	return text;
}
function normalizeMedicationText(name, dosage, frequency) {
	return [
		name,
		dosage,
		frequency
	].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function medicationDisplay(name, dosage, frequency) {
	const label = [name, dosage].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
	return frequency ? `${label} — ${frequency.toLowerCase()}` : label;
}
function looksLikeDoseTaken(text) {
	return /\b(already\s+)?(taken|took|take|had|completed)\b/i.test(text);
}
function findMedicationMention(medications, text) {
	const clean = text.toLowerCase();
	return medications.find((med) => {
		const name = med.name.toLowerCase();
		if (name && clean.includes(name)) return true;
		const words = name.split(/\s+/).filter((word) => word.length > 3);
		return words.length > 0 && words.some((word) => clean.includes(word));
	});
}
function normalizeAgentSymptomItems(items, fallbackText) {
	return items.map((item) => {
		const record = asRecord(item);
		return {
			name: stringValue(record.name || record.symptomName || item),
			notes: stringValue(record.notes || fallbackText),
			onset: stringValue(record.onset),
			duration: stringValue(record.duration),
			severity: normalizeSeverity(record.severity)
		};
	}).filter((symptom) => symptom.name);
}
function buildAgentRouterState(state) {
	return {
		profile: state.profile,
		medications: state.meds.map((med) => ({
			name: med.name,
			dosage: med.dosage,
			frequency: med.frequency,
			times: med.times
		})),
		symptoms: state.symptoms.slice(0, 12).map((symptom) => ({
			name: symptom.name,
			severity: symptom.severity,
			notes: symptom.notes
		})),
		patientContext: state.patientContext,
		latestVisits: state.visits.slice(0, 4).map((visit) => ({
			summary: visit.summary,
			diagnosisOrConcerns: visit.diagnosisOrConcerns,
			medicationChanges: visit.medicationChanges,
			actionItems: visit.actionItems
		}))
	};
}
function routeFromAgent(path) {
	return new Set([
		"/",
		"/talk",
		"/reminders",
		"/doctor",
		"/memory",
		"/emergency",
		"/profile"
	]).has(path) ? path : null;
}
function TalkThreadPage() {
	const { threadId } = useParams({ from: "/talk/$threadId" });
	const navigate = useNavigate();
	const { threads, appendToThread, clearThread, deleteThread, createThread, setActiveThread, setProfile, addMed, logDose, addSymptom, removeSymptomsByKeyword, addDoctorVisitPrep, addNote, updatePatientContext } = useApp();
	const thread = threads.find((t) => t.id === threadId);
	const messages = thread?.messages ?? [];
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [speaking, setSpeaking] = (0, import_react.useState)(false);
	const [autoListen, setAutoListen] = (0, import_react.useState)(false);
	const [input, setInput] = (0, import_react.useState)("");
	const [drawerOpen, setDrawerOpen] = (0, import_react.useState)(false);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const scrollRef = (0, import_react.useRef)(null);
	const patientContextExtractionAvailableRef = (0, import_react.useRef)(true);
	const { offline } = useConnectivity();
	const updateCurrentVisitPatientContext = (context, latestText = "") => {
		return updatePatientContext(filterCurrentVisitPatientContext(context, useApp.getState(), latestText));
	};
	(0, import_react.useEffect)(() => {
		if (thread) setActiveThread(thread.id);
	}, [thread, setActiveThread]);
	(0, import_react.useEffect)(() => {
		const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
		if (useApp.persist.hasHydrated()) setHydrated(true);
		return () => unsub();
	}, []);
	(0, import_react.useEffect)(() => {
		if (hydrated && !thread) navigate({
			to: "/talk",
			replace: true
		});
	}, [
		hydrated,
		thread,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages.length, busy]);
	const sortedThreads = (0, import_react.useMemo)(() => [...threads].sort((a, b) => b.updatedAt - a.updatedAt), [threads]);
	const handleNewChat = () => {
		stopSpeaking();
		setSpeaking(false);
		const tid = createThread();
		setDrawerOpen(false);
		navigate({
			to: "/talk/$threadId",
			params: { threadId: tid }
		});
	};
	const handleSwitchThread = (tid) => {
		stopSpeaking();
		setSpeaking(false);
		setDrawerOpen(false);
		navigate({
			to: "/talk/$threadId",
			params: { threadId: tid }
		});
	};
	const handleDeleteThread = (tid) => {
		deleteThread(tid);
		if (tid === threadId) {
			const next = threads.find((t) => t.id !== tid);
			if (next) navigate({
				to: "/talk/$threadId",
				params: { threadId: next.id },
				replace: true
			});
			else navigate({
				to: "/talk",
				replace: true
			});
		}
	};
	const handleUtterance = async (raw) => {
		const text = raw.trim();
		if (!text || busy || !thread) return;
		setAutoListen(false);
		appendToThread(thread.id, {
			role: "user",
			content: text
		});
		setBusy(true);
		const speakAndContinue = async (reply) => {
			appendToThread(thread.id, {
				role: "assistant",
				content: reply
			});
			setBusy(false);
			setSpeaking(true);
			await speak(reply, () => {
				setSpeaking(false);
				setAutoListen(true);
			});
		};
		const applyAgentAction = async (decision) => {
			const action = decision.action || "answer";
			const data = asRecord(decision.data);
			const saved = [];
			let reply = stringValue(decision.response);
			if (action === "update_profile") {
				const profilePatch = {};
				for (const key of [
					"name",
					"dob",
					"bloodGroup",
					"allergies",
					"conditions",
					"primaryPhysician"
				]) {
					const value = stringValue(data[key]);
					if (value) profilePatch[key] = value;
				}
				if (Array.isArray(data.emergencyContacts)) profilePatch.emergencyContacts = data.emergencyContacts.map((contact) => {
					const record = asRecord(contact);
					return {
						name: stringValue(record.name),
						phone: stringValue(record.phone),
						relation: stringValue(record.relation)
					};
				}).filter((contact) => contact.name || contact.phone);
				if (Object.keys(profilePatch).length) {
					setProfile(profilePatch);
					const updatedProfile = useApp.getState().profile;
					if (profilePatch.name) saved.push(`name: ${updatedProfile.name}`);
					if (profilePatch.dob) saved.push(`DOB: ${updatedProfile.dob}`);
					if (profilePatch.bloodGroup) saved.push(`blood group: ${updatedProfile.bloodGroup}`);
					if (profilePatch.allergies) saved.push(`allergies: ${updatedProfile.allergies}`);
					if (profilePatch.conditions) saved.push(`conditions: ${updatedProfile.conditions}`);
					if (profilePatch.primaryPhysician) saved.push(`primary physician: ${updatedProfile.primaryPhysician}`);
					if (profilePatch.emergencyContacts) saved.push("emergency contact");
					reply = `Got it. I updated your profile${saved.length ? ` — ${saved.join(", ")}` : ""}.`;
				}
			}
			if (action === "add_medication") {
				const existingMedicationForDose = looksLikeDoseTaken(text) ? findMedicationMention(useApp.getState().meds, text) : null;
				if (existingMedicationForDose) {
					logDose(existingMedicationForDose.id, "taken");
					reply = `Got it. I logged ${existingMedicationForDose.name} as taken.`;
					await speakAndContinue(reply);
					return;
				}
				const medicationItems = arrayValue(data.medications).length ? arrayValue(data.medications) : [data];
				const stateBefore = useApp.getState();
				const existingKeys = new Set(stateBefore.meds.map((med) => normalizeMedicationText(med.name, med.dosage, med.frequency).toLowerCase()));
				const savedMeds = [];
				const existingMeds = [];
				for (const item of medicationItems) {
					const med = asRecord(item);
					const name = stringValue(med.name || med.medicationName || item);
					if (!name) continue;
					const dosage = stringValue(med.dosage || med.dose);
					const frequency = normalizeFrequency(med.frequency || med.timing || med.schedule);
					const key = normalizeMedicationText(name, dosage, frequency).toLowerCase();
					if (!existingKeys.has(key)) {
						addMed({
							name,
							dosage,
							frequency,
							times: []
						});
						existingKeys.add(key);
						savedMeds.push(medicationDisplay(name, dosage, frequency));
					} else existingMeds.push(medicationDisplay(name, dosage, frequency));
				}
				if (savedMeds.length) {
					updateCurrentVisitPatientContext({ medications: savedMeds }, text);
					const updated = useApp.getState().patientContext.medications;
					reply = "I've updated your medication list and will include this in today's doctor visit.";
					console.info("Agent saved medications", updated);
				} else if (existingMeds.length) reply = `I already have ${existingMeds.join(", ")} in your medication list.`;
			}
			if (action === "log_dose") {
				const medicationName = stringValue(data.medicationName || data.name || data.medication);
				const medication = findMedicationMention(useApp.getState().meds, medicationName || text) || findMedicationMention(useApp.getState().meds, text);
				if (medication) {
					logDose(medication.id, "taken");
					reply = `Got it. I logged ${medication.name} as taken.`;
				} else reply = "Which medication did you take?";
			}
			if (action === "add_symptom") {
				const symptomItems = normalizeAgentSymptomItems(arrayValue(data.symptoms).length ? arrayValue(data.symptoms) : [data], text);
				const existingKeys = new Set(useApp.getState().symptoms.map((symptom) => symptom.name.toLowerCase()));
				const savedSymptoms = [];
				for (const item of symptomItems) {
					const symptom = asRecord(item);
					const name = stringValue(symptom.name);
					if (!name) continue;
					const notes = stringValue(symptom.notes || data.notes || text);
					const severity = normalizeSeverity(symptom.severity || data.severity);
					if (!existingKeys.has(name.toLowerCase())) {
						addSymptom({
							name,
							severity,
							notes
						});
						existingKeys.add(name.toLowerCase());
					}
					savedSymptoms.push(name);
				}
				if (savedSymptoms.length) {
					updateCurrentVisitPatientContext({
						symptoms: savedSymptoms,
						visitReason: stringValue(data.visitReason || data.reasonForVisit),
						onset: stringValue(data.onset),
						duration: stringValue(data.duration),
						patientNotes: [stringValue(data.notes)].filter(Boolean)
					}, text);
					reply = "I've updated your health summary and will include these symptoms in today's doctor visit.";
				}
			}
			if (action === "remove_symptom") {
				const keyword = stringValue(data.keyword) || stringValue(data.symptomName) || stringValue(data.name) || stringValue(data.symptom) || text;
				const beforeCount = useApp.getState().symptoms.length;
				const removedCount = removeSymptomsByKeyword(keyword);
				const afterState = useApp.getState();
				if (removedCount > 0 && afterState.symptoms.length < beforeCount) reply = `Done — I removed ${keyword} from your symptom notes.`;
				else reply = `I checked your notes, but I did not find ${keyword} in your symptoms.`;
			}
			if (action === "doctor_visit_prep") {
				const symptomItems = normalizeAgentSymptomItems(arrayValue(data.symptoms), text);
				const prepSymptoms = unique(symptomItems.map((symptom) => symptom.name));
				const concerns = unique(arrayValue(data.concerns).map((item) => stringValue(item)));
				const questionsForDoctor = unique(arrayValue(data.questionsForDoctor).map((item) => stringValue(item)));
				const visitReason = stringValue(data.visitReason || data.reasonForVisit);
				const onset = stringValue(data.onset) || symptomItems.find((symptom) => symptom.onset)?.onset || "";
				const duration = stringValue(data.duration) || symptomItems.find((symptom) => symptom.duration)?.duration || "";
				const timeline = stringValue(data.timeline || onset || duration);
				const patientNotes = unique(arrayValue(data.patientNotes).map((item) => stringValue(item)));
				updateCurrentVisitPatientContext({
					symptoms: prepSymptoms,
					visitReason,
					onset,
					duration: duration || timeline,
					patientNotes,
					concerns,
					questionsForDoctor
				}, text);
				addDoctorVisitPrep({
					reasonForVisit: visitReason,
					symptoms: prepSymptoms,
					timeline,
					context: [...concerns, ...patientNotes].join(" "),
					sourceText: text
				});
				reply = [
					useApp.getState().patientContext.visitReason,
					...prepSymptoms,
					...concerns,
					...questionsForDoctor
				].filter(Boolean).length ? "I've updated your pre-visit summary and will use it for today's doctor visit." : "I've updated your doctor-visit summary with that information.";
				const to = routeFromAgent(stringValue(decision.navigateTo || data.navigateTo));
				if (to === "/doctor") navigate({ to });
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
					reply = to === "/doctor" ? "Opening Doctor Visit now." : to === "/reminders" ? "Opening Medications now." : to === "/emergency" ? "Opening your emergency QR card now." : "Opening that page now.";
				}
			}
			if (action === "new_chat") {
				navigate({
					to: "/talk/$threadId",
					params: { threadId: createThread() }
				});
				reply = "Opening a new chat now.";
			}
			if (action === "open_previous_chat") {
				setDrawerOpen(true);
				reply = "Opening your previous chats now.";
			}
			await speakAndContinue(reply || "Done. I took care of that.");
		};
		const stateBeforeContextUpdate = useApp.getState();
		if (!offline) try {
			const conversation = (stateBeforeContextUpdate.threads.find((candidate) => candidate.id === thread.id)?.messages ?? []).slice(-8).map((message) => ({
				role: message.role,
				content: message.content
			}));
			await applyAgentAction((await routeMedsBuddyAgent({
				patientId: getPatientIdForContext(stateBeforeContextUpdate),
				message: text,
				conversation,
				currentState: buildAgentRouterState(stateBeforeContextUpdate)
			})).result ?? {
				action: "answer",
				response: ""
			});
			return;
		} catch (error) {
			console.info("Agent router unavailable.", error);
		}
		const nav = detectNavigationIntent(text);
		if (isHighConfidenceNavigation(nav)) {
			logNavigationIntent(nav);
			console.info("Structured Action:", {
				action: nav.action,
				screen: nav.screen
			});
			if (nav.appAction === "OPEN_CHAT_DRAWER") {
				setDrawerOpen(true);
				await speakAndContinue("Opening your previous chats now.");
				return;
			}
			navigate({ to: nav.to });
			await speakAndContinue(nav.to === "/doctor" ? "Opening Doctor Visit now." : "Opening that page now.");
			return;
		}
		if (patientContextExtractionAvailableRef.current && isMeaningfulPatientContextMessage(text)) {
			const state = useApp.getState();
			const current = state.threads.find((candidate) => candidate.id === thread.id);
			const currentVisitStartedAt = state.patientContext.currentVisitStartedAt ?? 0;
			const conversation = [...(current?.messages ?? []).filter((message) => message.at >= currentVisitStartedAt).slice(-10).map((message) => ({
				role: message.role,
				content: message.content
			})), {
				role: "user",
				content: text
			}];
			extractPatientContext({
				patientId: getPatientIdForContext(state),
				conversation
			}).then((result) => {
				updateCurrentVisitPatientContext(result.patientContext, text);
			}).catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				if (/405|method not allowed|endpoint was not found|not found/i.test(message)) patientContextExtractionAvailableRef.current = false;
				console.info("Patient context extraction unavailable.");
			});
		}
		if (offline) {
			await speakAndContinue(buildOfflineReply(text, useApp.getState()));
			return;
		}
		await speakAndContinue("I could not reach the MedsBuddy agent. Please try again in a moment.");
	};
	if (!hydrated || !thread) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-20 text-center text-sm text-muted-foreground",
		children: "Opening MedsBuddy…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col",
		style: { minHeight: "calc(100vh - 200px)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 mb-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setDrawerOpen(true),
						className: "size-10 rounded-full bg-card border grid place-items-center text-muted-foreground hover:bg-secondary transition shrink-0",
						"aria-label": "Chat history",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiOrb, {
						size: 56,
						speaking,
						listening: autoListen,
						thinking: busy
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted-foreground font-medium truncate",
							children: thread?.title || "MedsBuddy AI"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-base font-semibold tracking-tight leading-tight",
							children: busy ? "Thinking…" : speaking ? "Speaking…" : "How can I help?"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: handleNewChat,
						className: "rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 shadow-elegant shrink-0",
						"aria-label": "New chat",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), " New"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scrollRef,
				className: "flex-1 overflow-y-auto space-y-3 pr-1 -mx-1 px-1",
				children: [
					offline && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-primary/25 bg-primary/[0.05] p-3.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 font-semibold text-primary text-[14px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { className: "size-4" }), " Limited Offline Mode"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px] mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5",
									children: "Available"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "· Health notes" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "· Symptoms" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "· Doctor Summary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "· Emergency QR" })
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5",
									children: "Unavailable"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-muted-foreground",
									children: "· AI Patient Advocate"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-muted-foreground",
									children: "· Medical search"
								})
							] })]
						})]
					}),
					messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center text-sm text-muted-foreground mb-4 inline-flex items-center gap-1.5 mx-auto w-full justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4 text-primary" }), "Try one of these"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-2",
							children: SUGGESTIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => handleUtterance(s),
								className: "text-left rounded-2xl border bg-card hover:bg-secondary/50 shadow-card px-4 py-3 text-[15px] transition active:scale-[0.98]",
								children: s
							}, s))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
						initial: false,
						children: messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
							initial: {
								opacity: 0,
								y: 8
							},
							animate: {
								opacity: 1,
								y: 0
							},
							className: `flex ${m.role === "user" ? "justify-end" : "justify-start"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"}`,
								children: m.content
							})
						}, m.id))
					}),
					busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex justify-start",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-card border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-primary typing-dot" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-2 rounded-full bg-primary typing-dot",
									style: { animationDelay: "0.15s" }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-2 rounded-full bg-primary typing-dot",
									style: { animationDelay: "0.3s" }
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pt-4 mt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center justify-center mb-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicButton, {
							onTranscript: handleUtterance,
							busy,
							speaking,
							autoStart: autoListen,
							size: "xl"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (e) => {
							e.preventDefault();
							const t = input.trim();
							if (!t) return;
							setInput("");
							handleUtterance(t);
						},
						className: "flex gap-2 items-center bg-card border shadow-card rounded-full px-2 py-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: input,
							onChange: (e) => setInput(e.target.value),
							placeholder: "Or type a message…",
							className: "flex-1 bg-transparent px-3 py-2 text-[15px] outline-none"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "size-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50",
							disabled: !input.trim(),
							"aria-label": "Send",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
						})]
					}),
					messages.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							stopSpeaking();
							if (thread) clearThread(thread.id);
						},
						className: "mt-3 mx-auto block text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3" }), " Clear this conversation"]
					})
				]
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: drawerOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		onClick: () => setDrawerOpen(false),
		className: "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.aside, {
		initial: { x: "-100%" },
		animate: { x: 0 },
		exit: { x: "-100%" },
		transition: {
			type: "spring",
			damping: 28,
			stiffness: 240
		},
		className: "fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-background border-r shadow-2xl flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-4 border-b flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[11px] text-muted-foreground font-medium",
					children: "Conversations"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold",
					children: "Chat history"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setDrawerOpen(false),
					className: "size-9 rounded-full bg-card border grid place-items-center",
					"aria-label": "Close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: handleNewChat,
					className: "w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " New chat"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "flex-1 overflow-y-auto px-3 pb-4 space-y-1.5",
				children: [sortedThreads.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-sm text-muted-foreground text-center py-10",
					children: "No conversations yet."
				}), sortedThreads.map((t) => {
					const active = t.id === threadId;
					const preview = t.messages[t.messages.length - 1]?.content?.slice(0, 60) ?? "Empty chat";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: `rounded-xl border px-3 py-2.5 flex items-start gap-2 transition ${active ? "bg-primary/10 border-primary/40" : "bg-card hover:bg-secondary/50"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							role: "button",
							tabIndex: 0,
							onClick: () => handleSwitchThread(t.id),
							onKeyDown: (e) => {
								if (e.key === "Enter") handleSwitchThread(t.id);
							},
							className: "flex-1 min-w-0 text-left cursor-pointer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[14px] font-medium truncate inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "size-3.5 text-primary shrink-0" }), t.title]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[12px] text-muted-foreground truncate mt-0.5",
									children: preview
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] text-muted-foreground mt-1",
									children: new Date(t.updatedAt).toLocaleString()
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => handleDeleteThread(t.id),
							className: "size-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0",
							"aria-label": `Delete ${t.title}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
						})]
					}, t.id);
				})]
			})
		]
	})] }) })] });
}
//#endregion
export { TalkThreadPage as component };
