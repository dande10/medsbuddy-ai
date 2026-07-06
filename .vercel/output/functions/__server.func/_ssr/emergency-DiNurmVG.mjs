import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as useApp } from "./store-CNkGaKo_.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { B as ChevronRight, C as Maximize2, M as Download, O as Heart, _ as Pill, d as Share2, h as Printer, j as Droplet, l as Siren, t as X, u as ShieldCheck, v as OctagonAlert, w as Lock } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./app-shell-B3YczGC1.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { t as require_lib } from "../_libs/qrcode.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/emergency-DiNurmVG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_lib = /* @__PURE__ */ __toESM(require_lib());
function Emergency() {
	const { profile, meds } = useApp();
	const [dataUrl, setDataUrl] = (0, import_react.useState)("");
	const [full, setFull] = (0, import_react.useState)(false);
	const [showContactInfo, setShowContactInfo] = (0, import_react.useState)(false);
	const age = (() => {
		if (!profile.dob) return "";
		const d = new Date(profile.dob);
		if (isNaN(d.getTime())) return "";
		const diff = Date.now() - d.getTime();
		return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1e3)));
	})();
	const maskPhone = (phone) => {
		const digits = phone.replace(/\D/g, "");
		if (digits.length < 4) return "••••";
		return `••• ••• ${digits.slice(-4)}`;
	};
	const payload = buildEmergencyContactCard({
		name: profile.name,
		age,
		bloodGroup: profile.bloodGroup,
		allergies: profile.allergies,
		conditions: profile.conditions,
		medications: meds.map((m) => `${m.name} ${m.dosage} (${m.frequency})`),
		primaryPhysician: profile.primaryPhysician,
		emergencyContacts: profile.emergencyContacts.map((c) => ({
			name: c.name,
			relation: c.relation,
			phone: c.phone
		}))
	});
	const emergencyCard = {
		name: profile.name || "Patient",
		age,
		bloodGroup: profile.bloodGroup || "Not recorded",
		allergies: profile.allergies || "None recorded",
		conditions: profile.conditions || "None recorded",
		medications: meds.map((m) => `${m.name} ${m.dosage}`).join(", ") || "None recorded"
	};
	(0, import_react.useEffect)(() => {
		import_lib.toDataURL(payload, {
			width: 600,
			margin: 1,
			errorCorrectionLevel: "M",
			color: {
				dark: "#0B1736",
				light: "#FFFFFF"
			}
		}).then(setDataUrl).catch(() => setDataUrl(""));
	}, [payload]);
	const createCardBlob = async () => {
		if (!dataUrl) return;
		return createEmergencyCardPng(dataUrl, emergencyCard);
	};
	const share = async () => {
		const blob = await createCardBlob();
		if (!blob) return;
		try {
			const file = new File([blob], "medsbuddy-emergency-card.png", { type: "image/png" });
			if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
				await navigator.share({
					files: [file],
					title: "MedsBuddy Emergency Card"
				});
				return;
			}
		} catch {}
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "medsbuddy-emergency-card.png";
		a.click();
		URL.revokeObjectURL(a.href);
	};
	const downloadCard = async () => {
		const blob = await createCardBlob();
		if (!blob) return;
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "medsbuddy-emergency-card.png";
		a.click();
		URL.revokeObjectURL(a.href);
	};
	const printCard = () => {
		window.print();
	};
	const ready = profile.name && (meds.length > 0 || profile.allergies || profile.conditions);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				opacity: 0,
				y: 10
			},
			animate: {
				opacity: 1,
				y: 0
			},
			className: "relative overflow-hidden rounded-[28px] gradient-emergency text-destructive-foreground p-6 shadow-elegant mb-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center sos-pulse",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Siren, { className: "size-6" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12px] opacity-90 font-medium",
						children: "For first responders"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-primary-foreground text-2xl",
						children: "Emergency Profile"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm opacity-95 mt-3",
					children: "Show this QR to paramedics, ER staff, or anyone helping. Works fully offline."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-[11px] font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-white" }), " Emergency Access Available Offline"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] opacity-90 mt-2 max-w-sm",
					children: "Emergency QR and health information remain available even without internet."
				})
			]
		}),
		!ready && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/profile",
			className: "flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 mb-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-10 rounded-xl bg-warning/20 text-warning grid place-items-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OctagonAlert, { className: "size-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-semibold text-[15px]",
						children: "Complete your health profile"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: "Add name, allergies, and meds for a complete QR."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-5 text-warning" })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .97,
				opacity: 0
			},
			animate: {
				scale: 1,
				opacity: 1
			},
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setFull(true),
				className: "block w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-2xl bg-white p-4 grid place-items-center",
					children: dataUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: dataUrl,
						alt: "Emergency QR",
						className: "w-full max-w-xs aspect-square"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "aspect-square w-full max-w-xs grid place-items-center text-muted-foreground",
						children: "Generating…"
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 mt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setFull(true),
						className: "rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize2, { className: "size-4" }), " Full screen"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: share,
						disabled: !dataUrl,
						className: "rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4" }), " Share"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: downloadCard,
						disabled: !dataUrl,
						className: "rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), " Save card"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: printCard,
						disabled: !dataUrl,
						className: "rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-4" }), " Print"]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			id: "sos-print-card",
			className: "hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sos-print-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sos-print-kicker",
						children: "MedsBuddy SOS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sos-print-title",
						children: "Emergency Card"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sos-print-name",
						children: emergencyCard.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sos-print-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Age" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: emergencyCard.age || "Not recorded" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Blood" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: emergencyCard.bloodGroup })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Allergies" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: emergencyCard.allergies })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Conditions" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: emergencyCard.conditions })] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sos-print-meds",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Medications" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: emergencyCard.medications })]
					})
				] }), dataUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: dataUrl,
					alt: "Emergency QR"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 mb-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "size-5 text-destructive" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-[15px] font-semibold",
						children: "Health Card"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xl font-bold tracking-tight",
					children: profile.name || "—"
				}),
				profile.dob && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm text-muted-foreground",
					children: ["DOB ", profile.dob]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3 mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						icon: Droplet,
						label: "Blood",
						value: profile.bloodGroup || "—",
						tint: "danger"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
						icon: OctagonAlert,
						label: "Allergies",
						value: profile.allergies || "None",
						tint: "warning"
					})]
				}),
				profile.conditions && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: "Conditions"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: profile.conditions
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 mb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, { className: "size-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-[15px] font-semibold",
					children: "Current medications"
				})]
			}), meds.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/reminders",
				className: "text-sm text-primary font-medium",
				children: "Add your medications →"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y",
				children: meds.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "py-2 flex justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-medium text-[14px]",
						children: [
							m.name,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground font-normal",
								children: m.dosage
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted-foreground",
						children: m.frequency
					})]
				}, m.id))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-3xl bg-card border shadow-card p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 mb-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-5 text-success" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-[15px] font-semibold",
						children: "Emergency contacts"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-auto text-[10px] font-semibold uppercase tracking-wide text-success bg-success/10 px-2 py-0.5 rounded-full",
						children: "Protected"
					})
				]
			}), profile.emergencyContacts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/profile",
				className: "text-sm text-primary font-medium",
				children: "Add contacts →"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: profile.emergencyContacts.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium text-[14px]",
							children: c.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted-foreground",
							children: c.relation
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "inline-flex items-center gap-1.5 text-muted-foreground font-mono text-sm tabular-nums",
							children: maskPhone(c.phone)
						})]
					}, i))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowContactInfo(true),
					className: "mt-3 w-full rounded-xl border border-primary/30 bg-primary/5 text-primary py-2.5 font-medium text-sm inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4" }), " Request Family Contact"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted-foreground mt-2 leading-relaxed",
					children: "Phone numbers are masked to protect families from scams. Only the last 4 digits are shown."
				})
			] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 flex gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OctagonAlert, { className: "size-5 text-warning flex-shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-[12px] text-foreground leading-relaxed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold mb-0.5",
					children: "Safety notice"
				}), "This emergency profile is for medical support only. Do not use it for financial requests or money transfers."]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: showContactInfo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			className: "fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm grid place-items-center p-4",
			onClick: () => setShowContactInfo(false),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					scale: .9,
					opacity: 0
				},
				animate: {
					scale: 1,
					opacity: 1
				},
				exit: {
					scale: .9,
					opacity: 0
				},
				onClick: (e) => e.stopPropagation(),
				className: "bg-card rounded-3xl p-6 max-w-sm w-full shadow-elegant",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-6" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-bold mb-2",
						children: "Contact details protected"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground leading-relaxed",
						children: "For privacy, full contact details are protected. Please contact emergency services or use verified caregiver access."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setShowContactInfo(false),
						className: "mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium",
						children: "Understood"
					})
				]
			})
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: full && dataUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			className: "fixed inset-0 z-50 bg-foreground/95 backdrop-blur-sm grid place-items-center p-4",
			onClick: () => setFull(false),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: { scale: .85 },
				animate: { scale: 1 },
				exit: { scale: .85 },
				className: "text-center max-w-md w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-3xl bg-white p-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: dataUrl,
							alt: "Emergency QR",
							className: "w-full aspect-square"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 text-primary-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xl font-bold",
								children: profile.name
							}),
							profile.bloodGroup && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm opacity-80",
								children: ["Blood: ", profile.bloodGroup]
							}),
							profile.allergies && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm mt-1 text-warning",
								children: ["⚠ ", profile.allergies]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "mt-4 size-12 rounded-full bg-white/15 text-primary-foreground grid place-items-center mx-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					})
				]
			})
		}) })
	] });
}
async function createEmergencyCardPng(qrDataUrl, details) {
	const canvas = document.createElement("canvas");
	canvas.width = 1050;
	canvas.height = 660;
	const ctx = canvas.getContext("2d");
	if (!ctx) return void 0;
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#dc2626";
	ctx.fillRect(0, 0, canvas.width, 86);
	ctx.fillStyle = "#ffffff";
	ctx.font = "700 34px system-ui, -apple-system, sans-serif";
	ctx.fillText("MedsBuddy SOS Emergency Card", 44, 56);
	ctx.fillStyle = "#0f172a";
	ctx.font = "700 42px system-ui, -apple-system, sans-serif";
	ctx.fillText(details.name, 44, 150);
	ctx.font = "600 22px system-ui, -apple-system, sans-serif";
	ctx.fillStyle = "#475569";
	ctx.fillText(`Age: ${details.age || "Not recorded"}`, 44, 194);
	ctx.fillText(`Blood: ${details.bloodGroup}`, 260, 194);
	drawLabel(ctx, "Allergies", details.allergies, 44, 258, 560);
	drawLabel(ctx, "Conditions", details.conditions, 44, 366, 560);
	drawLabel(ctx, "Medications", details.medications, 44, 474, 560);
	const qr = await loadImage(qrDataUrl);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(682, 132, 312, 312);
	ctx.drawImage(qr, 690, 140, 296, 296);
	ctx.fillStyle = "#0f172a";
	ctx.font = "700 24px system-ui, -apple-system, sans-serif";
	ctx.fillText("Scan for contact card", 700, 482);
	ctx.font = "500 18px system-ui, -apple-system, sans-serif";
	ctx.fillStyle = "#475569";
	wrapCanvasText(ctx, "For medical support only. Call emergency services first.", 700, 520, 280, 24);
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob ?? void 0), "image/png", .95);
	});
}
function drawLabel(ctx, label, value, x, y, maxWidth) {
	ctx.fillStyle = "#2563eb";
	ctx.font = "700 19px system-ui, -apple-system, sans-serif";
	ctx.fillText(label.toUpperCase(), x, y);
	ctx.fillStyle = "#0f172a";
	ctx.font = "500 24px system-ui, -apple-system, sans-serif";
	wrapCanvasText(ctx, value, x, y + 36, maxWidth, 30, 2);
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
	const words = text.split(/\s+/).filter(Boolean);
	let line = "";
	let lineCount = 0;
	for (const word of words) {
		const testLine = line ? `${line} ${word}` : word;
		if (ctx.measureText(testLine).width > maxWidth && line) {
			ctx.fillText(lineCount === maxLines - 1 ? `${line}...` : line, x, y);
			lineCount += 1;
			if (lineCount >= maxLines) return;
			line = word;
			y += lineHeight;
		} else line = testLine;
	}
	if (line && lineCount < maxLines) ctx.fillText(line, x, y);
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = reject;
		image.src = src;
	});
}
function buildEmergencyContactCard({ name, age, bloodGroup, allergies, conditions, medications, primaryPhysician, emergencyContacts }) {
	const displayName = name || "Patient";
	const note = [
		"MedsBuddy emergency profile",
		`Patient: ${displayName}`,
		age ? `Age: ${age}` : null,
		bloodGroup ? `Blood group: ${bloodGroup}` : null,
		`Allergies: ${allergies || "None recorded"}`,
		`Conditions: ${conditions || "None recorded"}`,
		`Medications: ${medications.length ? medications.join("; ") : "None recorded"}`,
		`Primary physician: ${primaryPhysician || "Not recorded"}`,
		emergencyContacts.length ? `Emergency contacts: ${emergencyContacts.map((contact) => [
			contact.name || "Contact",
			contact.relation ? `(${contact.relation})` : "",
			contact.phone || ""
		].filter(Boolean).join(" ")).join("; ")}` : "Emergency contacts: None recorded",
		"Instructions: Call local emergency services first. Use for medical support only.",
		"Do not use for financial requests or money transfers."
	].filter(Boolean).join("\n");
	return [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`FN:${escapeVCard(`MedsBuddy Emergency - ${displayName}`)}`,
		`N:${escapeVCard(displayName)};;;;`,
		"ORG:MedsBuddy",
		"TITLE:Emergency Medical Profile",
		...emergencyContacts.filter((contact) => contact.phone.trim()).flatMap((contact, index) => [`item${index + 1}.TEL;TYPE=CELL,VOICE:${escapeVCard(contact.phone)}`, `item${index + 1}.X-ABLabel:${escapeVCard([contact.name || "Emergency contact", contact.relation].filter(Boolean).join(" - "))}`]),
		`NOTE:${escapeVCard(note)}`,
		"END:VCARD"
	].join("\n");
}
function escapeVCard(value) {
	return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function Fact({ icon: Icon, label, value, tint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border bg-card p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `size-8 rounded-lg grid place-items-center ${tint === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] text-muted-foreground mt-2",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-semibold truncate",
				children: value
			})
		]
	});
}
//#endregion
export { Emergency as component };
