import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, type VisitRecord } from "@/lib/store";
import { Check, Mic, MicOff, ShieldAlert, Square, StickyNote, ChevronLeft, ShieldCheck, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/record")({
  head: () => ({
    meta: [
      { title: "Record visit — MedsBuddy" },
      { name: "description", content: "Record and summarize your doctor visit." },
    ],
  }),
  component: RecordVisit,
});

type Stage = "doctor-consent" | "recording" | "summary" | "doctor-declined" | "done";

function RecordVisit() {
  const state = useApp();
  const navigate = useNavigate({ from: "/doctor/record" });
  const { currentVisitSummary, addVisit, addNote, setCurrentVisitSummary } = state;

  useEffect(() => {
    if (!currentVisitSummary) {
      navigate({ to: "/doctor" });
    }
  }, [currentVisitSummary, navigate]);

  const [stage, setStage] = useState<Stage>("doctor-consent");
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

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
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
    addVisit({
      doctor: doctorName.trim() || "Unspecified doctor",
      specialty: specialty.trim() || undefined,
      durationSec: seconds || undefined,
      audioDataUrl,
      summary: outcomeSummary,
      patientSummary: currentVisitSummary?.trim() || undefined,
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
    setCurrentVisitSummary(null);
    setStage("done");
  };

  return (
    <AppShell>
      <div className="mb-4">
        <button
          onClick={() => navigate({ to: "/doctor" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="size-4" /> Back to doctor prep
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Mic className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-80 font-medium">Visit recorder</div>
            <h1 className="text-primary-foreground text-2xl">Record today's visit</h1>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-3">Capture what your doctor says, save the outcome, and keep everything in your Health Memory.</p>
      </motion.div>

      <div className="flex items-center gap-2 mb-4">
        <StepDot active={stage === "doctor-consent" || stage === "recording" || stage === "summary" || stage === "done"} label="Consent" />
        <div className={`flex-1 h-0.5 ${stage !== "doctor-consent" ? "bg-primary" : "bg-border"}`} />
        <StepDot active={stage === "recording" || stage === "summary" || stage === "done"} label="Record" />
        <div className={`flex-1 h-0.5 ${stage === "summary" || stage === "done" ? "bg-primary" : "bg-border"}`} />
        <StepDot active={stage === "summary" || stage === "done"} label="Outcome" />
      </div>

      {stage === "doctor-consent" && (
        <Section icon={ShieldAlert} title="Get consent" tint="warning">
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
        </Section>
      )}

      {stage === "recording" && (
        <Section icon={Mic} title="Recording" tint="primary">
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
        </Section>
      )}

      {stage === "summary" && (
        <VisitSummaryForm
          duration={seconds}
          audioUrl={audioUrl}
          doctorName={doctorName || "your doctor"}
          patientSummary={currentVisitSummary ?? undefined}
          onCancel={() => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setAudioDataUrl(undefined);
            setStage("doctor-consent");
          }}
          onSave={handleSaveVisit}
        />
      )}

      {stage === "doctor-declined" && (
        <Section icon={MicOff} title="No recording" tint="primary">
          <p className="text-sm">That's okay. You can still take notes during the visit.</p>
          <button
            onClick={() => setQuickNoteOpen(true)}
            className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold inline-flex items-center justify-center gap-2"
          >
            <StickyNote className="size-4" /> Quick note
          </button>
          <button
            onClick={() => setStage("doctor-consent")}
            className="mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium"
          >
            Back
          </button>
          {quickNoteOpen && (
            <QuickNoteDialog
              onClose={() => setQuickNoteOpen(false)}
              onSave={(t) => { addNote(t); setQuickNoteOpen(false); toast.success("Note saved to Health Memory"); }}
            />
          )}
        </Section>
      )}

      {stage === "done" && (
        <Section icon={ShieldCheck} title="Visit saved" tint="success">
          <div className="text-sm">
            <div className="inline-flex items-center gap-1.5 text-success font-medium">
              <ShieldCheck className="size-4" /> Visit saved to Health Memory
            </div>
            <p className="text-muted-foreground mt-2">
              Your visit outcome summary, any recording, and notes are now in your Health Memory timeline.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/doctor" })}
            className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2"
          >
            <ChevronLeft className="size-4" /> Back to doctor prep
          </button>
          <button
            onClick={() => {
              setStage("doctor-consent");
              setDoctorName("");
              setSpecialty("");
              setSeconds(0);
            }}
            className="mt-2 w-full rounded-xl bg-secondary text-secondary-foreground py-2 text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <Pencil className="size-4" /> Log another visit
          </button>
        </Section>
      )}
    </AppShell>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`size-2.5 rounded-full ${active ? "bg-primary" : "bg-border"}`} />
      <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
    </div>
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
    <Section icon={Pencil} title="Visit outcome" tint="primary">
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
            <ChevronLeft className={`size-3 transition ${showPatientSummary ? "-rotate-90" : ""}`} />
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
    </Section>
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

function Section({ icon: Icon, title, tint, children }: { icon: typeof Mic; title: string; tint: "primary" | "success" | "warning"; children: React.ReactNode }) {
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
