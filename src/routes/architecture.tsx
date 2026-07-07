import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  FileText,
  Headphones,
  Lock,
  Mic,
  Server,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "MedsBuddy Architecture — Judge View" },
      {
        name: "description",
        content:
          "Judge-facing architecture view for MedsBuddy: Qwen Cloud, Alibaba ECS, ElevenLabs STT, and visit memory.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const flow = [
  {
    label: "Before Visit",
    icon: Bot,
    title: "Patient talks naturally",
    detail: "Qwen extracts symptoms, medications, concerns, timeline, and questions.",
  },
  {
    label: "During Visit",
    icon: Stethoscope,
    title: "Agent speaks with doctor",
    detail: "With consent, ElevenLabs transcribes and Qwen decides when MedsBuddy should answer.",
  },
  {
    label: "After Visit",
    icon: FileText,
    title: "Summary and memory",
    detail: "Qwen generates medications, follow-up, warning signs, and visit memory stored on ECS.",
  },
];

const stack = [
  {
    icon: Mic,
    name: "MedsBuddy App",
    role: "Patient interface for Talk, Doctor Visit, Emergency QR, and Visit Memory.",
  },
  {
    icon: Server,
    name: "Alibaba ECS FastAPI Backend",
    role: "Owns API routes, Qwen calls, STT/TTS forwarding, and SQLite visit memory.",
  },
  {
    icon: Cloud,
    name: "Qwen Cloud",
    role: "Structured extraction, doctor-agent reasoning, care-plan gap detection, and summaries.",
  },
  {
    icon: Headphones,
    name: "ElevenLabs STT/TTS",
    role: "Speech-to-text for the live doctor visit and voice output for MedsBuddy.",
  },
  {
    icon: Database,
    name: "Visit Memory DB",
    role: "Stores patient-approved visit summaries for later doctor questions and continuity.",
  },
];

const proofPoints = [
  "Qwen-powered agent-router classifies app actions and live doctor intents.",
  "Doctor visit mode requires doctor consent before MedsBuddy participates.",
  "Live agent can answer doctor questions from approved patient context only.",
  "Care-plan gap checker asks for missing medication, follow-up, or warning-sign details.",
  "Visit summary endpoint creates patient-friendly and caregiver-shareable summaries.",
  "Approved visit memory is stored on Alibaba ECS and reused when relevant.",
];

function ArchitecturePage() {
  return (
    <AppShell title="Architecture">
      <section className="space-y-5">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <ShieldCheck className="size-7" />
            </div>
            <div className="min-w-0">
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                MedsBuddy System Architecture
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
                MedsBuddy is an AI Patient Advocate powered by Qwen Cloud and deployed through
                Alibaba ECS backend APIs. It supports patients before, during, and after a doctor
                visit.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border bg-background p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">End-to-End Flow</h2>
            <Link
              to="/doctor"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Demo
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <Icon className="size-6" />
                    </div>
                    {index < flow.length - 1 && <div className="my-1 h-10 w-px bg-border" />}
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{item.title}</div>
                    <p className="mt-1 text-base leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Runtime Architecture</h2>
          <div className="grid gap-3">
            {stack.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="rounded-2xl border bg-card p-5 shadow-card">
                  <div className="flex gap-4">
                    <div className="size-12 rounded-xl bg-secondary text-primary grid place-items-center shrink-0">
                      <Icon className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold">{item.name}</div>
                      <p className="mt-1 text-base leading-6 text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <Lock className="size-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Trust Boundary</h2>
          </div>
          <div className="grid gap-3 text-base leading-6 text-muted-foreground">
            <p>
              Patient context is approved before the live doctor visit. During the appointment,
              MedsBuddy only responds from approved patient information or doctor-stated care-plan
              details.
            </p>
            <p>
              The backend stores approved visit memory and uses it for continuity when the doctor
              asks about prior visits or medication context.
            </p>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
