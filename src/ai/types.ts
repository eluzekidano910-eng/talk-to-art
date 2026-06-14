/**
 * AI 模块类型定义
 */

/** 命令意图 */
export type CommandIntent =
  | 'draw'
  | 'edit'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'export'
  | 'help'
  | 'sleep'
  | 'wake'
  | 'freehand'
  | 'select';

/** 解析后的命令 */
export interface Command {
  intent: CommandIntent;
  raw: string;
  params?: Record<string, unknown>;
}

/** 聊天消息（DeepSeek API 的消息格式） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** AI 解析器配置 */
export interface AiConfig {
  /** DeepSeek API Key */
  apiKey: string;
  /** 模型名称，默认 deepseek-chat */
  model: string;
  /** AI 解析模式是否开启 */
  enabled: boolean;
}

/** AI 返回的单条指令参数 */
export interface AiCommandParams {
  shape?: string;
  color?: string;
  size?: string;
  position?: string;
  count?: number;
  semanticName?: string;
  target?: string;
  moveDirection?: string;
  selectAll?: boolean;
}

/** AI 返回的单条指令条目 */
export interface AiCommandEntry {
  intent: string;
  params?: AiCommandParams;
}

/** AI 返回的完整响应结构（对应 response_format json_object）*/
export interface AiResponse {
  commands: AiCommandEntry[];
}

/** AI Service 错误 */
export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'timeout' | 'network' | 'auth' | 'api' | 'parse',
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}
