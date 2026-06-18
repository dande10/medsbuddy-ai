import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp, adherence } from "@/lib/store";
import { MessageCircle, Pill, Stethoscope, AlertTriangle, Clock, Users, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedsBuddy — Your AI Patient Advocate" },
      { name: "description", content: "Voice-first healthcare companion for medication, symptoms, doctor visits, and emergencies." },
      { property: "og:title", content: "MedsBuddy — Your AI Patient Advocate" },
      { property: "og:description", content: "Voice-first healthcare companion that works offline." },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, doses, meds, symptoms } = useApp();
  const adh = adherence(doses, 7);
  const greet = profile.name ? `Hello, ${profile.name.split(" ")[0]}` : "Hello";

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-muted-foreground text-sm">{greet}</p>
        <h1 className="mt-1">How can I help today?</h1>
      </section>

      <Link
        to="/talk"
        className="block rounded-3xl bg-primary text-primary-foreground p-6 mb-5 shadow-lg shadow-primary/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">Talk to your advocate</div>
            <div className="text-2xl font-semibold mt-1">Ask anything</div>
            <div className="text-sm opacity-80 mt-1">"Did I take my pills today?"</div>
          </div>
          <div className="size-16 rounded-full bg-primary-foreground/15 grid place-items-center">
            <MessageCircle className="size-8" />
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Stat label="Adherence (7d)" value={`${adh}%`} tone={adh >= 80 ? "good" : adh >= 50 ? "warn" : "bad"} />
        <Stat label="Medications" value={String(meds.length)} />
        <Stat label="Symptoms (7d)" value={String(symptoms.filter((s) => s.at > Date.now() - 7 * 86400000).length)} />
        <Stat label="Status" value={profile.name ? "Set up" : "Add profile"} />
      </div>

      <div className="space-y-2">
        <Quick to="/reminders" icon={Pill} label="Medications" sub="Track doses & adherence" />
        <Quick to="/doctor" icon={Stethoscope} label="Doctor visit prep" sub="Summary you can play aloud" />
        <Quick to="/memory" icon={Clock} label="Health memory" sub="Timeline of everything" />
        <Quick to="/emergency" icon={AlertTriangle} label="Emergency QR" sub="For first responders" tone="danger" />
        <Quick to="/caregiver" icon={Users} label="Caregiver dashboard" sub="Share with family" />
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const color =
    tone === "good" ? "text-primary" : tone === "warn" ? "text-accent-foreground" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl bg-card border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Quick({
  to,
  icon: Icon,
  label,
  sub,
  tone,
}: {
  to: "/reminders" | "/doctor" | "/memory" | "/emergency" | "/caregiver";
  icon: typeof Pill;
  label: string;
  sub: string;
  tone?: "danger";
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-4 rounded-2xl border bg-card p-4 ${tone === "danger" ? "border-destructive/30" : ""}`}
    >
      <div className={`size-12 rounded-xl grid place-items-center ${tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary"}`}>
        <Icon className="size-6" />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  );
}
