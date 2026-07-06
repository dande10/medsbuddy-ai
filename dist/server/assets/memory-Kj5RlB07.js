import { n as useApp } from "./store-xEuxQ6YF.js";
import { t as AppShell } from "./app-shell-ze7JTE56.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Activity, Calendar, Check, Clock, FileText, HelpCircle, Mic, Pill, Plus, StickyNote, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
//#region src/routes/memory.tsx?tsr-split=component
var FILTERS = [
	{
		id: "all",
		label: "All"
	},
	{
		id: "symptom",
		label: "Symptoms"
	},
	{
		id: "note",
		label: "Notes"
	},
	{
		id: "question",
		label: "Questions"
	},
	{
		id: "summary",
		label: "Summaries"
	},
	{
		id: "visit",
		label: "Visits"
	},
	{
		id: "medication",
		label: "Medications"
	}
];
function Memory() {
	const { symptoms, doses, appointments, summaries, notes, questions, visits, addSymptom, addNote, addQuestion, toggleQuestion, removeQuestion, removeNote } = useApp();
	const [filter, setFilter] = useState("all");
	const [composer, setComposer] = useState(null);
	const items = useMemo(() => {
		const all = [
			...symptoms.map((s) => ({
				id: "s" + s.id,
				at: s.at,
				kind: "symptom",
				title: `Symptom: ${s.name}`,
				sub: `Severity ${s.severity}/10${s.notes ? ` — ${s.notes}` : ""}`
			})),
			...notes.map((n) => ({
				id: "n" + n.id,
				at: n.at,
				kind: "note",
				title: "Health note",
				sub: n.text
			})),
			...questions.map((q) => ({
				id: "q" + q.id,
				at: q.at,
				kind: "question",
				title: q.asked ? "Asked at visit" : "Doctor question",
				sub: q.text
			})),
			...summaries.map((s) => ({
				id: "sum" + s.id,
				at: s.at,
				kind: "summary",
				title: "Doctor summary (approved)",
				sub: s.text.slice(0, 200)
			})),
			...doses.map((d) => ({
				id: "d" + d.id,
				at: d.at,
				kind: "medication",
				title: d.medName,
				sub: `Marked ${d.status}`
			})),
			...appointments.map((a) => ({
				id: "a" + a.id,
				at: a.at,
				kind: "appt",
				title: `Appointment: ${a.doctor}`,
				sub: a.notes
			})),
			...visits.map((v) => ({
				id: "v" + v.id,
				at: v.at,
				kind: "visit",
				title: `${v.specialty ? v.specialty + " visit" : "Doctor visit"}${v.doctor && v.doctor !== "Unspecified doctor" ? ` · ${v.doctor}` : ""}`,
				sub: v.summary
			}))
		];
		return (filter === "all" ? all : all.filter((i) => i.kind === filter)).sort((a, b) => b.at - a.at);
	}, [
		symptoms,
		notes,
		questions,
		summaries,
		doses,
		appointments,
		visits,
		filter
	]);
	return /* @__PURE__ */ jsxs(AppShell, { children: [
		/* @__PURE__ */ jsxs("div", {
			className: "flex items-end justify-between mb-4",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
				className: "text-xs text-muted-foreground font-medium",
				children: "Your health timeline"
			}), /* @__PURE__ */ jsx("h1", { children: "Health memory" })] }), /* @__PURE__ */ jsxs("button", {
				onClick: () => setComposer("symptom"),
				className: "rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant",
				children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Log"]
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-3 gap-2 mb-4",
			children: [
				/* @__PURE__ */ jsx(QuickAdd, {
					icon: Activity,
					label: "Symptom",
					onClick: () => setComposer("symptom")
				}),
				/* @__PURE__ */ jsx(QuickAdd, {
					icon: StickyNote,
					label: "Note",
					onClick: () => setComposer("note")
				}),
				/* @__PURE__ */ jsx(QuickAdd, {
					icon: HelpCircle,
					label: "Question",
					onClick: () => setComposer("question")
				})
			]
		}),
		/* @__PURE__ */ jsx("div", {
			className: "flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-3 mb-2 no-scrollbar",
			children: FILTERS.map((f) => {
				return /* @__PURE__ */ jsx("button", {
					onClick: () => setFilter(f.id),
					className: `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition ${f.id === filter ? "bg-primary text-primary-foreground border-primary shadow-card" : "bg-card text-muted-foreground border-border hover:text-foreground"}`,
					children: f.label
				}, f.id);
			})
		}),
		items.length === 0 ? /* @__PURE__ */ jsxs("div", {
			className: "rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3",
					children: /* @__PURE__ */ jsx(Clock, { className: "size-6" })
				}),
				/* @__PURE__ */ jsx("div", {
					className: "font-semibold",
					children: filter === "all" ? "Your timeline starts here" : "Nothing here yet"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground mt-1 max-w-xs mx-auto",
					children: "Log symptoms, health notes, and questions for your doctor — only meaningful health events live here."
				}),
				/* @__PURE__ */ jsx("button", {
					onClick: () => setComposer("symptom"),
					className: "mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold",
					children: "Log your first symptom"
				})
			]
		}) : /* @__PURE__ */ jsx("ol", {
			className: "relative ml-3 space-y-3 pl-6 border-l-2 border-border",
			children: items.map((it, idx) => {
				const Icon = it.kind === "symptom" ? Activity : it.kind === "medication" ? Pill : it.kind === "appt" ? Calendar : it.kind === "summary" ? FileText : it.kind === "question" ? HelpCircle : it.kind === "visit" ? Mic : StickyNote;
				const tone = it.kind === "symptom" ? "bg-warning/15 text-warning" : it.kind === "medication" ? "bg-primary/15 text-primary" : it.kind === "appt" ? "bg-success/15 text-success" : it.kind === "summary" ? "bg-success/15 text-success" : it.kind === "question" ? "bg-primary/15 text-primary" : it.kind === "visit" ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground";
				const qid = it.kind === "question" ? it.id.slice(1) : null;
				const nid = it.kind === "note" ? it.id.slice(1) : null;
				const qRow = qid ? questions.find((q) => q.id === qid) : null;
				return /* @__PURE__ */ jsxs(motion.li, {
					initial: {
						opacity: 0,
						x: -8
					},
					animate: {
						opacity: 1,
						x: 0
					},
					transition: { delay: Math.min(idx * .03, .3) },
					className: "relative",
					children: [/* @__PURE__ */ jsx("span", {
						className: `absolute -left-[34px] size-8 rounded-full grid place-items-center ring-4 ring-background ${tone}`,
						children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
					}), /* @__PURE__ */ jsxs("div", {
						className: "rounded-2xl bg-card border shadow-card p-3.5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-baseline justify-between gap-2",
								children: [/* @__PURE__ */ jsx("div", {
									className: "font-semibold text-[14px]",
									children: it.title
								}), /* @__PURE__ */ jsx("div", {
									className: "text-[11px] text-muted-foreground shrink-0",
									children: formatTime(it.at)
								})]
							}),
							it.sub && /* @__PURE__ */ jsx("div", {
								className: "text-sm text-muted-foreground mt-0.5",
								children: it.sub
							}),
							(qid || nid) && /* @__PURE__ */ jsxs("div", {
								className: "flex gap-2 mt-2.5 pt-2.5 border-t border-border/60",
								children: [qid && qRow && /* @__PURE__ */ jsxs("button", {
									onClick: () => toggleQuestion(qid),
									className: `text-[12px] font-medium inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${qRow.asked ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`,
									children: [
										/* @__PURE__ */ jsx(Check, { className: "size-3" }),
										" ",
										qRow.asked ? "Asked" : "Mark asked"
									]
								}), /* @__PURE__ */ jsxs("button", {
									onClick: () => qid ? removeQuestion(qid) : nid ? removeNote(nid) : void 0,
									className: "text-[12px] font-medium text-muted-foreground hover:text-destructive inline-flex items-center gap-1 ml-auto",
									children: [/* @__PURE__ */ jsx(Trash2, { className: "size-3" }), " Remove"]
								})]
							})
						]
					})]
				}, it.id);
			})
		}),
		composer === "symptom" && /* @__PURE__ */ jsx(AddSymptomDialog, {
			onClose: () => setComposer(null),
			onAdd: (s) => {
				addSymptom(s);
				setComposer(null);
			}
		}),
		composer === "note" && /* @__PURE__ */ jsx(TextDialog, {
			title: "Add a health note",
			placeholder: "e.g. Felt dizzy after lunch",
			onClose: () => setComposer(null),
			onSave: (t) => {
				addNote(t);
				setComposer(null);
			}
		}),
		composer === "question" && /* @__PURE__ */ jsx(TextDialog, {
			title: "Save a question for your doctor",
			placeholder: "e.g. Could my headaches be medication related?",
			onClose: () => setComposer(null),
			onSave: (t) => {
				addQuestion(t);
				setComposer(null);
			}
		}),
		/* @__PURE__ */ jsxs("p", {
			className: "text-center text-xs text-muted-foreground mt-6",
			children: [/* @__PURE__ */ jsx(Link, {
				to: "/talk",
				className: "text-primary font-medium",
				children: "Talk to MedsBuddy"
			}), " to log hands-free. Chat history lives on the Talk page."]
		})
	] });
}
function QuickAdd({ icon: Icon, label, onClick }) {
	return /* @__PURE__ */ jsxs("button", {
		onClick,
		className: "rounded-2xl bg-card border shadow-card px-3 py-3 flex flex-col items-center gap-1 text-[12px] font-medium hover:bg-secondary/40 transition active:scale-[0.98]",
		children: [/* @__PURE__ */ jsx(Icon, { className: "size-5 text-primary" }), label]
	});
}
function formatTime(at) {
	const d = new Date(at);
	const now = /* @__PURE__ */ new Date();
	if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
	return d.toLocaleDateString(void 0, {
		month: "short",
		day: "numeric"
	});
}
function AddSymptomDialog({ onClose, onAdd }) {
	const [name, setName] = useState("");
	const [severity, setSeverity] = useState(5);
	const [notes, setNotes] = useState("");
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4",
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
			className: "w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "mb-3",
					children: "Log a symptom"
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "block text-sm font-medium",
					children: ["Symptom", /* @__PURE__ */ jsx("input", {
						className: "mt-1 w-full rounded-xl border px-3 py-2.5",
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "e.g. headache"
					})]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "block text-sm font-medium mt-3",
					children: [
						"Severity: ",
						/* @__PURE__ */ jsxs("span", {
							className: "text-primary",
							children: [severity, "/10"]
						}),
						/* @__PURE__ */ jsx("input", {
							type: "range",
							min: 1,
							max: 10,
							value: severity,
							onChange: (e) => setSeverity(Number(e.target.value)),
							className: "w-full mt-1 accent-[oklch(0.585_0.215_263)]"
						})
					]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "block text-sm font-medium mt-3",
					children: ["Notes (optional)", /* @__PURE__ */ jsx("textarea", {
						className: "mt-1 w-full rounded-xl border px-3 py-2.5",
						rows: 2,
						value: notes,
						onChange: (e) => setNotes(e.target.value),
						placeholder: "When, where, anything else…"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex gap-2 mt-5",
					children: [/* @__PURE__ */ jsx("button", {
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium",
						onClick: onClose,
						children: "Cancel"
					}), /* @__PURE__ */ jsx("button", {
						className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50",
						disabled: !name.trim(),
						onClick: () => onAdd({
							name: name.trim(),
							severity,
							notes: notes.trim() || void 0
						}),
						children: "Log"
					})]
				})
			]
		})
	});
}
function TextDialog({ title, placeholder, onClose, onSave }) {
	const [text, setText] = useState("");
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4",
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
			className: "w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between mb-3",
					children: [/* @__PURE__ */ jsx("h2", { children: title }), /* @__PURE__ */ jsx("button", {
						onClick: onClose,
						className: "size-8 rounded-full bg-secondary grid place-items-center",
						"aria-label": "Close",
						children: /* @__PURE__ */ jsx(X, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ jsx("textarea", {
					autoFocus: true,
					rows: 4,
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder,
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
						children: "Save"
					})]
				})
			]
		})
	});
}
//#endregion
export { Memory as component };
