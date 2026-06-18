import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getRecognition } from "@/lib/voice";

interface Props {
  onTranscript: (text: string) => void;
  busy?: boolean;
  speaking?: boolean;
  size?: "lg" | "xl";
  autoStart?: boolean;
}

export function MicButton({ onTranscript, busy, speaking, size = "xl", autoStart }: Props) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<ReturnType<typeof getRecognition>>(null);

  const start = () => {
    setError(null);
    const rec = getRecognition();
    if (!rec) {
      setError("Voice not supported in this browser");
      return;
    }
    recRef.current = rec;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      if (t) onTranscript(t);
    };
    rec.onerror = () => setError("Could not hear you. Try again.");
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  useEffect(() => {
    if (autoStart && !busy && !speaking && !listening) {
      const t = setTimeout(() => start(), 400);
      return () => clearTimeout(t);
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, busy, speaking]);

  const dim = size === "xl" ? "size-32" : "size-24";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={busy}
        aria-label={listening ? "Stop listening" : "Tap to speak"}
        className={`${dim} rounded-full grid place-items-center text-primary-foreground transition-all
          ${busy ? "bg-muted-foreground" : listening ? "bg-destructive mic-pulse" : speaking ? "bg-primary speaking-glow" : "bg-primary hover:scale-105 active:scale-95"}
        `}
      >
        {busy ? (
          <Loader2 className="size-12 animate-spin" />
        ) : speaking ? (
          <Volume2 className="size-14" />
        ) : listening ? (
          <MicOff className="size-14" />
        ) : (
          <Mic className="size-14" />
        )}
      </button>
      <div className="text-sm text-muted-foreground min-h-5">
        {busy
          ? "Thinking…"
          : speaking
            ? "Speaking…"
            : listening
              ? "Listening — tap to stop"
              : "Tap to speak"}
      </div>
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}