import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { Activity, Pill, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/caregiver")({
  head: () => ({
    meta: [
      { title: "Caregiver — MedsBuddy" },
      { name: "description", content: "Daily summary for family and caregivers." },
    ],
  }),
  component: Caregiver,
});

function Caregiver() {
  const { profile, doses, symptoms } = useApp();
  const day = Date.now() - 24 * 86400000 / 24;
  const last24 = Date.now() - 86400000;
  const adh = adherence(doses, 7);
  const todayDoses = doses.filter((d) => d.at >= last24);
  const taken = todayDoses.filter((d) => d.status === "taken").length;
  const missed = todayDoses.filter((d) => d.status !== "taken").length;
  const recentSymp = symptoms.filter((s) => s.at >= last24);

  const summary = `${profile.name || "The patient"} completed ${adh}% of medications this week${recentSymp.length ? ` and reported ${recentSymp.length} symptom${recentSymp.length > 1 ? "s" : ""}` : ""}.`;

  void day;

  return (
    <AppShell title="Caregiver dashboard">
      <div className="rounded-3xl bg-primary text-primary-foreground p-5 mb-5">
        <div className="text-sm opacity-80">Today's summary</div>
        <div className="text-lg font-medium mt-1">{summary}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card icon={CheckCircle2} label="Doses taken (24h)" value={String(taken)} tone="good" />
        <Card icon={AlertCircle} label="Missed (24h)" value={String(missed)} tone={missed > 0 ? "bad" : "good"} />
        <Card icon={Pill} label="Adherence (7d)" value={`${adh}%`} tone={adh >= 80 ? "good" : "warn"} />
        <Card icon={Activity} label="Symptoms (24h)" value={String(recentSymp.length)} />
      </div>

      <h2 className="mb-2">Recent symptoms</h2>
      {recentSymp.length === 0 ? (
        <div className="text-sm text-muted-foreground">No symptoms in last 24 hours.</div>
      ) : (
        <ul className="space-y-2">
          {recentSymp.map((s) => (
            <li key={s.id} className="rounded-xl bg-card border p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-medium capitalize">{s.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.at).toLocaleString()}</div>
              </div>
              <div className="text-sm text-muted-foreground">Severity {s.severity}</div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Card({ icon: Icon, label, value, tone }: { icon: typeof Pill; label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-primary" : tone === "warn" ? "text-accent-foreground" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl bg-card border p-4">
      <Icon className={`size-5 ${color}`} />
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}