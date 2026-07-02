export type AppRoute =
  | "/"
  | "/talk"
  | "/reminders"
  | "/doctor"
  | "/memory"
  | "/emergency"
  | "/caregiver"
  | "/profile";

export type NavigationAction =
  | "OPEN_CHART_HISTORY"
  | "OPEN_CHAT_HISTORY"
  | "OPEN_MEDICATION_HISTORY"
  | "OPEN_MEDICATIONS"
  | "OPEN_PROFILE"
  | "OPEN_EMERGENCY_PROFILE"
  | "OPEN_QR_CODE"
  | "OPEN_REMINDERS"
  | "OPEN_SETTINGS"
  | "GO_HOME"
  | "OPEN_CAREGIVER_SUMMARY"
  | "SCHEDULE_DOCTOR_VISIT";

export interface NavigationIntent {
  action: NavigationAction;
  screen: string;
  to: AppRoute;
  label: string;
  confidence: number;
  route: "Local Navigation";
  appAction?: "OPEN_CHAT_DRAWER";
}

const commandWords =
  /\b(open|show|view|go|navigate|take me|switch|move|pull up|bring up|display|launch|start|schedule)\b/i;

const navigationIntents: Array<{
  action: NavigationAction;
  screen: string;
  to: AppRoute;
  label: string;
  appAction?: NavigationIntent["appAction"];
  exact: RegExp[];
  fuzzy: RegExp[];
}> = [
  {
    action: "OPEN_CHART_HISTORY",
    screen: "ChartHistory",
    to: "/memory",
    label: "Chart History",
    exact: [
      /\b(open|show|view|pull up|bring up)\s+(my\s+)?(chart|health|medical)\s+(history|timeline|memory|record)s?\b/i,
      /\b(chart|health|medical)\s+(history|timeline|memory|record)s?\b/i,
    ],
    fuzzy: [/\b(history|timeline|memory|record)s?\b/i],
  },
  {
    action: "OPEN_CHAT_HISTORY",
    screen: "ChatHistory",
    to: "/talk",
    label: "Chat History",
    appAction: "OPEN_CHAT_DRAWER",
    exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(chat|conversation)\s+history\b/i],
    fuzzy: [/\b(chat|conversation)s?\b/i, /\bhistory\b/i],
  },
  {
    action: "OPEN_MEDICATION_HISTORY",
    screen: "MedicationHistory",
    to: "/reminders",
    label: "Medication History",
    exact: [
      /\b(open|show|view|pull up|bring up)\s+(my\s+)?(medication|medicine|med|pill)s?\s+(history|log|timeline)\b/i,
      /\b(medication|medicine|med|pill)s?\s+(history|log|timeline)\b/i,
    ],
    fuzzy: [/\b(medication|medicine|med|pill)s?\b/i, /\b(history|log|timeline)\b/i],
  },
  {
    action: "OPEN_MEDICATIONS",
    screen: "Medications",
    to: "/reminders",
    label: "Medications",
    exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?(medication|medicine|med|pill)s?\b/i],
    fuzzy: [/\b(medication|medicine|med|pill)s?\b/i],
  },
  {
    action: "OPEN_PROFILE",
    screen: "Profile",
    to: "/profile",
    label: "Profile",
    exact: [
      /\b(open|show|view|pull up|bring up)\s+(my\s+)?(profile|account|personal info|details)\b/i,
    ],
    fuzzy: [/\b(profile|account)\b/i],
  },
  {
    action: "OPEN_EMERGENCY_PROFILE",
    screen: "EmergencyProfile",
    to: "/emergency",
    label: "Emergency Profile",
    exact: [
      /\b(open|show|view|pull up|bring up)\s+(my\s+)?(emergency|medical)\s+(profile|info|information)\b/i,
      /\b(emergency|medical)\s+(profile|info|information)\b/i,
    ],
    fuzzy: [/\bemergency\b/i, /\b(profile|info|information)\b/i],
  },
  {
    action: "OPEN_QR_CODE",
    screen: "EmergencyQRCode",
    to: "/emergency",
    label: "QR Code",
    exact: [
      /\b(open|show|view|pull up|bring up|display)\s+(my\s+)?(qr|qr code|emergency qr|emergency card|sos card)\b/i,
      /\b(qr|qr code|emergency qr|emergency card|sos card)\b/i,
    ],
    fuzzy: [/\b(qr|code|card)\b/i, /\b(emergency|sos)\b/i],
  },
  {
    action: "OPEN_REMINDERS",
    screen: "Reminders",
    to: "/reminders",
    label: "Reminders",
    exact: [/\b(open|show|view|pull up|bring up)\s+(my\s+)?reminders?\b/i],
    fuzzy: [/\breminders?\b/i],
  },
  {
    action: "OPEN_SETTINGS",
    screen: "Settings",
    to: "/profile",
    label: "Settings",
    exact: [/\b(open|show|view|pull up|bring up)\s+(settings|preferences)\b/i],
    fuzzy: [/\b(settings|preferences)\b/i],
  },
  {
    action: "GO_HOME",
    screen: "Home",
    to: "/",
    label: "Home",
    exact: [
      /\b(go|navigate|take me|bring me|send me)\s+home\b/i,
      /\b(open|show)\s+(home|main|start)\b/i,
    ],
    fuzzy: [/\b(home|main|start)\b/i],
  },
  {
    action: "OPEN_CAREGIVER_SUMMARY",
    screen: "CaregiverSummary",
    to: "/caregiver",
    label: "Caregiver Summary",
    exact: [
      /\b(open|show|view|pull up|bring up)\s+(my\s+)?(caregiver|family)\s+(summary|dashboard|view)\b/i,
      /\b(caregiver|family)\s+(summary|dashboard|view)\b/i,
    ],
    fuzzy: [/\b(caregiver|family)\b/i, /\b(summary|dashboard|view)\b/i],
  },
  {
    action: "SCHEDULE_DOCTOR_VISIT",
    screen: "DoctorVisitScheduler",
    to: "/doctor",
    label: "Doctor Visit",
    exact: [
      /\b(schedule|book|plan|start|open)\s+(a\s+)?(doctor|physician|clinic)\s+(visit|appointment)\b/i,
      /\b(doctor|physician|clinic)\s+(visit|appointment)\b/i,
    ],
    fuzzy: [/\b(schedule|book|plan)\b/i, /\b(doctor|physician|clinic|appointment|visit)\b/i],
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreIntent(text: string, exact: RegExp[], fuzzy: RegExp[]) {
  if (exact.some((rx) => rx.test(text))) return 95;

  const matches = fuzzy.filter((rx) => rx.test(text)).length;
  if (matches === 0) return 0;

  const base = commandWords.test(text) ? 58 : 38;
  return Math.min(base + matches * 14, 79);
}

export function detectNavigationIntent(text: string): NavigationIntent | null {
  const t = normalize(text);
  if (!t) return null;

  const best = navigationIntents
    .map((intent) => ({
      ...intent,
      confidence: scoreIntent(t, intent.exact, intent.fuzzy),
    }))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!best || best.confidence === 0) return null;

  return {
    action: best.action,
    screen: best.screen,
    to: best.to,
    label: best.label,
    confidence: best.confidence,
    route: "Local Navigation",
    appAction: best.appAction,
  };
}

export function isHighConfidenceNavigation(
  intent: NavigationIntent | null,
): intent is NavigationIntent {
  return Boolean(intent && intent.confidence > 80);
}

export function logNavigationIntent(intent: NavigationIntent) {
  console.info(`Detected Intent: ${intent.action}`);
  console.info(`Confidence: ${intent.confidence}%`);
  console.info(`Route: ${intent.route}`);
}

export function detectNavigation(text: string): NavigationIntent | null {
  return detectNavigationIntent(text);
}
