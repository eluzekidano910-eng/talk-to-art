import { useEffect, useState } from 'react';
import type { VoiceState } from '../voice';

interface SpeechBubbleProps {
  /** 当前识别文本 */
  text: string;
  /** 是否为最终结果 */
  isFinal: boolean;
  /** 语音模块状态 */
  state: VoiceState;
}

/**
 * 气泡型语音文本域
 * 左上角定位，实时逐字显示语音识别结果，带淡入动画
 */
export function SpeechBubble({ text, isFinal, state }: SpeechBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');

  // 控制可见性
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

  // 文本动画：逐字效果（给每个字符微小的进入动画）
  useEffect(() => {
    if (text !== displayText) {
      // 逐字追加，模拟打字机效果
      if (text.startsWith(displayText)) {
        // 追加模式
        const timeout = setTimeout(() => {
          setDisplayText(text);
        }, 30);
        return () => clearTimeout(timeout);
      } else {
        // 替换模式
        setDisplayText(text);
      }
    }
  }, [text, displayText]);

  // 最终结果到达时，清理显示
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
      {/* 气泡主体 */}
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
        {/* 脉冲指示点（听音中） */}
        {state === 'listening' && !text && (
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm text-white/70">正在听...</span>
          </div>
        )}

        {/* 有识别文本时 */}
        {(text || displayText) && (
          <p className="text-lg leading-relaxed break-words">
            {displayText || text}
            {/* 光标闪烁（interim 时显示） */}
            {isInterim && (
              <span className="inline-block w-0.5 h-5 bg-white/70 ml-0.5 align-middle animate-pulse" />
            )}
          </p>
        )}

        {/* 确认勾（final 时显示） */}
        {isConfirmed && (
          <div className="flex items-center gap-2 mt-1.5 text-emerald-400 text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            已识别
          </div>
        )}

        {/* 气泡尾巴 */}
        <div className="absolute -bottom-2 left-6 w-4 h-4 rotate-45
                        bg-white/10 border-r border-b border-white/20
                        backdrop-blur-xl" />
      </div>

      {/* 错误状态 */}
      {state === 'error' && (
        <div className="mt-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-400/30
                        text-red-300 text-sm animate-fade-in">
          ⚠️ 识别出错，请重试
        </div>
      )}
    </div>
  );
}
