import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp, t as adherence } from "./store-CNkGaKo_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { H as Check, _ as Pill, g as Plus, o as Trash2, t as X } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reminders-mAvuVKek.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Reminders() {
	const { meds, doses, addMed, removeMed, logDose } = useApp();
	const [open, setOpen] = (0, import_react.useState)(false);
	const adh = adherence(doses, 7);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground font-medium",
				children: "Stay on schedule"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Medications" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setOpen(true),
				className: "rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " Add"]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "rounded-3xl gradient-hero text-primary-foreground p-5 mb-5 shadow-elegant relative overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-10 -right-10 size-32 rounded-full bg-white/10 blur-2xl" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm opacity-85 font-medium",
					children: "7-day adherence"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end gap-3 mt-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-5xl font-bold tracking-tight",
						children: [adh, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-2xl",
							children: "%"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs opacity-80 pb-2",
						children: [doses.filter((d) => d.at > Date.now() - 7 * 864e5).length, " doses logged"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 h-2 rounded-full bg-white/20 overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						initial: { width: 0 },
						animate: { width: `${adh}%` },
						transition: { duration: .8 },
						className: "h-full bg-white rounded-full"
					})
				})
			]
		}),
		meds.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					children: "Let's set up your medications"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-1 max-w-xs mx-auto",
					children: "Add what you take and MedsBuddy will help you stay on track — and remind you when you forget."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setOpen(true),
					className: "mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold",
					children: "Add first medication"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: meds.map((m, idx) => {
				const last = doses.find((d) => d.medId === m.id);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 6
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { delay: idx * .04 },
					className: "rounded-2xl bg-card border shadow-card p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "size-11 rounded-xl bg-primary/10 text-primary grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { className: "size-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-semibold text-[16px] truncate",
										children: m.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-sm text-muted-foreground",
										children: [
											m.dosage,
											" · ",
											m.frequency
										]
									}),
									last && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-muted-foreground mt-0.5",
										children: [
											"Last: ",
											last.status,
											" · ",
											new Date(last.at).toLocaleString()
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => removeMed(m.id),
								className: "text-muted-foreground p-1",
								"aria-label": "Remove",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => logDose(m.id, "taken"),
							className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold active:scale-95 transition",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), " Taken"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => logDose(m.id, "skipped"),
							className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-semibold active:scale-95 transition",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), " Skip"]
						})]
					})]
				}, m.id);
			})
		}),
		open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddMedDialog, {
			onClose: () => setOpen(false),
			onAdd: (m) => {
				addMed(m);
				setOpen(false);
			}
		})
	] });
}
function AddMedDialog({ onClose, onAdd }) {
	const [name, setName] = (0, import_react.useState)("");
	const [dosage, setDosage] = (0, import_react.useState)("");
	const [frequency, setFrequency] = (0, import_react.useState)("Once daily");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3",
					children: "Add medication"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "w-full rounded-xl border px-3 py-2.5",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "e.g. Lisinopril"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Dosage",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "w-full rounded-xl border px-3 py-2.5",
								value: dosage,
								onChange: (e) => setDosage(e.target.value),
								placeholder: "e.g. 10mg"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Frequency",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "w-full rounded-xl border px-3 py-2.5 bg-background",
								value: frequency,
								onChange: (e) => setFrequency(e.target.value),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Once daily" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Twice daily" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Three times daily" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "As needed" })
								]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 mt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium",
						onClick: onClose,
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50",
						disabled: !name.trim(),
						onClick: () => onAdd({
							name: name.trim(),
							dosage: dosage.trim(),
							frequency,
							times: []
						}),
						children: "Save"
					})]
				})
			]
		})
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm font-medium text-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1",
			children
		})]
	});
}
//#endregion
export { Reminders as component };
