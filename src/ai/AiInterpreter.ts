/**
 * AiInterpreter — AI 语义解析器
 *
 * 职责：
 * - 构造 prompt 消息数组（system + context 历史 + 用户语音）
 * - 调 AiService.complete() 获取 AI 响应
 * - 校验返回的 JSON，丢弃非法命令
 * - 管理对话上下文，支持跨句指代
 */

import type { ChatMessage, Command, CommandIntent, AiCommandEntry, AiResponse, AiCommandParams } from './types';
import { AiService } from './AiService';
import {
  SYSTEM_PROMPT,
  MAX_CONTEXT_TURNS,
  CONTEXT_IDLE_TIMEOUT_MS,
} from './config';

/** valid 集合（运行时校验用） */
const VALID_INTENTS_SET = new Set([
  'draw', 'edit', 'delete', 'undo', 'redo', 'clear', 'export', 'help', 'sleep', 'wake',
]);
const VALID_SHAPES_SET = new Set(['circle', 'rect', 'triangle', 'line']);
const VALID_COLORS_SET = new Set([
  'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange',
  'white', 'black', 'gray', 'cyan', 'brown',
]);
const VALID_SIZES_SET = new Set(['small', 'medium', 'large']);
const VALID_POSITIONS_SET = new Set([
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
]);
const VALID_SEMANTIC_NAMES_SET = new Set([
  'sun', 'mountain', 'river', 'tree', 'flower', 'house', 'cloud',
]);
const VALID_MOVE_DIRECTIONS_SET = new Set(['上', '下', '左', '右']);
const VALID_TARGETS_SET = new Set([
  'selected', 'last', 'all',
  'sun', 'mountain', 'river', 'tree', 'flower', 'house', 'cloud',
  'circle', 'rect', 'triangle', 'line',
]);

export class AiInterpreter {
  private context: ChatMessage[] = [];
  private lastActivity = Date.now();

  constructor(private aiService: AiService) {}

  /**
   * 解析语音文本为结构化命令
   * @param text 用户语音文本
   * @returns 解析出的命令列表（空数组表示无法解析，可由上层触发规则兜底）
   */
  async parse(text: string): Promise<Command[]> {
    if (!text || !text.trim()) return [];
    if (!this.aiService.isReady) return [];

    this.checkContextExpiry();

    const messages = this.buildMessages(text);
    const raw = await this.aiService.complete(messages);
    const commands = this.parseResponse(raw, text);

    // 更新 context（无论是否解析成功，都保留对话历史）
    this.context.push(
      { role: 'user', content: text },
      { role: 'assistant', content: raw },
    );
    this.trimContext();

    this.lastActivity = Date.now();
    return commands;
  }

  /** 清空对话上下文 */
  clearContext(): void {
    this.context = [];
    this.lastActivity = Date.now();
  }

  /** 销毁实例，释放资源 */
  destroy(): void {
    this.context = [];
  }

  // ── context 管理 ──

  private checkContextExpiry(): void {
    if (Date.now() - this.lastActivity > CONTEXT_IDLE_TIMEOUT_MS) {
      this.context = [];
    }
  }

  private trimContext(): void {
    if (this.context.length > MAX_CONTEXT_TURNS * 2) {
      this.context = this.context.slice(-MAX_CONTEXT_TURNS * 2);
    }
  }

  // ── 消息构造 ──

  private buildMessages(text: string): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];
    for (const msg of this.context) {
      messages.push(msg);
    }
    messages.push({ role: 'user', content: text });
    return messages;
  }

  // ── 响应解析 + 校验 ──

  private parseResponse(raw: string, originalText: string): Command[] {
    let parsed: AiResponse;
    try {
      parsed = JSON.parse(raw) as AiResponse;
    } catch {
      return [];
    }

    if (!Array.isArray(parsed.commands)) return [];

    const commands: Command[] = [];
    for (const entry of parsed.commands) {
      if (!this.validateEntry(entry)) continue;
      commands.push({
        intent: entry.intent as CommandIntent,
        raw: originalText,
        params: this.sanitizeParams(entry.params),
      });
    }
    return commands;
  }

  private validateEntry(entry: AiCommandEntry): boolean {
    if (!entry || typeof entry.intent !== 'string') return false;
    if (!VALID_INTENTS_SET.has(entry.intent)) return false;

    const p = entry.params;
    if (!p) return true;

    if (p.shape && !VALID_SHAPES_SET.has(p.shape)) return false;
    if (p.color && !VALID_COLORS_SET.has(p.color)) return false;
    if (p.size  && !VALID_SIZES_SET.has(p.size)) return false;
    if (p.position && !VALID_POSITIONS_SET.has(p.position)) return false;
    if (p.semanticName && !VALID_SEMANTIC_NAMES_SET.has(p.semanticName)) return false;
    if (p.moveDirection && !VALID_MOVE_DIRECTIONS_SET.has(p.moveDirection)) return false;
    if (p.target && !VALID_TARGETS_SET.has(p.target)) return false;

    if (p.count !== undefined && (typeof p.count !== 'number' || p.count < 1)) return false;
    if (p.selectAll !== undefined && typeof p.selectAll !== 'boolean') return false;

    return true;
  }

  private sanitizeParams(params?: AiCommandParams): Record<string, unknown> | undefined {
    if (!params) return undefined;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
}
