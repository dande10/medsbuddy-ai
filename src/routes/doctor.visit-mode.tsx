import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp, adherence, type VisitRecord } from "@/lib/store";
import { speak, stopSpeaking, getRecognition } from "@/lib/voice";
import { aiChat } from "@/lib/ai-chat.functions";
import { useConnectivity } from "@/lib/connectivity";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check, Pencil, Volume2, Square, Mic, MicOff, ShieldAlert, ShieldCheck,
  ChevronLeft, Stethoscope, Sparkles, ListChecks, AlertCircle, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/doctor/visit-mode")({
  head: () => ({
    meta: [
      { title: "Doctor Visit Mode — MedsBuddy" },
      { name: "description", content: "Guided, hands-free assistant for your doctor visit." },
    ],
  }),
  component: DoctorVisitMode,
});

type Stage = "review" | "speak" | "consent" | "recording" | "summary" | "done";
const STEPS: { key: Stage | "summary"; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "speak", label: "Speak" },
  { key: "consent", label: "Consent" },
  { key: "recording", label: "Record" },
  { key: "summary", label: "Summary" },
];

function buildPatientSummary(state: ReturnType<typeof useApp.getState>): string {
  const { profile, meds, doses, symptoms, appointments } = state;
  const adh = adherence(doses, 7);
  const last7 = Date.now() - 7 * 86400000;
  const taken = doses.filter((d) => d.at >= last7 && d.status === "taken").length;
  const missed = doses.filter((d) => d.at >= last7 && d.status !== "taken").length;
  const recentSymp = symptoms.filter((s) => s.at >= last7);
  const sympCounts: Record<string, number> = {};
  for (const s of recentSymp) sympCounts[s.name] = (sympCounts[s.name] ?? 0) + 1;
  const lines: string[] = [];
  lines.push(`Hello Doctor. The patient would like to share a short health summary for ${profile.name || "the patient"}.`);
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
  lines.push("The patient would like to discuss adherence, any new symptoms, and possible medication adjustments.");
  return lines.join(" ");
}

const CONSENT_PROMPT =
  "Doctor, with the patient's permission, may I record this visit to help create an accurate after-visit summary and follow-up notes?";

