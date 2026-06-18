import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { Volume2, Square, Stethoscope, Pill, Activity, Calendar, MessageSquareQuote, Plus, ShieldCheck, FileText, Pencil, Check, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor visit — MedsBuddy" },
      { name: "description", content: "Premium clinical briefing for your next doctor visit." },
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
  if (meds.length) lines.push(`Current medications: ${meds.map((m) => `${m.name} ${m.dosage}`).join(", ")}.`);
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
  const { profile, meds, doses, symptoms, appointments, addSummary } = state;
  const generated = useMemo(() => buildSummary(state), [state]);
  const [speaking, setSpeaking] = useState(false);
  const [draft, setDraft] = useState(generated);
  const [approved, setApproved] = useState(false);

  // If the underlying data changes and the user hasn't approved yet, refresh draft.
  useEffect(() => {
    if (!approved) setDraft(generated);
  }, [generated, approved]);

  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const recentSymp = symptoms.filter((s) => s.at >= last7);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];

  const questions = [
    "Could any of my medications be causing my symptoms?",
    "Should I adjust the timing or dosage of my meds?",
    "Are there interactions I should know about?",
    "What new tests or screenings do you recommend?",
  ];

  const handleSpeak = async () => {
    setSpeaking(true);
    await speak(draft, () => setSpeaking(false));
  };
  const handleStop = () => { stopSpeaking(); setSpeaking(false); };

  const handleApprove = () => {
    const text = draft.trim();
    if (!text) return;
    addSummary(text);
    setApproved(true);
  };
  const handleEditAgain = () => {
    stopSpeaking();
    setSpeaking(false);
    setApproved(false);
  };

  const empty = !profile.name && meds.length === 0 && symptoms.length === 0;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Stethoscope className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-80 font-medium">Clinical briefing</div>
            <h1 className="text-primary-foreground text-2xl">Doctor visit prep</h1>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-3">A summary you can read or play aloud at your appointment — generated from your own data, offline-ready.</p>
      </motion.div>

      {empty ? (
        <EmptyState
          title="Let's prepare your first briefing"
          body="Add a medication and log a symptom or two — MedsBuddy will craft a clinical-grade summary for your next visit."
        />
      ) : (
        <>
          <ReviewBanner approved={approved} />

          <Section icon={FileText} title="Your summary — review before sharing" tint="primary">
            {!approved ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Editable doctor summary"
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Edit freely — add notes, remove anything you don't want shared. MedsBuddy will only speak what you approve.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={!draft.trim()}
                  className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="size-5" /> Approve summary
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-success/10 border border-success/30 p-3 text-[14px] leading-relaxed whitespace-pre-wrap">
                  {draft}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-success font-medium">
                  <ShieldCheck className="size-3.5" /> Approved & saved to your Memory timeline
                </div>
                <button
                  onClick={handleEditAgain}
                  className="mt-3 w-full rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2"
                >
                  <Pencil className="size-4" /> Edit again
                </button>
              </>
            )}
          </Section>

          <Section icon={Pill} title="Medications & adherence" tint="primary">
            <div className="text-3xl font-bold tracking-tight">{adh}%</div>
            <div className="text-xs text-muted-foreground mb-3">7-day adherence</div>
            {meds.length === 0 ? (
              <div className="text-sm text-muted-foreground">No medications listed.</div>
            ) : (
              <ul className="space-y-1.5 text-[14px]">
                {meds.map((m) => (
                  <li key={m.id} className="flex justify-between border-t pt-1.5 first:border-0 first:pt-0">
                    <span className="font-medium">{m.name} <span className="text-muted-foreground font-normal">{m.dosage}</span></span>
                    <span className="text-muted-foreground text-xs">{m.frequency}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Activity} title="Recent symptoms" tint="warning">
            {recentSymp.length === 0 ? (
              <div className="text-sm text-muted-foreground">None reported this week.</div>
            ) : (
              <ul className="space-y-1.5 text-[14px]">
                {recentSymp.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex justify-between border-t pt-1.5 first:border-0 first:pt-0">
                    <span className="capitalize font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(s.at).toLocaleDateString()} · severity {s.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Calendar} title="Appointments" tint="success">
            {upcoming ? (
              <div>
                <div className="font-medium text-[15px]">{upcoming.doctor}</div>
                <div className="text-sm text-muted-foreground">{new Date(upcoming.at).toLocaleString()}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming visits.</div>
            )}
          </Section>

          <Section icon={MessageSquareQuote} title="Questions to ask your doctor" tint="primary">
            <ul className="space-y-2 text-[14px]">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary font-bold">{i + 1}.</span><span>{q}</span></li>
              ))}
            </ul>
          </Section>
        </>
      )}

      <div className="sticky bottom-24 mt-5">
        {!approved ? (
          <div className="w-full rounded-2xl bg-card border border-dashed border-border py-4 px-4 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            Approve your summary above to enable Speak for me
          </div>
        ) : !speaking ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSpeak}
            className="w-full rounded-2xl gradient-hero text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant"
          >
            <Volume2 className="size-6" /> Speak for me
          </motion.button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full rounded-2xl bg-destructive text-destructive-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-3 sos-pulse"
          >
            <Square className="size-5 fill-current" /> Stop speaking
          </button>
        )}
        <p className="text-[11px] text-muted-foreground text-center mt-2">Generated on your device · works offline</p>
      </div>
    </AppShell>
  );
}

function ReviewBanner({ approved }: { approved: boolean }) {
  if (approved) {
    return (
      <div className="rounded-2xl bg-success/10 border border-success/30 p-3 mb-3 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-success/20 text-success grid place-items-center shrink-0">
          <ShieldCheck className="size-4" />
        </div>
        <div className="text-sm">
          <div className="font-semibold text-success">Summary approved</div>
          <div className="text-muted-foreground text-[13px]">MedsBuddy will only read the version you approved aloud.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-warning/10 border border-warning/30 p-3 mb-3 flex items-start gap-3">
      <div className="size-8 rounded-lg bg-warning/20 text-warning grid place-items-center shrink-0">
        <AlertTriangle className="size-4" />
      </div>
      <div className="text-sm">
        <div className="font-semibold text-warning">Please review your summary before sharing.</div>
        <div className="text-muted-foreground text-[13px]">You are in control — MedsBuddy never speaks on your behalf without approval.</div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, tint, children }: { icon: typeof Pill; title: string; tint: "primary" | "success" | "warning"; children: React.ReactNode }) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[tint];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border shadow-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-8 rounded-lg grid place-items-center ${tintClass}`}><Icon className="size-4" /></div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center">
      <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3"><Plus className="size-6" /></div>
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
      <div className="flex gap-2 justify-center mt-4">
        <Link to="/reminders" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">Add medication</Link>
        <Link to="/profile" className="rounded-full bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium">Complete profile</Link>
      </div>
    </div>
  );
}
