import { Link, useLocation } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Home,
  HeartPulse,
  ClipboardList,
  Pill,
  Stethoscope,
  Clock,
  Siren,
  User,
  CloudOff,
  Cloud,
  Wifi,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { stopSpeaking } from "@/lib/voice";
import { useConnectivity } from "@/lib/connectivity";
import { useApp } from "@/lib/store";
import medsBuddyImage from "@/assets/medsBuddy.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/talk", icon: ClipboardList, label: "Prepare Visit", mobileLabel: "Prepare" },
  { to: "/reminders", icon: Pill, label: "Meds" },
  { to: "/doctor", icon: Stethoscope, label: "Doctor" },
  { to: "/memory", icon: Clock, label: "Visits" },
  { to: "/emergency", icon: Siren, label: "SOS" },
] as const;

const mobileNavItems = navItems.filter((item) => item.to !== "/emergency");

export function AppShell({
  children,
  title,
  transparentHeader,
}: {
  children: ReactNode;
  title?: string;
  transparentHeader?: boolean;
}) {
  const location = useLocation();
  const { online, offline, simulated, hydrated } = useConnectivity();
  const setSimulateOffline = useApp((s) => s.setSimulateOffline);
  const simulateOffline = useApp((s) => s.simulateOffline);
  const profile = useApp((s) => s.profile);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const firstName = profile.name?.split(" ")[0] || "Patient";

  const toggleOfflineDemo = () => {
    if (!simulateOffline) {
      setSimulateOffline(true);
      setShowOfflineModal(true);
    } else {
      setSimulateOffline(false);
      toast.success("Online mode restored", {
        description: "AI features are available again.",
      });
    }
  };

  useEffect(() => {
    stopSpeaking();
  }, [location.pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopSpeaking();
    };
    const onUnload = () => stopSpeaking();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden lg:flex lg:w-[310px] xl:w-[330px] shrink-0 flex-col border-r border-border/70 bg-card/80 backdrop-blur-xl px-6 py-7">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative size-12 rounded-2xl overflow-hidden grid place-items-center bg-primary text-primary-foreground shadow-card ring-1 ring-primary/15">
            <HeartPulse className="size-7" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-xl">MedsBuddy</div>
            <div className="text-sm text-muted-foreground">AI Patient Advocate</div>
          </div>
        </Link>

        <nav className="mt-10 space-y-2" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const isSos = item.to === "/emergency";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors ${
                  isSos && active
                    ? "bg-destructive/10 text-destructive"
                    : active
                      ? "bg-primary/10 text-primary"
                      : isSos
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-foreground/75 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-5">
          <div className="relative overflow-hidden rounded-2xl border bg-background p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
                <HeartPulse className="size-5" />
              </div>
              <img
                src={medsBuddyImage}
                alt="MedsBuddy assistant"
                className="ml-auto h-24 w-auto object-contain"
              />
            </div>
            <div className="mt-3 font-semibold">Need help?</div>
            <p className="mt-1 text-sm text-muted-foreground">I'm here to support you 24/7</p>
            <Link
              to="/talk"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary/25 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              Chat with MedsBuddy
            </Link>
          </div>

          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-2xl border bg-background p-4 shadow-card hover:bg-secondary/50"
          >
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <HeartPulse className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{firstName}</div>
              <div className="text-sm text-muted-foreground">View Profile</div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-30 lg:hidden ${transparentHeader ? "bg-transparent" : "bg-background/80 backdrop-blur-xl border-b border-border/60"}`}
        >
          <div className="mx-auto w-full px-5 py-3.5 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="relative size-10 rounded-xl overflow-hidden grid place-items-center bg-primary text-primary-foreground shadow-card ring-1 ring-primary/15">
                <HeartPulse className="size-6" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-base">MedsBuddy</div>
                <div className="text-sm text-muted-foreground -mt-0.5">AI Patient Advocate</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <StatusIndicator
                online={online}
                simulated={simulated}
                hydrated={hydrated}
                onClick={toggleOfflineDemo}
              />
              <Link
                to="/profile"
                className="size-10 rounded-xl bg-card border grid place-items-center hover:bg-secondary transition-colors shadow-card"
                aria-label="Profile"
              >
                <User className="size-5 text-primary" />
              </Link>
            </div>
          </div>
        </header>

        <div className="hidden h-24 items-center justify-end gap-4 border-b border-border/70 bg-background/80 px-8 backdrop-blur-xl lg:flex 2xl:px-10">
          <StatusIndicator
            online={online}
            simulated={simulated}
            hydrated={hydrated}
            onClick={toggleOfflineDemo}
          />
          <Link
            to="/profile"
            className="size-12 rounded-2xl bg-card border grid place-items-center hover:bg-secondary transition-colors shadow-card"
            aria-label="Profile"
          >
            <User className="size-5 text-primary" />
          </Link>
        </div>

        <div>
          {offline && (
            <div className="bg-primary/10 text-primary text-center text-[12.5px] font-medium py-2 px-4 border-y border-primary/20 flex items-center justify-center gap-2">
              <CloudOff className="size-4" />
              <span>
                <strong className="font-semibold">Offline Mode Active</strong>
                <span className="text-foreground/70 font-normal">
                  {" "}
                  — Your health information remains available{simulated ? " (demo)" : ""}.
                </span>
              </span>
            </div>
          )}
          {title && (
            <div className="mx-auto w-full px-5 lg:px-10 2xl:px-14 pb-3 pt-1">
              <h1>{title}</h1>
            </div>
          )}
        </div>

        <main className="flex-1 mx-auto w-full px-5 lg:px-10 2xl:px-14 py-5 pb-28 lg:pb-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/60 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full grid grid-cols-5 px-2 lg:px-10 2xl:px-14">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center gap-1.5 pt-3 pb-2.5 text-xs font-semibold"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full bg-primary" />
                )}
                <Icon
                  className={`size-[21px] transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={`${active ? "text-primary" : "text-muted-foreground"}`}>
                  {"mobileLabel" in item ? item.mobileLabel : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <OfflineInfoDialog open={showOfflineModal} onOpenChange={setShowOfflineModal} />
    </div>
  );
}

function StatusIndicator({
  online,
  simulated,
  hydrated,
  onClick,
}: {
  online: boolean;
  simulated: boolean;
  hydrated: boolean;
  onClick: () => void;
}) {
  // Connecting (gray) until we know
  const state = !hydrated ? "connecting" : online ? "online" : "offline";
  const label =
    state === "online"
      ? "Online"
      : state === "offline"
        ? simulated
          ? "Offline (demo)"
          : "Offline Ready"
        : "Connecting";
  const Icon = state === "online" ? Cloud : state === "offline" ? CloudOff : Wifi;
  const tone =
    state === "online"
      ? "bg-success/10 text-success border-success/30"
      : state === "offline"
        ? "bg-primary/10 text-primary border-primary/30"
        : "bg-secondary text-muted-foreground border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${tone}`}
      title={`${label} — click to toggle Offline Demo Mode`}
      aria-label={`Connection status: ${label}. Toggle Offline Demo Mode.`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function OfflineInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const available = [
    "Emergency QR Code",
    "Doctor visit summaries",
    "Speak For Me",
    "Medication list",
    "Symptoms and health notes",
  ];
  const unavailable = [
    "AI medical chat",
    "Tavily medical search",
    "Cloud sync",
    "Live caregiver updates",
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-2">
            <CloudOff className="size-6" />
          </div>
          <DialogTitle>Offline Mode Active</DialogTitle>
          <DialogDescription>
            MedsBuddy can still help with important health information even without internet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div>
            <div className="font-semibold text-foreground mb-1.5">Available offline</div>
            <ul className="space-y-1">
              {available.map((x) => (
                <li key={x} className="flex items-center gap-2 text-foreground/80">
                  <span className="text-success font-semibold">✓</span> {x}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1.5">Not available offline</div>
            <ul className="space-y-1">
              {unavailable.map((x) => (
                <li key={x} className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-destructive font-semibold">✕</span> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold"
          >
            Got it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
