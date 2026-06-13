/**
 * AiService — DeepSeek API HTTP 通信层
 *
 * 职责：
 * - 构建并发送 HTTP 请求到 DeepSeek API
 * - 处理超时（5s）、重试（1 次）、网络错误
 * - 返回原始响应文本给上层解析
 *
 * 不负责：prompt 构造、JSON 校验、上下文管理（由 AiInterpreter 负责）
 */

import type { ChatMessage } from './types';
import { AiServiceError } from './types';
import {
  API_ENDPOINT,
  DEFAULT_MODEL,
  REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  MAX_TOKENS,
} from './config';

export class AiService {
  private _apiKey = '';
  private _model = DEFAULT_MODEL;

  /** 设置 API Key */
  setApiKey(key: string): void {
    this._apiKey = key;
  }

  /** 设置模型名称 */
  setModel(model: string): void {
    this._model = model;
  }

  /** API Key 是否已配置 */
  get isReady(): boolean {
    return !!this._apiKey;
  }

  /**
   * 发送消息到 DeepSeek API 并返回响应文本
   * @param messages 消息列表（system + user + assistant history）
   * @param options.timeoutMs 超时时间（毫秒），默认 5000
   * @param options.temperature 温度参数，默认 0.1
   */
  async complete(
    messages: ChatMessage[],
    options?: { timeoutMs?: number; temperature?: number },
  ): Promise<string> {
    if (!this._apiKey) {
      throw new AiServiceError('API Key 未设置', 'auth');
    }

    const timeout = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const temperature = options?.temperature ?? 0.1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this._request(messages, timeout, temperature);
      } catch (err) {
        lastError = err as Error;

        // auth 和明确 API 错误不重试
        if (err instanceof AiServiceError) {
          if (err.code === 'auth' || err.code === 'api') throw err;
        }

        // 还有重试次数时，等待 500ms 后重试
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    throw lastError ?? new AiServiceError('请求失败', 'network');
  }

  /** 销毁实例，释放资源 */
  destroy(): void {
    this._apiKey = '';
    this._model = DEFAULT_MODEL;
  }

  // ── 内部 HTTP 请求 ──

  private async _request(
    messages: ChatMessage[],
    timeoutMs: number,
    temperature: number,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify({
          model: this._model,
          messages,
          response_format: { type: 'json_object' },
          temperature,
          max_tokens: MAX_TOKENS,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.status === 401) {
        throw new AiServiceError('API Key 无效', 'auth');
      }
      if (res.status === 429) {
        throw new AiServiceError('请求过于频繁，请稍后重试', 'api');
      }
      if (!res.ok) {
        throw new AiServiceError(`API 返回错误 (${res.status})`, 'api');
      }

      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;

      if (!text || typeof text !== 'string') {
        throw new AiServiceError('API 返回了空响应', 'parse');
      }

      return text;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof AiServiceError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new AiServiceError('请求超时，已降级到规则引擎', 'timeout');
      }
      throw new AiServiceError(
        `网络错误: ${(err as Error).message}`,
        'network',
      );
    }
  }
}
