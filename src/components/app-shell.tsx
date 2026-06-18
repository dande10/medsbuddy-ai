import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Pill, Stethoscope, Clock, Siren, User, CloudOff, Cloud, Wifi } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { stopSpeaking } from "@/lib/voice";
import { useConnectivity } from "@/lib/connectivity";
import { useApp } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/talk", icon: MessageCircle, label: "Talk" },
  { to: "/reminders", icon: Pill, label: "Meds" },
  { to: "/doctor", icon: Stethoscope, label: "Doctor" },
  { to: "/memory", icon: Clock, label: "Memory" },
  { to: "/emergency", icon: Siren, label: "SOS" },
] as const;

export function AppShell({ children, title, transparentHeader }: { children: ReactNode; title?: string; transparentHeader?: boolean }) {
  const location = useLocation();
  const { online, offline, simulated, hydrated } = useConnectivity();
  const setSimulateOffline = useApp((s) => s.setSimulateOffline);
  const simulateOffline = useApp((s) => s.simulateOffline);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

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

  useEffect(() => { stopSpeaking(); }, [location.pathname]);

  useEffect(() => {
    const onVis = () => { if (document.hidden) stopSpeaking(); };
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className={`sticky top-0 z-30 ${transparentHeader ? "bg-transparent" : "bg-background/80 backdrop-blur-xl border-b border-border/60"}`}>
        <div className="mx-auto max-w-2xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative size-10 rounded-2xl overflow-hidden grid place-items-center shadow-elegant">
              <div className="absolute inset-0 gradient-hero" />
              <div className="relative font-bold text-primary-foreground text-lg tracking-tight">M</div>
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-[15px]">MedsBuddy</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">AI Patient Advocate</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <StatusIndicator online={online} simulated={simulated} hydrated={hydrated} onClick={toggleOfflineDemo} />
            <Link to="/profile" className="size-10 rounded-full bg-card border grid place-items-center hover:bg-secondary transition-colors" aria-label="Profile">
              <User className="size-5 text-primary" />
            </Link>
          </div>
        </div>
        {offline && (
          <div className="bg-primary/10 text-primary text-center text-[12.5px] font-medium py-2 px-4 border-y border-primary/20 flex items-center justify-center gap-2">
            <CloudOff className="size-4" />
            <span>
              <strong className="font-semibold">Offline Mode Active</strong>
              <span className="text-foreground/70 font-normal"> — Your health information remains available{simulated ? " (demo)" : ""}.</span>
            </span>
          </div>
        )}
        {title && (
          <div className="mx-auto max-w-2xl px-5 pb-3 pt-1">
            <h1>{title}</h1>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-5 py-5 pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border/60" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-2xl grid grid-cols-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            const isSos = item.to === "/emergency";
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary" />
                )}
                <Icon
                  className={`size-[22px] transition-colors ${
                    isSos && active ? "text-destructive" :
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={`${
                  isSos && active ? "text-destructive" :
                  active ? "text-primary" : "text-muted-foreground"
                }`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <OfflineInfoDialog open={showOfflineModal} onOpenChange={setShowOfflineModal} />
    </div>
  );
}

function StatusIndicator({ online, simulated, hydrated, onClick }: { online: boolean; simulated: boolean; hydrated: boolean; onClick: () => void }) {
  // Connecting (gray) until we know
  const state = !hydrated ? "connecting" : online ? "online" : "offline";
  const label =
    state === "online" ? "Online" :
    state === "offline" ? (simulated ? "Offline (demo)" : "Offline Ready") :
    "Connecting";
  const Icon = state === "online" ? Cloud : state === "offline" ? CloudOff : Wifi;
  const tone =
    state === "online" ? "bg-success/10 text-success border-success/30" :
    state === "offline" ? "bg-primary/10 text-primary border-primary/30" :
    "bg-secondary text-muted-foreground border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${tone}`}
      title={`${label} — click to toggle Offline Demo Mode`}
      aria-label={`Connection status: ${label}. Toggle Offline Demo Mode.`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function OfflineInfoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const available = [
    "Emergency QR Code",
    "Doctor Summary",
    "Speak For Me",
    "Medication list",
    "Symptoms and health notes",
    "Health Memory timeline",
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
