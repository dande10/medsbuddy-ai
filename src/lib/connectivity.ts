import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

/**
 * Single source of truth for "are we online?".
 * Combines the browser's navigator.onLine signal with the in-app
 * "Simulate Offline Mode" toggle for demos.
 */
export function useConnectivity() {
  const simulateOffline = useApp((s) => s.simulateOffline);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const update = () => setNetworkOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const online = hydrated ? networkOnline && !simulateOffline : true;
  return {
    online,
    offline: !online,
    simulated: simulateOffline,
    networkOnline,
    hydrated,
  };
}

/** Synchronous helper for non-hook code (e.g. inside event handlers). */
export function isCurrentlyOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  const sim = useApp.getState().simulateOffline;
  return navigator.onLine && !sim;
}