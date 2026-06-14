import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import { VoiceRecognizer } from './voice';
import type { VoiceResult, VoiceState } from './voice';
import { SpeechBubble } from './components/SpeechBubble';
import { MicButton } from './components/MicButton';
import { DrawingCanvas } from './canvas';
import type { DrawingCanvasHandle } from './canvas';
import { CanvasEngine } from './canvas';
import { CommandParser, expandSceneTemplate } from './command';
import type { Command } from './command';
import type { DrawShapeOptions, ShapeSize, ShapePosition } from './canvas';
import { CommandLog } from './components/CommandLog';
import type { LogEntry } from './components/CommandLog';
import { SoundPlayer } from './voice';
import { TtsPlayer } from './voice';
import { AiService, AiInterpreter } from './ai';
import { StatusBar } from './components';
import { SettingsPanel } from './components/SettingsPanel';
import type { AiConfig } from './ai';

/** 异步延迟工具 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 形状/颜色中文映射 */
const SHAPE_NAMES: Record<string, string> = {
  circle: '圆形', rect: '矩形', triangle: '三角形', line: '线条',
};
const COLOR_NAMES: Record<string, string> = {
  red: '红色', blue: '蓝色', green: '绿色', yellow: '黄色',
  purple: '紫色', pink: '粉色', orange: '橙色', white: '白色',
  black: '黑色', gray: '灰色', cyan: '青色', brown: '棕色',
};
/** 构建绘制反馈自然语言描述 */
function buildDrawFeedback(params: Record<string, unknown>): string {
  const shape = params.shape as string | undefined;
  const color = params.color as string | undefined;
  const semanticName = params.semanticName as string | undefined;
  const count = typeof params.count === 'number' ? params.count : 1;

  const label = semanticName || SHAPE_NAMES[shape ?? ''] || (shape ?? '图形');
  const colorLabel = color ? COLOR_NAMES[color.toLowerCase()] || color : '';

  if (count > 1) {
    return colorLabel
      ? `已画好${count}个${colorLabel}的${label}`
      : `已画好${count}个${label}`;
  }
  return colorLabel
    ? `已画好一个${colorLabel}的${label}`
    : `已画好一个${label}`;
}

/**
 * 执行解析后的语音命令，在画布上绘制或操作
 */
