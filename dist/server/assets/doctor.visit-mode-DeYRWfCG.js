import { n as useApp, t as adherence } from "./store-xEuxQ6YF.js";
import { i as stopSpeaking, n as getRecognition, r as speak, t as useConnectivity } from "./connectivity-CwnS1gGA.js";
import { t as aiChat } from "./ai-chat.functions-CsFDkth9.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronLeft, ListChecks, Loader2, Mic, MicOff, Pencil, ShieldAlert, ShieldCheck, Sparkles, Square, Stethoscope, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
//#region src/routes/doctor.visit-mode.tsx?tsr-split=component
var STEPS = [
	{
		key: "review",
		label: "Review"
	},
	{
		key: "speak",
		label: "Speak"
	},
	{
		key: "consent",
		label: "Consent"
	},
	{
		key: "recording",
		label: "Record"
	},
	{
		key: "summary",
		label: "Summary"
	}
];
function buildPatientSummary(state) {
	const { profile, meds, doses, symptoms, appointments } = state;
	const adh = adherence(doses, 7);
	const last7 = Date.now() - 7 * 864e5;
	const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
	const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
	const recentSymp = symptoms.filter((s) => s.at >= last7);
	const sympCounts = {};
	for (const s of recentSymp) sympCounts[s.name] = (sympCounts[s.name] ?? 0) + 1;
	const lines = [];
	lines.push(`Hello Doctor. The patient would like to share a short health summary for ${profile.name || "the patient"}.`);
	if (meds.length) lines.push(`Current medications: ${meds.map((m) => `${m.name} ${m.dosage}`).join(", ")}.`);
	lines.push(`Over the last 7 days, medication adherence is ${adh} percent, with ${taken} doses taken and ${missed} missed or skipped.`);
	if (recentSymp.length) {
		const parts = Object.entries(sympCounts).map(([n, c]) => `${n}${c > 1 ? ` ${c} times` : ""}`);
		lines.push(`Reported symptoms include ${parts.join(", ")}.`);
	} else lines.push("No symptoms reported this week.");
	if (profile.allergies) lines.push(`Allergies: ${profile.allergies}.`);
	if (profile.conditions) lines.push(`Conditions: ${profile.conditions}.`);
	const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];
	if (upcoming) lines.push(`Upcoming visit with ${upcoming.doctor} on ${new Date(upcoming.at).toLocaleDateString()}.`);
	lines.push("The patient would like to discuss adherence, any new symptoms, and possible medication adjustments.");
	return lines.join(" ");
}
var CONSENT_PROMPT = "Doctor, with the patient's permission, may I record this visit to help create an accurate after-visit summary and follow-up notes?";
function DoctorVisitMode() {
	const state = useApp();
	const navigate = useNavigate({ from: "/doctor/visit-mode" });
	const { addSummary, addVisit, addNote, setCurrentVisitSummary } = state;
	const { online } = useConnectivity();
	const generated = useMemo(() => buildPatientSummary(state), [state]);
	const [stage, setStage] = useState("review");
	const [draft, setDraft] = useState(generated);
	const [editing, setEditing] = useState(false);
	const [doctorName, setDoctorName] = useState("");
	const [specialty, setSpecialty] = useState("");
	const [speaking, setSpeaking] = useState(false);
	const [listening, setListening] = useState(false);
	const [heardText, setHeardText] = useState("");
	const recRef = useRef(null);
	const [seconds, setSeconds] = useState(0);
	const [audioUrl, setAudioUrl] = useState(null);
	const [audioDataUrl, setAudioDataUrl] = useState(void 0);
	const [recError, setRecError] = useState(null);
	const recorderRef = useRef(null);
	const chunksRef = useRef([]);
	const tickRef = useRef(null);
	const startedAtRef = useRef(0);
	const streamRef = useRef(null);
	const [outcomeFields, setOutcomeFields] = useState({
		topicsDiscussed: "",
		medicationChanges: "",
		newRecommendations: "",
		testsOrdered: "",
		followUpAppointments: "",
		actionItems: "",
		notes: ""
	});
	const [aiDrafting, setAiDrafting] = useState(false);
	useEffect(() => {
		if (stage === "review" && !editing) setDraft(generated);
	}, [
		generated,
		stage,
		editing
	]);
	useEffect(() => {
		return () => {
			stopSpeaking();
			try {
				recRef.current?.abort();
			} catch {}
			if (tickRef.current) window.clearInterval(tickRef.current);
			streamRef.current?.getTracks().forEach((t) => t.stop());
			if (audioUrl) URL.revokeObjectURL(audioUrl);
		};
	}, []);
	const handleApprove = () => {
		const text = draft.trim();
		if (!text) return;
		addSummary(text);
		setCurrentVisitSummary(text);
		setEditing(false);
		setStage("speak");
		setTimeout(() => doSpeakSummary(text), 250);
	};
	const doSpeakSummary = async (text) => {
		setSpeaking(true);
		await speak(text, () => {
			setSpeaking(false);
			setStage("consent");
			setTimeout(() => doSpeakConsent(), 400);
		});
	};
	const stopSpeakSummary = () => {
		stopSpeaking();
		setSpeaking(false);
	};
	const skipToConsent = () => {
		stopSpeaking();
		setSpeaking(false);
		setStage("consent");
		setTimeout(() => doSpeakConsent(), 200);
	};
	const doSpeakConsent = async () => {
		setSpeaking(true);
		await speak(CONSENT_PROMPT, () => {
			setSpeaking(false);
			startListeningForConsent();
		});
	};
	const startListeningForConsent = () => {
		const rec = getRecognition();
		if (!rec) return;
		recRef.current = rec;
		setHeardText("");
		setListening(true);
		rec.onresult = (ev) => {
			const t = ev.results[0]?.[0]?.transcript ?? "";
			setHeardText(t);
			const lc = t.toLowerCase().trim();
			if (/\b(yes|yeah|yep|okay|ok|sure|approved?|that'?s fine|go ahead|of course)\b/.test(lc)) handleConsent(true);
			else if (/\b(no|nope|not today|decline|don'?t|do not)\b/.test(lc)) handleConsent(false);
		};
		rec.onerror = () => setListening(false);
		rec.onend = () => setListening(false);
		try {
			rec.start();
		} catch {
			setListening(false);
		}
	};
	const stopListening = () => {
		try {
			recRef.current?.abort();
		} catch {}
		setListening(false);
	};
	const handleConsent = async (approved) => {
		stopListening();
		stopSpeaking();
		setSpeaking(false);
		if (approved) await startRecording();
		else {
			toast.info("Recording declined — that's okay. You can still capture the outcome.");
			setStage("summary");
		}
	};
	const startRecording = async () => {
		setRecError(null);
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
			const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
			chunksRef.current = [];
			rec.ondataavailable = (e) => {
				if (e.data.size) chunksRef.current.push(e.data);
			};
			rec.onstop = async () => {
				const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
				setAudioUrl(URL.createObjectURL(blob));
				if (blob.size <= 3 * 1024 * 1024) setAudioDataUrl(await blobToDataUrl(blob));
				streamRef.current?.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
				setStage("summary");
				draftOutcomeWithAi();
			};
			rec.start();
			recorderRef.current = rec;
			startedAtRef.current = Date.now();
			setSeconds(0);
			setStage("recording");
			tickRef.current = window.setInterval(() => {
				setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1e3));
			}, 500);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Microphone unavailable";
			setRecError(msg);
			toast.error("Couldn't start recording", { description: msg });
			setStage("summary");
		}
	};
	const stopRecording = () => {
		if (tickRef.current) {
			window.clearInterval(tickRef.current);
			tickRef.current = null;
		}
		recorderRef.current?.stop();
	};
	const draftOutcomeWithAi = async () => {
		if (!online) return;
		setAiDrafting(true);
		try {
			const { reply } = await aiChat({ data: { messages: [{
				role: "system",
				content: "You are MedsBuddy, a clinical scribe. Based on the patient's pre-visit summary, draft a *visit outcome* template a patient can quickly verify. Output JSON ONLY with keys: topicsDiscussed, medicationChanges, newRecommendations, testsOrdered, followUpAppointments, actionItems. Each value is a short string (may be empty). Do NOT repeat the patient summary text. Keep it generic if details aren't known — patient will edit."
			}, {
				role: "user",
				content: `Patient pre-visit summary:\n${draft}`
			}] } });
			const match = reply.match(/\{[\s\S]*\}/);
			if (match) {
				const parsed = JSON.parse(match[0]);
				setOutcomeFields((prev) => ({
					...prev,
					...parsed,
					notes: prev.notes
				}));
			}
		} catch {} finally {
			setAiDrafting(false);
		}
	};
	const canSaveOutcome = Object.entries(outcomeFields).some(([, v]) => v.trim());
	const handleSaveOutcome = () => {
		const f = outcomeFields;
		const outcomeBits = [
			f.topicsDiscussed && `Discussed: ${f.topicsDiscussed}`,
			f.medicationChanges && `Medication changes: ${f.medicationChanges}`,
			f.newRecommendations && `Recommendations: ${f.newRecommendations}`,
			f.testsOrdered && `Tests ordered: ${f.testsOrdered}`,
			f.followUpAppointments && `Follow-up: ${f.followUpAppointments}`,
			f.actionItems && `Action items: ${f.actionItems}`
		].filter(Boolean);
		const summary = outcomeBits.length > 0 ? outcomeBits.join(". ") : `Visit outcome with ${doctorName || "doctor"}${specialty ? ` (${specialty})` : ""} on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}.`;
		addVisit({
			doctor: doctorName.trim() || "Unspecified doctor",
			specialty: specialty.trim() || void 0,
			durationSec: seconds || void 0,
			audioDataUrl,
			summary,
			patientSummary: draft.trim() || void 0,
			topicsDiscussed: f.topicsDiscussed.trim() || void 0,
			medicationChanges: f.medicationChanges.trim() || void 0,
			newRecommendations: f.newRecommendations.trim() || void 0,
			testsOrdered: f.testsOrdered.trim() || void 0,
			followUpAppointments: f.followUpAppointments.trim() || void 0,
			actionItems: f.actionItems.trim() || void 0,
			notes: f.notes.trim() || void 0,
			recorded: !!audioDataUrl || seconds > 0
		});
		if (f.actionItems.trim()) addNote(`Follow-up from visit: ${f.actionItems.trim()}`);
		if (audioUrl) URL.revokeObjectURL(audioUrl);
		setAudioUrl(null);
		setAudioDataUrl(void 0);
		setCurrentVisitSummary(null);
		setStage("done");
		toast.success("Visit saved to Health Memory");
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("div", {
			className: "mb-3",
			children: /* @__PURE__ */ jsxs("button", {
				onClick: () => navigate({ to: "/doctor" }),
				className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition",
				children: [/* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }), " Exit Visit Mode"]
			})
		}),
		/* @__PURE__ */ jsxs(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-4 relative overflow-hidden",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center",
						children: /* @__PURE__ */ jsx(Stethoscope, { className: "size-6" })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-[12px] opacity-80 font-medium",
						children: "Guided by MedsBuddy"
					}), /* @__PURE__ */ jsx("h1", {
						className: "text-primary-foreground text-2xl",
						children: "Doctor Visit Mode"
					})] })]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm opacity-90 mt-3",
					children: "I'll guide your appointment hands-free — review, speak, ask consent, record only if approved, then summarize."
				})
			]
		}),
		/* @__PURE__ */ jsx(StepBar, { stage }),
		stage === "review" && /* @__PURE__ */ jsxs(Card, {
			icon: Pencil,
			title: "Step 1 · Patient summary",
			tint: "primary",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-[12px] text-muted-foreground mb-2",
					children: "Quick review — this is what MedsBuddy will speak to your doctor."
				}),
				!editing ? /* @__PURE__ */ jsx("div", {
					className: "rounded-xl bg-secondary/40 border p-3 text-[14px] leading-relaxed whitespace-pre-wrap",
					children: draft
				}) : /* @__PURE__ */ jsx("textarea", {
					value: draft,
					onChange: (e) => setDraft(e.target.value),
					rows: 10,
					className: "w-full rounded-xl border bg-background px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2 mt-3",
					children: [/* @__PURE__ */ jsx("input", {
						value: doctorName,
						onChange: (e) => setDoctorName(e.target.value),
						placeholder: "Doctor name (optional)",
						className: "rounded-xl border bg-background px-3 py-2 text-sm"
					}), /* @__PURE__ */ jsx("input", {
						value: specialty,
						onChange: (e) => setSpecialty(e.target.value),
						placeholder: "Specialty (optional)",
						className: "rounded-xl border bg-background px-3 py-2 text-sm"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex gap-2 mt-3",
					children: [/* @__PURE__ */ jsxs("button", {
						onClick: () => setEditing((s) => !s),
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2",
						children: [
							/* @__PURE__ */ jsx(Pencil, { className: "size-4" }),
							" ",
							editing ? "Done editing" : "Edit summary"
						]
					}), /* @__PURE__ */ jsxs("button", {
						onClick: handleApprove,
						disabled: !draft.trim(),
						className: "flex-1 rounded-xl gradient-hero text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Check, { className: "size-5" }), " Approve & Continue"]
					})]
				})
			]
		}),
		stage === "speak" && /* @__PURE__ */ jsxs(Card, {
			icon: Volume2,
			title: "Step 2 · Speaking your summary",
			tint: "primary",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm mb-3",
					children: "MedsBuddy is reading your summary to the doctor. The consent question follows automatically."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "rounded-xl bg-primary/5 border border-primary/20 p-3 text-[13px] leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto",
					children: draft
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex gap-2 mt-3",
					children: [speaking ? /* @__PURE__ */ jsxs("button", {
						onClick: stopSpeakSummary,
						className: "flex-1 rounded-xl bg-destructive text-destructive-foreground py-3 font-semibold inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(Square, { className: "size-4 fill-current" }), " Stop speaking"]
					}) : /* @__PURE__ */ jsxs("button", {
						onClick: () => doSpeakSummary(draft),
						className: "flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(Volume2, { className: "size-5" }), " Replay"]
					}), /* @__PURE__ */ jsx("button", {
						onClick: skipToConsent,
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 font-medium",
						children: "Skip to consent"
					})]
				})
			]
		}),
		stage === "consent" && /* @__PURE__ */ jsxs(Card, {
			icon: ShieldAlert,
			title: "Step 3 · Asking the doctor",
			tint: "warning",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-xl bg-warning/10 border border-warning/30 p-3 mb-3 text-[13px]",
					children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-warning mb-1",
						children: "MedsBuddy is asking the doctor:"
					}), /* @__PURE__ */ jsxs("div", {
						className: "italic",
						children: [
							"\"",
							CONSENT_PROMPT,
							"\""
						]
					})]
				}),
				listening && /* @__PURE__ */ jsxs("div", {
					className: "rounded-xl bg-primary/10 border border-primary/30 p-3 mb-3 flex items-center gap-2 text-[13px]",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "relative grid place-items-center size-7 rounded-full bg-primary/20",
							children: [/* @__PURE__ */ jsx("span", { className: "absolute inset-0 rounded-full bg-primary/40 animate-ping" }), /* @__PURE__ */ jsx(Mic, { className: "size-3.5 text-primary relative" })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ jsx("div", {
								className: "font-semibold text-primary",
								children: "Listening for doctor's reply…"
							}), /* @__PURE__ */ jsx("div", {
								className: "text-muted-foreground text-[12px]",
								children: heardText || "Say \"yes\" or \"no\" — or tap a button below."
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: stopListening,
							className: "text-[12px] text-muted-foreground underline",
							children: "Stop"
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ jsxs("button", {
							onClick: () => handleConsent(true),
							className: "rounded-xl gradient-hero text-primary-foreground py-4 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant",
							children: [/* @__PURE__ */ jsx(Check, { className: "size-5" }), " Doctor Approved Recording"]
						}),
						/* @__PURE__ */ jsxs("button", {
							onClick: () => handleConsent(false),
							className: "rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2",
							children: [/* @__PURE__ */ jsx(MicOff, { className: "size-5" }), " Doctor Declined Recording"]
						}),
						!listening && /* @__PURE__ */ jsxs("button", {
							onClick: startListeningForConsent,
							className: "text-[12px] text-primary inline-flex items-center justify-center gap-1 mt-1",
							children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5" }), " Listen for spoken reply"]
						})
					]
				})
			]
		}),
		stage === "recording" && /* @__PURE__ */ jsxs(Card, {
			icon: Mic,
			title: "Step 4 · Recording visit",
			tint: "warning",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl bg-destructive/10 border-2 border-destructive/40 p-5 flex items-center gap-4",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "relative grid place-items-center size-12 rounded-full bg-destructive/20",
						children: [/* @__PURE__ */ jsx("span", { className: "absolute inset-0 rounded-full bg-destructive/40 animate-ping" }), /* @__PURE__ */ jsx(Mic, { className: "size-6 text-destructive relative" })]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-bold text-destructive text-lg",
							children: "Recording Visit"
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-[13px] text-muted-foreground",
							children: [formatDuration(seconds), " · audio stays on this device"]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: stopRecording,
					className: "mt-4 w-full rounded-2xl bg-destructive text-destructive-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(Square, { className: "size-5 fill-current" }), " Stop Recording"]
				}),
				recError && /* @__PURE__ */ jsx("div", {
					className: "text-[12px] text-destructive mt-2",
					children: recError
				})
			]
		}),
		stage === "summary" && /* @__PURE__ */ jsxs(Card, {
			icon: Sparkles,
			title: "Step 5 · Visit outcome summary",
			tint: "primary",
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "text-[13px] text-muted-foreground mb-3",
					children: ["Capture what the doctor said. ", aiDrafting && /* @__PURE__ */ jsxs("span", {
						className: "inline-flex items-center gap-1 text-primary",
						children: [/* @__PURE__ */ jsx(Loader2, { className: "size-3 animate-spin" }), " drafting…"]
					})]
				}),
				audioUrl && /* @__PURE__ */ jsxs("div", {
					className: "mb-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-[12px] font-medium text-muted-foreground mb-1",
						children: "Visit recording"
					}), /* @__PURE__ */ jsx("audio", {
						controls: true,
						src: audioUrl,
						className: "w-full"
					})]
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Topics discussed",
					value: outcomeFields.topicsDiscussed,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						topicsDiscussed: v
					})),
					placeholder: "e.g. Blood pressure, headaches, sleep"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Medication changes",
					value: outcomeFields.medicationChanges,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						medicationChanges: v
					})),
					placeholder: "e.g. Increased lisinopril to 20mg"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "New recommendations",
					value: outcomeFields.newRecommendations,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						newRecommendations: v
					})),
					placeholder: "e.g. Low-sodium diet, walk 20 min/day"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Tests ordered",
					value: outcomeFields.testsOrdered,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						testsOrdered: v
					})),
					placeholder: "e.g. Blood panel, EKG"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Follow-up appointments",
					value: outcomeFields.followUpAppointments,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						followUpAppointments: v
					})),
					placeholder: "e.g. Cardiology in 3 months"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Action items for me",
					value: outcomeFields.actionItems,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						actionItems: v
					})),
					placeholder: "e.g. Pick up new prescription"
				}),
				/* @__PURE__ */ jsx(Field, {
					label: "Other notes",
					value: outcomeFields.notes,
					onChange: (v) => setOutcomeFields((p) => ({
						...p,
						notes: v
					})),
					placeholder: "Anything else worth remembering"
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: handleSaveOutcome,
					disabled: !canSaveOutcome,
					className: "mt-4 w-full rounded-2xl gradient-hero text-primary-foreground py-4 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant disabled:opacity-50",
					children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-5" }), " Save to Health Memory"]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "text-[11px] text-muted-foreground mt-2 text-center",
					children: "Saves to visit history, Health Memory, and follow-up tasks."
				})
			]
		}),
		stage === "done" && /* @__PURE__ */ jsxs(Card, {
			icon: ShieldCheck,
			title: "Visit saved",
			tint: "success",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "inline-flex items-center gap-1.5 text-success font-medium",
					children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-4" }), " Saved to Health Memory"]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-muted-foreground text-[13px] mt-2",
					children: "Your visit outcome, recording, and follow-up tasks are now in your timeline."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2 mt-4",
					children: [/* @__PURE__ */ jsxs("button", {
						onClick: () => navigate({ to: "/doctor" }),
						className: "rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }), " Back to doctor"]
					}), /* @__PURE__ */ jsxs("button", {
						onClick: () => navigate({ to: "/memory" }),
						className: "rounded-xl gradient-hero text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant",
						children: [/* @__PURE__ */ jsx(ListChecks, { className: "size-4" }), " Open Health Memory"]
					})]
				})
			]
		}),
		!online && stage === "summary" && /* @__PURE__ */ jsxs("div", {
			className: "rounded-xl bg-muted/40 border p-3 text-[12px] text-muted-foreground inline-flex items-start gap-2 mt-2",
			children: [/* @__PURE__ */ jsx(AlertCircle, { className: "size-3.5 mt-0.5" }), " Offline — AI draft is unavailable, but you can still capture everything manually."]
		})
	] });
}
function StepBar({ stage }) {
	const order = [
		"review",
		"speak",
		"consent",
		"recording",
		"summary"
	];
	const currentIdx = stage === "done" ? order.length - 1 : order.indexOf(stage);
	return /* @__PURE__ */ jsx("div", {
		className: "flex items-center gap-1 mb-4 px-1",
		children: STEPS.map((s, i) => {
			const active = i <= currentIdx;
			const current = i === currentIdx;
			return /* @__PURE__ */ jsxs("div", {
				className: "flex-1 flex flex-col items-center gap-1",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center w-full",
					children: [
						i > 0 && /* @__PURE__ */ jsx("div", { className: `flex-1 h-0.5 ${i <= currentIdx ? "bg-primary" : "bg-border"}` }),
						/* @__PURE__ */ jsx("div", {
							className: `size-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`,
							children: active && !current ? /* @__PURE__ */ jsx(Check, { className: "size-3" }) : i + 1
						}),
						i < STEPS.length - 1 && /* @__PURE__ */ jsx("div", { className: `flex-1 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-border"}` })
					]
				}), /* @__PURE__ */ jsx("span", {
					className: `text-[10px] font-medium ${current ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}`,
					children: s.label
				})]
			}, s.key);
		})
	});
}
function Card({ icon: Icon, title, tint, children }) {
	const tintClass = {
		primary: "bg-primary/10 text-primary",
		success: "bg-success/15 text-success",
		warning: "bg-warning/15 text-warning"
	}[tint];
	return /* @__PURE__ */ jsxs(motion.div, {
		initial: {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "rounded-2xl bg-card border shadow-card p-4 mb-3",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 mb-3",
			children: [/* @__PURE__ */ jsx("div", {
				className: `size-8 rounded-lg grid place-items-center ${tintClass}`,
				children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
			}), /* @__PURE__ */ jsx("h2", {
				className: "text-[15px] font-semibold",
				children: title
			})]
		}), children]
	});
}
function Field({ label, value, onChange, placeholder }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "block mt-2",
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-[12px] font-medium text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsx("textarea", {
			rows: 2,
			value,
			onChange: (e) => onChange(e.target.value),
			placeholder,
			className: "mt-1 w-full rounded-xl border px-3 py-2 text-sm"
		})]
	});
}
function formatDuration(s) {
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${String(r).padStart(2, "0")}`;
}
function blobToDataUrl(blob) {
	return new Promise((res, rej) => {
		const r = new FileReader();
		r.onloadend = () => res(String(r.result));
		r.onerror = () => rej(r.error);
		r.readAsDataURL(blob);
	});
}
//#endregion
export { DoctorVisitMode as component };
