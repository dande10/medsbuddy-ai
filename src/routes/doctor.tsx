import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence, type VisitRecord } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { Volume2, Square, Stethoscope, Pill, Activity, Calendar, MessageSquareQuote, Plus, ShieldCheck, FileText, Pencil, Check, AlertTriangle, Mic, MicOff, ShieldAlert, History, Trash2, StickyNote, Sparkles, PlayCircle, X, Send, ChevronRight, ListChecks, AlertCircle, ClipboardList, Heart, FlaskConical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { aiChat } from "@/lib/ai-chat.functions";
import { useConnectivity } from "@/lib/connectivity";

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
  const { profile, meds, doses, symptoms, appointments, addSummary, addNote, visits } = state;
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
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3 py-1 text-[11px] font-semibold">
          <span className="size-1.5 rounded-full bg-white" /> Offline Ready
        </div>
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

          {approved && (
            <VisitWorkflow
              meds={meds}
              patientSummary={draft}
              onSaveVisit={(v) => {
                state.addVisit(v);
                toast.success("Visit saved to Health Memory");
              }}
              onQuickNote={(t) => {
                addNote(t);
                toast.success("Note saved to Health Memory");
              }}
            />
          )}

          {visits.length > 0 && <VisitHistory visits={visits} onRemove={(id) => state.removeVisit(id)} />}
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
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Generated from your device data. No internet required.
        </p>
      </div>
    </AppShell>
  );
}

/* ---------------- Visit recording workflow ---------------- */

type Stage = "ask" | "patient-declined" | "doctor-consent" | "recording" | "summary" | "doctor-declined" | "done";

