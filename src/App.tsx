import { SpeechBubble } from './components/SpeechBubble';
import type { VoiceState } from './voice';

/** 临时 mock 数据 — 后续接入 VoiceRecognizer 后替换 */
const MOCK_TEXT = '画一个红色的圆';
const MOCK_STATE: VoiceState = 'listening';
const MOCK_IS_FINAL = false;

function App() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f0f0f]">
      {/* 画布占位 — 后续替换为 Fabric Canvas */}
      <div className="w-full h-full bg-[#1a1a1a]" />

      {/* 语音气泡 */}
      <SpeechBubble
        text={MOCK_TEXT}
        isFinal={MOCK_IS_FINAL}
        state={MOCK_STATE}
      />

      {/* 麦克风按钮 — 后续替换为 MicButton 组件 */}
      <button className="absolute bottom-8 left-1/2 -translate-x-1/2
                         w-16 h-16 rounded-full bg-red-500 hover:bg-red-400
                         flex items-center justify-center text-2xl
                         shadow-lg shadow-red-500/30 transition-all
                         active:scale-90">
        🎤
      </button>
    </div>
  );
}

export default App;
