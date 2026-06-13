import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import { VoiceRecognizer } from './voice';
import type { VoiceResult, VoiceState } from './voice';
import { SpeechBubble } from './components/SpeechBubble';
import { MicButton } from './components/MicButton';
import { DrawingCanvas } from './canvas';
import type { DrawingCanvasHandle } from './canvas';
import { CanvasEngine } from './canvas';
import { CommandParser } from './command';
import type { Command } from './command';
import type { DrawShapeOptions, ShapeSize, ShapePosition } from './canvas';
import { CommandLog } from './components/CommandLog';
import type { LogEntry } from './components/CommandLog';
import { SoundPlayer } from './voice';

/**
 * 执行解析后的语音命令，在画布上绘制或操作
 */
function executeCanvasCommand(engine: CanvasEngine, cmd: Command): boolean {
  const params = cmd.params ?? {};

  switch (cmd.intent) {
    case 'draw': {
      const shape = params.shape as string;
      const options: DrawShapeOptions = {};
      if (typeof params.color === 'string') options.color = params.color;
      if (typeof params.size === 'string') options.size = params.size as ShapeSize;
      if (typeof params.position === 'string') options.position = params.position as ShapePosition;
      if (typeof params.semanticName === 'string') options.name = params.semanticName;

      switch (shape) {
        case 'circle': engine.drawCircle(options); break;
        case 'rect': engine.drawRect(options); break;
        case 'triangle': engine.drawTriangle(options); break;
        case 'line': engine.drawLine(options); break;
        default: return false;
      }
      return true;
    }
    case 'undo':
      return engine.undo();
    case 'edit': {
      const editParams = cmd.params ?? {};
      let target = typeof editParams.target === 'string' ? editParams.target : null;
      if (!target) {
        const active = engine.canvas.getActiveObject();
        target = active ? 'selected' : 'last';
      }
      return engine.editObjects(target, editParams);
    }
    case 'delete': {
      const delParams = cmd.params ?? {};
      const target = typeof delParams.target === 'string' ? delParams.target : 'selected';
      return engine.deleteObjects(target);
    }
    case 'redo':
      return engine.redo();
    case 'clear':
      engine.clear();
      return true;
    case 'export':
      engine.exportPNG();
      return true;
    }
  }

 function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceText, setVoiceText] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const soundPlayerRef = useRef<SoundPlayer | null>(null);

  const [supported, setSupported] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // 初始化音效播放器
  useEffect(() => {
    soundPlayerRef.current = new SoundPlayer();
    return () => soundPlayerRef.current?.destroy();
  }, []);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const isAwakeRef = useRef(false);
  const autoStartedRef = useRef(false);

  // 语音最终结果 → 解析 → 执行 → 音效 + 日志
  useEffect(() => {
    if (!isFinal || !voiceText) return;

    // 唤醒词检测：说"小A小A"或"打开程序"激活
    if ((/小A[,，、]?小A/.test(voiceText) || /打开程序/.test(voiceText)) && !isAwakeRef.current) {
      isAwakeRef.current = true;
      soundPlayerRef.current?.play('ready');
      setLogEntries(prev => [...prev, {
        id: ++logIdRef.current, rawText: voiceText, commands: [],
        status: 'success',
      }].slice(-50));
      setVoiceState('listening');
      return;
    }
    // 未唤醒 → 忽略所有语音
    if (!isAwakeRef.current) return;

    const engine = canvasRef.current?.engine;
    if (!engine) return;

    const parser = new CommandParser();
    const commands = parser.parse(voiceText);

    // 空命令 → 音效 + 错误日志
    if (commands.length === 0) {
      soundPlayerRef.current?.play('empty');
      setLogEntries(prev => [...prev, {
        id: ++logIdRef.current, rawText: voiceText, commands: [],
        status: 'error', error: '未识别为有效指令',
      }].slice(-50));
      return;
    }

    // 语音控制：休眠/唤醒（直接操作识别器，不经过画布）
    if (commands.some(c => c.intent === 'sleep' || c.intent === 'wake')) {
      const isSleep = commands.some(c => c.intent === 'sleep');
      if (isSleep) {
        isAwakeRef.current = false;
        if (/停止|关闭/.test(voiceText)) {
          recognizerRef.current?.stop();
          setVoiceState('idle');
        } else {
          setVoiceState('standby');
        }
      } else {
        isAwakeRef.current = true;
        recognizerRef.current?.start();
        setVoiceState('listening');
      }
      soundPlayerRef.current?.play('ready');
      setLogEntries(prev => [...prev, {
        id: ++logIdRef.current, rawText: voiceText,
        commands: commands.map(c => ({ intent: c.intent, params: {} })),
        status: 'success',
      }].slice(-50));
      if (recognizerRef.current?.isListening()) setVoiceState('listening');
      return;
    }

    // 执行命令，跟踪是否全部成功
    let allOk = true;
    for (const cmd of commands) {
      if (!executeCanvasCommand(engine, cmd)) allOk = false;
    }

    // 音效反馈（commit 2/3）
    soundPlayerRef.current?.play(allOk ? 'success' : 'error');

    // 添加到命令日志
    setLogEntries(prev => [...prev, {
      id: ++logIdRef.current, rawText: voiceText,
      commands: commands.map(c => ({ intent: c.intent, params: c.params ?? {} })),
      status: allOk ? 'success' : 'error',
      error: allOk ? undefined : '部分命令执行失败',
    }].slice(-50));

    // 如果识别器仍在监听，恢复为 listening 状态
    if (recognizerRef.current?.isListening()) {
      setVoiceState('listening');
    }
  }, [isFinal, voiceText]);

  // 获取或创建识别器实例
  const getRecognizer = useCallback(() => {
    if (!recognizerRef.current && VoiceRecognizer.isSupported()) {
      try {
        recognizerRef.current = new VoiceRecognizer(
          { lang: 'zh-CN', continuous: true, interimResults: true },
          {
            onResult: (result: VoiceResult) => {
              setVoiceText(result.text);
              setIsFinal(result.isFinal);
              if (result.isFinal) {
                setVoiceState('processing');
              }
            },
            onStateChange: (state: VoiceState) => {
              // 未唤醒时启动默认进入待命
              if (state === 'listening' && !isAwakeRef.current) {
                setVoiceState('standby');
              } else {
                setVoiceState(state);
              }
            },
            onError: (error: string) => {
              setVoiceState('error');
              setVoiceText(error);
              setIsFinal(false);
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

  // 首次点击页面任意位置自动启动麦克风（浏览器需要用户手势）
  useEffect(() => {
    const handler = () => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      const rec = getRecognizer();
      if (rec?.isReady() && !rec.isListening()) {
        setVoiceText('');
        setIsFinal(false);
        rec.start();
        setVoiceState('standby');
      }
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [getRecognizer]);

  // 切换麦克风
  const handleToggle = useCallback(() => {
    const rec = getRecognizer();
    if (!rec) return;

    if (voiceState !== 'idle' || rec.isListening()) {
      rec.stop();
    } else {
      setVoiceText('');
      setIsFinal(false);
      rec.start();
    }
  }, [getRecognizer, voiceState]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="canvas-wrapper">
        <DrawingCanvas ref={canvasRef} className="absolute inset-0" />
      </div>

      <div className="brand-watermark">小A · 语音绘图</div>
 
      <CommandLog entries={logEntries} />

      {initError && (
        <div className="absolute top-6 right-6 z-50 max-w-sm rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-200 shadow-2xl">
          {initError}
        </div>
      )}

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
