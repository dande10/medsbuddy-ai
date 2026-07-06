import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { l as stopSpeaking } from "./voice-CdDuvBHY.mjs";
import { t as useConnectivity } from "./connectivity-ClLUgQVv.mjs";
import { g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { E as House, F as CloudOff, I as Clock, P as Cloud, S as MessageCircle, _ as Pill, i as User, l as Siren, n as Wifi, s as Stethoscope, t as X } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-B3YczGC1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
var navItems = [
	{
		to: "/",
		icon: House,
		label: "Home"
	},
	{
		to: "/talk",
		icon: MessageCircle,
		label: "Talk"
	},
	{
		to: "/reminders",
		icon: Pill,
		label: "Meds"
	},
	{
		to: "/doctor",
		icon: Stethoscope,
		label: "Doctor"
	},
	{
		to: "/memory",
		icon: Clock,
		label: "Visits"
	},
	{
		to: "/emergency",
		icon: Siren,
		label: "SOS"
	}
];
function AppShell({ children, title, transparentHeader }) {
	const location = useLocation();
	const { online, offline, simulated, hydrated } = useConnectivity();
	const setSimulateOffline = useApp((s) => s.setSimulateOffline);
	const simulateOffline = useApp((s) => s.simulateOffline);
	const [showOfflineModal, setShowOfflineModal] = (0, import_react.useState)(false);
	const toggleOfflineDemo = () => {
		if (!simulateOffline) {
			setSimulateOffline(true);
			setShowOfflineModal(true);
		} else {
			setSimulateOffline(false);
			toast.success("Online mode restored", { description: "AI features are available again." });
		}
	};
	(0, import_react.useEffect)(() => {
		stopSpeaking();
	}, [location.pathname]);
	(0, import_react.useEffect)(() => {
		const onVis = () => {
			if (document.hidden) stopSpeaking();
		};
		const onUnload = () => stopSpeaking();
		document.addEventListener("visibilitychange", onVis);
		window.addEventListener("beforeunload", onUnload);
		window.addEventListener("pagehide", onUnload);
		return () => {
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("beforeunload", onUnload);
			window.removeEventListener("pagehide", onUnload);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background flex flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: `sticky top-0 z-30 ${transparentHeader ? "bg-transparent" : "bg-background/80 backdrop-blur-xl border-b border-border/60"}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto max-w-2xl px-5 py-3.5 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							className: "flex items-center gap-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative size-10 rounded-2xl overflow-hidden grid place-items-center shadow-elegant",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 gradient-hero" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "relative font-bold text-primary-foreground text-lg tracking-tight",
									children: "M"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "leading-tight",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-semibold text-[15px]",
									children: "MedsBuddy"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted-foreground -mt-0.5",
									children: "AI Patient Advocate"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIndicator, {
								online,
								simulated,
								hydrated,
								onClick: toggleOfflineDemo
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/profile",
								className: "size-10 rounded-full bg-card border grid place-items-center hover:bg-secondary transition-colors",
								"aria-label": "Profile",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "size-5 text-primary" })
							})]
						})]
					}),
					offline && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-primary/10 text-primary text-center text-[12.5px] font-medium py-2 px-4 border-y border-primary/20 flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "font-semibold",
							children: "Offline Mode Active"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-foreground/70 font-normal",
							children: [
								" ",
								"— Your health information remains available",
								simulated ? " (demo)" : "",
								"."
							]
						})] })]
					}),
					title && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto max-w-2xl px-5 pb-3 pt-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: title })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 mx-auto max-w-2xl w-full px-5 py-5 pb-28",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/60",
				style: { paddingBottom: "env(safe-area-inset-bottom)" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto max-w-2xl grid grid-cols-6",
					children: navItems.map((item) => {
						const Icon = item.icon;
						const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
						const isSos = item.to === "/emergency";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: item.to,
							className: "relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium",
							children: [
								active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									className: `size-[22px] transition-colors ${isSos && active ? "text-destructive" : active ? "text-primary" : "text-muted-foreground"}`,
									strokeWidth: active ? 2.4 : 2
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `${isSos && active ? "text-destructive" : active ? "text-primary" : "text-muted-foreground"}`,
									children: item.label
								})
							]
						}, item.to);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfflineInfoDialog, {
				open: showOfflineModal,
				onOpenChange: setShowOfflineModal
			})
		]
	});
}
function StatusIndicator({ online, simulated, hydrated, onClick }) {
	const state = !hydrated ? "connecting" : online ? "online" : "offline";
	const label = state === "online" ? "Online" : state === "offline" ? simulated ? "Offline (demo)" : "Offline Ready" : "Connecting";
	const Icon = state === "online" ? Cloud : state === "offline" ? CloudOff : Wifi;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${state === "online" ? "bg-success/10 text-success border-success/30" : state === "offline" ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`,
		title: `${label} — click to toggle Offline Demo Mode`,
		"aria-label": `Connection status: ${label}. Toggle Offline Demo Mode.`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-3.5" }), label]
	});
}
function OfflineInfoDialog({ open, onOpenChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudOff, { className: "size-6" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Offline Mode Active" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "MedsBuddy can still help with important health information even without internet." })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold text-foreground mb-1.5",
						children: "Available offline"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1",
						children: [
							"Emergency QR Code",
							"Doctor visit summaries",
							"Speak For Me",
							"Medication list",
							"Symptoms and health notes"
						].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2 text-foreground/80",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-success font-semibold",
									children: "✓"
								}),
								" ",
								x
							]
						}, x))
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold text-foreground mb-1.5",
						children: "Not available offline"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1",
						children: [
							"AI medical chat",
							"Tavily medical search",
							"Cloud sync",
							"Live caregiver updates"
						].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2 text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-destructive font-semibold",
									children: "✕"
								}),
								" ",
								x
							]
						}, x))
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => onOpenChange(false),
					className: "w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold",
					children: "Got it"
				}) })
			]
		})
	});
}
//#endregion
export { AppShell as t };
