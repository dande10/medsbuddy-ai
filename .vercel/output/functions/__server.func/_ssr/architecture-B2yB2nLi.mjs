import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { A as FileText, G as ArrowRight, N as Database, P as Cloud, W as Bot, b as Mic, f as Server, k as Headphones, s as Stethoscope, u as ShieldCheck, w as Lock } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/architecture-B2yB2nLi.js
var import_jsx_runtime = require_jsx_runtime();
var flow = [
	{
		label: "Before Visit",
		icon: Bot,
		title: "Patient talks naturally",
		detail: "Qwen extracts symptoms, medications, concerns, timeline, and questions."
	},
	{
		label: "During Visit",
		icon: Stethoscope,
		title: "Agent speaks with doctor",
		detail: "With consent, ElevenLabs transcribes and Qwen decides when MedsBuddy should answer."
	},
	{
		label: "After Visit",
		icon: FileText,
		title: "Summary and memory",
		detail: "Qwen generates medications, follow-up, warning signs, and visit memory stored on ECS."
	}
];
var stack = [
	{
		icon: Mic,
		name: "MedsBuddy App",
		role: "Patient interface for Talk, Doctor Visit, Emergency QR, and Visit Memory."
	},
	{
		icon: Server,
		name: "Alibaba ECS FastAPI Backend",
		role: "Owns API routes, Qwen calls, STT/TTS forwarding, and SQLite visit memory."
	},
	{
		icon: Cloud,
		name: "Qwen Cloud",
		role: "Structured extraction, doctor-agent reasoning, care-plan gap detection, and summaries."
	},
	{
		icon: Headphones,
		name: "ElevenLabs STT/TTS",
		role: "Speech-to-text for the live doctor visit and voice output for MedsBuddy."
	},
	{
		icon: Database,
		name: "Visit Memory DB",
		role: "Stores patient-approved visit summaries for later doctor questions and continuity."
	}
];
function ArchitecturePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Architecture",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "space-y-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-2xl border bg-card p-5 shadow-card",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 text-2xl font-bold tracking-tight",
								children: "MedsBuddy System Architecture"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-6 text-muted-foreground",
								children: "MedsBuddy is an AI Patient Advocate powered by Qwen Cloud and deployed through Alibaba ECS backend APIs. It supports patients before, during, and after a doctor visit."
							})]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl border bg-background p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold tracking-tight",
							children: "End-to-End Flow"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/doctor",
							className: "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground",
							children: ["Demo", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3.5" })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-3",
						children: flow.map((item, index) => {
							const Icon = item.icon;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col items-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "size-10 rounded-xl bg-primary/10 text-primary grid place-items-center",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" })
									}), index < flow.length - 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-1 h-8 w-px bg-border" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 pb-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
											children: item.label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-0.5 font-semibold",
											children: item.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm leading-5 text-muted-foreground",
											children: item.detail
										})
									]
								})]
							}, item.label);
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold tracking-tight",
						children: "Runtime Architecture"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-2.5",
						children: stack.map((item) => {
							const Icon = item.icon;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-2xl border bg-card p-4 shadow-card",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "size-10 rounded-xl bg-secondary text-primary grid place-items-center shrink-0",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-semibold",
											children: item.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm leading-5 text-muted-foreground",
											children: item.role
										})]
									})]
								})
							}, item.name);
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl border bg-card p-4 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-semibold tracking-tight",
							children: "Trust Boundary"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 text-sm leading-5 text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Patient context is approved before the live doctor visit. During the appointment, MedsBuddy only responds from approved patient information or doctor-stated care-plan details." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The backend stores approved visit memory and uses it for continuity when the doctor asks about prior visits or medication context." })]
					})]
				})
			]
		})
	});
}
//#endregion
export { ArchitecturePage as component };
