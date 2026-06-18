export type AppRoute = "/" | "/talk" | "/reminders" | "/doctor" | "/memory" | "/emergency" | "/caregiver" | "/profile";

const patterns: { rx: RegExp; to: AppRoute; label: string }[] = [
  { rx: /\b(go|navigate|take me)?\s*(home|main|start)\b/i, to: "/", label: "Home" },
  { rx: /\b(open|show|go to)?\s*(talk|chat|assistant|advocate)\b/i, to: "/talk", label: "Talk" },
  { rx: /\b(open|show|view)?\s*(reminders?|medications?|meds|pills?)\b/i, to: "/reminders", label: "Reminders" },
  { rx: /\b(open|show|go to)?\s*(doctor|physician|appointment|visit prep|summary)\b/i, to: "/doctor", label: "Doctor" },
  { rx: /\b(open|show|view)?\s*(memory|timeline|history)\b/i, to: "/memory", label: "Memory" },
  { rx: /\b(open|show)?\s*(emergency|qr|sos|help)\b/i, to: "/emergency", label: "Emergency" },
  { rx: /\b(open|show)?\s*(caregiver|family|dashboard)\b/i, to: "/caregiver", label: "Caregiver" },
  { rx: /\b(open|show)?\s*(profile|account|me)\b/i, to: "/profile", label: "Profile" },
];

export function detectNavigation(text: string): { to: AppRoute; label: string } | null {
  const t = text.toLowerCase().trim();
  if (!/^(open|show|go|navigate|take me|switch|move)/i.test(t) && !/\bpage\b/.test(t)) return null;
  for (const p of patterns) {
    if (p.rx.test(t)) return { to: p.to, label: p.label };
  }
  return null;
}