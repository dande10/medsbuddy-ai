import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AiOrb } from "@/components/ai-orb";
import { useApp, adherence } from "@/lib/store";
import {
  Pill,
  Stethoscope,
  Siren,
  Activity,
  Mic,
  FileText,
  QrCode,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Check,
  Network,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedsBuddy — Your AI Patient Advocate" },
      {
        name: "description",
        content:
          "Voice-first AI healthcare companion for medications, symptoms, doctor visits, and emergencies.",
      },
      { property: "og:title", content: "MedsBuddy — Your AI Patient Advocate" },
      {
        property: "og:description",
        content: "Premium voice-first AI healthcare advocate that works offline.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { profile, doses, meds, symptoms, appointments } = useApp();
  const adh = adherence(doses, 7);
  const firstName = profile.name ? profile.name.split(" ")[0] : "";
  const last24 = Date.now() - 86400000;
  const dosesToday = doses.filter((d) => d.at >= last24);
  const sympToday = symptoms.filter((s) => s.at >= last24);
  const upcoming = appointments.filter((a) => a.at >= Date.now()).sort((a, b) => a.at - b.at)[0];
  const profileReady = Boolean(
    profile.name && (meds.length || profile.allergies || profile.conditions),
  );

  // Compute time-based greeting on the client only to avoid SSR hydration mismatch.
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <AppShell>
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[28px] gradient-hero text-primary-foreground p-6 shadow-elegant mb-5"
      >
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 size-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] opacity-80 font-medium">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </div>
            <h2 className="text-[26px] font-bold leading-tight mt-1 tracking-tight">
              Your AI Patient
              <br />
              Advocate is here.
            </h2>
            <p className="text-sm opacity-85 mt-2 max-w-[20rem]">
              Ask anything about your health, meds, or visits — out loud or by typing.
            </p>
          </div>
          <AiOrb size={88} />
        </div>

        <button
          onClick={() => navigate({ to: "/talk" })}
          className="relative mt-5 w-full rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur border border-white/25 px-5 py-3.5 flex items-center gap-3 transition-colors"
        >
          <div className="size-10 rounded-full bg-white/95 grid place-items-center">
            <Mic className="size-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <div className="font-semibold text-[15px]">Tap to talk</div>
            <div className="text-[12px] opacity-80">"Did I take my meds today?"</div>
          </div>
          <ChevronRight className="size-5 opacity-80" />
        </button>
      </motion.div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        <QuickAction to="/talk" icon={Mic} label="Ask" />
        <QuickAction to="/doctor" icon={FileText} label="Speak" sub="For me" />
        <QuickAction to="/emergency" icon={QrCode} label="SOS" danger />
        <QuickAction to="/architecture" icon={Network} label="Arch" sub="Judges" />
      </div>

      {/* OFFLINE READY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-primary/25 bg-primary/[0.04] p-4 mb-5"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <CloudOff className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] tracking-tight">Offline Ready</div>
            <div className="text-[12px] text-muted-foreground">
              Works without internet — even in emergencies.
            </div>
          </div>
          <span className="rounded-full bg-success/15 text-success text-[11px] font-semibold px-2.5 py-1">
            Available
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
          {["Doctor Summary", "Emergency QR", "Medications", "Symptoms", "Visit Summaries"].map(
            (f) => (
              <li key={f} className="inline-flex items-center gap-1.5 text-foreground/80">
                <Check className="size-3.5 text-primary shrink-0" />
                {f}
              </li>
            ),
          )}
        </ul>
      </motion.div>

      {/* SNAPSHOT */}
      <div className="flex items-baseline justify-between mb-3">
        <h2>Today's snapshot</h2>
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <SnapshotCard
          to="/reminders"
          icon={Pill}
          tint="primary"
          label="Medications"
          value={
            meds.length === 0
              ? "Set up"
              : `${dosesToday.filter((d) => d.status === "taken").length}/${dosesToday.length || meds.length}`
          }
          sub={meds.length === 0 ? "Add your first med" : "Doses today"}
        />
        <SnapshotCard
          to="/symptoms"
          icon={Activity}
          tint="warning"
          label="Symptoms"
          value={String(sympToday.length)}
          sub={sympToday.length === 0 ? "Nothing logged" : "Logged in 24h"}
        />
        <SnapshotCard
          to="/doctor"
          icon={Stethoscope}
          tint="success"
          label="Doctor visit"
          value={
            upcoming
              ? new Date(upcoming.at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "Ready"
          }
          sub={upcoming ? `with ${upcoming.doctor}` : "Generate summary"}
        />
        <SnapshotCard
          to="/emergency"
          icon={profileReady ? ShieldCheck : AlertTriangle}
          tint={profileReady ? "success" : "danger"}
          label="Emergency"
          value={profileReady ? "Ready" : "Incomplete"}
          sub={profileReady ? "QR ready to share" : "Add your profile"}
        />
      </div>

      {/* Adherence ribbon */}
      <Link
        to="/reminders"
        className="block rounded-2xl border bg-card shadow-card p-4 mb-4 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">7-day adherence</div>
          <div className="text-xs text-muted-foreground">
            {doses.filter((d) => d.at > Date.now() - 7 * 86400000).length} doses
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${adh}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background:
                adh >= 80
                  ? "linear-gradient(90deg, var(--success), var(--primary-glow))"
                  : adh >= 50
                    ? "linear-gradient(90deg, var(--warning), var(--primary-glow))"
                    : "linear-gradient(90deg, var(--destructive), var(--warning))",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-2xl font-bold tracking-tight">{adh}%</div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-success" /> on track
          </div>
        </div>
      </Link>

      {/* Onboarding nudge */}
      {!profileReady && (
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4"
        >
          <div className="size-10 rounded-xl bg-primary/15 grid place-items-center text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[15px]">Complete your health profile</div>
            <div className="text-xs text-muted-foreground">
              Used for AI replies, doctor summary, and emergency QR.
            </div>
          </div>
          <ChevronRight className="size-5 text-primary" />
        </Link>
      )}

      {/* SOS quick access */}
      <Link
        to="/emergency"
        className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-4"
      >
        <div className="size-10 rounded-xl bg-destructive/10 grid place-items-center text-destructive sos-pulse">
          <Siren className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-[15px]">Emergency QR</div>
          <div className="text-xs text-muted-foreground">
            For paramedics & first responders — works offline
          </div>
        </div>
        <ChevronRight className="size-5 text-destructive" />
      </Link>
    </AppShell>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  sub,
  danger,
}: {
  to: "/talk" | "/doctor" | "/emergency" | "/memory" | "/symptoms" | "/architecture";
  icon: typeof Mic;
  label: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center justify-center rounded-2xl bg-card border shadow-card p-3 active:scale-95 transition-transform"
    >
      <div
        className={`size-10 rounded-xl grid place-items-center mb-1.5 ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"} group-hover:scale-110 transition-transform`}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-[12px] font-semibold leading-tight">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground leading-tight">{sub}</div>}
    </Link>
  );
}

function SnapshotCard({
  to,
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  to: "/reminders" | "/memory" | "/symptoms" | "/doctor" | "/emergency";
  icon: typeof Pill;
  label: string;
  value: string;
  sub: string;
  tint: "primary" | "success" | "warning" | "danger";
}) {
  const tintClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/10 text-destructive",
  }[tint];
  return (
    <Link
      to={to}
      className="rounded-2xl bg-card border shadow-card p-4 active:scale-[0.98] transition-transform"
    >
      <div className={`size-9 rounded-xl grid place-items-center ${tintClass}`}>
        <Icon className="size-[18px]" />
      </div>
      <div className="text-[12px] text-muted-foreground mt-3 font-medium">{label}</div>
      <div className="text-xl font-bold tracking-tight mt-0.5">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>
    </Link>
  );
}
