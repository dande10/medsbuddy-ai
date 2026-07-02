import { describe, expect, it, vi } from "vitest";

import {
  detectNavigationIntent,
  isHighConfidenceNavigation,
  logNavigationIntent,
} from "@/lib/nav-commands";

describe("intent-based navigation routing", () => {
  it.each([
    ["open chart history", "OPEN_CHART_HISTORY", "ChartHistory"],
    ["show chat history", "OPEN_CHAT_HISTORY", "ChatHistory"],
    ["show my medications", "OPEN_MEDICATIONS", "Medications"],
    ["open medication history", "OPEN_MEDICATION_HISTORY", "MedicationHistory"],
    ["open profile", "OPEN_PROFILE", "Profile"],
    ["show emergency card", "OPEN_QR_CODE", "EmergencyQRCode"],
    ["open reminders", "OPEN_REMINDERS", "Reminders"],
    ["open settings", "OPEN_SETTINGS", "Settings"],
    ["take me home", "GO_HOME", "Home"],
    ["open caregiver summary", "OPEN_CAREGIVER_SUMMARY", "CaregiverSummary"],
    ["schedule doctor visit", "SCHEDULE_DOCTOR_VISIT", "DoctorVisitScheduler"],
  ])("routes '%s' locally", (phrase, action, screen) => {
    const intent = detectNavigationIntent(phrase);

    expect(isHighConfidenceNavigation(intent)).toBe(true);
    expect(intent).toMatchObject({
      action,
      screen,
      route: "Local Navigation",
    });
    expect(intent?.confidence).toBeGreaterThan(80);
  });

  it.each([
    "did I take my medicine today",
    "is dizziness a medication side effect",
    "my stomach hurts",
    "can you summarize this for my caregiver",
  ])("lets Qwen handle '%s'", (phrase) => {
    const intent = detectNavigationIntent(phrase);

    expect(isHighConfidenceNavigation(intent)).toBe(false);
  });

  it("logs the structured routing decision", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const intent = detectNavigationIntent("open chart history");

    expect(intent).not.toBeNull();
    logNavigationIntent(intent!);

    expect(info).toHaveBeenCalledWith("Detected Intent: OPEN_CHART_HISTORY");
    expect(info).toHaveBeenCalledWith("Confidence: 95%");
    expect(info).toHaveBeenCalledWith("Route: Local Navigation");

    info.mockRestore();
  });
});