async function executeCanvasCommand(engine: CanvasEngine, cmd: Command, soundPlayer?: SoundPlayer, ttsPlayer?: TtsPlayer, lastSemantic?: string | null): Promise<boolean> {
  const params = cmd.params ?? {};

  switch (cmd.intent) {
    case 'draw': {
      const shape = params.shape as string;
      const options: DrawShapeOptions = {};
      if (typeof params.color === 'string') options.color = params.color;
      if (typeof params.size === 'string') options.size = params.size as ShapeSize;
      if (typeof params.position === 'string') options.position = params.position as ShapePosition;
      if (typeof params.semanticName === 'string') options.name = params.semanticName;

      const count = typeof params.count === 'number' ? params.count : 1;
      const batchShapes = ['circle', 'rect', 'triangle', 'line'];
      if (count > 1 && batchShapes.includes(shape)) {
        engine.drawShapeBatch(shape as 'circle' | 'rect' | 'triangle' | 'line', options, count);
      } else if (shape === 'circle') {
        engine.drawCircle(options);
      } else if (shape === 'rect') {
        engine.drawRect(options);
      } else if (shape === 'triangle') {
        engine.drawTriangle(options);
      } else if (shape === 'line') {
        engine.drawLine(options);
      } else {
        return false;
      }
      ttsPlayer?.speak(buildDrawFeedback(params));
      return true;
    }
    case 'undo':
      {
        const ok = engine.undo();
        ttsPlayer?.speak(ok ? '已撤销' : '没有可以撤销的操作');
        return ok;
      }
    case 'edit': {
      const editParams = cmd.params ?? {};
      let target = typeof editParams.target === 'string' ? editParams.target : null;
      if (!target) {
        const active = engine.canvas.getActiveObject();
        target = active ? 'selected' : 'last';
      }
      const ok = engine.editObjects(target, editParams);
      if (ok) {
        const target2 = typeof editParams.target === 'string' ? editParams.target : '';
        const display = SHAPE_NAMES[target2] || target2 || '对象';
        const colorName = typeof editParams.color === 'string' ? (COLOR_NAMES[editParams.color.toLowerCase()] || editParams.color) : null;
        const posEntries: Record<string, string> = {
          'top-left': '左上角', 'top-center': '上边', 'top-right': '右上角',
          'center-left': '左边', 'center': '中间', 'center-right': '右边',
          'bottom-left': '左下角', 'bottom-center': '下边', 'bottom-right': '右下角',
        };
        let msg: string;
        if (editParams.size === 'large') msg = `已将${display}放大`;
        else if (editParams.size === 'small') msg = `已将${display}缩小`;
        else if (colorName) msg = `已将${display}改成${colorName}`;
        else if (typeof editParams.position === 'string') msg = `已将${display}移到${posEntries[editParams.position] || editParams.position}`;
        else if (typeof editParams.moveDirection === 'string') msg = `已将${display}向${editParams.moveDirection}移动`;
        else msg = `已编辑${display}`;
        ttsPlayer?.speak(msg);
      } else {
        ttsPlayer?.speak('没有找到可以编辑的对象');
      }
      return ok;
    }
    case 'delete': {
      const delParams = cmd.params ?? {};
      const target = typeof delParams.target === 'string' ? delParams.target : 'selected';
      const ok = engine.deleteObjects(target);
      if (ok) ttsPlayer?.speak(target === 'all' ? '已删除所有对象' : '已删除');
      return ok;
    }
    case 'redo':
      {
        const ok = engine.redo();
        ttsPlayer?.speak(ok ? '已重做' : '没有可以重做的操作');
        return ok;
      }
    case 'clear':
      engine.clear();
      return true;
   case 'export':
     engine.exportPNG();
      return true;
    case 'help':
      {
        const objects = engine.canvas.getObjects() as any[];
        if (objects.length === 0) {
          ttsPlayer?.speak('画布当前为空。你可以说"画一个太阳"来开始。');
          return true;
        }
        // 统计形状分类
        const typeShapeName: Record<string, string> = {
          circle: '圆形', rect: '矩形', triangle: '三角形', line: '线条',
        };
        const unitWords: Record<string, string> = {
          circle: '个', rect: '个', triangle: '个', line: '条',
        };
        const groups = new Map<string, number>();
        for (const obj of objects) {
          const key = obj.name || typeShapeName[obj.type] || obj.type;
          groups.set(key, (groups.get(key) || 0) + 1);
        }
        const parts: string[] = [];
        for (const [name, count] of groups) {
          const objType = objects.find(o => (o.name || typeShapeName[o.type] || o.type) === name)?.type;
          const unit = unitWords[objType] || '个';
          const digitMap: Record<number, string> = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' };
          const num = digitMap[count] || count;
          parts.push(`${num}${unit}${name}`);
        }
        const list = parts.join('、');
        const trail = lastSemantic ? `。上一步操作：${lastSemantic}。` : '。';
        ttsPlayer?.speak(`画布上有${objects.length}个对象：${list}${trail}`);
        return true;
      }
    case 'select': {
      const selCmd = cmd.params ?? {};
      if (selCmd.filters) {
        return engine.selectObjectsByFilters(selCmd.filters as Record<string, string>[]);
      }
      const target = typeof selCmd.target === 'string' ? selCmd.target : 'selected';
      if (target === 'deselect') {
        engine.deselectAll();
        ttsPlayer?.speak('已取消选中');
        soundPlayer?.play('ready');
        return true;
      }
      const found = engine.selectObjects(target);
      if (found) ttsPlayer?.speak(target === 'all' ? '已选中所有对象' : '已选中');
      if (found) soundPlayer?.play('success');
      return found;
    }
    case 'scene': {
      const sceneKey = typeof params.scene === 'string' ? params.scene : null;
      if (!sceneKey) {
        ttsPlayer?.speak('未知场景');
        return false;
      }
      // 查找场景中文名
      const sceneNames: Record<string, string> = {
        sunrise: '日出', landscape: '风景', mountains: '山水', city: '城市',
        flowchart: '流程图', smiley: '笑脸', sunset: '日落', flowerField: '花海',
        starryNight: '星空',
      };
      ttsPlayer?.speak(`正在绘制${sceneNames[sceneKey] || sceneKey}`);
      const subCommands = expandSceneTemplate(sceneKey);
      for (let i = 0; i < subCommands.length; i++) {
        if (i > 0) await delay(600);
        await executeCanvasCommand(engine, subCommands[i], soundPlayer, ttsPlayer, lastSemantic);
      }
      ttsPlayer?.speak('场景绘制完成');
      return subCommands.length > 0;
    }
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
 const ttsPlayerRef = useRef<TtsPlayer | null>(null);
const aiServiceRef = useRef<AiService | null>(null);
 const aiInterpreterRef = useRef<AiInterpreter | null>(null);
 const aiEnabledRef = useRef(false);
 const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const [isFreehand, setIsFreehand] = useState(false);
  const [lastSemanticRef, setLastSemanticRef] = useState<string | null>(null);

  const [supported, setSupported] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // 初始化音效播放器
  useEffect(() => {
    soundPlayerRef.current = new SoundPlayer();
  return () => soundPlayerRef.current?.destroy();
  }, []);

  useEffect(() => {
    ttsPlayerRef.current = new TtsPlayer();
    return () => ttsPlayerRef.current?.cancel();
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
      if (/帮助|怎么用|支持|指令|help|功能|说明|教程|停止|关闭|休眠|结束|暂停|睡眠|开始|启动|恢复|唤醒|继续|开始听|撤销|回退|上一步|后退|undo|重做|redo|前进|清空|清除|重新开始|重置|clear|全部删|导出|保存|下载|export|save|png|图片|日出|风景|山水|城市|流程图|笑脸|日落|花海|星空|朝阳|晚霞|风景画|山水画/.test(voiceText)) {
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
        if (!await executeCanvasCommand(engine, cmd, soundPlayerRef.current, ttsPlayerRef.current, lastSemanticRef)) allOk = false;
      }

      // 追踪最后一步语义引用（用于 StatusBar 展示）
      const lastDrawCmd = [...commands].reverse().find(c => c.intent === 'draw' && c.params?.semanticName);
      if (lastDrawCmd?.params?.semanticName) {
        setLastSemanticRef(lastDrawCmd.params.semanticName as string);
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
      <StatusBar voiceState={voiceState} isAwake={isAwakeRef.current} isFreehand={isFreehand} lastSemanticRef={lastSemanticRef} />
 
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