function DoctorVisitMode() {
  const state = useApp();
  const navigate = useNavigate({ from: "/doctor/visit-mode" });
  const { addSummary, addVisit, addNote, setCurrentVisitSummary } = state;
  const { online } = useConnectivity();

  const generated = useMemo(() => buildPatientSummary(state), [state]);
  const [stage, setStage] = useState<Stage>("review");
  const [draft, setDraft] = useState(generated);
  const [editing, setEditing] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");

  // speak
  const [speaking, setSpeaking] = useState(false);

  // consent
  const [listening, setListening] = useState(false);
  const [heardText, setHeardText] = useState("");
  const recRef = useRef<ReturnType<typeof getRecognition>>(null);

  // recording
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | undefined>(undefined);
  const [recError, setRecError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // summary
  const [outcomeFields, setOutcomeFields] = useState({
    topicsDiscussed: "", medicationChanges: "", newRecommendations: "",
    testsOrdered: "", followUpAppointments: "", actionItems: "", notes: "",
  });
  const [aiDrafting, setAiDrafting] = useState(false);

  useEffect(() => {
    if (stage === "review" && !editing) setDraft(generated);
  }, [generated, stage, editing]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      try { recRef.current?.abort(); } catch { /* noop */ }
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- step 1: review ---------- */
  const handleApprove = () => {
    const text = draft.trim();
    if (!text) return;
    addSummary(text);
    setCurrentVisitSummary(text);
    setEditing(false);
    setStage("speak");
    // auto-trigger speak step
    setTimeout(() => doSpeakSummary(text), 250);
  };

  /* ---------- step 2: speak ---------- */
  const doSpeakSummary = async (text: string) => {
    setSpeaking(true);
    await speak(text, () => {
      setSpeaking(false);
      // auto-advance to consent + speak the consent prompt
      setStage("consent");
      setTimeout(() => doSpeakConsent(), 400);
    });
  };
  const stopSpeakSummary = () => { stopSpeaking(); setSpeaking(false); };
  const skipToConsent = () => {
    stopSpeaking();
    setSpeaking(false);
    setStage("consent");
    setTimeout(() => doSpeakConsent(), 200);
  };

  /* ---------- step 3: consent ---------- */
  const doSpeakConsent = async () => {
    setSpeaking(true);
    await speak(CONSENT_PROMPT, () => {
      setSpeaking(false);
      startListeningForConsent();
    });
  };
  const startListeningForConsent = () => {
    const rec = getRecognition();
    if (!rec) return; // no SR support; user uses buttons
    recRef.current = rec;
    setHeardText("");
    setListening(true);
    rec.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript ?? "";
      setHeardText(t);
      const lc = t.toLowerCase().trim();
      if (/\b(yes|yeah|yep|okay|ok|sure|approved?|that'?s fine|go ahead|of course)\b/.test(lc)) {
        handleConsent(true);
      } else if (/\b(no|nope|not today|decline|don'?t|do not)\b/.test(lc)) {
        handleConsent(false);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  };
  const stopListening = () => {
    try { recRef.current?.abort(); } catch { /* noop */ }
    setListening(false);
  };

  const handleConsent = async (approved: boolean) => {
    stopListening();
    stopSpeaking();
    setSpeaking(false);
    if (approved) {
      await startRecording();
    } else {
      toast.info("Recording declined — that's okay. You can still capture the outcome.");
      setStage("summary");
    }
  };

  /* ---------- step 4: recording ---------- */
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
          setAudioDataUrl(await blobToDataUrl(blob));
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setStage("summary");
        // try AI draft of outcome
        void draftOutcomeWithAi();
      };
      rec.start();
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setStage("recording");
      tickRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone unavailable";
      setRecError(msg);
      toast.error("Couldn't start recording", { description: msg });
      setStage("summary");
    }
  };
  const stopRecording = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    recorderRef.current?.stop();
  };

  /* ---------- step 5: summary ---------- */
  const draftOutcomeWithAi = async () => {
    if (!online) return;
    setAiDrafting(true);
    try {
      const { reply } = await aiChat({
        data: {
          messages: [
            {
              role: "system",
              content:
                "You are MedsBuddy, a clinical scribe. Based on the patient's pre-visit summary, draft a *visit outcome* template a patient can quickly verify. Output JSON ONLY with keys: topicsDiscussed, medicationChanges, newRecommendations, testsOrdered, followUpAppointments, actionItems. Each value is a short string (may be empty). Do NOT repeat the patient summary text. Keep it generic if details aren't known — patient will edit.",
            },
            { role: "user", content: `Patient pre-visit summary:\n${draft}` },
          ],
        },
      });
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as Partial<typeof outcomeFields>;
        setOutcomeFields((prev) => ({ ...prev, ...parsed, notes: prev.notes }));
      }
    } catch { /* ignore */ }
    finally { setAiDrafting(false); }
  };

  const canSaveOutcome = Object.entries(outcomeFields).some(([, v]) => v.trim());

  const handleSaveOutcome = () => {
    const f = outcomeFields;
    const outcomeBits = [
      f.topicsDiscussed && `Discussed: ${f.topicsDiscussed}`,
      f.medicationChanges && `Medication changes: ${f.medicationChanges}`,
      f.newRecommendations && `Recommendations: ${f.newRecommendations}`,
      f.testsOrdered && `Tests ordered: ${f.testsOrdered}`,
      f.followUpAppointments && `Follow-up: ${f.followUpAppointments}`,
      f.actionItems && `Action items: ${f.actionItems}`,
    ].filter(Boolean) as string[];
    const summary =
      outcomeBits.length > 0
        ? outcomeBits.join(". ")
        : `Visit outcome with ${doctorName || "doctor"}${specialty ? ` (${specialty})` : ""} on ${new Date().toLocaleDateString()}.`;
    const visit: Omit<VisitRecord, "id" | "at"> = {
      doctor: doctorName.trim() || "Unspecified doctor",
      specialty: specialty.trim() || undefined,
      durationSec: seconds || undefined,
      audioDataUrl,
      summary,
      patientSummary: draft.trim() || undefined,
      topicsDiscussed: f.topicsDiscussed.trim() || undefined,
      medicationChanges: f.medicationChanges.trim() || undefined,
      newRecommendations: f.newRecommendations.trim() || undefined,
      testsOrdered: f.testsOrdered.trim() || undefined,
      followUpAppointments: f.followUpAppointments.trim() || undefined,
      actionItems: f.actionItems.trim() || undefined,
      notes: f.notes.trim() || undefined,
      recorded: !!audioDataUrl || seconds > 0,
    };
    addVisit(visit);
    if (f.actionItems.trim()) addNote(`Follow-up from visit: ${f.actionItems.trim()}`);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioDataUrl(undefined);
    setCurrentVisitSummary(null);
    setStage("done");
    toast.success("Visit saved to Health Memory");
  };

  /* ---------- render ---------- */
  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => navigate({ to: "/doctor" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft className="size-4" /> Exit Visit Mode
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Stethoscope className="size-6" />
          </div>
          <div>
            <div className="text-[12px] opacity-80 font-medium">Guided by MedsBuddy</div>
            <h1 className="text-primary-foreground text-2xl">Doctor Visit Mode</h1>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-3">I'll guide your appointment hands-free — review, speak, ask consent, record only if approved, then summarize.</p>
      </motion.div>

      <StepBar stage={stage} />

      {stage === "review" && (
        <Card icon={Pencil} title="Step 1 · Patient summary" tint="primary">
          <p className="text-[12px] text-muted-foreground mb-2">Quick review — this is what MedsBuddy will speak to your doctor.</p>
          {!editing ? (
            <div className="rounded-xl bg-secondary/40 border p-3 text-[14px] leading-relaxed whitespace-pre-wrap">{draft}</div>
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Doctor name (optional)" className="rounded-xl border bg-background px-3 py-2 text-sm" />
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty (optional)" className="rounded-xl border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setEditing((s) => !s)}
              className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2"
            >
              <Pencil className="size-4" /> {editing ? "Done editing" : "Edit summary"}
            </button>
            <button
              onClick={handleApprove}
              disabled={!draft.trim()}
              className="flex-1 rounded-xl gradient-hero text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant disabled:opacity-50"
            >
              <Check className="size-5" /> Approve & Continue
            </button>
          </div>
        </Card>
      )}

      {stage === "speak" && (
        <Card icon={Volume2} title="Step 2 · Speaking your summary" tint="primary">
          <p className="text-sm mb-3">MedsBuddy is reading your summary to the doctor. The consent question follows automatically.</p>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-[13px] leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto">
            {draft}
          </div>
          <div className="flex gap-2 mt-3">
            {speaking ? (
              <button onClick={stopSpeakSummary} className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-3 font-semibold inline-flex items-center justify-center gap-2">
                <Square className="size-4 fill-current" /> Stop speaking
              </button>
            ) : (
              <button onClick={() => doSpeakSummary(draft)} className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2">
                <Volume2 className="size-5" /> Replay
              </button>
            )}
            <button onClick={skipToConsent} className="flex-1 rounded-xl bg-secondary text-secondary-foreground py-3 font-medium">
              Skip to consent
            </button>
          </div>
        </Card>
      )}

      {stage === "consent" && (
        <Card icon={ShieldAlert} title="Step 3 · Asking the doctor" tint="warning">
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 mb-3 text-[13px]">
            <div className="font-semibold text-warning mb-1">MedsBuddy is asking the doctor:</div>
            <div className="italic">"{CONSENT_PROMPT}"</div>
          </div>

          {listening && (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 mb-3 flex items-center gap-2 text-[13px]">
              <span className="relative grid place-items-center size-7 rounded-full bg-primary/20">
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                <Mic className="size-3.5 text-primary relative" />
              </span>
              <div className="flex-1">
                <div className="font-semibold text-primary">Listening for doctor's reply…</div>
                <div className="text-muted-foreground text-[12px]">{heardText || "Say \"yes\" or \"no\" — or tap a button below."}</div>
              </div>
              <button onClick={stopListening} className="text-[12px] text-muted-foreground underline">Stop</button>
            </div>
          )}

          <div className="grid gap-2">
            <button
              onClick={() => handleConsent(true)}
              className="rounded-xl gradient-hero text-primary-foreground py-4 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant"
            >
              <Check className="size-5" /> Doctor Approved Recording
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2"
            >
              <MicOff className="size-5" /> Doctor Declined Recording
            </button>
            {!listening && (
              <button onClick={startListeningForConsent} className="text-[12px] text-primary inline-flex items-center justify-center gap-1 mt-1">
                <Mic className="size-3.5" /> Listen for spoken reply
              </button>
            )}
          </div>
        </Card>
      )}

      {stage === "recording" && (
        <Card icon={Mic} title="Step 4 · Recording visit" tint="warning">
          <div className="rounded-2xl bg-destructive/10 border-2 border-destructive/40 p-5 flex items-center gap-4">
            <span className="relative grid place-items-center size-12 rounded-full bg-destructive/20">
              <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" />
              <Mic className="size-6 text-destructive relative" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-destructive text-lg">Recording Visit</div>
              <div className="text-[13px] text-muted-foreground">{formatDuration(seconds)} · audio stays on this device</div>
            </div>
          </div>
          <button
            onClick={stopRecording}
            className="mt-4 w-full rounded-2xl bg-destructive text-destructive-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2"
          >
            <Square className="size-5 fill-current" /> Stop Recording
          </button>
          {recError && <div className="text-[12px] text-destructive mt-2">{recError}</div>}
        </Card>
      )}

      {stage === "summary" && (
        <Card icon={Sparkles} title="Step 5 · Visit outcome summary" tint="primary">
          <p className="text-[13px] text-muted-foreground mb-3">
            Capture what the doctor said. {aiDrafting && <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="size-3 animate-spin" /> drafting…</span>}
          </p>
          {audioUrl && (
            <div className="mb-3">
              <div className="text-[12px] font-medium text-muted-foreground mb-1">Visit recording</div>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}
          <Field label="Topics discussed" value={outcomeFields.topicsDiscussed} onChange={(v) => setOutcomeFields((p) => ({ ...p, topicsDiscussed: v }))} placeholder="e.g. Blood pressure, headaches, sleep" />
          <Field label="Medication changes" value={outcomeFields.medicationChanges} onChange={(v) => setOutcomeFields((p) => ({ ...p, medicationChanges: v }))} placeholder="e.g. Increased lisinopril to 20mg" />
          <Field label="New recommendations" value={outcomeFields.newRecommendations} onChange={(v) => setOutcomeFields((p) => ({ ...p, newRecommendations: v }))} placeholder="e.g. Low-sodium diet, walk 20 min/day" />
          <Field label="Tests ordered" value={outcomeFields.testsOrdered} onChange={(v) => setOutcomeFields((p) => ({ ...p, testsOrdered: v }))} placeholder="e.g. Blood panel, EKG" />
          <Field label="Follow-up appointments" value={outcomeFields.followUpAppointments} onChange={(v) => setOutcomeFields((p) => ({ ...p, followUpAppointments: v }))} placeholder="e.g. Cardiology in 3 months" />
          <Field label="Action items for me" value={outcomeFields.actionItems} onChange={(v) => setOutcomeFields((p) => ({ ...p, actionItems: v }))} placeholder="e.g. Pick up new prescription" />
          <Field label="Other notes" value={outcomeFields.notes} onChange={(v) => setOutcomeFields((p) => ({ ...p, notes: v }))} placeholder="Anything else worth remembering" />
          <button
            onClick={handleSaveOutcome}
            disabled={!canSaveOutcome}
            className="mt-4 w-full rounded-2xl gradient-hero text-primary-foreground py-4 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant disabled:opacity-50"
          >
            <ShieldCheck className="size-5" /> Save to Health Memory
          </button>
          <div className="text-[11px] text-muted-foreground mt-2 text-center">Saves to visit history, Health Memory, and follow-up tasks.</div>
        </Card>
      )}

      {stage === "done" && (
        <Card icon={ShieldCheck} title="Visit saved" tint="success">
          <div className="inline-flex items-center gap-1.5 text-success font-medium">
            <ShieldCheck className="size-4" /> Saved to Health Memory
          </div>
          <p className="text-muted-foreground text-[13px] mt-2">
            Your visit outcome, recording, and follow-up tasks are now in your timeline.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => navigate({ to: "/doctor" })} className="rounded-xl bg-secondary text-secondary-foreground py-3 font-medium inline-flex items-center justify-center gap-2">
              <ChevronLeft className="size-4" /> Back to doctor
            </button>
            <button onClick={() => navigate({ to: "/memory" })} className="rounded-xl gradient-hero text-primary-foreground py-3 font-semibold inline-flex items-center justify-center gap-2 shadow-elegant">
              <ListChecks className="size-4" /> Open Health Memory
            </button>
          </div>
        </Card>
      )}

      {!online && stage === "summary" && (
        <div className="rounded-xl bg-muted/40 border p-3 text-[12px] text-muted-foreground inline-flex items-start gap-2 mt-2">
          <AlertCircle className="size-3.5 mt-0.5" /> Offline — AI draft is unavailable, but you can still capture everything manually.
        </div>
      )}
    </>
  );
}

function StepBar({ stage }: { stage: Stage }) {
  const order: Stage[] = ["review", "speak", "consent", "recording", "summary"];
  const currentIdx = stage === "done" ? order.length - 1 : order.indexOf(stage);
  return (
    <div className="flex items-center gap-1 mb-4 px-1">
      {STEPS.map((s, i) => {
        const active = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 ${i <= currentIdx ? "bg-primary" : "bg-border"}`} />}
              <div className={`size-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
                current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {active && !current ? <Check className="size-3" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />}
            </div>
            <span className={`text-[10px] font-medium ${current ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Card({ icon: Icon, title, tint, children }: { icon: typeof Mic; title: string; tint: "primary" | "success" | "warning"; children: React.ReactNode }) {
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block mt-2">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      />
    </label>
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