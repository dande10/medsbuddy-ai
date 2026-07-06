import { n as useApp } from "./store-xEuxQ6YF.js";
import { t as AppShell } from "./app-shell-ze7JTE56.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CloudOff, Plus, Trash2 } from "lucide-react";
//#region src/routes/profile.tsx?tsr-split=component
function ProfilePage() {
	const { profile, setProfile, simulateOffline, setSimulateOffline } = useApp();
	const [draft, setDraft] = useState(profile);
	const [saved, setSaved] = useState(false);
	const upd = (k, v) => setDraft({
		...draft,
		[k]: v
	});
	const addContact = () => upd("emergencyContacts", [...draft.emergencyContacts, {
		name: "",
		phone: "",
		relation: ""
	}]);
	const removeContact = (i) => upd("emergencyContacts", draft.emergencyContacts.filter((_, idx) => idx !== i));
	const updateContact = (i, k, v) => upd("emergencyContacts", draft.emergencyContacts.map((c, idx) => idx === i ? {
		...c,
		[k]: v
	} : c));
	return /* @__PURE__ */ jsxs(AppShell, {
		title: "Your profile",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted-foreground mb-5",
				children: "This information is stored on your device and used for AI replies, the doctor summary, and the emergency QR."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border bg-card shadow-card p-4 mb-5 flex items-center gap-3",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: `size-10 rounded-xl grid place-items-center shrink-0 ${simulateOffline ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`,
						children: /* @__PURE__ */ jsx(CloudOff, { className: "size-5" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex-1 min-w-0",
						children: [/* @__PURE__ */ jsx("div", {
							className: "font-semibold text-[15px]",
							children: "Simulate Offline Mode"
						}), /* @__PURE__ */ jsx("div", {
							className: "text-[12px] text-muted-foreground",
							children: "Demo offline behavior without turning Wi-Fi off. Doctor Summary, QR, and local data keep working."
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						role: "switch",
						"aria-checked": simulateOffline,
						onClick: () => setSimulateOffline(!simulateOffline),
						className: `relative h-7 w-12 rounded-full transition-colors shrink-0 ${simulateOffline ? "bg-primary" : "bg-secondary border"}`,
						children: /* @__PURE__ */ jsx("span", { className: `absolute top-0.5 left-0.5 size-6 rounded-full bg-background shadow transition-transform ${simulateOffline ? "translate-x-5" : "translate-x-0"}` })
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsx(F, {
						label: "Full name",
						children: /* @__PURE__ */ jsx(I, {
							value: draft.name,
							onChange: (v) => upd("name", v),
							placeholder: "Jane Doe"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ jsx(F, {
							label: "Date of birth",
							children: /* @__PURE__ */ jsx(I, {
								type: "date",
								value: draft.dob,
								onChange: (v) => upd("dob", v)
							})
						}), /* @__PURE__ */ jsx(F, {
							label: "Blood group",
							children: /* @__PURE__ */ jsx(I, {
								value: draft.bloodGroup,
								onChange: (v) => upd("bloodGroup", v),
								placeholder: "O+"
							})
						})]
					}),
					/* @__PURE__ */ jsx(F, {
						label: "Allergies",
						children: /* @__PURE__ */ jsx(I, {
							value: draft.allergies,
							onChange: (v) => upd("allergies", v),
							placeholder: "Penicillin, peanuts…"
						})
					}),
					/* @__PURE__ */ jsx(F, {
						label: "Medical conditions",
						children: /* @__PURE__ */ jsx(I, {
							value: draft.conditions,
							onChange: (v) => upd("conditions", v),
							placeholder: "Hypertension, diabetes…"
						})
					}),
					/* @__PURE__ */ jsx(F, {
						label: "Primary physician",
						children: /* @__PURE__ */ jsx(I, {
							value: draft.primaryPhysician,
							onChange: (v) => upd("primaryPhysician", v),
							placeholder: "Dr. Smith — 555-1234"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "pt-2",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between mb-2",
								children: [/* @__PURE__ */ jsx("h2", { children: "Emergency contacts" }), /* @__PURE__ */ jsxs("button", {
									onClick: addContact,
									className: "inline-flex items-center gap-1 text-sm text-primary font-medium",
									children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), " Add"]
								})]
							}),
							draft.emergencyContacts.length === 0 && /* @__PURE__ */ jsx("div", {
								className: "text-sm text-muted-foreground",
								children: "No contacts yet."
							}),
							/* @__PURE__ */ jsx("div", {
								className: "space-y-3",
								children: draft.emergencyContacts.map((c, i) => /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl bg-card border p-3 space-y-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ jsx(I, {
											value: c.name,
											onChange: (v) => updateContact(i, "name", v),
											placeholder: "Name"
										}), /* @__PURE__ */ jsx(I, {
											value: c.relation,
											onChange: (v) => updateContact(i, "relation", v),
											placeholder: "Relation"
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ jsx(I, {
											value: c.phone,
											onChange: (v) => updateContact(i, "phone", v),
											placeholder: "Phone"
										}), /* @__PURE__ */ jsx("button", {
											onClick: () => removeContact(i),
											className: "size-10 rounded-xl bg-secondary text-secondary-foreground grid place-items-center",
											"aria-label": "Remove",
											children: /* @__PURE__ */ jsx(Trash2, { className: "size-4" })
										})]
									})]
								}, i))
							})
						]
					}),
					/* @__PURE__ */ jsx("button", {
						onClick: () => {
							setProfile(draft);
							setSaved(true);
							setTimeout(() => setSaved(false), 1500);
						},
						className: "w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold mt-4",
						children: saved ? "Saved ✓" : "Save profile"
					})
				]
			})
		]
	});
}
function F({ label, children }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "block",
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-sm font-medium",
			children: label
		}), /* @__PURE__ */ jsx("div", {
			className: "mt-1",
			children
		})]
	});
}
function I({ value, onChange, placeholder, type = "text" }) {
	return /* @__PURE__ */ jsx("input", {
		type,
		value,
		onChange: (e) => onChange(e.target.value),
		placeholder,
		className: "w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
	});
}
//#endregion
export { ProfilePage as component };
