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
import { AiService, AiInterpreter } from './ai';
import { StatusBar } from './components';
import { SettingsPanel } from './components/SettingsPanel';
import type { AiConfig } from './ai';

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

      const _count = typeof params.count === 'number' ? params.count : 1;
      switch (shape) {
        case 'circle': for (let i = 0; i < _count; i++) { engine.drawCircle(options); } break;
        case 'rect': for (let i = 0; i < _count; i++) { engine.drawRect(options); } break;
        case 'triangle': for (let i = 0; i < _count; i++) { engine.drawTriangle(options); } break;
        case 'line': for (let i = 0; i < _count; i++) { engine.drawLine(options); } break;
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
    case 'help':
      return true;
    default:
      return false;
    }
  }
 
 function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceText, setVoiceText] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const recognizerRef = useRef<VoiceRecognizer | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const soundPlayerRef = useRef<SoundPlayer | null>(null);
 const aiServiceRef = useRef<AiService | null>(null);
 const aiInterpreterRef = useRef<AiInterpreter | null>(null);
 const aiEnabledRef = useRef(false);
 const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const [isFreehand, setIsFreehand] = useState(false);

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

  // 语音最终结果 → 解析 → 执行 → 音效 + 日志
  useEffect(() => {
    if (!isFinal || !voiceText) return;

    // 唤醒词检测：说"小A小A"或"打开程序"激活
    if ((/小[aA诶][,，、]?小[aA诶]/i.test(voiceText) || /打开程序/.test(voiceText) || /^小[aA诶]/.test(voiceText)) && !isAwakeRef.current) {
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

    // AI 解析优先，失败则回退到规则引擎
    (async () => {
      let commands;

      // System intents → rule engine (no AI latency)
      if (/帮助|怎么用|支持|指令|help|功能|说明|教程|停止|关闭|休眠|结束|暂停|睡眠|开始|启动|恢复|唤醒|继续|开始听|撤销|回退|上一步|后退|undo|重做|redo|前进|清空|清除|重新开始|重置|clear|全部删|导出|保存|下载|export|save|png|图片/.test(voiceText)) {
        commands = new CommandParser().parse(voiceText);
      } else if (aiEnabledRef.current && aiInterpreterRef.current && aiServiceRef.current?.isReady) {
        try {
          const aiCmds = await aiInterpreterRef.current.parse(voiceText);
          commands = aiCmds.length > 0 ? aiCmds : new CommandParser().parse(voiceText);
        } catch {
          commands = new CommandParser().parse(voiceText);
        }
      } else {
        commands = new CommandParser().parse(voiceText);
      }

      // 空命令 → 音效 + 错误日志
      if (commands.length === 0) {
        soundPlayerRef.current?.play('empty');
        setLogEntries(prev => [...prev, {
          id: ++logIdRef.current, rawText: voiceText, commands: [],
          status: 'error', error: '未识别为有效指令',
        }].slice(-50));
        return;
      }

      // 语音控制：休眠/唤醒（仅切换状态，识别器始终保持运行）
      if (commands.some(c => c.intent === 'sleep' || c.intent === 'wake')) {
        const isSleep = commands.some(c => c.intent === 'sleep');
        if (isSleep) {
          isAwakeRef.current = false;
          setVoiceState('standby');
        } else {
          isAwakeRef.current = true;
          setVoiceState('listening');
        }
        soundPlayerRef.current?.play('ready');
        setLogEntries(prev => [...prev, {
          id: ++logIdRef.current, rawText: voiceText,
          commands: commands.map(c => ({ intent: c.intent, params: {} })),
          status: 'success',
        }].slice(-50));
        return;
      }

      // 执行命令，跟踪是否全部成功
      // Handle freehand separately
      const fhCmd = commands.find(c => c.intent === 'freehand');
      if (fhCmd) {
        const action = (fhCmd.params?.action) ?? 'start';
        if (action === 'start') {
          engine.startFreehand({ color: fhCmd.params?.color, width: fhCmd.params?.width });
          setIsFreehand(true);
        } else {
          engine.stopFreehand();
          setIsFreehand(false);
        }
      }
      let allOk = true;
      for (const cmd of commands) {
        if (cmd.intent === 'freehand') continue;
        if (!executeCanvasCommand(engine, cmd)) allOk = false;
      }

      // 音效反馈
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
    })();
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

  // 进入页面自动启动麦克风（浏览器可能需要用户首次手势授权）
  useEffect(() => {
    const rec = getRecognizer();
    if (rec?.isReady() && !rec.isListening()) {
      setVoiceText('');
      setIsFinal(false);
      try {
        rec.start();
        setVoiceState('standby');
      } catch {
        // 无用户手势时优雅失败，用户点击麦克风按钮即可手动启动
      }
    }
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

  // AI 服务初始化（从 localStorage 加载配置）
 useEffect(() => {
   const service = new AiService();
   const interpreter = new AiInterpreter(service);
   aiServiceRef.current = service;
   aiInterpreterRef.current = interpreter;
   const savedKey = localStorage.getItem('ai_api_key');
   const savedModel = localStorage.getItem('ai_model');
   if (savedKey) {
     service.setApiKey(savedKey);
     if (savedModel) service.setModel(savedModel);
   }
   return () => { interpreter.destroy(); service.destroy(); aiServiceRef.current = null; aiInterpreterRef.current = null; };
 }, []);

 const handleConfigChange = (config: AiConfig) => {
   const service = aiServiceRef.current;
   if (!service) return;
   service.setApiKey(config.apiKey);
   service.setModel(config.model);
   aiEnabledRef.current = config.enabled;
 };

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
      <button
        onClick={() => { setSettingsKey(k => k + 1); setSettingsOpen(true); }}
        className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center
                   rounded-lg bg-white/5 border border-white/10 text-white/40
                   hover:bg-white/10 hover:text-white/70 transition-all z-50"
        aria-label="设置"
      >⚙</button>

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

      {/* 设置面板 */}
      {settingsOpen && (
        <SettingsPanel
          key={settingsKey}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onConfigChange={handleConfigChange}
          aiService={aiServiceRef.current}
        />
      )}
    </div>
  );
}

export default App;
