import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { Volume2, Square, FileText } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor visit — MedsBuddy" },
      { name: "description", content: "Generate a doctor-ready summary and play it aloud." },
    ],
  }),
  component: Doctor,
});

function buildSummary(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms, appointments } = state;
  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
  const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
  const recentSymp = symptoms.filter((s) => s.at >= last7);
  const sympCounts: Record<string, number> = {};
  for (const s of recentSymp) sympCounts[s.name] = (sympCounts[s.name] ?? 0) + 1;

  const lines: string[] = [];
  lines.push(`Hello doctor. This is a summary for ${profile.name || "the patient"}.`);
  if (meds.length) {
    lines.push(`Current medications: ${meds.map((m) => `${m.name} ${m.dosage}`).join(", ")}.`);
  }
  lines.push(`Over the last 7 days, medication adherence is ${adh} percent, with ${taken} doses taken and ${missed} missed or skipped.`);
  if (recentSymp.length) {
    const parts = Object.entries(sympCounts).map(([n, c]) => `${n}${c > 1 ? ` ${c} times` : ""}`);
    lines.push(`Reported symptoms include ${parts.join(", ")}.`);
  } else {
    lines.push("No symptoms reported this week.");
  }
  if (profile.allergies) lines.push(`Allergies: ${profile.allergies}.`);
  if (profile.conditions) lines.push(`Conditions: ${profile.conditions}.`);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];
  if (upcoming) lines.push(`Upcoming visit with ${upcoming.doctor} on ${new Date(upcoming.at).toLocaleDateString()}.`);
  lines.push("I would like to discuss adherence, any new symptoms, and possible medication adjustments.");
  return lines.join(" ");
}

function Doctor() {
  const state = useApp();
  const summary = useMemo(() => buildSummary(state), [state]);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = async () => {
    setSpeaking(true);
    await speak(summary, () => setSpeaking(false));
  };
  const handleStop = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  return (
    <AppShell title="Doctor visit prep">
      <div className="rounded-3xl bg-card border p-5 mb-5">
        <div className="flex items-center gap-2 text-primary mb-3">
          <FileText className="size-5" />
          <span className="font-semibold">Your summary</span>
        </div>
        <p className="text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">{summary}</p>
      </div>

      {!speaking ? (
        <button
          onClick={handleSpeak}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
        >
          <Volume2 className="size-6" /> Speak for me
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="w-full rounded-2xl bg-destructive text-destructive-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 speaking-glow"
        >
          <Square className="size-6 fill-current" /> Stop speaking
        </button>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        This summary is generated locally on your device and works offline.
      </p>
    </AppShell>
  );
}