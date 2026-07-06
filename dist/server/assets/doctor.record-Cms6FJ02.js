import { n as useApp } from "./store-xEuxQ6YF.js";
import { t as AppShell } from "./app-shell-ze7JTE56.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Check, ChevronLeft, Mic, MicOff, Pencil, ShieldAlert, ShieldCheck, Square, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
//#region src/routes/doctor.record.tsx?tsr-split=component
function RecordVisit() {
	const state = useApp();
	const navigate = useNavigate({ from: "/doctor/record" });
	const { currentVisitSummary, addVisit, addNote, setCurrentVisitSummary } = state;
	useEffect(() => {
		if (!currentVisitSummary) navigate({ to: "/doctor" });
	}, [currentVisitSummary, navigate]);
	const [stage, setStage] = useState("doctor-consent");
	const [doctorName, setDoctorName] = useState("");
	const [specialty, setSpecialty] = useState("");
	const [recording, setRecording] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [audioUrl, setAudioUrl] = useState(null);
	const [audioDataUrl, setAudioDataUrl] = useState(void 0);
	const [recError, setRecError] = useState(null);
	const recorderRef = useRef(null);
	const chunksRef = useRef([]);
	const tickRef = useRef(null);
	const startedAtRef = useRef(0);
	const streamRef = useRef(null);
	const [quickNoteOpen, setQuickNoteOpen] = useState(false);
	useEffect(() => {
		return () => {
			if (tickRef.current) window.clearInterval(tickRef.current);
			streamRef.current?.getTracks().forEach((t) => t.stop());
			if (audioUrl) URL.revokeObjectURL(audioUrl);
		};
	}, []);
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
				else setAudioDataUrl(void 0);
				streamRef.current?.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
				setRecording(false);
				setStage("summary");
			};
			rec.start();
			recorderRef.current = rec;
			startedAtRef.current = Date.now();
			setSeconds(0);
			setRecording(true);
			setStage("recording");
			tickRef.current = window.setInterval(() => {
				setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1e3));
			}, 500);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Microphone unavailable";
			setRecError(msg);
			toast.error("Couldn't start recording", { description: msg });
		}
	};
	const stopRecording = () => {
		if (tickRef.current) {
			window.clearInterval(tickRef.current);
			tickRef.current = null;
		}
		recorderRef.current?.stop();
	};
	const handleSaveVisit = (payload) => {
		const outcomeBits = [
			payload.topicsDiscussed && `Discussed: ${payload.topicsDiscussed}`,
			payload.medicationChanges && `Medication changes: ${payload.medicationChanges}`,
			payload.newRecommendations && `Recommendations: ${payload.newRecommendations}`,
			payload.testsOrdered && `Tests ordered: ${payload.testsOrdered}`,
			payload.followUpAppointments && `Follow-up: ${payload.followUpAppointments}`,
			payload.actionItems && `Action items: ${payload.actionItems}`
		].filter(Boolean);
		const outcomeSummary = outcomeBits.length > 0 ? outcomeBits.join(". ") : `Visit outcome with ${doctorName || "doctor"}${specialty ? ` (${specialty})` : ""} on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}.`;
		addVisit({
			doctor: doctorName.trim() || "Unspecified doctor",
			specialty: specialty.trim() || void 0,
			durationSec: seconds || void 0,
			audioDataUrl,
			summary: outcomeSummary,
			patientSummary: currentVisitSummary?.trim() || void 0,
			topicsDiscussed: payload.topicsDiscussed.trim() || void 0,
			medicationChanges: payload.medicationChanges.trim() || void 0,
			newRecommendations: payload.newRecommendations.trim() || void 0,
			testsOrdered: payload.testsOrdered.trim() || void 0,
			followUpAppointments: payload.followUpAppointments.trim() || void 0,
			actionItems: payload.actionItems.trim() || void 0,
			notes: payload.notes.trim() || void 0,
			recorded: !!audioDataUrl || seconds > 0
		});
		if (audioUrl) URL.revokeObjectURL(audioUrl);
		setAudioUrl(null);
		setAudioDataUrl(void 0);
		setSeconds(0);
		setDoctorName("");
		setSpecialty("");
		setCurrentVisitSummary(null);
		setStage("done");
	};
	return /* @__PURE__ */ jsxs(AppShell, { children: [
		/* @__PURE__ */ jsx("div", {
			className: "mb-4",
			children: /* @__PURE__ */ jsxs("button", {
				onClick: () => navigate({ to: "/doctor" }),
				className: "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition",
				children: [/* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }), " Back to doctor prep"]
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
			className: "rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center",
						children: /* @__PURE__ */ jsx(Mic, { className: "size-6" })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-[12px] opacity-80 font-medium",
						children: "Visit recorder"
					}), /* @__PURE__ */ jsx("h1", {
						className: "text-primary-foreground text-2xl",
						children: "Record today's visit"
					})] })]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm opacity-90 mt-3",
					children: "Capture what your doctor says, save the outcome, and keep everything in your Health Memory."
				})
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 mb-4",
			children: [
				/* @__PURE__ */ jsx(StepDot, {
					active: stage === "doctor-consent" || stage === "recording" || stage === "summary" || stage === "done",
					label: "Consent"
				}),
				/* @__PURE__ */ jsx("div", { className: `flex-1 h-0.5 ${stage !== "doctor-consent" ? "bg-primary" : "bg-border"}` }),
				/* @__PURE__ */ jsx(StepDot, {
					active: stage === "recording" || stage === "summary" || stage === "done",
					label: "Record"
				}),
				/* @__PURE__ */ jsx("div", { className: `flex-1 h-0.5 ${stage === "summary" || stage === "done" ? "bg-primary" : "bg-border"}` }),
				/* @__PURE__ */ jsx(StepDot, {
					active: stage === "summary" || stage === "done",
					label: "Outcome"
				})
			]
		}),
		stage === "doctor-consent" && /* @__PURE__ */ jsxs(Section, {
			icon: ShieldAlert,
			title: "Get consent",
			tint: "warning",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-xl bg-warning/10 border border-warning/30 p-3 mb-3 flex items-start gap-2",
					children: [/* @__PURE__ */ jsx(ShieldAlert, { className: "size-4 text-warning shrink-0 mt-0.5" }), /* @__PURE__ */ jsxs("div", {
						className: "text-[13px] text-warning-foreground/90",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold text-warning",
							children: "Before recording"
						}), "Please make sure your doctor agrees to being recorded."]
					})]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm italic text-foreground/90",
					children: "\"Doctor, would it be okay if I record this visit to help me remember important information and create a summary afterward?\""
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
						onClick: startRecording,
						className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(Check, { className: "size-4" }), " Doctor approved"]
					}), /* @__PURE__ */ jsxs("button", {
						onClick: () => setStage("doctor-declined"),
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(MicOff, { className: "size-4" }), " Doctor declined"]
					})]
				}),
				recError && /* @__PURE__ */ jsx("div", {
					className: "text-[12px] text-destructive mt-2",
					children: recError
				})
			]
		}),
		stage === "recording" && /* @__PURE__ */ jsxs(Section, {
			icon: Mic,
			title: "Recording",
			tint: "primary",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "relative grid place-items-center size-10 rounded-full bg-destructive/15",
						children: [/* @__PURE__ */ jsx("span", { className: "absolute inset-0 rounded-full bg-destructive/40 animate-ping" }), /* @__PURE__ */ jsx(Mic, { className: "size-5 text-destructive relative" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold text-destructive",
							children: "Recording visit"
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-[12px] text-muted-foreground",
							children: [
								formatDuration(seconds),
								" · ",
								doctorName || "your doctor"
							]
						})]
					}),
					/* @__PURE__ */ jsxs("button", {
						onClick: stopRecording,
						className: "rounded-xl bg-destructive text-destructive-foreground px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5",
						children: [/* @__PURE__ */ jsx(Square, { className: "size-4 fill-current" }), " Stop"]
					})
				]
			}), /* @__PURE__ */ jsx("p", {
				className: "text-[11px] text-muted-foreground mt-2 text-center",
				children: "You can stop the recording at any time. Audio stays on your device."
			})]
		}),
		stage === "summary" && /* @__PURE__ */ jsx(VisitSummaryForm, {
			duration: seconds,
			audioUrl,
			doctorName: doctorName || "your doctor",
			patientSummary: currentVisitSummary ?? void 0,
			onCancel: () => {
				if (audioUrl) URL.revokeObjectURL(audioUrl);
				setAudioUrl(null);
				setAudioDataUrl(void 0);
				setStage("doctor-consent");
			},
			onSave: handleSaveVisit
		}),
		stage === "doctor-declined" && /* @__PURE__ */ jsxs(Section, {
			icon: MicOff,
			title: "No recording",
			tint: "primary",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm",
					children: "That's okay. You can still take notes during the visit."
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: () => setQuickNoteOpen(true),
					className: "mt-3 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(StickyNote, { className: "size-4" }), " Quick note"]
				}),
				/* @__PURE__ */ jsx("button", {
					onClick: () => setStage("doctor-consent"),
					className: "mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium",
					children: "Back"
				}),
				quickNoteOpen && /* @__PURE__ */ jsx(QuickNoteDialog, {
					onClose: () => setQuickNoteOpen(false),
					onSave: (t) => {
						addNote(t);
						setQuickNoteOpen(false);
						toast.success("Note saved to Health Memory");
					}
				})
			]
		}),
		stage === "done" && /* @__PURE__ */ jsxs(Section, {
			icon: ShieldCheck,
			title: "Visit saved",
			tint: "success",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "text-sm",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "inline-flex items-center gap-1.5 text-success font-medium",
						children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-4" }), " Visit saved to Health Memory"]
					}), /* @__PURE__ */ jsx("p", {
						className: "text-muted-foreground mt-2",
						children: "Your visit outcome summary, any recording, and notes are now in your Health Memory timeline."
					})]
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: () => navigate({ to: "/doctor" }),
					className: "mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }), " Back to doctor prep"]
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: () => {
						setStage("doctor-consent");
						setDoctorName("");
						setSpecialty("");
						setSeconds(0);
					},
					className: "mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(Pencil, { className: "size-4" }), " Log another visit"]
				})
			]
		})
	] });
}
function StepDot({ active, label }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col items-center gap-1",
		children: [/* @__PURE__ */ jsx("div", { className: `size-2.5 rounded-full ${active ? "bg-primary" : "bg-border"}` }), /* @__PURE__ */ jsx("span", {
			className: `text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`,
			children: label
		})]
	});
}
function VisitSummaryForm({ duration, audioUrl, doctorName, patientSummary, onCancel, onSave }) {
	const [topicsDiscussed, setTopicsDiscussed] = useState("");
	const [medicationChanges, setMedicationChanges] = useState("");
	const [newRecommendations, setNewRecommendations] = useState("");
	const [testsOrdered, setTestsOrdered] = useState("");
	const [followUpAppointments, setFollowUpAppointments] = useState("");
	const [actionItems, setActionItems] = useState("");
	const [notes, setNotes] = useState("");
	const [showPatientSummary, setShowPatientSummary] = useState(false);
	const canSave = topicsDiscussed.trim() || medicationChanges.trim() || newRecommendations.trim() || testsOrdered.trim() || followUpAppointments.trim() || actionItems.trim() || notes.trim();
	return /* @__PURE__ */ jsxs(Section, {
		icon: Pencil,
		title: "Visit outcome",
		tint: "primary",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-xl bg-success/10 border border-success/30 p-3 mb-3 text-[13px]",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-success",
						children: "Recording finished"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "text-muted-foreground",
						children: [
							formatDuration(duration),
							" with ",
							doctorName,
							". Capture the ",
							/* @__PURE__ */ jsx("strong", { children: "visit outcome" }),
							" below — what the doctor said, decided, or recommended."
						]
					}),
					audioUrl && /* @__PURE__ */ jsx("audio", {
						controls: true,
						src: audioUrl,
						className: "w-full mt-2"
					})
				]
			}),
			patientSummary && /* @__PURE__ */ jsxs("div", {
				className: "rounded-xl border bg-secondary/40 p-3 mb-3 text-[12px]",
				children: [
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => setShowPatientSummary((s) => !s),
						className: "font-semibold text-foreground inline-flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(ChevronLeft, { className: `size-3 transition ${showPatientSummary ? "-rotate-90" : ""}` }), "Patient summary you brought to the visit"]
					}),
					showPatientSummary && /* @__PURE__ */ jsx("div", {
						className: "mt-2 text-muted-foreground whitespace-pre-wrap",
						children: patientSummary
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: "For reference only — please capture what the doctor said below, not what you told them."
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-[12px] font-semibold uppercase tracking-wide text-primary mb-1",
				children: "Visit outcome"
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Topics discussed",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: topicsDiscussed,
					onChange: (e) => setTopicsDiscussed(e.target.value),
					placeholder: "e.g. Blood pressure trends, headaches, sleep",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Medication changes",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: medicationChanges,
					onChange: (e) => setMedicationChanges(e.target.value),
					placeholder: "e.g. Increased lisinopril to 20mg; stopped ibuprofen",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "New recommendations",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: newRecommendations,
					onChange: (e) => setNewRecommendations(e.target.value),
					placeholder: "e.g. Reduce salt, walk 20 min/day",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Tests ordered",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: testsOrdered,
					onChange: (e) => setTestsOrdered(e.target.value),
					placeholder: "e.g. Blood panel, EKG",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Follow-up appointments",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: followUpAppointments,
					onChange: (e) => setFollowUpAppointments(e.target.value),
					placeholder: "e.g. Cardiology in 3 months",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Action items for me",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: actionItems,
					onChange: (e) => setActionItems(e.target.value),
					placeholder: "e.g. Pick up new prescription, book lab",
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsx(Field, {
				label: "Other appointment notes",
				children: /* @__PURE__ */ jsx("textarea", {
					rows: 2,
					value: notes,
					onChange: (e) => setNotes(e.target.value),
					className: "w-full rounded-xl border px-3 py-2 text-sm"
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2 mt-3",
				children: [/* @__PURE__ */ jsx("button", {
					onClick: onCancel,
					className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium",
					children: "Discard"
				}), /* @__PURE__ */ jsx("button", {
					onClick: () => onSave({
						topicsDiscussed,
						medicationChanges,
						newRecommendations,
						testsOrdered,
						followUpAppointments,
						actionItems,
						notes
					}),
					disabled: !canSave,
					className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50",
					children: "Save visit outcome"
				})]
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "block mt-2",
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-[12px] font-medium text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsx("div", {
			className: "mt-1",
			children
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
export { RecordVisit as component };
