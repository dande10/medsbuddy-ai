import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { L as ClipboardList, U as Calendar, V as ChevronDown, b as Mic, o as Trash2 } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/memory-wdaKQ3vn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Memory() {
	const { visits, removeVisit } = useApp();
	const [openVisitId, setOpenVisitId] = (0, import_react.useState)(null);
	const sortedVisits = [...visits].sort((a, b) => b.at - a.at);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-end justify-between mb-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground font-medium",
			children: "Doctor visit records"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Doctor visit summaries" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/doctor",
			className: "rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 shadow-elegant",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" }), " New visit"]
		})]
	}), sortedVisits.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "size-6" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-semibold",
				children: "No visit summaries yet"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground mt-1 max-w-xs mx-auto",
				children: "End a Doctor Visit to save the summary here. You can come back anytime to review or delete it."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/doctor",
				className: "mt-4 inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold",
				children: "Start Doctor Visit"
			})
		]
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: sortedVisits.map((visit, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VisitCard, {
			visit,
			index,
			isOpen: openVisitId === visit.id,
			onToggle: () => setOpenVisitId(openVisitId === visit.id ? null : visit.id),
			onDelete: () => removeVisit(visit.id)
		}, visit.id))
	})] });
}
function VisitCard({ visit, index, isOpen, onToggle, onDelete }) {
	const title = `${visit.specialty || "Doctor"} visit${visit.doctor ? ` · ${visit.doctor}` : ""}`;
	const details = getVisitDetails(visit);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		initial: {
			opacity: 0,
			y: 8
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { delay: Math.min(index * .03, .2) },
		className: "rounded-2xl bg-card border shadow-card p-4 transition hover:border-primary/40 hover:shadow-elegant",
		onClick: onToggle,
		onKeyDown: (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				onToggle();
			}
		},
		role: "button",
		tabIndex: 0,
		"aria-expanded": isOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-[12px] text-muted-foreground font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "size-3.5" }),
							" ",
							formatDateTime(visit.at)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-[17px] font-semibold mt-1",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-primary font-semibold mt-1",
						children: isOpen ? "Hide full visit summary" : "View full visit summary"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: `size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: (event) => {
						event.stopPropagation();
						onDelete();
					},
					className: "size-9 rounded-full bg-secondary text-muted-foreground hover:text-destructive grid place-items-center shrink-0",
					"aria-label": "Delete visit summary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 space-y-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl border bg-background p-3 text-[14px] leading-relaxed",
				children: visit.summary
			}), isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3 border-t pt-3",
				onClick: (event) => event.stopPropagation(),
				children: details.length > 0 ? details.map((detail) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs font-semibold uppercase tracking-wide text-primary",
					children: detail.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-[14px] leading-relaxed text-foreground",
					children: detail.value
				})] }, detail.label)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No extra structured details were saved for this visit."
				})
			})]
		})]
	});
}
function getVisitDetails(visit) {
	return [
		["Patient context", visit.patientSummary],
		["Topics discussed", visit.topicsDiscussed],
		["Diagnosis or concerns", visit.diagnosisOrConcerns],
		["Medication changes", visit.medicationChanges || visit.medications],
		["New recommendations", visit.newRecommendations],
		["Tests ordered", visit.testsOrdered],
		["Follow-up appointments", visit.followUpAppointments || visit.followUp],
		["Action items", visit.actionItems],
		["Care plan", visit.carePlan],
		["Questions answered", visit.questionsAnswered],
		["Notes", visit.notes]
	].map(([label, value]) => ({
		label: label ?? "",
		value: typeof value === "string" ? value.trim() : ""
	})).filter((detail) => detail.value.length > 0);
}
function formatDateTime(at) {
	return new Date(at).toLocaleString(void 0, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}
//#endregion
export { Memory as component };