function VisitWorkflow({
  meds,
  patientSummary,
  onSaveVisit,
  onQuickNote,
}: {
  meds: { name: string; dosage: string }[];
  patientSummary: string;
  onSaveVisit: (v: Omit<VisitRecord, "id" | "at"> & { at?: number }) => void;
  onQuickNote: (text: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("ask");
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | undefined>(undefined);
  const [recError, setRecError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Only persist audio if reasonably small (<3MB) to avoid blowing localStorage
        if (blob.size <= 3 * 1024 * 1024) {
          const dataUrl = await blobToDataUrl(blob);
          setAudioDataUrl(dataUrl);
        } else {
          setAudioDataUrl(undefined);
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        setStage("summary");
      };
      rec.start();
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setRecording(true);
      setStage("recording");
      tickRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone unavailable";
      setRecError(msg);
      toast.error("Couldn't start recording", { description: msg });
    }
  };

  const stopRecording = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    recorderRef.current?.stop();
  };

  const handleSaveVisit = (payload: {
    topicsDiscussed: string;
    medicationChanges: string;
    newRecommendations: string;
    testsOrdered: string;
    followUpAppointments: string;
    actionItems: string;
    notes: string;
  }) => {
    // Build a short Visit Outcome summary that is distinct from the patient's pre-visit summary.
    const outcomeBits = [
      payload.topicsDiscussed && `Discussed: ${payload.topicsDiscussed}`,
      payload.medicationChanges && `Medication changes: ${payload.medicationChanges}`,
      payload.newRecommendations && `Recommendations: ${payload.newRecommendations}`,
      payload.testsOrdered && `Tests ordered: ${payload.testsOrdered}`,
      payload.followUpAppointments && `Follow-up: ${payload.followUpAppointments}`,
      payload.actionItems && `Action items: ${payload.actionItems}`,
    ].filter(Boolean) as string[];
    const outcomeSummary =
      outcomeBits.length > 0
        ? outcomeBits.join(". ")
        : `Visit outcome with ${doctorName || "doctor"}${specialty ? ` (${specialty})` : ""} on ${new Date().toLocaleDateString()}.`;
    onSaveVisit({
      doctor: doctorName.trim() || "Unspecified doctor",
      specialty: specialty.trim() || undefined,
      durationSec: seconds || undefined,
      audioDataUrl,
      summary: outcomeSummary,
      patientSummary: patientSummary?.trim() || undefined,
      topicsDiscussed: payload.topicsDiscussed.trim() || undefined,
      medicationChanges: payload.medicationChanges.trim() || undefined,
      newRecommendations: payload.newRecommendations.trim() || undefined,
      testsOrdered: payload.testsOrdered.trim() || undefined,
      followUpAppointments: payload.followUpAppointments.trim() || undefined,
      actionItems: payload.actionItems.trim() || undefined,
      notes: payload.notes.trim() || undefined,
      recorded: !!audioDataUrl || seconds > 0,
    });
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioDataUrl(undefined);
    setSeconds(0);
    setDoctorName("");
    setSpecialty("");
    setStage("done");
  };

  return (
    <Section icon={Mic} title="Today's visit" tint="primary">
      {stage === "ask" && (
        <div>
          <p className="text-sm">Would you like me to help keep track of today's visit?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setStage("doctor-consent")}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold"
            >
              Yes
            </button>
            <button
              onClick={() => setStage("patient-declined")}
              className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {stage === "patient-declined" && (
        <div className="text-sm text-muted-foreground">
          No problem — you can come back anytime.{" "}
          <button className="text-primary font-medium" onClick={() => setStage("ask")}>Change my mind</button>
        </div>
      )}

      {stage === "doctor-consent" && (
        <div>
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 mb-3 flex items-start gap-2">
            <ShieldAlert className="size-4 text-warning shrink-0 mt-0.5" />
            <div className="text-[13px] text-warning-foreground/90">
              <div className="font-semibold text-warning">Before recording</div>
              Please make sure your doctor agrees to being recorded.
            </div>
          </div>
          <p className="text-sm italic text-foreground/90">
            "Doctor, would it be okay if I record this visit to help me remember important information and create a summary afterward?"
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Doctor name (optional)"
              className="rounded-xl border bg-background px-3 py-2 text-sm"
            />
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Specialty (optional)"
              className="rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={startRecording}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2"
            >
              <Check className="size-4" /> Doctor approved
            </button>
            <button
              onClick={() => setStage("doctor-declined")}
              className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2"
            >
              <MicOff className="size-4" /> Doctor declined
            </button>
          </div>
          {recError && <div className="text-[12px] text-destructive mt-2">{recError}</div>}
        </div>
      )}

      {stage === "recording" && (
        <div>
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3">
            <span className="relative grid place-items-center size-10 rounded-full bg-destructive/15">
              <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" />
              <Mic className="size-5 text-destructive relative" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-destructive">Recording visit</div>
              <div className="text-[12px] text-muted-foreground">{formatDuration(seconds)} · {doctorName || "your doctor"}</div>
            </div>
            <button
              onClick={stopRecording}
              className="rounded-xl bg-destructive text-destructive-foreground px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Square className="size-4 fill-current" /> Stop
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            You can stop the recording at any time. Audio stays on your device.
          </p>
        </div>
      )}

      {stage === "summary" && (
        <VisitSummaryForm
          duration={seconds}
          audioUrl={audioUrl}
          doctorName={doctorName || "your doctor"}
          patientSummary={patientSummary}
          onCancel={() => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setAudioDataUrl(undefined);
            setStage("ask");
          }}
          onSave={handleSaveVisit}
        />
      )}

      {stage === "doctor-declined" && (
        <div>
          <p className="text-sm">That's okay. You can still take notes during the visit.</p>
          <button
            onClick={() => setQuickNoteOpen(true)}
            className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2"
          >
            <StickyNote className="size-4" /> Quick note
          </button>
          <button
            onClick={() => setStage("ask")}
            className="mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium"
          >
            Back
          </button>
          {quickNoteOpen && (
            <QuickNoteDialog
              onClose={() => setQuickNoteOpen(false)}
              onSave={(t) => { onQuickNote(t); setQuickNoteOpen(false); }}
            />
          )}
        </div>
      )}

      {stage === "done" && (
        <div className="text-sm">
          <div className="inline-flex items-center gap-1.5 text-success font-medium">
            <ShieldCheck className="size-4" /> Visit saved to Health Memory
          </div>
          <button
            onClick={() => setStage("ask")}
            className="block mt-3 text-primary text-sm font-medium"
          >
            Log another visit
          </button>
        </div>
      )}
    </Section>
  );
}

function VisitSummaryForm({
  duration, audioUrl, doctorName, patientSummary, onCancel, onSave,
}: {
  duration: number;
  audioUrl: string | null;
  doctorName: string;
  patientSummary?: string;
  onCancel: () => void;
  onSave: (p: {
    topicsDiscussed: string;
    medicationChanges: string;
    newRecommendations: string;
    testsOrdered: string;
    followUpAppointments: string;
    actionItems: string;
    notes: string;
  }) => void;
}) {
  const [topicsDiscussed, setTopicsDiscussed] = useState("");
  const [medicationChanges, setMedicationChanges] = useState("");
  const [newRecommendations, setNewRecommendations] = useState("");
  const [testsOrdered, setTestsOrdered] = useState("");
  const [followUpAppointments, setFollowUpAppointments] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [notes, setNotes] = useState("");
  const [showPatientSummary, setShowPatientSummary] = useState(false);
  const canSave =
    topicsDiscussed.trim() ||
    medicationChanges.trim() ||
    newRecommendations.trim() ||
    testsOrdered.trim() ||
    followUpAppointments.trim() ||
    actionItems.trim() ||
    notes.trim();
  return (
    <div>
      <div className="rounded-xl bg-success/10 border border-success/30 p-3 mb-3 text-[13px]">
        <div className="font-semibold text-success">Recording finished</div>
        <div className="text-muted-foreground">
          {formatDuration(duration)} with {doctorName}. Capture the <strong>visit outcome</strong> below — what the doctor said, decided, or recommended.
        </div>
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full mt-2" />
        )}
      </div>
      {patientSummary && (
        <div className="rounded-xl border bg-secondary/40 p-3 mb-3 text-[12px]">
          <button
            type="button"
            onClick={() => setShowPatientSummary((s) => !s)}
            className="font-semibold text-foreground inline-flex items-center gap-1"
          >
            <ChevronRight className={`size-3 transition ${showPatientSummary ? "rotate-90" : ""}`} />
            Patient summary you brought to the visit
          </button>
          {showPatientSummary && (
            <div className="mt-2 text-muted-foreground whitespace-pre-wrap">{patientSummary}</div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">For reference only — please capture what the doctor said below, not what you told them.</div>
        </div>
      )}
      <div className="text-[12px] font-semibold uppercase tracking-wide text-primary mb-1">Visit outcome</div>
      <Field label="Topics discussed"><textarea rows={2} value={topicsDiscussed} onChange={(e) => setTopicsDiscussed(e.target.value)} placeholder="e.g. Blood pressure trends, headaches, sleep" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="Medication changes"><textarea rows={2} value={medicationChanges} onChange={(e) => setMedicationChanges(e.target.value)} placeholder="e.g. Increased lisinopril to 20mg; stopped ibuprofen" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="New recommendations"><textarea rows={2} value={newRecommendations} onChange={(e) => setNewRecommendations(e.target.value)} placeholder="e.g. Reduce salt, walk 20 min/day" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="Tests ordered"><textarea rows={2} value={testsOrdered} onChange={(e) => setTestsOrdered(e.target.value)} placeholder="e.g. Blood panel, EKG" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="Follow-up appointments"><textarea rows={2} value={followUpAppointments} onChange={(e) => setFollowUpAppointments(e.target.value)} placeholder="e.g. Cardiology in 3 months" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="Action items for me"><textarea rows={2} value={actionItems} onChange={(e) => setActionItems(e.target.value)} placeholder="e.g. Pick up new prescription, book lab" className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <Field label="Other appointment notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" /></Field>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium">Discard</button>
        <button
          onClick={() =>
            onSave({
              topicsDiscussed,
              medicationChanges,
              newRecommendations,
              testsOrdered,
              followUpAppointments,
              actionItems,
              notes,
            })
          }
          disabled={!canSave}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50"
        >
          Save visit outcome
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mt-2">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function QuickNoteDialog({ onClose, onSave }: { onClose: () => void; onSave: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-3xl p-5 shadow-2xl">
        <h2 className="mb-3">Quick visit note</h2>
        <textarea
          autoFocus
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot down what the doctor said…"
          className="w-full rounded-xl border px-3 py-2.5 text-[15px]"
        />
        <div className="flex gap-2 mt-4">
          <button className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-2.5 font-medium" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-50"
            disabled={!text.trim()}
            onClick={() => onSave(text.trim())}
          >
            Save note
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function VisitHistory({ visits, onRemove }: { visits: VisitRecord[]; onRemove: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = visits.find((v) => v.id === openId) ?? null;
  return (
    <Section icon={History} title="Doctor visit history" tint="success">
      <ul className="space-y-3">
        {visits.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => setOpenId(v.id)}
              className="w-full text-left rounded-xl border bg-background p-3 hover:bg-secondary/40 transition active:scale-[0.997]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold text-[14px]">
                  {v.specialty ? `${v.specialty} visit` : "Doctor visit"}
                  {v.doctor && v.doctor !== "Unspecified doctor" && <span className="text-muted-foreground font-normal"> · {v.doctor}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(v.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground line-clamp-2">
                <span className="font-medium text-foreground">Summary:</span> {v.summary}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                {v.recorded && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Mic className="size-3" /> Recorded{v.durationSec ? ` · ${formatDuration(v.durationSec)}` : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 ml-auto text-primary font-medium">
                  Open <ChevronRight className="size-3" />
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <VisitDetailDialog
          visit={open}
          onClose={() => setOpenId(null)}
          onRemove={(id) => { onRemove(id); setOpenId(null); }}
        />
      )}
    </Section>
  );
}

/* ---------------- Visit detail with AI explanation ---------------- */

function VisitDetailDialog({
  visit, onClose, onRemove,
}: {
  visit: VisitRecord;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const { online } = useConnectivity();
  const [explanation, setExplanation] = useState<string>("");
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [questions, setQuestions] = useState<{ q: string; a: string }[]>([]);
  const [askInput, setAskInput] = useState("");
  const [asking, setAsking] = useState(false);

  // Local extraction (deterministic, offline-safe)
  const topics = useMemo(() => extractTopics(visit), [visit]);
  const transcriptText = useMemo(() => buildTranscript(visit), [visit]);
  const summaryNarration = useMemo(() => buildSummaryNarration(visit), [visit]);

  useEffect(() => () => stopSpeaking(), []);

  const handleExplain = async () => {
    if (!online) {
      setExplanation(
        `Here's a plain-language summary I can give without internet:\n\n${summaryNarration}\n\nConnect to the internet for a deeper AI explanation.`,
      );
      return;
    }
    setLoadingExplain(true);
    setExplainError(null);
    try {
      const { reply } = await aiChat({
        data: {
          messages: [
            {
              role: "system",
              content:
                "You are MedsBuddy, a compassionate patient advocate. The patient ALREADY KNOWS what they told the doctor (the 'patient summary' is for context only). Your job is to explain the VISIT OUTCOME — what the doctor said, decided, or changed during the appointment. DO NOT repeat or rephrase the patient summary. Focus only on: topics discussed, medication changes, new recommendations, tests ordered, follow-up appointments, and action items. Be warm and concise (4-7 short sentences) in plain language. End with: 'Would you like me to explain any part in more detail?'",
            },
            {
              role: "user",
              content: `Explain what happened during this visit. Focus on the outcome — do not repeat the patient summary.\n\n${transcriptText}`,
            },
          ],
        },
      });
      setExplanation(reply);
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : "Could not reach AI.");
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleListen = async () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    const text = explanation || `Here is a summary of your recent appointment. ${summaryNarration}`;
    await speak(text, () => setSpeaking(false));
  };

  const handleAsk = async (q?: string) => {
    const text = (q ?? askInput).trim();
    if (!text) return;
    setAskInput("");
    if (!online) {
      setQuestions((qs) => [...qs, { q: text, a: "I'm offline right now, but here's what I can see in the saved visit notes: " + summaryNarration }]);
      return;
    }
    setAsking(true);
    setQuestions((qs) => [...qs, { q: text, a: "" }]);
    try {
      const { reply } = await aiChat({
        data: {
          messages: [
            {
              role: "system",
              content:
                "You are MedsBuddy, a patient advocate. Answer the patient's question using ONLY the visit notes provided. Use plain, kind language. If the answer isn't in the notes, say so honestly and suggest asking the doctor next visit. Keep answers to 1-3 short sentences.",
            },
            { role: "user", content: `Visit notes:\n${transcriptText}\n\nQuestion: ${text}` },
          ],
        },
      });
      setQuestions((qs) => qs.map((row, i) => (i === qs.length - 1 ? { ...row, a: reply } : row)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reach AI.";
      setQuestions((qs) => qs.map((row, i) => (i === qs.length - 1 ? { ...row, a: `Sorry — ${msg}` } : row)));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header / Overview */}
        <div className="p-5 border-b">
          <div className="flex items-start gap-3">
            <div className="size-11 rounded-2xl gradient-hero grid place-items-center text-primary-foreground shrink-0">
              <Stethoscope className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground font-medium">Visit overview</div>
              <h2 className="text-[17px] font-semibold leading-tight">
                {visit.specialty ? `${visit.specialty} visit` : "Doctor visit"}
              </h2>
              <div className="text-[13px] text-muted-foreground mt-0.5">
                {visit.doctor && visit.doctor !== "Unspecified doctor" ? visit.doctor + " · " : ""}
                {new Date(visit.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                {visit.durationSec ? ` · Duration ${formatDuration(visit.durationSec)}` : ""}
              </div>
            </div>
            <button onClick={onClose} className="size-8 rounded-full bg-secondary grid place-items-center" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <ActionBtn icon={Sparkles} label={loadingExplain ? "Thinking…" : "Explain this visit"} onClick={handleExplain} primary disabled={loadingExplain} />
            <ActionBtn icon={speaking ? Square : Volume2} label={speaking ? "Stop" : "Listen to summary"} onClick={handleListen} />
            <ActionBtn icon={FileText} label={showTranscript ? "Hide notes" : "View notes"} onClick={() => setShowTranscript((s) => !s)} />
            <ActionBtn
              icon={PlayCircle}
              label={visit.audioDataUrl ? (showPlayer ? "Hide recording" : "Play recording") : "No recording"}
              onClick={() => visit.audioDataUrl && setShowPlayer((s) => !s)}
              disabled={!visit.audioDataUrl}
            />
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Visit timeline */}
          <VisitTimeline visit={visit} />

          {/* Explanation */}
          {(explanation || loadingExplain || explainError) && (
            <Block icon={Sparkles} title="MedsBuddy explains">
              {loadingExplain && <div className="text-sm text-muted-foreground">Reading the visit notes and putting it in plain language…</div>}
              {explainError && <div className="text-sm text-destructive">Sorry — {explainError}</div>}
              {explanation && <div className="text-[14px] whitespace-pre-wrap leading-relaxed">{explanation}</div>}
            </Block>
          )}

          {/* Player */}
          {showPlayer && visit.audioDataUrl && (
            <Block icon={PlayCircle} title="Recording">
              <audio controls src={visit.audioDataUrl} className="w-full" />
            </Block>
          )}

          {/* Transcript / notes */}
          {showTranscript && (
            <Block icon={FileText} title="Visit notes">
              <pre className="text-[13px] whitespace-pre-wrap font-sans leading-relaxed">{transcriptText}</pre>
            </Block>
          )}

          {/* Important topics */}
          {topics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="size-4 text-primary" />
                <h3 className="text-[14px] font-semibold">Important topics</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topics.map((t, i) => {
                  const Icon = TOPIC_ICON[t.kind];
                  const tone = TOPIC_TONE[t.kind];
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${tone}`}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                        <Icon className="size-3.5" /> {t.label}
                      </div>
                      <div className="text-[13px] mt-1 text-foreground/90 whitespace-pre-wrap">{t.detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Q&A */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareQuote className="size-4 text-primary" />
              <h3 className="text-[14px] font-semibold">Ask about this visit</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SUGGESTED_QS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  disabled={asking}
                  className="rounded-full bg-secondary text-secondary-foreground text-[12px] px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            {questions.length > 0 && (
              <div className="space-y-2 mb-2">
                {questions.map((row, i) => (
                  <div key={i} className="rounded-xl border bg-background p-3">
                    <div className="text-[12px] font-semibold text-primary">You</div>
                    <div className="text-[13px] mb-2">{row.q}</div>
                    <div className="text-[12px] font-semibold text-success">MedsBuddy</div>
                    <div className="text-[13px] text-foreground/90 whitespace-pre-wrap">
                      {row.a || (asking && i === questions.length - 1 ? "Thinking…" : "")}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
              className="flex gap-2"
            >
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask a question about this visit…"
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!askInput.trim() || asking}
                className="rounded-xl bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50"
                aria-label="Send question"
              >
                <Send className="size-4" />
              </button>
            </form>
            {!online && <div className="text-[11px] text-muted-foreground mt-2">Offline — I'll answer from your saved notes.</div>}
          </div>

          <button
            onClick={() => onRemove(visit.id)}
            className="text-[12px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Remove this visit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const SUGGESTED_QS = [
  "What medication changed?",
  "What should I do next?",
  "What follow-up is required?",
  "Explain this in simple language.",
];

type TopicKind = "medication" | "diagnosis" | "symptom" | "test" | "follow-up" | "lifestyle";
const TOPIC_ICON: Record<TopicKind, typeof Pill> = {
  medication: Pill,
  diagnosis: AlertCircle,
  symptom: Activity,
  test: FlaskConical,
  "follow-up": ClipboardList,
  lifestyle: Heart,
};
const TOPIC_TONE: Record<TopicKind, string> = {
  medication: "bg-primary/5 border-primary/20 text-primary",
  diagnosis: "bg-warning/10 border-warning/30 text-warning",
  symptom: "bg-warning/10 border-warning/30 text-warning",
  test: "bg-primary/5 border-primary/20 text-primary",
  "follow-up": "bg-success/10 border-success/30 text-success",
  lifestyle: "bg-success/10 border-success/30 text-success",
};
const TOPIC_LABEL: Record<TopicKind, string> = {
  medication: "Medications",
  diagnosis: "New diagnosis",
  symptom: "Symptoms discussed",
  test: "Tests ordered",
  "follow-up": "Follow-up",
  lifestyle: "Lifestyle",
};

function extractTopics(v: VisitRecord): { kind: TopicKind; label: string; detail: string }[] {
  const topics: { kind: TopicKind; label: string; detail: string }[] = [];
  const push = (kind: TopicKind, detail?: string) => {
    if (detail && detail.trim()) topics.push({ kind, label: TOPIC_LABEL[kind], detail: detail.trim() });
  };
  push("medication", v.medicationChanges ?? v.medications);
  push("follow-up", v.followUpAppointments ?? v.followUp);
  push("lifestyle", v.newRecommendations ?? v.carePlan);
  push("test", v.testsOrdered);
  push("symptom", v.topicsDiscussed);
  // Heuristic: pull "test" / "lab" mentions out of notes
  const haystack = [v.summary, v.notes, v.actionItems, v.questionsAnswered].filter(Boolean).join("\n");
  if (!v.testsOrdered && /\b(lab|test|x-?ray|scan|blood work|ekg|mri|ct)\b/i.test(haystack)) {
    push("test", findSentencesMatching(haystack, /lab|test|x-?ray|scan|blood work|ekg|mri|ct/i));
  }
  if (/\b(diagnos|condition|finding)\b/i.test(haystack)) {
    push("diagnosis", findSentencesMatching(haystack, /diagnos|condition|finding/i));
  }
  return topics;
}

function findSentencesMatching(text: string, re: RegExp): string {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => re.test(s))
    .slice(0, 2)
    .join(" ");
}

function buildTranscript(v: VisitRecord): string {
  const parts = [
    `Visit outcome summary: ${v.summary}`,
    v.topicsDiscussed && `Topics discussed: ${v.topicsDiscussed}`,
    v.medicationChanges && `Medication changes: ${v.medicationChanges}`,
    v.newRecommendations && `New recommendations: ${v.newRecommendations}`,
    v.testsOrdered && `Tests ordered: ${v.testsOrdered}`,
    v.followUpAppointments && `Follow-up appointments: ${v.followUpAppointments}`,
    v.actionItems && `Action items for the patient: ${v.actionItems}`,
    v.medications && !v.medicationChanges && `Medications discussed: ${v.medications}`,
    v.carePlan && !v.newRecommendations && `Care plan: ${v.carePlan}`,
    v.followUp && !v.followUpAppointments && `Follow-up actions: ${v.followUp}`,
    v.questionsAnswered && `Questions answered: ${v.questionsAnswered}`,
    v.notes && `Appointment notes: ${v.notes}`,
    v.patientSummary && `(For context only — patient summary brought to the visit: ${v.patientSummary})`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function buildSummaryNarration(v: VisitRecord): string {
  const bits: string[] = [v.summary];
  if (v.medicationChanges) bits.push(`Medication changes: ${v.medicationChanges}.`);
  if (v.newRecommendations) bits.push(`New recommendations: ${v.newRecommendations}.`);
  if (v.testsOrdered) bits.push(`Tests ordered: ${v.testsOrdered}.`);
  if (v.followUpAppointments) bits.push(`Follow-up: ${v.followUpAppointments}.`);
  if (v.actionItems) bits.push(`Your action items: ${v.actionItems}.`);
  return bits.join(" ");
}

function ActionBtn({ icon: Icon, label, onClick, primary, disabled }: { icon: typeof Pill; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2.5 text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-50 ${
        primary ? "gradient-hero text-primary-foreground shadow-elegant" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
      }`}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Pill; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-background p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function VisitTimeline({ visit }: { visit: VisitRecord }) {
  const hasPatient = !!visit.patientSummary?.trim();
  const hasRecording = visit.recorded || !!visit.audioDataUrl;
  const hasOutcome =
    !!(visit.topicsDiscussed || visit.medicationChanges || visit.newRecommendations ||
       visit.testsOrdered || visit.followUpAppointments || visit.actionItems);
  const hasFollowUp = !!(visit.actionItems || visit.followUpAppointments);
  const steps: { label: string; sub: string; done: boolean; icon: typeof Pill }[] = [
    { label: "Patient Summary", sub: hasPatient ? "Brought to the visit" : "Not saved", done: hasPatient, icon: FileText },
    { label: "Visit Recording", sub: hasRecording ? (visit.durationSec ? `Recorded · ${formatDuration(visit.durationSec)}` : "Recorded") : "No recording", done: hasRecording, icon: Mic },
    { label: "Visit Outcome Summary", sub: hasOutcome ? "What the doctor said" : "Not captured", done: hasOutcome, icon: Sparkles },
    { label: "Follow-Up Tasks", sub: hasFollowUp ? "Action items saved" : "None", done: hasFollowUp, icon: ClipboardList },
  ];
  return (
    <div className="rounded-2xl border bg-background p-3.5">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="size-4 text-primary" />
        <h3 className="text-[13px] font-semibold">Visit timeline</h3>
      </div>
      <ol className="relative">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex gap-3 pb-3 last:pb-0 relative">
              {i < steps.length - 1 && (
                <span className={`absolute left-3.5 top-7 bottom-0 w-px ${s.done ? "bg-primary/40" : "bg-border"}`} />
              )}
              <div className={`size-7 rounded-full grid place-items-center shrink-0 ${s.done ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                <Icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className={`text-[13px] font-semibold ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.sub}</div>
              </div>
              {s.done && <Check className="size-4 text-success shrink-0 mt-1" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function _BlockDuplicate({ icon: Icon, title, children }: { icon: typeof Pill; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-background p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-[13px] font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
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
