import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Pill, Stethoscope, Clock, Siren, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { stopSpeaking } from "@/lib/voice";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/talk", icon: MessageCircle, label: "Talk" },
  { to: "/reminders", icon: Pill, label: "Meds" },
  { to: "/doctor", icon: Stethoscope, label: "Doctor" },
  { to: "/memory", icon: Clock, label: "Memory" },
  { to: "/emergency", icon: Siren, label: "SOS" },
] as const;

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function AppShell({ children, title, transparentHeader }: { children: ReactNode; title?: string; transparentHeader?: boolean }) {
  const location = useLocation();
  const online = useOnline();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

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
          <Link to="/profile" className="size-10 rounded-full bg-card border grid place-items-center hover:bg-secondary transition-colors" aria-label="Profile">
            <User className="size-5 text-primary" />
          </Link>
        </div>
        {!online && (
          <div className="bg-warning/15 text-foreground text-center text-xs font-medium py-1.5 px-4 border-y border-warning/30">
            <span className="inline-block size-1.5 rounded-full bg-warning mr-2 align-middle" />
            Offline Mode Active — your data is safe
          </div>
        )}
        {title && (
          <div className="mx-auto max-w-2xl px-5 pb-3 pt-1">
            <h1>{title}</h1>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={isClient ? { opacity: 0, y: 8 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 mx-auto max-w-2xl w-full px-5 py-5 pb-28"
        >
          {children}
        </motion.main>
      </AnimatePresence>

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
                  <motion.span
                    layoutId="navActivePill"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
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
    </div>
  );
}
