import type { ChatMessage } from './types';
import { AiServiceError } from './types';
import { API_ENDPOINT, DEFAULT_MODEL, REQUEST_TIMEOUT_MS, MAX_RETRIES, MAX_TOKENS } from './config';

export class AiService {
  private _apiKey = '';
  private _model = DEFAULT_MODEL;

  setApiKey(key: string): void { this._apiKey = key; }
  setModel(model: string): void { this._model = model; }
  get isReady(): boolean { return !!this._apiKey; }

  async complete(
    messages: ChatMessage[],
    options?: { timeoutMs?: number; temperature?: number; useJsonMode?: boolean; maxTokens?: number },
  ): Promise<string> {
    if (!this._apiKey) throw new AiServiceError('API Key 未设置', 'auth');

    const timeout = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this._request(messages, timeout, options);
      } catch (err) {
        lastError = err as Error;
        if (err instanceof AiServiceError && (err.code === 'auth' || err.code === 'api')) throw err;
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw lastError ?? new AiServiceError('请求失败', 'network');
  }

  destroy(): void { this._apiKey = ''; this._model = DEFAULT_MODEL; }

  private async _request(
    messages: ChatMessage[],
    timeoutMs: number,
    opts?: { temperature?: number; useJsonMode?: boolean; maxTokens?: number },
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 只发送 model 和 messages，其他参数可选
      const body: Record<string, unknown> = { model: this._model, messages };
      if (opts?.temperature !== undefined) body.temperature = opts.temperature;
      if (opts?.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
      if (opts?.useJsonMode) body.response_format = { type: 'json_object' };

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this._apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status === 401) throw new AiServiceError('API Key 无效', 'auth');
      if (res.status === 429) throw new AiServiceError('请求过于频繁，请稍后重试', 'api');
      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch { }
        throw new AiServiceError(`API 返回错误 (${res.status}): ${detail.slice(0, 200)}`, 'api');
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text || typeof text !== 'string') throw new AiServiceError('API 返回了空响应', 'parse');
      return text;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AiServiceError) throw err;
      if ((err as Error).name === 'AbortError') throw new AiServiceError('请求超时', 'timeout');
      throw new AiServiceError(`网络错误: ${(err as Error).message}`, 'network');
    }
  }
}