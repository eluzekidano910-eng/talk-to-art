import { useEffect, useState } from "react";
import type { VoiceState } from "../voice";

interface SpeechBubbleProps {
  /** current text */
  text: string;
  /** is final result */
  isFinal: boolean;
  /** voice module state */
  state: VoiceState;
}

/**
 * Bubble type voice text area
 */
export function SpeechBubble({ text, isFinal, state }: SpeechBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState("");

  // visibility control
  useEffect(() => {
    if (state === 'listening' || state === 'processing' || state === 'standby') {
      setVisible(true);
    } else if (state === 'idle') {
      if (text) {
        setVisible(true);
        return;
      }
      setVisible(false);
    }
  }, [state, isFinal, text]);

  // text animation: typewriter effect
  useEffect(() => {
    if (text !== displayText) {
      if (text.startsWith(displayText)) {
        const timeout = setTimeout(() => {
          setDisplayText(text);
        }, 30);
        return () => clearTimeout(timeout);
      } else {
        setDisplayText(text);
      }
    }
  }, [text, displayText]);

  // final result handling
  useEffect(() => {
    if (isFinal && text) {
      setDisplayText(text);
    }
  }, [isFinal, text]);

  if (!visible) return null;

  const isInterim = state === 'listening' && text && !isFinal;
  const isConfirmed = isFinal && text;

  return (
    <div className={`
      absolute top-6 left-6 z-50 max-w-md
      transition-all duration-300 ease-out
      animate-fade-in
    `}>
      {/* bubble body */}
      <div className={`
        relative rounded-2xl px-5 py-3
        backdrop-blur-xl
        border shadow-2xl
        transition-colors duration-200
        ${isConfirmed
          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
          : isInterim
            ? 'bg-white/10 border-white/20 text-white'
            : 'bg-white/5 border-white/10 text-white/60'
        }
      `}>
        {/* pulse indicator (listening) */}
        {state === 'standby' && !text && (
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm text-emerald-200/70">🕊 🕊 小A在听 说"小A小A"或"打开程序"唤醒我吧～～</span>
          </div>
        )}

        {state === 'listening' && !text && (
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm text-white/70">小A已唤醒 请说指令～～</span>
          </div>
        )}

        {/* show 已识别 text */}
        {(text || displayText) && (
          <p className="text-lg leading-relaxed break-words">
            {displayText || text}
            {/* cursor blink (interim) */}
            {isInterim && (
              <span className="inline-block w-0.5 h-5 bg-white/70 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        )}

        {/* confirmed check (final) */}
        {isConfirmed && (
          <div className="flex items-center gap-2 mt-1.5 text-emerald-400 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            recognized
          </div>
        )}

        {/* bubble tail */}
        <div className="absolute -bottom-2 left-6 w-4 h-4 rotate-45
                        bg-white/10 border-r border-b border-white/20
                        backdrop-blur-xl" />
      </div>

      {/* error state */}
      {state === 'error' && (
        <div className="mt-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-400/30
                        text-red-300 text-sm animate-fade-in">
          ⚠️ 识别出错，请重试
        </div>
      )}
    </div>
  );
}
