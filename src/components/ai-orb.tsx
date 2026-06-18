import { motion } from "framer-motion";

interface Props {
  size?: number;
  speaking?: boolean;
  listening?: boolean;
  thinking?: boolean;
}

/** Premium animated AI avatar — conic gradient orb that reacts to state. */
export function AiOrb({ size = 96, speaking, listening, thinking }: Props) {
  const scale = speaking ? [1, 1.07, 1] : listening ? [1, 1.03, 1] : 1;
  const duration = speaking ? 1.1 : listening ? 1.8 : 4;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* outer soft glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, oklch(0.68 0.20 262 / 0.55), transparent 70%)",
        }}
      />
      {/* spinning conic orb */}
      <motion.div
        className="ai-orb rounded-full relative overflow-hidden"
        style={{ width: size * 0.92, height: size * 0.92 }}
        animate={{ scale }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* glass highlight */}
        <div className="ai-halo absolute inset-0 rounded-full" />
        {/* inner pupil */}
        <div
          className="absolute rounded-full bg-background/30 backdrop-blur-md"
          style={{
            inset: size * 0.18,
          }}
        />
      </motion.div>
      {thinking && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="size-1.5 rounded-full bg-primary typing-dot" />
          <span className="size-1.5 rounded-full bg-primary typing-dot" style={{ animationDelay: "0.15s" }} />
          <span className="size-1.5 rounded-full bg-primary typing-dot" style={{ animationDelay: "0.3s" }} />
        </div>
      )}
    </div>
  );
}

export function Waveform({ active, bars = 5 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex items-end gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-primary-foreground/90 ${active ? "waveform-bar" : ""}`}
          style={{
            height: "100%",
            animationDelay: `${i * 0.12}s`,
            transform: active ? undefined : "scaleY(0.3)",
          }}
        />
      ))}
    </div>
  );
}