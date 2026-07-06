import { n as useApp } from "./store-xEuxQ6YF.js";
import { i as stopSpeaking, t as useConnectivity } from "./connectivity-CwnS1gGA.js";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Clock, Cloud, CloudOff, Home, MessageCircle, Pill, Siren, Stethoscope, User, Wifi, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
//#region src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/ui/dialog.tsx
var Dialog = DialogPrimitive.Root;
var DialogPortal = DialogPrimitive.Portal;
var DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Overlay, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
var DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [/* @__PURE__ */ jsx(DialogOverlay, {}), /* @__PURE__ */ jsxs(DialogPrimitive.Content, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ jsxs(DialogPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
var DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
//#endregion
//#region src/components/app-shell.tsx
var navItems = [
	{
		to: "/",
		icon: Home,
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
		label: "Memory"
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
	const [showOfflineModal, setShowOfflineModal] = useState(false);
	const toggleOfflineDemo = () => {
		if (!simulateOffline) {
			setSimulateOffline(true);
			setShowOfflineModal(true);
		} else {
			setSimulateOffline(false);
			toast.success("Online mode restored", { description: "AI features are available again." });
		}
	};
	useEffect(() => {
		stopSpeaking();
	}, [location.pathname]);
	useEffect(() => {
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
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-background flex flex-col",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: `sticky top-0 z-30 ${transparentHeader ? "bg-transparent" : "bg-background/80 backdrop-blur-xl border-b border-border/60"}`,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mx-auto max-w-2xl px-5 py-3.5 flex items-center justify-between",
						children: [/* @__PURE__ */ jsxs(Link, {
							to: "/",
							className: "flex items-center gap-2.5",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "relative size-10 rounded-2xl overflow-hidden grid place-items-center shadow-elegant",
								children: [/* @__PURE__ */ jsx("div", { className: "absolute inset-0 gradient-hero" }), /* @__PURE__ */ jsx("div", {
									className: "relative font-bold text-primary-foreground text-lg tracking-tight",
									children: "M"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "leading-tight",
								children: [/* @__PURE__ */ jsx("div", {
									className: "font-semibold text-[15px]",
									children: "MedsBuddy"
								}), /* @__PURE__ */ jsx("div", {
									className: "text-[11px] text-muted-foreground -mt-0.5",
									children: "AI Patient Advocate"
								})]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(StatusIndicator, {
								online,
								simulated,
								hydrated,
								onClick: toggleOfflineDemo
							}), /* @__PURE__ */ jsx(Link, {
								to: "/profile",
								className: "size-10 rounded-full bg-card border grid place-items-center hover:bg-secondary transition-colors",
								"aria-label": "Profile",
								children: /* @__PURE__ */ jsx(User, { className: "size-5 text-primary" })
							})]
						})]
					}),
					offline && /* @__PURE__ */ jsxs("div", {
						className: "bg-primary/10 text-primary text-center text-[12.5px] font-medium py-2 px-4 border-y border-primary/20 flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(CloudOff, { className: "size-4" }), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("strong", {
							className: "font-semibold",
							children: "Offline Mode Active"
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-foreground/70 font-normal",
							children: [
								" — Your health information remains available",
								simulated ? " (demo)" : "",
								"."
							]
						})] })]
					}),
					title && /* @__PURE__ */ jsx("div", {
						className: "mx-auto max-w-2xl px-5 pb-3 pt-1",
						children: /* @__PURE__ */ jsx("h1", { children: title })
					})
				]
			}),
			/* @__PURE__ */ jsx("main", {
				className: "flex-1 mx-auto max-w-2xl w-full px-5 py-5 pb-28",
				children
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/60",
				style: { paddingBottom: "env(safe-area-inset-bottom)" },
				children: /* @__PURE__ */ jsx("div", {
					className: "mx-auto max-w-2xl grid grid-cols-6",
					children: navItems.map((item) => {
						const Icon = item.icon;
						const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
						const isSos = item.to === "/emergency";
						return /* @__PURE__ */ jsxs(Link, {
							to: item.to,
							className: "relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium",
							children: [
								active && /* @__PURE__ */ jsx("span", { className: "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary" }),
								/* @__PURE__ */ jsx(Icon, {
									className: `size-[22px] transition-colors ${isSos && active ? "text-destructive" : active ? "text-primary" : "text-muted-foreground"}`,
									strokeWidth: active ? 2.4 : 2
								}),
								/* @__PURE__ */ jsx("span", {
									className: `${isSos && active ? "text-destructive" : active ? "text-primary" : "text-muted-foreground"}`,
									children: item.label
								})
							]
						}, item.to);
					})
				})
			}),
			/* @__PURE__ */ jsx(OfflineInfoDialog, {
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
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick,
		className: `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${state === "online" ? "bg-success/10 text-success border-success/30" : state === "offline" ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`,
		title: `${label} — click to toggle Offline Demo Mode`,
		"aria-label": `Connection status: ${label}. Toggle Offline Demo Mode.`,
		children: [/* @__PURE__ */ jsx(Icon, { className: "size-3.5" }), label]
	});
}
function OfflineInfoDialog({ open, onOpenChange }) {
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "max-w-md",
			children: [
				/* @__PURE__ */ jsxs(DialogHeader, { children: [
					/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-2",
						children: /* @__PURE__ */ jsx(CloudOff, { className: "size-6" })
					}),
					/* @__PURE__ */ jsx(DialogTitle, { children: "Offline Mode Active" }),
					/* @__PURE__ */ jsx(DialogDescription, { children: "MedsBuddy can still help with important health information even without internet." })
				] }),
				/* @__PURE__ */ jsxs("div", {
					className: "grid gap-4 text-sm",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-foreground mb-1.5",
						children: "Available offline"
					}), /* @__PURE__ */ jsx("ul", {
						className: "space-y-1",
						children: [
							"Emergency QR Code",
							"Doctor Summary",
							"Speak For Me",
							"Medication list",
							"Symptoms and health notes",
							"Health Memory timeline"
						].map((x) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-center gap-2 text-foreground/80",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "text-success font-semibold",
									children: "✓"
								}),
								" ",
								x
							]
						}, x))
					})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-foreground mb-1.5",
						children: "Not available offline"
					}), /* @__PURE__ */ jsx("ul", {
						className: "space-y-1",
						children: [
							"AI medical chat",
							"Tavily medical search",
							"Cloud sync",
							"Live caregiver updates"
						].map((x) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-center gap-2 text-muted-foreground",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "text-destructive font-semibold",
									children: "✕"
								}),
								" ",
								x
							]
						}, x))
					})] })]
				}),
				/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx("button", {
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
