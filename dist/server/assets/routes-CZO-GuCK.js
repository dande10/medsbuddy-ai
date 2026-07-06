import { n as useApp, t as adherence } from "./store-xEuxQ6YF.js";
import { t as AppShell } from "./app-shell-ze7JTE56.js";
import { t as AiOrb } from "./ai-orb-CbPIJWSf.js";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Activity, AlertTriangle, Check, CheckCircle2, ChevronRight, CloudOff, FileText, Mic, Pill, Plus, QrCode, ShieldCheck, Siren, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
//#region src/routes/index.tsx?tsr-split=component
function Home() {
	const navigate = useNavigate();
	const { profile, doses, meds, symptoms, appointments } = useApp();
	const adh = adherence(doses, 7);
	const firstName = profile.name ? profile.name.split(" ")[0] : "";
	const last24 = Date.now() - 864e5;
	const dosesToday = doses.filter((d) => d.at >= last24);
	const sympToday = symptoms.filter((s) => s.at >= last24);
	const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];
	const profileReady = Boolean(profile.name && (meds.length || profile.allergies || profile.conditions));
	const [greeting, setGreeting] = useState("Hello");
	useEffect(() => {
		const h = (/* @__PURE__ */ new Date()).getHours();
		setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
	}, []);
	return /* @__PURE__ */ jsxs(AppShell, { children: [
		/* @__PURE__ */ jsxs(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			transition: { duration: .5 },
			className: "relative overflow-hidden rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsx("div", { className: "absolute -bottom-16 -left-12 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "relative flex items-start justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "text-[13px] opacity-80 font-medium",
								children: [greeting, firstName ? `, ${firstName}` : ""]
							}),
							/* @__PURE__ */ jsxs("h2", {
								className: "text-[26px] font-bold leading-tight mt-1 tracking-tight",
								children: [
									"Your AI Patient",
									/* @__PURE__ */ jsx("br", {}),
									"Advocate is here."
								]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-sm opacity-85 mt-2 max-w-[20rem]",
								children: "Ask anything about your health, meds, or visits — out loud or by typing."
							})
						]
					}), /* @__PURE__ */ jsx(AiOrb, { size: 88 })]
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: () => navigate({ to: "/talk" }),
					className: "relative mt-5 w-full rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur border border-white/25 px-5 py-3.5 flex items-center gap-3 transition-colors",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "size-10 rounded-full bg-white/95 grid place-items-center",
							children: /* @__PURE__ */ jsx(Mic, { className: "size-5 text-primary" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "text-left flex-1",
							children: [/* @__PURE__ */ jsx("div", {
								className: "font-semibold text-[15px]",
								children: "Tap to talk"
							}), /* @__PURE__ */ jsx("div", {
								className: "text-[12px] opacity-80",
								children: "\"Did I take my meds today?\""
							})]
						}),
						/* @__PURE__ */ jsx(ChevronRight, { className: "size-5 opacity-80" })
					]
				})
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-4 gap-2.5 mb-6",
			children: [
				/* @__PURE__ */ jsx(QuickAction, {
					to: "/talk",
					icon: Mic,
					label: "Ask"
				}),
				/* @__PURE__ */ jsx(QuickAction, {
					to: "/doctor",
					icon: FileText,
					label: "Speak",
					sub: "For me"
				}),
				/* @__PURE__ */ jsx(QuickAction, {
					to: "/emergency",
					icon: QrCode,
					label: "SOS",
					danger: true
				}),
				/* @__PURE__ */ jsx(QuickAction, {
					to: "/memory",
					icon: Plus,
					label: "Symptom"
				})
			]
		}),
		/* @__PURE__ */ jsxs(motion.div, {
			initial: {
				opacity: 0,
				y: 8
			},
			animate: {
				opacity: 1,
				y: 0
			},
			transition: { duration: .4 },
			className: "rounded-3xl border border-primary/25 bg-primary/[0.04] p-4 mb-5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3 mb-3",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0",
						children: /* @__PURE__ */ jsx(CloudOff, { className: "size-5" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold text-[15px] tracking-tight",
							children: "Offline Ready"
						}), /* @__PURE__ */ jsx("div", {
							className: "text-[12px] text-muted-foreground",
							children: "Works without internet — even in emergencies."
						})]
					}),
					/* @__PURE__ */ jsx("span", {
						className: "rounded-full bg-success/15 text-success text-[11px] font-semibold px-2.5 py-1",
						children: "Available"
					})
				]
			}), /* @__PURE__ */ jsx("ul", {
				className: "grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]",
				children: [
					"Doctor Summary",
					"Emergency QR",
					"Medications",
					"Symptoms",
					"Health Memory"
				].map((f) => /* @__PURE__ */ jsxs("li", {
					className: "inline-flex items-center gap-1.5 text-foreground/80",
					children: [/* @__PURE__ */ jsx(Check, { className: "size-3.5 text-primary shrink-0" }), f]
				}, f))
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "flex items-baseline justify-between mb-3",
			children: [/* @__PURE__ */ jsx("h2", { children: "Today's snapshot" }), /* @__PURE__ */ jsx("span", {
				className: "text-xs text-muted-foreground",
				children: (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, {
					weekday: "long",
					month: "short",
					day: "numeric"
				})
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-2 gap-3 mb-5",
			children: [
				/* @__PURE__ */ jsx(SnapshotCard, {
					to: "/reminders",
					icon: Pill,
					tint: "primary",
					label: "Medications",
					value: meds.length === 0 ? "Set up" : `${dosesToday.filter((d) => d.status === "taken").length}/${dosesToday.length || meds.length}`,
					sub: meds.length === 0 ? "Add your first med" : "Doses today"
				}),
				/* @__PURE__ */ jsx(SnapshotCard, {
					to: "/memory",
					icon: Activity,
					tint: "warning",
					label: "Symptoms",
					value: String(sympToday.length),
					sub: sympToday.length === 0 ? "Nothing logged" : "Logged in 24h"
				}),
				/* @__PURE__ */ jsx(SnapshotCard, {
					to: "/doctor",
					icon: Stethoscope,
					tint: "success",
					label: "Doctor visit",
					value: upcoming ? new Date(upcoming.at).toLocaleDateString(void 0, {
						month: "short",
						day: "numeric"
					}) : "Ready",
					sub: upcoming ? `with ${upcoming.doctor}` : "Generate summary"
				}),
				/* @__PURE__ */ jsx(SnapshotCard, {
					to: "/emergency",
					icon: profileReady ? ShieldCheck : AlertTriangle,
					tint: profileReady ? "success" : "danger",
					label: "Emergency",
					value: profileReady ? "Ready" : "Incomplete",
					sub: profileReady ? "QR ready to share" : "Add your profile"
				})
			]
		}),
		/* @__PURE__ */ jsxs(Link, {
			to: "/reminders",
			className: "block rounded-2xl border bg-card shadow-card p-4 mb-4 hover:bg-secondary/40 transition-colors",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between mb-2",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-sm font-medium",
						children: "7-day adherence"
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground",
						children: [doses.filter((d) => d.at > Date.now() - 7 * 864e5).length, " doses"]
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "h-2.5 rounded-full bg-secondary overflow-hidden",
					children: /* @__PURE__ */ jsx(motion.div, {
						initial: { width: 0 },
						animate: { width: `${adh}%` },
						transition: {
							duration: .8,
							ease: "easeOut"
						},
						className: "h-full rounded-full",
						style: { background: adh >= 80 ? "linear-gradient(90deg, var(--success), var(--primary-glow))" : adh >= 50 ? "linear-gradient(90deg, var(--warning), var(--primary-glow))" : "linear-gradient(90deg, var(--destructive), var(--warning))" }
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between mt-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "text-2xl font-bold tracking-tight",
						children: [adh, "%"]
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground inline-flex items-center gap-1",
						children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-3.5 text-success" }), " on track"]
					})]
				})
			]
		}),
		!profileReady && /* @__PURE__ */ jsxs(Link, {
			to: "/profile",
			className: "flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "size-10 rounded-xl bg-primary/15 grid place-items-center text-primary",
					children: /* @__PURE__ */ jsx(ShieldCheck, { className: "size-5" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-[15px]",
						children: "Complete your health profile"
					}), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "Used for AI replies, doctor summary, and emergency QR."
					})]
				}),
				/* @__PURE__ */ jsx(ChevronRight, { className: "size-5 text-primary" })
			]
		}),
		/* @__PURE__ */ jsxs(Link, {
			to: "/emergency",
			className: "flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-4",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "size-10 rounded-xl bg-destructive/10 grid place-items-center text-destructive sos-pulse",
					children: /* @__PURE__ */ jsx(Siren, { className: "size-5" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-[15px]",
						children: "Emergency QR"
					}), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "For paramedics & first responders — works offline"
					})]
				}),
				/* @__PURE__ */ jsx(ChevronRight, { className: "size-5 text-destructive" })
			]
		})
	] });
}
function QuickAction({ to, icon: Icon, label, sub, danger }) {
	return /* @__PURE__ */ jsxs(Link, {
		to,
		className: "group flex flex-col items-center justify-center rounded-2xl bg-card border shadow-card p-3 active:scale-95 transition-transform",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: `size-10 rounded-xl grid place-items-center mb-1.5 ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"} group-hover:scale-110 transition-transform`,
				children: /* @__PURE__ */ jsx(Icon, { className: "size-5" })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-[12px] font-semibold leading-tight",
				children: label
			}),
			sub && /* @__PURE__ */ jsx("div", {
				className: "text-[10px] text-muted-foreground leading-tight",
				children: sub
			})
		]
	});
}
function SnapshotCard({ to, icon: Icon, label, value, sub, tint }) {
	const tintClass = {
		primary: "bg-primary/10 text-primary",
		success: "bg-success/15 text-success",
		warning: "bg-warning/15 text-warning",
		danger: "bg-destructive/10 text-destructive"
	}[tint];
	return /* @__PURE__ */ jsxs(Link, {
		to,
		className: "rounded-2xl bg-card border shadow-card p-4 active:scale-[0.98] transition-transform",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: `size-9 rounded-xl grid place-items-center ${tintClass}`,
				children: /* @__PURE__ */ jsx(Icon, { className: "size-[18px]" })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-[12px] text-muted-foreground mt-3 font-medium",
				children: label
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-xl font-bold tracking-tight mt-0.5",
				children: value
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-[11px] text-muted-foreground mt-0.5 truncate",
				children: sub
			})
		]
	});
}
//#endregion
export { Home as component };
