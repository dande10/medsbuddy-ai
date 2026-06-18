// Browser speech utilities (client-only)

let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Speak via ElevenLabs; fallback to browser SpeechSynthesis if offline/fails. */
export async function speak(text: string, onEnd?: () => void): Promise<void> {
  stopSpeaking();
  if (!text.trim()) return;

  // Try ElevenLabs first (requires network)
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        currentUrl = url;
        audio.onended = () => {
          if (currentUrl === url) {
            URL.revokeObjectURL(url);
            currentUrl = null;
            currentAudio = null;
          }
          onEnd?.();
        };
        await audio.play();
        return;
      }
    } catch {
      /* fall through to fallback */
    }
  }

  // Fallback: browser TTS (offline)
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } else {
    onEnd?.();
  }
}

// Speech recognition (browser Web Speech API)
type SRConstructor = new () => SpeechRecognition;
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [i: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}

export function getRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = false;
  rec.interimResults = false;
  return rec;
}