import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, ClipboardList, Mic, Pill, ShieldCheck, Sparkles, Volume2, X } from "lucide-react";

import type {
  ConversationMessage,
  DemoStage,
  DoctorVisitConsent,
  SpeakerMode,
  VisitSummaryData,
} from "./doctor-visit-logic";

export function AIAdvocateDemo({
  stage,
  patientSummary,
  messages,
  wakeStatus,
  selectedSpeaker,
  simulatedTranscript,
  onSelectedSpeakerChange,
  onSimulatedTranscriptChange,
  onSubmitTranscript,
  onStartVisit,
  onEndVisit,
  doctorVisitConsent,
  onDoctorConsents,
  onDoctorDeclines,
  voiceSupported,
  voiceListening,
  voiceSpeaking,
}: {
  stage: DemoStage;
  patientSummary: string;
  messages: ConversationMessage[];
  wakeStatus: string;
  selectedSpeaker: SpeakerMode;
  simulatedTranscript: string;
  onSelectedSpeakerChange: (speaker: SpeakerMode) => void;
  onSimulatedTranscriptChange: (value: string) => void;
  onSubmitTranscript: () => void;
  onStartVisit: () => void;
  onEndVisit: () => void;
  doctorVisitConsent: DoctorVisitConsent;
  onDoctorConsents: () => void;
  onDoctorDeclines: () => void;
  voiceSupported: boolean;
  voiceListening: boolean;
  voiceSpeaking: boolean;
}) {
  const active = stage === "active";
  const visitCanListen = doctorVisitConsent === "granted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      {stage === "idle" && (
        <>
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">Patient context</div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{patientSummary}</p>
          </div>
          <button
            onClick={onStartVisit}
            className="w-full rounded-2xl gradient-hero text-primary-foreground py-5 px-4 text-lg font-semibold inline-flex items-center justify-center gap-3 shadow-elegant"
          >
            <Sparkles className="size-6" /> Start Live Visit
          </button>
        </>
      )}

      {active && (
        <>
          {visitCanListen && (
            <div className="mb-3 rounded-2xl border bg-background p-3">
              <div className="text-[12px] font-semibold text-primary">
                Speaker detection: {selectedSpeaker === "Auto" ? "Automatic" : selectedSpeaker}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                MedsBuddy labels speech as Doctor or Patient from the words spoken. Use these only
                if you need to correct the next line.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["Auto", "Doctor", "Patient"] as SpeakerMode[]).map((speaker) => (
                  <button
                    key={speaker}
                    onClick={() => onSelectedSpeakerChange(speaker)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      selectedSpeaker === speaker
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {speaker}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 mb-3 flex items-center gap-3">
            <span className="relative grid place-items-center size-10 rounded-full bg-primary/20">
              {visitCanListen && (
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              )}
              <Mic className="size-5 text-primary relative" />
            </span>
            <div>
              <div className="font-semibold text-primary">{wakeStatus}</div>
              <div className="text-[12px] text-muted-foreground">
                {!visitCanListen
                  ? voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : doctorVisitConsent === "declined"
                      ? "MedsBuddy is not participating because the doctor did not consent."
                      : "MedsBuddy is waiting for the doctor's consent before listening."
                  : voiceSpeaking
                    ? "MedsBuddy is speaking out loud."
                    : voiceSupported
                      ? voiceListening
                        ? "Microphone is listening. MedsBuddy will speak to the doctor for the patient when needed."
                        : "Microphone is not active yet. Use the transcript box if permission is blocked."
                      : "This browser does not support speech recognition. Use the transcript box below."}
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-3 mb-3">
            <div className="text-[12px] font-semibold text-primary mb-1">
              AI Patient Advocate patient context
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{patientSummary}</p>
          </div>
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                Start speaking. MedsBuddy will label the speaker automatically.
              </div>
            ) : (
              messages.map((row, index) => (
                <ConversationRow
                  key={`${row.speaker}-${index}`}
                  speaker={row.speaker}
                  text={row.text}
                />
              ))
            )}
          </div>
          {doctorVisitConsent === "pending" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                onClick={onDoctorConsents}
                className="rounded-2xl bg-primary text-primary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor consents
              </button>
              <button
                onClick={onDoctorDeclines}
                className="rounded-2xl bg-secondary text-secondary-foreground py-4 px-4 text-sm font-semibold"
              >
                Doctor does not consent
              </button>
            </div>
          )}
          {visitCanListen && (
            <div className="mt-4 rounded-2xl border bg-background p-3">
              <label htmlFor="wake-transcript" className="text-[12px] font-semibold text-primary">
                Simulate live transcript
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="wake-transcript"
                  value={simulatedTranscript}
                  onChange={(e) => onSimulatedTranscriptChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmitTranscript();
                  }}
                  placeholder='Try: "Doctor, can you explain if this dizziness is from medication?"'
                  className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={onSubmitTranscript}
                  disabled={!simulatedTranscript.trim()}
                  className="rounded-xl bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Add to visit
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                MedsBuddy listens for clinical context and speaks to the doctor on the patient's
                behalf when an important clarification is missing.
              </p>
            </div>
          )}
          <button
            onClick={onEndVisit}
            className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold inline-flex items-center justify-center gap-2"
          >
            <ClipboardList className="size-5" /> End Visit
          </button>
        </>
      )}

      {stage === "summary" && (
        <div className="rounded-2xl bg-success/10 border border-success/30 p-4 flex items-start gap-3">
          <div className="size-10 rounded-xl bg-success/20 text-success grid place-items-center shrink-0">
            <Check className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-success">AI Patient Advocate visit completed</div>
            <p className="text-[13px] text-muted-foreground mt-1">
              The structured visit summary is ready below and saved to patient history.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ConsentModal({
  patientConsent,
  doctorConsent,
  onPatientConsentChange,
  onDoctorConsentChange,
  onBeginVisit,
  onClose,
}: {
  patientConsent: boolean;
  doctorConsent: boolean;
  onPatientConsentChange: (value: boolean) => void;
  onDoctorConsentChange: (value: boolean) => void;
  onBeginVisit: () => void;
  onClose: () => void;
}) {
  const ready = patientConsent && doctorConsent;
  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-2xl gradient-hero grid place-items-center text-primary-foreground shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-muted-foreground font-medium">Consent required</div>
            <h2 className="text-[18px] font-semibold">Start AI Patient Advocate visit</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-secondary grid place-items-center"
            aria-label="Close consent modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 mt-5">
          <ConsentCheck
            checked={patientConsent}
            label="Patient consent: MedsBuddy may listen and speak on my behalf."
            onChange={onPatientConsentChange}
          />
          <ConsentCheck
            checked={doctorConsent}
            label="Doctor consent: MedsBuddy may participate in this visit."
            onChange={onDoctorConsentChange}
          />
        </div>

        <button
          onClick={onBeginVisit}
          disabled={!ready}
          className="mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-semibold disabled:opacity-50"
        >
          Begin Listening
        </button>
      </motion.div>
    </div>
  );
}

function ConsentCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border bg-background p-4 text-[15px] font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-primary"
      />
      {label}
    </label>
  );
}

