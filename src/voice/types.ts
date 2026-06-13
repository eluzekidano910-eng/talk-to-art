/** 语音识别状态 */
export type VoiceState = 'idle' | 'standby' | 'listening' | 'processing' | 'error';

/** 语音识别结果 */
export interface VoiceResult {
  /** 识别文本 */
  text: string;
  /** 是否为最终结果（false = 逐字中间结果） */
  isFinal: boolean;
  /** 置信度 0~1 */
  confidence: number;
}

/** 语音识别器配置 */
export interface VoiceRecognizerConfig {
  /** 语言代码，默认 'zh-CN' */
  lang?: string;
  /** 是否连续识别，默认 false（说完一句自动停） */
  continuous?: boolean;
  /** 是否返回中间结果，默认 true */
  interimResults?: boolean;
  /** 最大备选结果数，默认 1 */
  maxAlternatives?: number;
}

/** 语音识别器事件回调 */
export interface VoiceRecognizerCallbacks {
  /** 识别到新文本（interim 或 final） */
  onResult?: (result: VoiceResult) => void;
  /** 开始监听 */
  onStart?: () => void;
  /** 停止监听 */
  onEnd?: () => void;
  /** 发生错误 */
  onError?: (error: string) => void;
  /** 状态变更 */
  onStateChange?: (state: VoiceState) => void;
}
