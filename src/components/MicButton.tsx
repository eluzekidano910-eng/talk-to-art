import type { VoiceState } from '../voice';

interface MicButtonProps {
  /** 是否正在监听 */
  isListening: boolean;
  /** 语音模块状态 */
  state: VoiceState;
  /** 点击切换 */
  onToggle: () => void;
  /** 浏览器是否支持语音识别 */
  supported: boolean;
}

/**
 * 麦克风按钮 + 音频波形可视化
 * 底部居中悬浮，带波纹扩散动画和声波条
 */
export function MicButton({ isListening, state, onToggle, supported }: MicButtonProps) {
  if (!supported) {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2
                      px-6 py-3 rounded-xl bg-yellow-500/15 border border-yellow-400/30
                      text-yellow-300 text-sm">
        ⚠️ 当前浏览器不支持语音识别，请使用 Chrome 或 Edge
      </div>
    );
  }

  const isActive = isListening || state === 'processing';

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
      {/* 波形条（监听时显示） */}
      <div
        className={`
          flex items-end gap-1 h-12 transition-all duration-300
          ${isActive ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-2 rounded-full bg-red-400/80"
            style={{
              animation: isActive
                ? `waveformBar 0.6s ease-in-out ${i * 0.12}s infinite alternate`
                : 'none',
              height: isActive ? undefined : '4px',
            }}
          />
        ))}
      </div>

      {/* 主按钮 */}
      <button
        onClick={onToggle}
        className={`
          relative w-16 h-16 rounded-full
          flex items-center justify-center text-2xl
          transition-all duration-300 ease-out
          active:scale-90 select-none
          ${isActive
            ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/40 scale-110'
            : 'bg-white/10 hover:bg-white/20 shadow-lg shadow-black/20'
          }
        `}
        aria-label={isActive ? '停止语音识别' : '开始语音识别'}
      >
        {/* 波纹扩散圈（监听时） */}
        {isActive && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            <span
              className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
              style={{ animationDelay: '0.3s' }}
            />
          </>
        )}

        {/* 图标 */}
        {isActive ? (
          // 监听中：声波动画图标
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path
              d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              opacity={isActive ? 1 : 0.5}
            />
          </svg>
        ) : (
          // 待命中：麦克风图标
          <svg className="w-7 h-7 text-white/80" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* 状态文字 */}
      <span className={`
        text-xs transition-colors duration-200
        ${isActive ? 'text-red-400' : 'text-white/40'}
      `}>
        {isActive ? '监听中...' : '点击开始'}
      </span>
    </div>
  );
}
