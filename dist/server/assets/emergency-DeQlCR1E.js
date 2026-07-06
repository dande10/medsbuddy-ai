import { n as useApp } from "./store-xEuxQ6YF.js";
import { t as AppShell } from "./app-shell-ze7JTE56.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { AlertOctagon, ChevronRight, Droplet, Heart, Lock, Maximize2, Pill, Share2, ShieldCheck, Siren, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
//#region src/routes/emergency.tsx?tsr-split=component
function Emergency() {
	const { profile, meds } = useApp();
	const [dataUrl, setDataUrl] = useState("");
	const [full, setFull] = useState(false);
	const [showContactInfo, setShowContactInfo] = useState(false);
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
	const payload = JSON.stringify({
		type: "MedsBuddyEmergencyProfile",
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
			phoneMasked: maskPhone(c.phone)
		})),
		instructions: "Call local emergency services. Contact primary physician. Do NOT honor any financial requests using this profile.",
		disclaimer: "Medical support only. Not to be used for financial requests."
	});
	useEffect(() => {
		QRCode.toDataURL(payload, {
			width: 600,
			margin: 1,
			errorCorrectionLevel: "M",
			color: {
				dark: "#0B1736",
				light: "#FFFFFF"
			}
		}).then(setDataUrl).catch(() => setDataUrl(""));
	}, [payload]);
	const share = async () => {
		if (!dataUrl) return;
		try {
			const blob = await (await fetch(dataUrl)).blob();
			const file = new File([blob], "emergency-qr.png", { type: "image/png" });
			if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
				await navigator.share({
					files: [file],
					title: "Emergency Profile"
				});
				return;
			}
		} catch {}
		const a = document.createElement("a");
		a.href = dataUrl;
		a.download = "emergency-qr.png";
		a.click();
	};
	const ready = profile.name && (meds.length > 0 || profile.allergies || profile.conditions);
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
			className: "relative overflow-hidden rounded-[28px] gradient-emergency text-destructive-foreground p-6 shadow-elegant mb-5",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center sos-pulse",
						children: /* @__PURE__ */ jsx(Siren, { className: "size-6" })
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
						className: "text-[12px] opacity-90 font-medium",
						children: "For first responders"
					}), /* @__PURE__ */ jsx("h1", {
						className: "text-primary-foreground text-2xl",
						children: "Emergency Profile"
					})] })]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm opacity-95 mt-3",
					children: "Show this QR to paramedics, ER staff, or anyone helping. Works fully offline."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-[11px] font-semibold",
					children: [/* @__PURE__ */ jsx("span", { className: "size-1.5 rounded-full bg-white" }), " Emergency Access Available Offline"]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-[12px] opacity-90 mt-2 max-w-sm",
					children: "Emergency QR and health information remain available even without internet."
				})
			]
		}),
		!ready && /* @__PURE__ */ jsxs(Link, {
			to: "/profile",
			className: "flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 mb-4",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "size-10 rounded-xl bg-warning/20 text-warning grid place-items-center",
					children: /* @__PURE__ */ jsx(AlertOctagon, { className: "size-5" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex-1",
					children: [/* @__PURE__ */ jsx("div", {
						className: "font-semibold text-[15px]",
						children: "Complete your health profile"
					}), /* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "Add name, allergies, and meds for a complete QR."
					})]
				}),
				/* @__PURE__ */ jsx(ChevronRight, { className: "size-5 text-warning" })
			]
		}),
		/* @__PURE__ */ jsxs(motion.div, {
			initial: {
				scale: .97,
				opacity: 0
			},
			animate: {
				scale: 1,
				opacity: 1
			},
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [/* @__PURE__ */ jsx("button", {
				onClick: () => setFull(true),
				className: "block w-full",
				children: /* @__PURE__ */ jsx("div", {
					className: "rounded-2xl bg-white p-4 grid place-items-center",
					children: dataUrl ? /* @__PURE__ */ jsx("img", {
						src: dataUrl,
						alt: "Emergency QR",
						className: "w-full max-w-xs aspect-square"
					}) : /* @__PURE__ */ jsx("div", {
						className: "aspect-square w-full max-w-xs grid place-items-center text-muted-foreground",
						children: "Generating…"
					})
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-2 gap-2 mt-3",
				children: [/* @__PURE__ */ jsxs("button", {
					onClick: () => setFull(true),
					className: "rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(Maximize2, { className: "size-4" }), " Full screen"]
				}), /* @__PURE__ */ jsxs("button", {
					onClick: share,
					disabled: !dataUrl,
					className: "rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50",
					children: [/* @__PURE__ */ jsx(Share2, { className: "size-4" }), " Share"]
				})]
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 mb-3",
					children: [/* @__PURE__ */ jsx(Heart, { className: "size-5 text-destructive" }), /* @__PURE__ */ jsx("h2", {
						className: "text-[15px] font-semibold",
						children: "Health Card"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "text-xl font-bold tracking-tight",
					children: profile.name || "—"
				}),
				profile.dob && /* @__PURE__ */ jsxs("div", {
					className: "text-sm text-muted-foreground",
					children: ["DOB ", profile.dob]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-3 mt-4",
					children: [/* @__PURE__ */ jsx(Fact, {
						icon: Droplet,
						label: "Blood",
						value: profile.bloodGroup || "—",
						tint: "danger"
					}), /* @__PURE__ */ jsx(Fact, {
						icon: AlertOctagon,
						label: "Allergies",
						value: profile.allergies || "None",
						tint: "warning"
					})]
				}),
				profile.conditions && /* @__PURE__ */ jsxs("div", {
					className: "mt-3",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-xs text-muted-foreground",
						children: "Conditions"
					}), /* @__PURE__ */ jsx("div", {
						className: "text-sm font-medium",
						children: profile.conditions
					})]
				})
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "rounded-3xl bg-card border shadow-card p-5 mb-4",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 mb-3",
				children: [/* @__PURE__ */ jsx(Pill, { className: "size-5 text-primary" }), /* @__PURE__ */ jsx("h2", {
					className: "text-[15px] font-semibold",
					children: "Current medications"
				})]
			}), meds.length === 0 ? /* @__PURE__ */ jsx(Link, {
				to: "/reminders",
				className: "text-sm text-primary font-medium",
				children: "Add your medications →"
			}) : /* @__PURE__ */ jsx("ul", {
				className: "divide-y",
				children: meds.map((m) => /* @__PURE__ */ jsxs("li", {
					className: "py-2 flex justify-between",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "font-medium text-[14px]",
						children: [
							m.name,
							" ",
							/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground font-normal",
								children: m.dosage
							})
						]
					}), /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted-foreground",
						children: m.frequency
					})]
				}, m.id))
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "rounded-3xl bg-card border shadow-card p-5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 mb-3",
				children: [
					/* @__PURE__ */ jsx(Lock, { className: "size-5 text-success" }),
					/* @__PURE__ */ jsx("h2", {
						className: "text-[15px] font-semibold",
						children: "Emergency contacts"
					}),
					/* @__PURE__ */ jsx("span", {
						className: "ml-auto text-[10px] font-semibold uppercase tracking-wide text-success bg-success/10 px-2 py-0.5 rounded-full",
						children: "Protected"
					})
				]
			}), profile.emergencyContacts.length === 0 ? /* @__PURE__ */ jsx(Link, {
				to: "/profile",
				className: "text-sm text-primary font-medium",
				children: "Add contacts →"
			}) : /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("div", {
					className: "space-y-2",
					children: profile.emergencyContacts.map((c, i) => /* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
							className: "font-medium text-[14px]",
							children: c.name
						}), /* @__PURE__ */ jsx("div", {
							className: "text-[11px] text-muted-foreground",
							children: c.relation
						})] }), /* @__PURE__ */ jsx("div", {
							className: "inline-flex items-center gap-1.5 text-muted-foreground font-mono text-sm tabular-nums",
							children: maskPhone(c.phone)
						})]
					}, i))
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: () => setShowContactInfo(true),
					className: "mt-3 w-full rounded-xl border border-primary/30 bg-primary/5 text-primary py-2.5 font-medium text-sm inline-flex items-center justify-center gap-2",
					children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-4" }), " Request Family Contact"]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-[11px] text-muted-foreground mt-2 leading-relaxed",
					children: "Phone numbers are masked to protect families from scams. Only the last 4 digits are shown."
				})
			] })]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 flex gap-3",
			children: [/* @__PURE__ */ jsx(AlertOctagon, { className: "size-5 text-warning flex-shrink-0 mt-0.5" }), /* @__PURE__ */ jsxs("div", {
				className: "text-[12px] text-foreground leading-relaxed",
				children: [/* @__PURE__ */ jsx("div", {
					className: "font-semibold mb-0.5",
					children: "Safety notice"
				}), "This emergency profile is for medical support only. Do not use it for financial requests or money transfers."]
			})]
		}),
		/* @__PURE__ */ jsx(AnimatePresence, { children: showContactInfo && /* @__PURE__ */ jsx(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			className: "fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm grid place-items-center p-4",
			onClick: () => setShowContactInfo(false),
			children: /* @__PURE__ */ jsxs(motion.div, {
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
					/* @__PURE__ */ jsx("div", {
						className: "size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3",
						children: /* @__PURE__ */ jsx(ShieldCheck, { className: "size-6" })
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-bold mb-2",
						children: "Contact details protected"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground leading-relaxed",
						children: "For privacy, full contact details are protected. Please contact emergency services or use verified caregiver access."
					}),
					/* @__PURE__ */ jsx("button", {
						onClick: () => setShowContactInfo(false),
						className: "mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium",
						children: "Understood"
					})
				]
			})
		}) }),
		/* @__PURE__ */ jsx(AnimatePresence, { children: full && dataUrl && /* @__PURE__ */ jsx(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			className: "fixed inset-0 z-50 bg-foreground/95 backdrop-blur-sm grid place-items-center p-4",
			onClick: () => setFull(false),
			children: /* @__PURE__ */ jsxs(motion.div, {
				initial: { scale: .85 },
				animate: { scale: 1 },
				exit: { scale: .85 },
				className: "text-center max-w-md w-full",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "rounded-3xl bg-white p-5",
						children: /* @__PURE__ */ jsx("img", {
							src: dataUrl,
							alt: "Emergency QR",
							className: "w-full aspect-square"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4 text-primary-foreground",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "text-xl font-bold",
								children: profile.name
							}),
							profile.bloodGroup && /* @__PURE__ */ jsxs("div", {
								className: "text-sm opacity-80",
								children: ["Blood: ", profile.bloodGroup]
							}),
							profile.allergies && /* @__PURE__ */ jsxs("div", {
								className: "text-sm mt-1 text-warning",
								children: ["⚠ ", profile.allergies]
							})
						]
					}),
					/* @__PURE__ */ jsx("button", {
						className: "mt-4 size-12 rounded-full bg-white/15 text-primary-foreground grid place-items-center mx-auto",
						children: /* @__PURE__ */ jsx(X, { className: "size-5" })
					})
				]
			})
		}) })
	] });
}
function Fact({ icon: Icon, label, value, tint }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-xl border bg-card p-3",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: `size-8 rounded-lg grid place-items-center ${tint === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"}`,
				children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-[11px] text-muted-foreground mt-2",
				children: label
			}),
			/* @__PURE__ */ jsx("div", {
				className: "text-sm font-semibold truncate",
				children: value
			})
		]
	});
}
//#endregion
export { Emergency as component };
