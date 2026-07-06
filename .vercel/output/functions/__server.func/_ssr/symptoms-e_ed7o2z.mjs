import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { K as Activity, g as Plus, o as Trash2 } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/symptoms-e_ed7o2z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var commonSymptoms = [
	"Fever",
	"Dizziness",
	"Fatigue",
	"Leg pain",
	"Back pain",
	"Headache"
];
function Symptoms() {
	const { symptoms, addSymptom, removeSymptom, removeSymptomsByKeyword } = useApp();
	const [name, setName] = (0, import_react.useState)("");
	const [severity, setSeverity] = (0, import_react.useState)(5);
	const [notes, setNotes] = (0, import_react.useState)("");
	const saveSymptom = () => {
		const trimmedName = name.trim();
		const trimmedNotes = notes.trim();
		if (!trimmedName) return;
		addSymptom({
			name: trimmedName,
			severity,
			notes: trimmedNotes || void 0
		});
		toast.success("Symptom logged");
		setName("");
		setSeverity(5);
		setNotes("");
	};
	const deleteSymptom = (symptom) => {
		if (isUtiRelatedSymptom(symptom)) {
			if (removeSymptomsByKeyword("UTI") > 0) {
				toast.success("Removed UTI-related symptoms");
				return;
			}
		}
		removeSymptom(symptom.id);
		toast.success("Symptom removed");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-end justify-between mb-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground font-medium",
				children: "Daily health tracking"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Symptoms" })] })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-3xl bg-card border shadow-card p-4 mb-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-11 rounded-2xl bg-warning/15 text-warning grid place-items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					children: "Log symptom"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: "Save what happened so MedsBuddy can include it in doctor visits."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "Symptom"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "mt-1 w-full rounded-xl border bg-background px-3 py-2.5",
							value: name,
							onChange: (event) => setName(event.target.value),
							placeholder: "e.g. evening dizziness"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: commonSymptoms.map((symptom) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setName(symptom),
							className: "rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground",
							children: symptom
						}, symptom))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm font-medium",
							children: [
								"Severity: ",
								severity,
								"/10"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "mt-2 w-full accent-primary",
							type: "range",
							min: "1",
							max: "10",
							value: severity,
							onChange: (event) => setSeverity(Number(event.target.value))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "Notes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: "mt-1 min-h-24 w-full rounded-xl border bg-background px-3 py-2.5",
							value: notes,
							onChange: (event) => setNotes(event.target.value),
							placeholder: "When did it start? What makes it better or worse?"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: saveSymptom,
						disabled: !name.trim(),
						className: "w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), " Save symptom"]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-baseline justify-between mb-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Recent symptoms" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-xs text-muted-foreground",
				children: [symptoms.length, " logged"]
			})]
		}),
		symptoms.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-14 rounded-2xl bg-warning/15 text-warning grid place-items-center mx-auto mb-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					children: "No symptoms logged yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground mt-1 max-w-xs mx-auto",
					children: "Add a symptom above. It will be available for Doctor Visit summaries."
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: symptoms.map((symptom, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
				initial: {
					opacity: 0,
					y: 6
				},
				animate: {
					opacity: 1,
					y: 0
				},
				transition: { delay: Math.min(index * .03, .18) },
				className: "rounded-2xl bg-card border shadow-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold text-[16px]",
						children: symptom.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground mt-0.5",
						children: formatDateTime(symptom.at)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-full bg-warning/15 text-warning px-3 py-1 text-xs font-semibold",
							children: [symptom.severity, "/10"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => deleteSymptom(symptom),
							className: "size-9 rounded-full border bg-background text-muted-foreground grid place-items-center transition hover:bg-destructive/10 hover:text-destructive",
							"aria-label": `Delete ${symptom.name}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						})]
					})]
				}), symptom.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted-foreground",
					children: symptom.notes
				})]
			}, symptom.id))
		})
	] });
}
function formatDateTime(at) {
	return new Date(at).toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}
function isUtiRelatedSymptom(symptom) {
	return /\buti\b|urinary tract infection|urinary infection|burning while urinating|burning or discomfort while urinating|discomfort while urinating|urinating|urination/i.test(`${symptom.name} ${symptom.notes ?? ""}`);
}
//#endregion
export { Symptoms as component };
