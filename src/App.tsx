import { useCallback, useRef, useState } from 'react';
import { VoiceRecognizer } from './voice';
import type { VoiceResult, VoiceState } from './voice';
import { SpeechBubble } from './components/SpeechBubble';
import { MicButton } from './components/MicButton';

function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceText, setVoiceText] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const recognizerRef = useRef<VoiceRecognizer | null>(null);

  const [supported, setSupported] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // 获取或创建识别器实例
  const getRecognizer = useCallback(() => {
    if (!recognizerRef.current && VoiceRecognizer.isSupported()) {
      try {
        recognizerRef.current = new VoiceRecognizer(
          { lang: 'zh-CN', continuous: false, interimResults: true },
          {
            onResult: (result: VoiceResult) => {
              setVoiceText(result.text);
              setIsFinal(result.isFinal);
              if (result.isFinal) {
                setVoiceState('processing');
                setTimeout(() => setVoiceState('idle'), 1500);
              }
            },
            onStateChange: (state: VoiceState) => {
              setVoiceState(state);
            },
            onError: (error: string) => {
              setVoiceState('error');
              setVoiceText(error);
              setTimeout(() => setVoiceState('idle'), 3000);
            },
          },
        );

        // 检查是否构造成功
        if (!recognizerRef.current.isReady()) {
          const msg = 'SpeechRecognition 初始化失败，可能是浏览器版本问题';
          setInitError(msg);
          setSupported(false);
          return null;
        }
      } catch (err) {
        const msg = `语音引擎初始化失败: ${err instanceof Error ? err.message : String(err)}`;
        setInitError(msg);
        setSupported(false);
        return null;
      }
    }
    return recognizerRef.current;
  }, []);

  // 切换麦克风
  const handleToggle = useCallback(() => {
    const rec = getRecognizer();
    if (!rec) return;

    if (rec.isListening()) {
      rec.stop();
      setVoiceText('');
      setIsFinal(false);
    } else {
      setVoiceText('');
      setIsFinal(false);
      rec.start();
    }
  }, [getRecognizer]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f0f0f]">
      {/* 画布占位 — 后续替换为 Fabric Canvas */}
      <div className="w-full h-full bg-[#1a1a1a]" />

      {/* 语音气泡 */}
      <SpeechBubble
        text={voiceText}
        isFinal={isFinal}
        state={voiceState}
      />

      {/* 麦克风按钮 */}
      <MicButton
        isListening={voiceState === 'listening'}
        state={voiceState}
        onToggle={handleToggle}
        supported={supported}
      />
    </div>
  );
}

export default App;
