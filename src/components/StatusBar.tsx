import type { VoiceState } from "../voice";

interface StatusBarProps {
  voiceState: VoiceState;
  isAwake: boolean;
  isFreehand: boolean;
  lastSemanticRef?: string | null;
}

export function StatusBar({ voiceState, isAwake, isFreehand, lastSemanticRef }: StatusBarProps) {
  const stateLabel: Record<VoiceState, string> = {
    idle: "\u7a7a\u95f2",
    standby: "\u5f85\u547d",
    listening: "\u76d1\u542c\u4e2d",
    processing: "\u5904\u7406\u4e2d",
    error: "\u9519\u8bef",
  };

  return (
    <div className="absolute top-6 right-40 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/5 text-xs text-white/40 select-none">
      <span className="inline-flex items-center gap-1.5">
        <span className={"w-1.5 h-1.5 rounded-full " + (
          voiceState === "listening" ? "bg-red-400 animate-pulse" :
          voiceState === "processing" ? "bg-yellow-400" :
          voiceState === "error" ? "bg-red-500" :
          voiceState === "standby" ? "bg-emerald-400" :
          "bg-white/20"
        )} />
        {stateLabel[voiceState]}
      </span>
      {isAwake && <span className="text-emerald-400/60">\u5df2\u5524\u9192</span>}
      {isFreehand && <span className="text-blue-400/60">\u753b\u7b14\u6a21\u5f0f</span>}
      {lastSemanticRef && <span className="text-amber-400/60">\u4e0a\u4e00\u6b65\uff1a{lastSemanticRef}</span>}
    </div>
  );
}

