import { n as useApp, t as adherence } from "./store-CNkGaKo_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { K as Activity, R as CircleCheck, _ as Pill, z as CircleAlert } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/caregiver-Kt8I10rA.js
var import_jsx_runtime = require_jsx_runtime();
function Caregiver() {
	const { profile, doses, symptoms } = useApp();
	Date.now() - 24 * 864e5 / 24;
	const last24 = Date.now() - 864e5;
	const adh = adherence(doses, 7);
	const todayDoses = doses.filter((d) => d.at >= last24);
	const taken = todayDoses.filter((d) => d.status === "taken").length;
	const missed = todayDoses.filter((d) => d.status !== "taken").length;
	const recentSymp = symptoms.filter((s) => s.at >= last24);
	const summary = `${profile.name || "The patient"} completed ${adh}% of medications this week${recentSymp.length ? ` and reported ${recentSymp.length} symptom${recentSymp.length > 1 ? "s" : ""}` : ""}.`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Caregiver dashboard",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-3xl bg-primary text-primary-foreground p-5 mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm opacity-80",
					children: "Today's summary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-lg font-medium mt-1",
					children: summary
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 mb-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						icon: CircleCheck,
						label: "Doses taken (24h)",
						value: String(taken),
						tone: "good"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						icon: CircleAlert,
						label: "Missed (24h)",
						value: String(missed),
						tone: missed > 0 ? "bad" : "good"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						icon: Pill,
						label: "Adherence (7d)",
						value: `${adh}%`,
						tone: adh >= 80 ? "good" : "warn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						icon: Activity,
						label: "Symptoms (24h)",
						value: String(recentSymp.length)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-2",
				children: "Recent symptoms"
			}),
			recentSymp.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground",
				children: "No symptoms in last 24 hours."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: recentSymp.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-xl bg-card border p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium capitalize",
							children: s.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: new Date(s.at).toLocaleString()
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm text-muted-foreground",
						children: ["Severity ", s.severity]
					})]
				}, s.id))
			})
		]
	});
}
function Card({ icon: Icon, label, value, tone }) {
	const color = tone === "good" ? "text-primary" : tone === "warn" ? "text-accent-foreground" : tone === "bad" ? "text-destructive" : "text-foreground";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl bg-card border p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `size-5 ${color}` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground mt-2",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `text-2xl font-bold ${color}`,
				children: value
			})
		]
	});
}
//#endregion
export { Caregiver as component };
