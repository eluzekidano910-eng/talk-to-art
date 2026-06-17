import type { VoiceRecognizerConfig, VoiceRecognizerCallbacks, VoiceResult, VoiceState } from './types';

/** 用户不说话多少毫秒后自动停止 */
const SILENCE_TIMEOUT = 8000;

/**
 * 浏览器语音识别服务层
 * 封装 Web Speech API (SpeechRecognition)，提供：
 * - 实时逐字识别（interim results）
 * - 最终结果回调
 * - 连续/单次两种模式
 * - 5 秒静音自动停止
 * - 错误优雅降级
 */
export class VoiceRecognizer {
  private recognition: SpeechRecognition | null = null;
  private _state: VoiceState = 'idle';
  private _active = false;
  private _silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: VoiceRecognizerCallbacks = {};
  private config: Required<VoiceRecognizerConfig>;

  /** 浏览器是否支持语音识别 */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  constructor(config: VoiceRecognizerConfig = {}, callbacks: VoiceRecognizerCallbacks = {}) {
    this.config = {
      lang: config.lang ?? 'zh-CN',
      continuous: config.continuous ?? false,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives ?? 1,
    };
    this.callbacks = callbacks;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[VoiceRecognizer] 当前浏览器不支持 Web Speech API');
      return;
    }

    try {
      this.recognition = new SR();
    } catch (err) {
      console.warn('[VoiceRecognizer] SpeechRecognition 构造失败', err);
      return;
    }

    if (!this.recognition) return;

    this.recognition.lang = this.config.lang;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.bindEvents();
  }

  /** 当前状态 */
  get state(): VoiceState {
    return this._state;
  }

  /** 实例是否构造成功 */
  isReady(): boolean {
    return this.recognition !== null;
  }

  /** 是否正在监听 */
  isListening(): boolean {
    return this._active || this._state === 'listening';
  }

  /** 开始监听 */
  start(): void {
    if (!this.recognition) {
      this.callbacks.onError?.('浏览器不支持语音识别');
      return;
    }
    if (this._active) return;

    this._active = true;
    this.startSilenceTimer();

    this.startRecognition();
  }

  /** 停止监听（处理完已有语音） */
  stop(): void {
    this._active = false;
    this.clearSilenceTimer();
    try { this.recognition?.abort(); } catch { /* ignore */ }
    this.setState('idle');
    this.callbacks.onEnd?.();
  }

  /** 立即中止（丢弃已有语音） */
  abort(): void {
    this._active = false;
    this.clearSilenceTimer();
    try { this.recognition?.abort(); } catch { /* ignore */ }
    this.setState('idle');
  }

  /** 更新回调 */
  setCallbacks(callbacks: VoiceRecognizerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /** 销毁实例 */
  destroy(): void {
    this.abort();
    this.recognition = null;
    this.callbacks = {};
  }

  // ── 静音计时器 ──

  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    this._silenceTimer = setTimeout(() => {
      // 8 秒没有任何识别结果 → 自动停止
      this.stop();
    }, SILENCE_TIMEOUT);
  }

  private clearSilenceTimer(): void {
    if (this._silenceTimer !== null) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  }

  private startRecognition(): void {
    if (!this.recognition || !this._active) return;
    try {
      this.recognition.start();
    } catch (err) {
      console.warn('[VoiceRecognizer] start failed', err);
      this.stop();
    }
  }

  // ── 内部事件绑定 ──

  private bindEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('[VoiceRecognizer] start');
      this.setState('listening');
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      console.log('[VoiceRecognizer] end');
      const wasActive = this._active;
      this._active = false;
      this.clearSilenceTimer();
      this.setState('idle');
      if (wasActive) {
        this.callbacks.onEnd?.();
      }
    };

    this.recognition.onaudiostart = () => {
      console.log('[VoiceRecognizer] audio start');
    };

    this.recognition.onaudioend = () => {
      console.log('[VoiceRecognizer] audio end');
    };

    this.recognition.onsoundstart = () => {
      console.log('[VoiceRecognizer] sound start');
    };

    this.recognition.onsoundend = () => {
      console.log('[VoiceRecognizer] sound end');
    };

    this.recognition.onspeechstart = () => {
      console.log('[VoiceRecognizer] speech start');
    };

    this.recognition.onspeechend = () => {
      console.log('[VoiceRecognizer] speech end');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        const confidence = result[0]?.confidence ?? 0;

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
        maxConfidence = Math.max(maxConfidence, confidence);
      }

      if (finalText) {
        console.log('[VoiceRecognizer] final result', finalText.trim());
        const voiceResult: VoiceResult = {
          text: finalText.trim(),
          isFinal: true,
          confidence: maxConfidence,
        };
        this.callbacks.onResult?.(voiceResult);
        // 收到最终结果 → 重置静音倒计时
        this.startSilenceTimer();
      } else if (interimText) {
        console.log('[VoiceRecognizer] interim result', interimText.trim());
        const voiceResult: VoiceResult = {
          text: interimText.trim(),
          isFinal: false,
          confidence: maxConfidence,
        };
        this.callbacks.onResult?.(voiceResult);
        this.startSilenceTimer();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMap: Record<string, string> = {
        'no-speech': '未检测到语音',
        'aborted': '识别已中止',
        'audio-capture': '无法访问麦克风',
        'network': '网络连接失败',
        'not-allowed': '麦克风权限被拒绝',
        'service-not-allowed': '语音识别服务不可用',
        'bad-grammar': '语法错误',
        'language-not-supported': '不支持该语言',
      };
      const message = errorMap[event.error] ?? `语音识别错误: ${event.error}`;
      console.warn(`[VoiceRecognizer] ${message}`);

      if (event.error === 'aborted') {
        return;
      }

      if (!this._active) return;

      // 语言不支持 → 自动降级尝试
      if (event.error === 'language-not-supported') {
        const fallbacks = ['zh-CN', 'cmn-Hans-CN', 'zh', 'en-US'];
        const current = this.recognition?.lang ?? '';
        const idx = fallbacks.indexOf(current);
        if (idx >= 0 && idx < fallbacks.length - 1) {
          const next = fallbacks[idx + 1];
          console.log(`[VoiceRecognizer] 语言 ${current} 不支持，降级: ${next}`);
          this.recognition!.lang = next;
          this.stop();
          this.callbacks.onError?.(`不支持语言 ${current}，已切换到 ${next}，请重新点击麦克风`);
          return;
        }
        this.stop();
        this.setState('error');
        this.callbacks.onError?.('所有中文语言代码均不被该浏览器支持');
        return;
      }

      // no-speech 不算真正错误，静默处理
      if (event.error === 'no-speech') {
        this.stop();
        return;
      }

      this.stop();
      this.setState('error');
      this.callbacks.onError?.(message);
    };
  }

  private setState(state: VoiceState): void {
    if (this._state !== state) {
      this._state = state;
      this.callbacks.onStateChange?.(state);
    }
  }
}
