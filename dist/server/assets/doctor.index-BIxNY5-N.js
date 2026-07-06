import { n as useApp, t as adherence } from "./store-xEuxQ6YF.js";
import { i as stopSpeaking, r as speak, t as useConnectivity } from "./connectivity-CwnS1gGA.js";
import { t as aiChat } from "./ai-chat.functions-CsFDkth9.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Activity, AlertCircle, AlertTriangle, Calendar, Check, ChevronRight, ClipboardList, FileText, FlaskConical, Heart, History, ListChecks, MessageSquareQuote, Mic, Pencil, Pill, PlayCircle, Plus, Send, ShieldCheck, Sparkles, Square, Stethoscope, StickyNote, Trash2, Volume2, X } from "lucide-react";
import { motion } from "framer-motion";
//#region src/components/doctor-page.tsx
function buildSummary(state) {
	const { profile, meds, doses, symptoms, appointments } = state;
	const adh = adherence(doses, 7);
	const last7 = Date.now() - 7 * 864e5;
	const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
	const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
	const recentSymp = symptoms.filter((s) => s.at >= last7);
	const sympCounts = {};
	for (const s of recentSymp) sympCounts[s.name] = (sympCounts[s.name] ?? 0) + 1;
	const lines = [];
	lines.push(`Hello doctor. This is a summary for ${profile.name || "the patient"}.`);
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
	lines.push("I would like to discuss adherence, any new symptoms, and possible medication adjustments.");
	return lines.join(" ");
}
function DoctorPage() {
	const state = useApp();
	const navigate = useNavigate({ from: "/doctor" });
	const { profile, meds, doses, symptoms, appointments, addSummary, addNote, visits, setCurrentVisitSummary } = state;
	const generated = useMemo(() => buildSummary(state), [state]);
	const [speaking, setSpeaking] = useState(false);
	const [draft, setDraft] = useState(generated);
	const [approved, setApproved] = useState(false);
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	useEffect(() => {
		if (!approved) setDraft(generated);
	}, [generated, approved]);
	const adh = adherence(doses, 7);
	const last7 = Date.now() - 7 * 864e5;
	const recentSymp = symptoms.filter((s) => s.at >= last7);
	const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];
	const questions = [
		"Could any of my medications be causing my symptoms?",
		"Should I adjust the timing or dosage of my meds?",
		"Are there interactions I should know about?",
		"What new tests or screenings do you recommend?"
	];
	const handleSpeak = async () => {
		setSpeaking(true);
		await speak(draft, () => setSpeaking(false));
	};
	const handleStop = () => {
		stopSpeaking();
		setSpeaking(false);
	};
	const handleApprove = () => {
		const text = draft.trim();
		if (!text) return;
		addSummary(text);
		setCurrentVisitSummary(text);
		setApproved(true);
	};
	const handleEditAgain = () => {
		stopSpeaking();
		setSpeaking(false);
		setApproved(false);
	};
	const empty = !profile.name && meds.length === 0 && symptoms.length === 0;
	if (!mounted) return /* @__PURE__ */ jsx("div", { className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 min-h-[180px]" });
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center",
						children: /* @__PURE__ */ jsx(Stethoscope, { className: "size-6" })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-[12px] opacity-80 font-medium",
						children: "Clinical briefing"
					}), /* @__PURE__ */ jsx("h1", {
						className: "text-primary-foreground text-2xl",
						children: "Doctor visit prep"
					})] })]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm opacity-90 mt-3",
					children: "A summary you can read or play aloud at your appointment — generated from your own data, offline-ready."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-[11px] font-semibold",
					children: [/* @__PURE__ */ jsx("span", { className: "size-1.5 rounded-full bg-white" }), " Offline Ready"]
				})
			]
		}),
		!empty && /* @__PURE__ */ jsxs(motion.button, {
			whileTap: { scale: .98 },
			onClick: () => navigate({ to: "/doctor/visit-mode" }),
			className: "w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant mb-4 relative overflow-hidden group",
			children: [
				/* @__PURE__ */ jsx("span", { className: "absolute inset-0 bg-white/0 group-active:bg-white/10 transition" }),
				/* @__PURE__ */ jsx(Sparkles, { className: "size-6" }),
				/* @__PURE__ */ jsxs("span", {
					className: "flex flex-col items-start leading-tight text-left",
					children: [/* @__PURE__ */ jsx("span", { children: "Start Doctor Visit Mode" }), /* @__PURE__ */ jsx("span", {
						className: "text-[11px] opacity-80 font-normal",
						children: "Hands-free guided flow · review → speak → consent → record → summary"
					})]
				})
			]
		}),
		empty ? /* @__PURE__ */ jsx(EmptyState, {
			title: "Let's prepare your first briefing",
			body: "Add a medication and log a symptom or two — MedsBuddy will craft a clinical-grade summary for your next visit."
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(ReviewBanner, { approved }),
			/* @__PURE__ */ jsx(Section, {
				icon: FileText,
				title: "Your summary — review before sharing",
				tint: "primary",
				children: !approved ? /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("textarea", {
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						rows: 10,
						className: "w-full rounded-xl border bg-background px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40",
						"aria-label": "Editable doctor summary"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-muted-foreground mt-2",
						children: "Edit freely — add notes, remove anything you don't want shared. MedsBuddy will only speak what you approve."
					}),
					/* @__PURE__ */ jsxs("button", {
						onClick: handleApprove,
						disabled: !draft.trim(),
						className: "mt-3 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Check, { className: "size-5" }), " Approve summary"]
					})
				] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("div", {
						className: "rounded-xl bg-success/10 border border-success/30 p-3 text-[14px] leading-relaxed whitespace-pre-wrap",
						children: draft
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-2 inline-flex items-center gap-1.5 text-xs text-success font-medium",
						children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3.5" }), " Approved & saved to your Memory timeline"]
					}),
					/* @__PURE__ */ jsxs("button", {
						onClick: handleEditAgain,
						className: "mt-3 w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(Pencil, { className: "size-4" }), " Edit again"]
					})
				] })
			}),
			/* @__PURE__ */ jsxs(Section, {
				icon: Pill,
				title: "Medications & adherence",
				tint: "primary",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "text-3xl font-bold tracking-tight",
						children: [adh, "%"]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground mb-3",
						children: "7-day adherence"
					}),
					meds.length === 0 ? /* @__PURE__ */ jsx("div", {
						className: "text-sm text-muted-foreground",
						children: "No medications listed."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "space-y-1.5 text-[14px]",
						children: meds.map((m) => /* @__PURE__ */ jsxs("li", {
							className: "flex justify-between border-t pt-1.5 first:border-0 first:pt-0",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "font-medium",
								children: [
									m.name,
									" ",
									/* @__PURE__ */ jsx("span", {
										className: "text-muted-foreground font-normal",
										children: m.dosage
									})
								]
							}), /* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground text-xs",
								children: m.frequency
							})]
						}, m.id))
					})
				]
			}),
			/* @__PURE__ */ jsx(Section, {
				icon: Activity,
				title: "Recent symptoms",
				tint: "warning",
				children: recentSymp.length === 0 ? /* @__PURE__ */ jsx("div", {
					className: "text-sm text-muted-foreground",
					children: "None reported this week."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "space-y-1.5 text-[14px]",
					children: recentSymp.slice(0, 6).map((s) => /* @__PURE__ */ jsxs("li", {
						className: "flex justify-between border-t pt-1.5 first:border-0 first:pt-0",
						children: [/* @__PURE__ */ jsx("span", {
							className: "capitalize font-medium",
							children: s.name
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted-foreground",
							children: [
								new Date(s.at).toLocaleDateString(),
								" · severity ",
								s.severity
							]
						})]
					}, s.id))
				})
			}),
			/* @__PURE__ */ jsx(Section, {
				icon: Calendar,
				title: "Appointments",
				tint: "success",
				children: upcoming ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					className: "font-medium text-[15px]",
					children: upcoming.doctor
				}), /* @__PURE__ */ jsx("div", {
					className: "text-sm text-muted-foreground",
					children: new Date(upcoming.at).toLocaleString()
				})] }) : /* @__PURE__ */ jsx("div", {
					className: "text-sm text-muted-foreground",
					children: "No upcoming visits."
				})
			}),
			/* @__PURE__ */ jsx(Section, {
				icon: MessageSquareQuote,
				title: "Questions to ask your doctor",
				tint: "primary",
				children: /* @__PURE__ */ jsx("ul", {
					className: "space-y-2 text-[14px]",
					children: questions.map((q, i) => /* @__PURE__ */ jsxs("li", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-primary font-bold",
							children: [i + 1, "."]
						}), /* @__PURE__ */ jsx("span", { children: q })]
					}, i))
				})
			}),
			approved && /* @__PURE__ */ jsx(PostApprovePrompt, {
				onStartVisit: () => navigate({ to: "/doctor/record" }),
				onQuickNote: (t) => {
					addNote(t);
					toast.success("Note saved to Health Memory");
				}
			}),
			visits.length > 0 && /* @__PURE__ */ jsx(VisitHistory, {
				visits,
				onRemove: (id) => state.removeVisit(id)
			})
		] }),
		/* @__PURE__ */ jsxs("div", {
			className: "sticky bottom-24 mt-5",
			children: [!approved ? /* @__PURE__ */ jsxs("div", {
				className: "w-full rounded-2xl bg-card border border-dashed border-border py-4 px-4 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2",
				children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "size-4 text-warning" }), "Approve your summary above to enable Speak for me"]
			}) : !speaking ? /* @__PURE__ */ jsxs(motion.button, {
				whileTap: { scale: .97 },
				onClick: handleSpeak,
				className: "w-full rounded-2xl gradient-hero text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant",
				children: [/* @__PURE__ */ jsx(Volume2, { className: "size-6" }), " Speak for me"]
			}) : /* @__PURE__ */ jsxs("button", {
				onClick: handleStop,
				className: "w-full rounded-2xl bg-destructive text-destructive-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 sos-pulse",
				children: [/* @__PURE__ */ jsx(Square, { className: "size-5 fill-current" }), " Stop speaking"]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-[11px] text-muted-foreground text-center mt-2",
				children: "Generated from your device data. No internet required."
			})]
		})
	] });
}
function PostApprovePrompt({ onStartVisit, onQuickNote }) {
	const [declined, setDeclined] = useState(false);
	const [quickNoteOpen, setQuickNoteOpen] = useState(false);
	if (declined) return /* @__PURE__ */ jsx(Section, {
		icon: Mic,
		title: "Today's visit",
		tint: "primary",
		children: /* @__PURE__ */ jsxs("div", {
			className: "text-sm text-muted-foreground",
			children: [
				"No problem — you can come back anytime.",
				" ",
				/* @__PURE__ */ jsx("button", {
					className: "text-primary font-medium",
					onClick: () => setDeclined(false),
					children: "Change my mind"
				})
			]
		})
	});
	return /* @__PURE__ */ jsxs(Section, {
		icon: Mic,
		title: "Today's visit",
		tint: "primary",
		children: [/* @__PURE__ */ jsxs("div", { children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-sm font-medium",
				children: "Would you like me to help keep track of today's visit?"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[12px] text-muted-foreground mt-1",
				children: "I can record audio (with consent), capture what the doctor said, and save a visit outcome summary to your Health Memory."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2 mt-3",
				children: [/* @__PURE__ */ jsxs("button", {
					onClick: onStartVisit,
					className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(Check, { className: "size-4" }), " Yes"]
				}), /* @__PURE__ */ jsx("button", {
					onClick: () => setDeclined(true),
					className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium",
					children: "Not now"
				})]
			}),
			/* @__PURE__ */ jsxs("button", {
				onClick: () => setQuickNoteOpen(true),
				className: "mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium inline-flex items-center justify-center gap-2",
				children: [/* @__PURE__ */ jsx(StickyNote, { className: "size-4" }), " Quick note instead"]
			})
		] }), quickNoteOpen && /* @__PURE__ */ jsx(QuickNoteDialog, {
			onClose: () => setQuickNoteOpen(false),
			onSave: (t) => {
				onQuickNote(t);
				setQuickNoteOpen(false);
			}
		})]
	});
}
function QuickNoteDialog({ onClose, onSave }) {
	const [text, setText] = useState("");
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4",
		onClick: onClose,
		children: /* @__PURE__ */ jsxs(motion.div, {
			initial: {
				y: 30,
				opacity: 0
			},
			animate: {
				y: 0,
				opacity: 1
			},
			onClick: (e) => e.stopPropagation(),
			className: "w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "mb-3",
					children: "Quick visit note"
				}),
				/* @__PURE__ */ jsx("textarea", {
					autoFocus: true,
					rows: 4,
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder: "Jot down what the doctor said…",
					className: "w-full rounded-xl border px-3 py-2.5 text-[15px]"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex gap-2 mt-4",
					children: [/* @__PURE__ */ jsx("button", {
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium",
						onClick: onClose,
						children: "Cancel"
					}), /* @__PURE__ */ jsx("button", {
						className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50",
						disabled: !text.trim(),
						onClick: () => onSave(text.trim()),
						children: "Save note"
					})]
				})
			]
		})
	});
}
function VisitHistory({ visits, onRemove }) {
	const [openId, setOpenId] = useState(null);
	const open = visits.find((v) => v.id === openId) ?? null;
	return /* @__PURE__ */ jsxs(Section, {
		icon: History,
		title: "Doctor visit history",
		tint: "success",
		children: [/* @__PURE__ */ jsx("ul", {
			className: "space-y-3",
			children: visits.map((v) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
				onClick: () => setOpenId(v.id),
				className: "w-full text-left rounded-xl border bg-background p-3 hover:bg-secondary/40 transition active:scale-[0.997]",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-baseline justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "font-semibold text-[14px]",
							children: [v.specialty ? `${v.specialty} visit` : "Doctor visit", v.doctor && v.doctor !== "Unspecified doctor" && /* @__PURE__ */ jsxs("span", {
								className: "text-muted-foreground font-normal",
								children: [" · ", v.doctor]
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "text-[11px] text-muted-foreground shrink-0",
							children: new Date(v.at).toLocaleDateString(void 0, {
								month: "short",
								day: "numeric",
								year: "numeric"
							})
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-1 text-[13px] text-muted-foreground line-clamp-2",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "font-medium text-foreground",
								children: "Summary:"
							}),
							" ",
							v.summary
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3 mt-2 text-[11px] text-muted-foreground",
						children: [v.recorded && /* @__PURE__ */ jsxs("span", {
							className: "inline-flex items-center gap-1 text-primary",
							children: [
								/* @__PURE__ */ jsx(Mic, { className: "size-3" }),
								" Recorded",
								v.durationSec ? ` · ${formatDuration(v.durationSec)}` : ""
							]
						}), /* @__PURE__ */ jsxs("span", {
							className: "inline-flex items-center gap-1 ml-auto text-primary font-medium",
							children: ["Open ", /* @__PURE__ */ jsx(ChevronRight, { className: "size-3" })]
						})]
					})
				]
			}) }, v.id))
		}), open && /* @__PURE__ */ jsx(VisitDetailDialog, {
			visit: open,
			onClose: () => setOpenId(null),
			onRemove: (id) => {
				onRemove(id);
				setOpenId(null);
			}
		})]
	});
}
function VisitDetailDialog({ visit, onClose, onRemove }) {
	const { online } = useConnectivity();
	const [explanation, setExplanation] = useState("");
	const [loadingExplain, setLoadingExplain] = useState(false);
	const [explainError, setExplainError] = useState(null);
	const [showTranscript, setShowTranscript] = useState(false);
	const [showPlayer, setShowPlayer] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const [questions, setQuestions] = useState([]);
	const [askInput, setAskInput] = useState("");
	const [asking, setAsking] = useState(false);
	const topics = useMemo(() => extractTopics(visit), [visit]);
	const transcriptText = useMemo(() => buildTranscript(visit), [visit]);
	const summaryNarration = useMemo(() => buildSummaryNarration(visit), [visit]);
	useEffect(() => () => stopSpeaking(), []);
	const handleExplain = async () => {
		if (!online) {
			setExplanation(`Here's a plain-language summary I can give without internet:\n\n${summaryNarration}\n\nConnect to the internet for a deeper AI explanation.`);
			return;
		}
		setLoadingExplain(true);
		setExplainError(null);
		try {
			const { reply } = await aiChat({ data: { messages: [{
				role: "system",
				content: "You are MedsBuddy, a compassionate patient advocate. The patient ALREADY KNOWS what they told the doctor (the 'patient summary' is for context only). Your job is to explain the VISIT OUTCOME — what the doctor said, decided, or changed during the appointment. DO NOT repeat or rephrase the patient summary. Focus only on: topics discussed, medication changes, new recommendations, tests ordered, follow-up appointments, and action items. Be warm and concise (4-7 short sentences) in plain language. End with: 'Would you like me to explain any part in more detail?'"
			}, {
				role: "user",
				content: `Explain what happened during this visit. Focus on the outcome — do not repeat the patient summary.\n\n${transcriptText}`
			}] } });
			setExplanation(reply);
		} catch (e) {
			setExplainError(e instanceof Error ? e.message : "Could not reach AI.");
		} finally {
			setLoadingExplain(false);
		}
	};
	const handleListen = async () => {
		if (speaking) {
			stopSpeaking();
			setSpeaking(false);
			return;
		}
		setSpeaking(true);
		await speak(explanation || `Here is a summary of your recent appointment. ${summaryNarration}`, () => setSpeaking(false));
	};
	const handleAsk = async (q) => {
		const text = (q ?? askInput).trim();
		if (!text) return;
		setAskInput("");
		if (!online) {
			setQuestions((qs) => [...qs, {
				q: text,
				a: "I'm offline right now, but here's what I can see in the saved visit notes: " + summaryNarration
			}]);
			return;
		}
		setAsking(true);
		setQuestions((qs) => [...qs, {
			q: text,
			a: ""
		}]);
		try {
			const { reply } = await aiChat({ data: { messages: [{
				role: "system",
				content: "You are MedsBuddy, a patient advocate. Answer the patient's question using ONLY the visit notes provided. Use plain, kind language. If the answer isn't in the notes, say so honestly and suggest asking the doctor next visit. Keep answers to 1-3 short sentences."
			}, {
				role: "user",
				content: `Visit notes:\n${transcriptText}\n\nQuestion: ${text}`
			}] } });
			setQuestions((qs) => qs.map((row, i) => i === qs.length - 1 ? {
				...row,
				a: reply
			} : row));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not reach AI.";
			setQuestions((qs) => qs.map((row, i) => i === qs.length - 1 ? {
				...row,
				a: `Sorry — ${msg}`
			} : row));
		} finally {
			setAsking(false);
		}
	};
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4",
		onClick: onClose,
		children: /* @__PURE__ */ jsxs(motion.div, {
			initial: {
				y: 40,
				opacity: 0
			},
			animate: {
				y: 0,
				opacity: 1
			},
			onClick: (e) => e.stopPropagation(),
			className: "w-full sm:max-w-lg bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "p-5 border-b",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-start gap-3",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "size-11 rounded-2xl gradient-hero grid place-items-center text-primary-foreground shrink-0",
							children: /* @__PURE__ */ jsx(Stethoscope, { className: "size-5" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex-1 min-w-0",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "text-[11px] text-muted-foreground font-medium",
									children: "Visit overview"
								}),
								/* @__PURE__ */ jsx("h2", {
									className: "text-[17px] font-semibold leading-tight",
									children: visit.specialty ? `${visit.specialty} visit` : "Doctor visit"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "text-[13px] text-muted-foreground mt-0.5",
									children: [
										visit.doctor && visit.doctor !== "Unspecified doctor" ? visit.doctor + " · " : "",
										new Date(visit.at).toLocaleDateString(void 0, {
											month: "short",
											day: "numeric",
											year: "numeric"
										}),
										visit.durationSec ? ` · Duration ${formatDuration(visit.durationSec)}` : ""
									]
								})
							]
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: onClose,
							className: "size-8 rounded-full bg-secondary grid place-items-center",
							"aria-label": "Close",
							children: /* @__PURE__ */ jsx(X, { className: "size-4" })
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2 mt-4",
					children: [
						/* @__PURE__ */ jsx(ActionBtn, {
							icon: Sparkles,
							label: loadingExplain ? "Thinking…" : "Explain this visit",
							onClick: handleExplain,
							primary: true,
							disabled: loadingExplain
						}),
						/* @__PURE__ */ jsx(ActionBtn, {
							icon: speaking ? Square : Volume2,
							label: speaking ? "Stop" : "Listen to summary",
							onClick: handleListen
						}),
						/* @__PURE__ */ jsx(ActionBtn, {
							icon: FileText,
							label: showTranscript ? "Hide notes" : "View notes",
							onClick: () => setShowTranscript((s) => !s)
						}),
						/* @__PURE__ */ jsx(ActionBtn, {
							icon: PlayCircle,
							label: visit.audioDataUrl ? showPlayer ? "Hide recording" : "Play recording" : "No recording",
							onClick: () => visit.audioDataUrl && setShowPlayer((s) => !s),
							disabled: !visit.audioDataUrl
						})
					]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "overflow-y-auto p-5 space-y-4",
				children: [
					/* @__PURE__ */ jsx(VisitTimeline, { visit }),
					(explanation || loadingExplain || explainError) && /* @__PURE__ */ jsxs(Block, {
						icon: Sparkles,
						title: "MedsBuddy explains",
						children: [
							loadingExplain && /* @__PURE__ */ jsx("div", {
								className: "text-sm text-muted-foreground",
								children: "Reading the visit notes and putting it in plain language…"
							}),
							explainError && /* @__PURE__ */ jsxs("div", {
								className: "text-sm text-destructive",
								children: ["Sorry — ", explainError]
							}),
							explanation && /* @__PURE__ */ jsx("div", {
								className: "text-[14px] whitespace-pre-wrap leading-relaxed",
								children: explanation
							})
						]
					}),
					showPlayer && visit.audioDataUrl && /* @__PURE__ */ jsx(Block, {
						icon: PlayCircle,
						title: "Recording",
						children: /* @__PURE__ */ jsx("audio", {
							controls: true,
							src: visit.audioDataUrl,
							className: "w-full"
						})
					}),
					showTranscript && /* @__PURE__ */ jsx(Block, {
						icon: FileText,
						title: "Visit notes",
						children: /* @__PURE__ */ jsx("pre", {
							className: "text-[13px] whitespace-pre-wrap font-sans leading-relaxed",
							children: transcriptText
						})
					}),
					topics.length > 0 && /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2 mb-2",
						children: [/* @__PURE__ */ jsx(ListChecks, { className: "size-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
							className: "text-[14px] font-semibold",
							children: "Important topics"
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
						children: topics.map((t, i) => {
							const Icon = TOPIC_ICON[t.kind];
							const tone = TOPIC_TONE[t.kind];
							return /* @__PURE__ */ jsxs("div", {
								className: `rounded-xl border p-3 ${tone}`,
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80",
									children: [
										/* @__PURE__ */ jsx(Icon, { className: "size-3.5" }),
										" ",
										t.label
									]
								}), /* @__PURE__ */ jsx("div", {
									className: "text-[13px] mt-1 text-foreground/90 whitespace-pre-wrap",
									children: t.detail
								})]
							}, i);
						})
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 mb-2",
							children: [/* @__PURE__ */ jsx(MessageSquareQuote, { className: "size-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
								className: "text-[14px] font-semibold",
								children: "Ask about this visit"
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "flex flex-wrap gap-1.5 mb-2",
							children: SUGGESTED_QS.map((q) => /* @__PURE__ */ jsx("button", {
								onClick: () => handleAsk(q),
								disabled: asking,
								className: "rounded-full bg-secondary text-secondary-foreground text-[12px] px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition disabled:opacity-50",
								children: q
							}, q))
						}),
						questions.length > 0 && /* @__PURE__ */ jsx("div", {
							className: "space-y-2 mb-2",
							children: questions.map((row, i) => /* @__PURE__ */ jsxs("div", {
								className: "rounded-xl border bg-background p-3",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "text-[12px] font-semibold text-primary",
										children: "You"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "text-[13px] mb-2",
										children: row.q
									}),
									/* @__PURE__ */ jsx("div", {
										className: "text-[12px] font-semibold text-success",
										children: "MedsBuddy"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "text-[13px] text-foreground/90 whitespace-pre-wrap",
										children: row.a || (asking && i === questions.length - 1 ? "Thinking…" : "")
									})
								]
							}, i))
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: (e) => {
								e.preventDefault();
								handleAsk();
							},
							className: "flex gap-2",
							children: [/* @__PURE__ */ jsx("input", {
								value: askInput,
								onChange: (e) => setAskInput(e.target.value),
								placeholder: "Ask a question about this visit…",
								className: "flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
							}), /* @__PURE__ */ jsx("button", {
								type: "submit",
								disabled: !askInput.trim() || asking,
								className: "rounded-xl bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50",
								"aria-label": "Send question",
								children: /* @__PURE__ */ jsx(Send, { className: "size-4" })
							})]
						}),
						!online && /* @__PURE__ */ jsx("div", {
							className: "text-[11px] text-muted-foreground mt-2",
							children: "Offline — I'll answer from your saved notes."
						})
					] }),
					/* @__PURE__ */ jsxs("button", {
						onClick: () => onRemove(visit.id),
						className: "text-[12px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(Trash2, { className: "size-3" }), " Remove this visit"]
					})
				]
			})]
		})
	});
}
var SUGGESTED_QS = [
	"What medication changed?",
	"What should I do next?",
	"What follow-up is required?",
	"Explain this in simple language."
];
var TOPIC_ICON = {
	medication: Pill,
	diagnosis: AlertCircle,
	symptom: Activity,
	test: FlaskConical,
	"follow-up": ClipboardList,
	lifestyle: Heart
};
var TOPIC_TONE = {
	medication: "bg-primary/5 border-primary/20 text-primary",
	diagnosis: "bg-warning/10 border-warning/30 text-warning",
	symptom: "bg-warning/10 border-warning/30 text-warning",
	test: "bg-primary/5 border-primary/20 text-primary",
	"follow-up": "bg-success/10 border-success/30 text-success",
	lifestyle: "bg-success/10 border-success/30 text-success"
};
var TOPIC_LABEL = {
	medication: "Medications",
	diagnosis: "New diagnosis",
	symptom: "Symptoms discussed",
	test: "Tests ordered",
	"follow-up": "Follow-up",
	lifestyle: "Lifestyle"
};
function extractTopics(v) {
	const topics = [];
	const push = (kind, detail) => {
		if (detail && detail.trim()) topics.push({
			kind,
			label: TOPIC_LABEL[kind],
			detail: detail.trim()
		});
	};
	push("medication", v.medicationChanges ?? v.medications);
	push("follow-up", v.followUpAppointments ?? v.followUp);
	push("lifestyle", v.newRecommendations ?? v.carePlan);
	push("test", v.testsOrdered);
	push("symptom", v.topicsDiscussed);
	const haystack = [
		v.summary,
		v.notes,
		v.actionItems,
		v.questionsAnswered
	].filter(Boolean).join("\n");
	if (!v.testsOrdered && /\b(lab|test|x-?ray|scan|blood work|ekg|mri|ct)\b/i.test(haystack)) push("test", findSentencesMatching(haystack, /lab|test|x-?ray|scan|blood work|ekg|mri|ct/i));
	if (/\b(diagnos|condition|finding)\b/i.test(haystack)) push("diagnosis", findSentencesMatching(haystack, /diagnos|condition|finding/i));
	return topics;
}
function findSentencesMatching(text, re) {
	return (text.match(/[^.!?\n]+[.!?]?/g) ?? []).map((s) => s.trim()).filter((s) => re.test(s)).slice(0, 2).join(" ");
}
function buildTranscript(v) {
	return [
		`Visit outcome summary: ${v.summary}`,
		v.topicsDiscussed && `Topics discussed: ${v.topicsDiscussed}`,
		v.medicationChanges && `Medication changes: ${v.medicationChanges}`,
		v.newRecommendations && `New recommendations: ${v.newRecommendations}`,
		v.testsOrdered && `Tests ordered: ${v.testsOrdered}`,
		v.followUpAppointments && `Follow-up appointments: ${v.followUpAppointments}`,
		v.actionItems && `Action items for the patient: ${v.actionItems}`,
		v.medications && !v.medicationChanges && `Medications discussed: ${v.medications}`,
		v.carePlan && !v.newRecommendations && `Care plan: ${v.carePlan}`,
		v.followUp && !v.followUpAppointments && `Follow-up actions: ${v.followUp}`,
		v.questionsAnswered && `Questions answered: ${v.questionsAnswered}`,
		v.notes && `Appointment notes: ${v.notes}`,
		v.patientSummary && `(For context only — patient summary brought to the visit: ${v.patientSummary})`
	].filter(Boolean).join("\n\n");
}
function buildSummaryNarration(v) {
	const bits = [v.summary];
	if (v.medicationChanges) bits.push(`Medication changes: ${v.medicationChanges}.`);
	if (v.newRecommendations) bits.push(`New recommendations: ${v.newRecommendations}.`);
	if (v.testsOrdered) bits.push(`Tests ordered: ${v.testsOrdered}.`);
	if (v.followUpAppointments) bits.push(`Follow-up: ${v.followUpAppointments}.`);
	if (v.actionItems) bits.push(`Your action items: ${v.actionItems}.`);
	return bits.join(" ");
}
function ActionBtn({ icon: Icon, label, onClick, primary, disabled }) {
	return /* @__PURE__ */ jsxs("button", {
		onClick,
		disabled,
		className: `rounded-xl px-3 py-2.5 text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-50 ${primary ? "gradient-hero text-primary-foreground shadow-elegant" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`,
		children: [
			/* @__PURE__ */ jsx(Icon, { className: "size-4" }),
			" ",
			label
		]
	});
}
function Block({ icon: Icon, title, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl border bg-background p-3.5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 mb-2",
			children: [/* @__PURE__ */ jsx(Icon, { className: "size-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
				className: "text-[13px] font-semibold",
				children: title
			})]
		}), children]
	});
}
function VisitTimeline({ visit }) {
	const hasPatient = !!visit.patientSummary?.trim();
	const hasRecording = visit.recorded || !!visit.audioDataUrl;
	const hasOutcome = !!(visit.topicsDiscussed || visit.medicationChanges || visit.newRecommendations || visit.testsOrdered || visit.followUpAppointments || visit.actionItems);
	const hasFollowUp = !!(visit.actionItems || visit.followUpAppointments);
	const steps = [
		{
			label: "Patient Summary",
			sub: hasPatient ? "Brought to the visit" : "Not saved",
			done: hasPatient,
			icon: FileText
		},
		{
			label: "Visit Recording",
			sub: hasRecording ? visit.durationSec ? `Recorded · ${formatDuration(visit.durationSec)}` : "Recorded" : "No recording",
			done: hasRecording,
			icon: Mic
		},
		{
			label: "Visit Outcome Summary",
			sub: hasOutcome ? "What the doctor said" : "Not captured",
			done: hasOutcome,
			icon: Sparkles
		},
		{
			label: "Follow-Up Tasks",
			sub: hasFollowUp ? "Action items saved" : "None",
			done: hasFollowUp,
			icon: ClipboardList
		}
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl border bg-background p-3.5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 mb-3",
			children: [/* @__PURE__ */ jsx(ListChecks, { className: "size-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
				className: "text-[13px] font-semibold",
				children: "Visit timeline"
			})]
		}), /* @__PURE__ */ jsx("ol", {
			className: "relative",
			children: steps.map((s, i) => {
				const Icon = s.icon;
				return /* @__PURE__ */ jsxs("li", {
					className: "flex gap-3 pb-3 last:pb-0 relative",
					children: [
						i < steps.length - 1 && /* @__PURE__ */ jsx("span", { className: `absolute left-3.5 top-7 bottom-0 w-px ${s.done ? "bg-primary/40" : "bg-border"}` }),
						/* @__PURE__ */ jsx("div", {
							className: `size-7 rounded-full grid place-items-center shrink-0 ${s.done ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`,
							children: /* @__PURE__ */ jsx(Icon, { className: "size-3.5" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex-1 min-w-0 pt-0.5",
							children: [/* @__PURE__ */ jsx("div", {
								className: `text-[13px] font-semibold ${s.done ? "text-foreground" : "text-muted-foreground"}`,
								children: s.label
							}), /* @__PURE__ */ jsx("div", {
								className: "text-[11px] text-muted-foreground",
								children: s.sub
							})]
						}),
						s.done && /* @__PURE__ */ jsx(Check, { className: "size-4 text-success shrink-0 mt-1" })
					]
				}, i);
			})
		})]
	});
}
function formatDuration(s) {
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${String(r).padStart(2, "0")}`;
}
function ReviewBanner({ approved }) {
	if (approved) return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl bg-success/10 border border-success/30 p-3 mb-3 flex items-start gap-3",
		children: [/* @__PURE__ */ jsx("div", {
			className: "size-8 rounded-lg bg-success/20 text-success grid place-items-center shrink-0",
			children: /* @__PURE__ */ jsx(ShieldCheck, { className: "size-4" })
		}), /* @__PURE__ */ jsxs("div", {
			className: "text-sm",
			children: [/* @__PURE__ */ jsx("div", {
				className: "font-semibold text-success",
				children: "Summary approved"
			}), /* @__PURE__ */ jsx("div", {
				className: "text-muted-foreground text-[13px]",
				children: "MedsBuddy will only read the version you approved aloud."
			})]
		})]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl bg-warning/10 border border-warning/30 p-3 mb-3 flex items-start gap-3",
		children: [/* @__PURE__ */ jsx("div", {
			className: "size-8 rounded-lg bg-warning/20 text-warning grid place-items-center shrink-0",
			children: /* @__PURE__ */ jsx(AlertTriangle, { className: "size-4" })
		}), /* @__PURE__ */ jsxs("div", {
			className: "text-sm",
			children: [/* @__PURE__ */ jsx("div", {
				className: "font-semibold text-warning",
				children: "Please review your summary before sharing."
			}), /* @__PURE__ */ jsx("div", {
				className: "text-muted-foreground text-[13px]",
				children: "You are in control — MedsBuddy never speaks on your behalf without approval."
			})]
		})]
	});
}
function Section({ icon: Icon, title, tint, children }) {
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
function EmptyState({ title, body }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3",
				children: /* @__PURE__ */ jsx(Plus, { className: "size-6" })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "font-semibold",
				children: title
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground mt-1",
				children: body
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2 justify-center mt-4",
				children: [/* @__PURE__ */ jsx(Link, {
					to: "/reminders",
					className: "rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium",
					children: "Add medication"
				}), /* @__PURE__ */ jsx(Link, {
					to: "/profile",
					className: "rounded-full bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium",
					children: "Complete profile"
				})]
			})
		]
	});
}
//#endregion
//#region src/routes/doctor.index.tsx?tsr-split=component
var SplitComponent = DoctorPage;
//#endregion
export { SplitComponent as component };
