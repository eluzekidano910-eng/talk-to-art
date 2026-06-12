import type { VoiceRecognizerConfig, VoiceRecognizerCallbacks, VoiceResult, VoiceState } from './types';

/** 用户不说话多少毫秒后自动停止 */
const SILENCE_TIMEOUT = 5000;

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
  private _userStopped = false;
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
    return this._state === 'listening';
  }

  /** 开始监听 */
  start(): void {
    if (!this.recognition) {
      this.callbacks.onError?.('浏览器不支持语音识别');
      return;
    }
    if (this._state === 'listening') return;

    this._userStopped = false;
    this.clearSilenceTimer();

    try {
      this.recognition.start();
    } catch (_err) {
      try { this.recognition.abort(); } catch { /* ignore */ }
      setTimeout(() => {
        try { this.recognition?.start(); } catch { /* ignore */ }
      }, 100);
    }
  }

  /** 停止监听（处理完已有语音） */
  stop(): void {
    this._userStopped = true;
    this.clearSilenceTimer();
    try { this.recognition?.stop(); } catch { /* ignore */ }
  }

  /** 立即中止（丢弃已有语音） */
  abort(): void {
    this._userStopped = true;
    this.clearSilenceTimer();
    try { this.recognition?.abort(); } catch { /* ignore */ }
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
      // 5 秒没说话 → 自动停止
      this.stop();
    }, SILENCE_TIMEOUT);
  }

  private clearSilenceTimer(): void {
    if (this._silenceTimer !== null) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  }

  // ── 内部事件绑定 ──

  private bindEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      // 用户又说话了，清除静音倒计时
      this.clearSilenceTimer();
      this.setState('listening');
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      // 用户主动停止 → 回到 idle
      if (this._userStopped) {
        this.setState('idle');
        this.callbacks.onEnd?.();
        return;
      }
      // 一句说完 → 重启识别 + 启动静音倒计时
      this.startSilenceTimer();
      // 延迟重启（等浏览器状态稳定）
      setTimeout(() => {
        if (!this._userStopped) {
          try { this.recognition?.start(); } catch { /* ignore */ }
        }
      }, 200);
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
        const voiceResult: VoiceResult = {
          text: finalText.trim(),
          isFinal: true,
          confidence: maxConfidence,
        };
        this.callbacks.onResult?.(voiceResult);
        // 收到最终结果 → 重置静音倒计时
        this.startSilenceTimer();
      } else if (interimText) {
        const voiceResult: VoiceResult = {
          text: interimText.trim(),
          isFinal: false,
          confidence: maxConfidence,
        };
        this.callbacks.onResult?.(voiceResult);
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

      // no-speech 不算真正错误，静默处理
      if (event.error === 'no-speech') {
        if (!this._userStopped) {
          setTimeout(() => {
            try { this.recognition?.start(); } catch { /* ignore */ }
          }, 300);
        }
        return;
      }

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
