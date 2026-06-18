import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Pill, Stethoscope, Clock, AlertTriangle, Users, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { stopSpeaking } from "@/lib/voice";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/talk", icon: MessageCircle, label: "Talk" },
  { to: "/reminders", icon: Pill, label: "Meds" },
  { to: "/doctor", icon: Stethoscope, label: "Doctor" },
  { to: "/memory", icon: Clock, label: "Memory" },
  { to: "/emergency", icon: AlertTriangle, label: "SOS" },
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

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const location = useLocation();
  const online = useOnline();

  // Stop any speech on route change, tab hide, page unload
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b">
        <div className="mx-auto max-w-2xl px-5 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
              M
            </div>
            <div className="leading-tight">
              <div className="font-semibold">MedsBuddy</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Your AI Patient Advocate</div>
            </div>
          </Link>
          <Link
            to="/profile"
            className="size-10 rounded-full bg-secondary text-secondary-foreground grid place-items-center"
            aria-label="Profile"
          >
            <User className="size-5" />
          </Link>
        </div>
        {!online && (
          <div className="bg-accent text-accent-foreground text-center text-sm font-medium py-1.5 px-4">
            ● Offline Mode Active — your data is safe and accessible
          </div>
        )}
        {title && (
          <div className="mx-auto max-w-2xl px-5 pb-3 pt-1">
            <h1>{title}</h1>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-5 py-5 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t">
        <div className="mx-auto max-w-2xl grid grid-cols-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-6 ${active ? "stroke-[2.4]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function CaregiverLink() {
  return (
    <Link to="/caregiver" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
      <Users className="size-4" /> Caregiver dashboard
    </Link>
  );
}