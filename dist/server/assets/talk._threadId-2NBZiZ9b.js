import { n as useApp } from "./store-xEuxQ6YF.js";
import { i as stopSpeaking, n as getRecognition, r as speak, t as useConnectivity } from "./connectivity-CwnS1gGA.js";
import { t as aiChat } from "./ai-chat.functions-CsFDkth9.js";
import { t as AiOrb } from "./ai-orb-CbPIJWSf.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CloudOff, History, Loader2, MessageCircle, Mic, MicOff, Plus, Send, Sparkles, Trash2, Volume2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
//#region src/components/mic-button.tsx
function MicButton({ onTranscript, busy, speaking, size = "xl", autoStart }) {
	const [listening, setListening] = useState(false);
	const [error, setError] = useState(null);
	const recRef = useRef(null);
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
	useEffect(() => {
		if (autoStart && !busy && !speaking && !listening) {
			const t = setTimeout(() => start(), 400);
			return () => clearTimeout(t);
		}
	}, [
		autoStart,
		busy,
		speaking
	]);
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col items-center gap-3",
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: listening ? stop : start,
				disabled: busy,
				"aria-label": listening ? "Stop listening" : "Tap to speak",
				className: `${size === "xl" ? "size-32" : "size-24"} rounded-full grid place-items-center text-primary-foreground transition-all
          ${busy ? "bg-muted-foreground" : listening ? "bg-destructive mic-pulse" : speaking ? "bg-primary speaking-glow" : "bg-primary hover:scale-105 active:scale-95"}
        `,
				children: busy ? /* @__PURE__ */ jsx(Loader2, { className: "size-12 animate-spin" }) : speaking ? /* @__PURE__ */ jsx(Volume2, { className: "size-14" }) : listening ? /* @__PURE__ */ jsx(MicOff, { className: "size-14" }) : /* @__PURE__ */ jsx(Mic, { className: "size-14" })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-sm text-muted-foreground min-h-5",
				children: busy ? "Thinking…" : speaking ? "Speaking…" : listening ? "Listening — tap to stop" : "Tap to speak"
			}),
			error && /* @__PURE__ */ jsx("div", {
				className: "text-xs text-destructive",
				children: error
			})
		]
	});
}
//#endregion
//#region src/lib/nav-commands.ts
var patterns = [
	{
		rx: /\b(go|navigate|take me)?\s*(home|main|start)\b/i,
		to: "/",
		label: "Home"
	},
	{
		rx: /\b(open|show|go to)?\s*(talk|chat|assistant|advocate)\b/i,
		to: "/talk",
		label: "Talk"
	},
	{
		rx: /\b(open|show|view)?\s*(reminders?|medications?|meds|pills?)\b/i,
		to: "/reminders",
		label: "Reminders"
	},
	{
		rx: /\b(open|show|go to)?\s*(doctor|physician|appointment|visit prep|summary)\b/i,
		to: "/doctor",
		label: "Doctor"
	},
	{
		rx: /\b(open|show|view)?\s*(memory|timeline|history)\b/i,
		to: "/memory",
		label: "Memory"
	},
	{
		rx: /\b(open|show)?\s*(emergency|qr|sos|help)\b/i,
		to: "/emergency",
		label: "Emergency"
	},
	{
		rx: /\b(open|show)?\s*(caregiver|family|dashboard)\b/i,
		to: "/caregiver",
		label: "Caregiver"
	},
	{
		rx: /\b(open|show)?\s*(profile|account|me)\b/i,
		to: "/profile",
		label: "Profile"
	}
];
function detectNavigation(text) {
	const t = text.toLowerCase().trim();
	if (!/^(open|show|go|navigate|take me|switch|move)/i.test(t) && !/\bpage\b/.test(t)) return null;
	for (const p of patterns) if (p.rx.test(t)) return {
		to: p.to,
		label: p.label
	};
	return null;
}
//#endregion
//#region src/routes/talk.$threadId.tsx?tsr-split=component
var SUGGESTIONS = [
	"How are you today?",
	"Who are you?",
	"I have a symptom I want to remember",
	"Help me prepare for my doctor visit"
];
function buildSystemPrompt(state) {
	const { profile, meds, doses, symptoms } = state;
	const recentDoses = doses.slice(0, 10).map((d) => `${new Date(d.at).toLocaleString()}: ${d.medName} — ${d.status}`).join("; ");
	const recentSymp = symptoms.slice(0, 8).map((s) => `${new Date(s.at).toLocaleString()}: ${s.name} (severity ${s.severity})`).join("; ");
	return [
		"You are MedsBuddy, an AI Patient Advocate — a caring healthcare companion, not a chatbot, assistant, search engine, or registration form.",
		"",
		"## Identity & purpose",
		"Name: MedsBuddy. Role: AI Patient Advocate.",
		"Mission: help the patient remember important health information, track symptoms, organize medications, prepare for doctor visits, and feel supported throughout their healthcare journey.",
		"When the patient asks who or what you are, proactively explain your purpose in warm, human language.",
		"",
		"## Voice & personality",
		"Always: friendly, caring, calm, supportive, encouraging, professional. Never: robotic, cold, judgmental, overly technical. Use short, natural sentences (1–3).",
		"",
		"## Proactive care",
		"Acknowledge symptoms warmly, confirm they are remembered for the next doctor visit, and offer to log details. Say \"I've made a note of that\" so the patient feels heard.",
		"",
		"## Boundaries",
		"You are not a doctor. For urgent symptoms (chest pain, trouble breathing, severe bleeding, suicidal thoughts), kindly tell the patient to call emergency services.",
		"Use the patient context below — never invent medications or symptoms.",
		"",
		"## Patient context",
		`Patient: ${profile.name || "Unknown"}, DOB ${profile.dob || "?"}, allergies: ${profile.allergies || "none recorded"}, conditions: ${profile.conditions || "none recorded"}.`,
		`Medications: ${meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join("; ") || "none"}.`,
		`Recent doses: ${recentDoses || "none"}.`,
		`Recent symptoms: ${recentSymp || "none"}.`
	].join("\n");
}
function looksMedical(text) {
	return /side effect|interaction|recall|safe to take|what is|how does|symptom of/i.test(text);
}
function looksLikeSymptom(text) {
	if (!text.match(/\b(?:i (?:feel|have|am)|my .+ (?:hurts|aches))\b[^.]*/i)) return null;
	const symptomMatch = text.match(/\b(dizz\w*|headache|nause\w*|tired|fatigue|pain|chest pain|short(?:ness)? of breath|cough|fever|anxious|nausea|vomit\w*)\b/i);
	if (!symptomMatch) return null;
	return {
		name: symptomMatch[0].toLowerCase(),
		severity: 5
	};
}
function TalkThreadPage() {
	const { threadId } = useParams({ from: "/talk/$threadId" });
	const navigate = useNavigate();
	const { threads, appendToThread, clearThread, deleteThread, createThread, setActiveThread, addSymptom } = useApp();
	const thread = threads.find((t) => t.id === threadId);
	const messages = thread?.messages ?? [];
	const [busy, setBusy] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const [autoListen, setAutoListen] = useState(false);
	const [input, setInput] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const scrollRef = useRef(null);
	const { offline } = useConnectivity();
	useEffect(() => {
		if (thread) setActiveThread(thread.id);
	}, [thread, setActiveThread]);
	useEffect(() => {
		const unsub = useApp.persist.onFinishHydration(() => setHydrated(true));
		if (useApp.persist.hasHydrated()) setHydrated(true);
		return () => unsub();
	}, []);
	useEffect(() => {
		if (hydrated && !thread) navigate({
			to: "/talk",
			replace: true
		});
	}, [
		hydrated,
		thread,
		navigate
	]);
	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages.length, busy]);
	const sortedThreads = useMemo(() => [...threads].sort((a, b) => b.updatedAt - a.updatedAt), [threads]);
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
		const nav = detectNavigation(text);
		if (nav) {
			appendToThread(thread.id, {
				role: "user",
				content: text
			});
			appendToThread(thread.id, {
				role: "assistant",
				content: `Opening ${nav.label}.`
			});
			setSpeaking(true);
			await speak(`Opening ${nav.label}.`, () => setSpeaking(false));
			navigate({ to: nav.to });
			return;
		}
		if (offline) {
			appendToThread(thread.id, {
				role: "user",
				content: text
			});
			appendToThread(thread.id, {
				role: "assistant",
				content: "I'm in Limited Offline Mode right now, so I can't reach the AI advocate or run medical search. Your symptoms, notes, doctor summary, and emergency QR all still work — I'll pick up the conversation as soon as we're back online."
			});
			return;
		}
		const symp = looksLikeSymptom(text);
		if (symp) addSymptom({
			name: symp.name,
			severity: symp.severity,
			notes: text
		});
		appendToThread(thread.id, {
			role: "user",
			content: text
		});
		setBusy(true);
		try {
			const state = useApp.getState();
			const sys = buildSystemPrompt(state);
			const history = (state.threads.find((t) => t.id === thread.id)?.messages ?? []).slice(-8).map((m) => ({
				role: m.role,
				content: m.content
			}));
			const useSearch = looksMedical(text) && (typeof navigator === "undefined" || navigator.onLine);
			const { reply } = await aiChat({ data: {
				messages: [
					{
						role: "system",
						content: sys
					},
					...history,
					{
						role: "user",
						content: text
					}
				],
				useWebSearch: useSearch,
				searchQuery: useSearch ? text : void 0
			} });
			const finalReply = (symp ? `Got it — I've logged "${symp.name}". ` : "") + reply;
			appendToThread(thread.id, {
				role: "assistant",
				content: finalReply
			});
			setBusy(false);
			setSpeaking(true);
			await speak(finalReply, () => {
				setSpeaking(false);
				setAutoListen(true);
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not reach the AI.";
			appendToThread(thread.id, {
				role: "assistant",
				content: `Sorry — ${msg}`
			});
			setBusy(false);
		}
	};
	if (!hydrated || !thread) return /* @__PURE__ */ jsx("div", {
		className: "py-20 text-center text-sm text-muted-foreground",
		children: "Opening MedsBuddy…"
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
		className: "flex flex-col",
		style: { minHeight: "calc(100vh - 200px)" },
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3 mb-4",
				children: [
					/* @__PURE__ */ jsx("button", {
						onClick: () => setDrawerOpen(true),
						className: "size-10 rounded-full bg-card border grid place-items-center text-muted-foreground hover:bg-secondary transition shrink-0",
						"aria-label": "Chat history",
						children: /* @__PURE__ */ jsx(History, { className: "size-4" })
					}),
					/* @__PURE__ */ jsx(AiOrb, {
						size: 56,
						speaking,
						listening: autoListen,
						thinking: busy
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ jsx("div", {
							className: "text-[11px] text-muted-foreground font-medium truncate",
							children: thread?.title || "MedsBuddy AI"
						}), /* @__PURE__ */ jsx("div", {
							className: "text-base font-semibold tracking-tight leading-tight",
							children: busy ? "Thinking…" : speaking ? "Speaking…" : "How can I help?"
						})]
					}),
					/* @__PURE__ */ jsxs("button", {
						onClick: handleNewChat,
						className: "rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 shadow-elegant shrink-0",
						"aria-label": "New chat",
						children: [/* @__PURE__ */ jsx(Plus, { className: "size-3.5" }), " New"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				ref: scrollRef,
				className: "flex-1 overflow-y-auto space-y-3 pr-1 -mx-1 px-1",
				children: [
					offline && /* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl border border-primary/25 bg-primary/[0.05] p-3.5",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 font-semibold text-primary text-[14px]",
							children: [/* @__PURE__ */ jsx(CloudOff, { className: "size-4" }), " Limited Offline Mode"]
						}), /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px] mt-2",
							children: [/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5",
									children: "Available"
								}),
								/* @__PURE__ */ jsx("div", { children: "· Health notes" }),
								/* @__PURE__ */ jsx("div", { children: "· Symptoms" }),
								/* @__PURE__ */ jsx("div", { children: "· Doctor Summary" }),
								/* @__PURE__ */ jsx("div", { children: "· Emergency QR" })
							] }), /* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("div", {
									className: "text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5",
									children: "Unavailable"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "text-muted-foreground",
									children: "· AI Patient Advocate"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "text-muted-foreground",
									children: "· Medical search"
								})
							] })]
						})]
					}),
					messages.length === 0 && /* @__PURE__ */ jsxs("div", {
						className: "py-6",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "text-center text-sm text-muted-foreground mb-4 inline-flex items-center gap-1.5 mx-auto w-full justify-center",
							children: [/* @__PURE__ */ jsx(Sparkles, { className: "size-4 text-primary" }), "Try one of these"]
						}), /* @__PURE__ */ jsx("div", {
							className: "grid gap-2",
							children: SUGGESTIONS.map((s) => /* @__PURE__ */ jsx("button", {
								onClick: () => handleUtterance(s),
								className: "text-left rounded-2xl border bg-card hover:bg-secondary/50 shadow-card px-4 py-3 text-[15px] transition active:scale-[0.98]",
								children: s
							}, s))
						})]
					}),
					/* @__PURE__ */ jsx(AnimatePresence, {
						initial: false,
						children: messages.map((m) => /* @__PURE__ */ jsx(motion.div, {
							initial: {
								opacity: 0,
								y: 8
							},
							animate: {
								opacity: 1,
								y: 0
							},
							className: `flex ${m.role === "user" ? "justify-end" : "justify-start"}`,
							children: /* @__PURE__ */ jsx("div", {
								className: `max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"}`,
								children: m.content
							})
						}, m.id))
					}),
					busy && /* @__PURE__ */ jsx("div", {
						className: "flex justify-start",
						children: /* @__PURE__ */ jsxs("div", {
							className: "bg-card border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ jsx("span", { className: "size-2 rounded-full bg-primary typing-dot" }),
								/* @__PURE__ */ jsx("span", {
									className: "size-2 rounded-full bg-primary typing-dot",
									style: { animationDelay: "0.15s" }
								}),
								/* @__PURE__ */ jsx("span", {
									className: "size-2 rounded-full bg-primary typing-dot",
									style: { animationDelay: "0.3s" }
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "pt-4 mt-3",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "flex items-center justify-center mb-4",
						children: /* @__PURE__ */ jsx(MicButton, {
							onTranscript: handleUtterance,
							busy,
							speaking,
							autoStart: autoListen,
							size: "xl"
						})
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: (e) => {
							e.preventDefault();
							const t = input.trim();
							if (!t) return;
							setInput("");
							handleUtterance(t);
						},
						className: "flex gap-2 items-center bg-card border shadow-card rounded-full px-2 py-1.5",
						children: [/* @__PURE__ */ jsx("input", {
							value: input,
							onChange: (e) => setInput(e.target.value),
							placeholder: "Or type a message…",
							className: "flex-1 bg-transparent px-3 py-2 text-[15px] outline-none"
						}), /* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "size-10 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50",
							disabled: !input.trim(),
							"aria-label": "Send",
							children: /* @__PURE__ */ jsx(Send, { className: "size-4" })
						})]
					}),
					messages.length > 0 && /* @__PURE__ */ jsxs("button", {
						onClick: () => {
							stopSpeaking();
							if (thread) clearThread(thread.id);
						},
						className: "mt-3 mx-auto block text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(Trash2, { className: "size-3" }), " Clear this conversation"]
					})
				]
			})
		]
	}), /* @__PURE__ */ jsx(AnimatePresence, { children: drawerOpen && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		onClick: () => setDrawerOpen(false),
		className: "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
	}), /* @__PURE__ */ jsxs(motion.aside, {
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
			/* @__PURE__ */ jsxs("div", {
				className: "p-4 border-b flex items-center justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
					className: "text-[11px] text-muted-foreground font-medium",
					children: "Conversations"
				}), /* @__PURE__ */ jsx("h2", {
					className: "text-lg font-semibold",
					children: "Chat history"
				})] }), /* @__PURE__ */ jsx("button", {
					onClick: () => setDrawerOpen(false),
					className: "size-9 rounded-full bg-card border grid place-items-center",
					"aria-label": "Close",
					children: /* @__PURE__ */ jsx(X, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "p-3",
				children: /* @__PURE__ */ jsxs("button", {
					onClick: handleNewChat,
					className: "w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant",
					children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " New chat"]
				})
			}),
			/* @__PURE__ */ jsxs("ul", {
				className: "flex-1 overflow-y-auto px-3 pb-4 space-y-1.5",
				children: [sortedThreads.length === 0 && /* @__PURE__ */ jsx("li", {
					className: "text-sm text-muted-foreground text-center py-10",
					children: "No conversations yet."
				}), sortedThreads.map((t) => {
					const active = t.id === threadId;
					const preview = t.messages[t.messages.length - 1]?.content?.slice(0, 60) ?? "Empty chat";
					return /* @__PURE__ */ jsxs("li", {
						className: `rounded-xl border px-3 py-2.5 flex items-start gap-2 transition ${active ? "bg-primary/10 border-primary/40" : "bg-card hover:bg-secondary/50"}`,
						children: [/* @__PURE__ */ jsxs("div", {
							role: "button",
							tabIndex: 0,
							onClick: () => handleSwitchThread(t.id),
							onKeyDown: (e) => {
								if (e.key === "Enter") handleSwitchThread(t.id);
							},
							className: "flex-1 min-w-0 text-left cursor-pointer",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "text-[14px] font-medium truncate inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(MessageCircle, { className: "size-3.5 text-primary shrink-0" }), t.title]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "text-[12px] text-muted-foreground truncate mt-0.5",
									children: preview
								}),
								/* @__PURE__ */ jsx("div", {
									className: "text-[10px] text-muted-foreground mt-1",
									children: new Date(t.updatedAt).toLocaleString()
								})
							]
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => handleDeleteThread(t.id),
							className: "size-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0",
							"aria-label": `Delete ${t.title}`,
							children: /* @__PURE__ */ jsx(Trash2, { className: "size-3.5" })
						})]
					}, t.id);
				})]
			})
		]
	})] }) })] });
}
//#endregion
export { TalkThreadPage as component };