function ConversationRow({ speaker, text }: { speaker: string; text: string }) {
  const isAdvocate = speaker === "MedsBuddy";
  return (
    <div
      className={`rounded-xl border p-3 ${
        isAdvocate ? "bg-primary/5 border-primary/20" : "bg-background"
      }`}
    >
      <div
        className={`text-[12px] font-semibold ${isAdvocate ? "text-primary" : "text-muted-foreground"}`}
      >
        {speaker}
      </div>
      <div className="text-[14px] leading-relaxed mt-1">{text}</div>
    </div>
  );
}

export function VisitSummary({
  summary,
  onSpeakSummary,
  summarySpeaking,
}: {
  summary: VisitSummaryData;
  onSpeakSummary: () => void;
  summarySpeaking: boolean;
}) {
  return (
    <Section icon={ClipboardList} title="Visit Summary" tint="success">
      <div className="space-y-3">
        <button
          onClick={onSpeakSummary}
          className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Volume2 className="size-4" />
          {summarySpeaking ? "Speaking visit summary..." : "Speak Brief Summary"}
        </button>
        <SummaryBlock title="Visit summary" body={summary.visitSummary} />
        <SummaryBlock title="Diagnosis" body={summary.diagnosis} />
        <SummaryBlock title="Medication changes" body={summary.medicationChanges} />
        <SummaryBlock title="Follow-up instructions" body={summary.followUpInstructions} />
        <SummaryBlock
          title="Questions for next appointment"
          body={summary.nextAppointmentQuestions}
        />
        <SummaryBlock title="Patient concerns" body={summary.patientConcerns} />
        <SummaryBlock title="Doctor assessment" body={summary.doctorAssessment} />
        <SummaryBlock
          title="MedsBuddy questions asked on behalf of patient"
          body={summary.medsBuddyQuestions}
        />
        <SummaryBlock title="Doctor answers" body={summary.doctorAnswers} />
        <SummaryBlock title="Medication guidance" body={summary.medicationGuidance} />
        <SummaryBlock title="Warning signs" body={summary.warningSigns} />
        <SummaryBlock title="Follow-up plan" body={summary.followUpPlan} />
        <SummaryBlock
          title="Simple patient-friendly explanation"
          body={summary.simpleExplanation}
        />
        <SummaryBlock title="Caregiver share summary" body={summary.caregiverSummary} />
      </div>
    </Section>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-[12px] font-semibold text-primary mb-1">{title}</div>
      <div className="text-[14px] leading-relaxed">{body}</div>
    </div>
  );
}

export function MetricSection({
  icon,
  title,
  value,
  label,
  children,
}: {
  icon: typeof Pill;
  title: string;
  value: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Section icon={icon} title={title} tint="primary">
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mb-3">{label}</div>
      {children}
    </Section>
  );
}

export function Section({
  icon: Icon,
  title,
  tint,
  children,
}: {
  icon: typeof Pill;
  title: string;
  tint: "primary" | "success" | "warning";
  children: ReactNode;
}) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border shadow-card p-4 mb-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`size-8 rounded-lg grid place-items-center ${tintClass}`}>
          <Icon className="size-4" />
        </div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}
