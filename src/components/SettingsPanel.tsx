import { useEffect, useState } from 'react';
import type { AiService, AiConfig } from '../ai';
import { AiServiceError } from '../ai';

const STORAGE_KEYS = {
  apiKey: 'ai_api_key',
  model: 'ai_model',
  enabled: 'ai_enabled',
};

function loadFromStorage(): { apiKey: string; model: string; enabled: boolean } {
  return {
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) ?? '',
    model: localStorage.getItem(STORAGE_KEYS.model) ?? 'deepseek-chat',
    enabled: localStorage.getItem(STORAGE_KEYS.enabled) === 'true',
  };
}

function saveToStorage(config: { apiKey: string; model: string; enabled: boolean }): void {
  if (config.apiKey) {
    localStorage.setItem(STORAGE_KEYS.apiKey, config.apiKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
  }
  localStorage.setItem(STORAGE_KEYS.model, config.model);
  localStorage.setItem(STORAGE_KEYS.enabled, String(config.enabled));
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange: (config: AiConfig) => void;
  aiService: AiService | null;
}

export function SettingsPanel({ isOpen, onClose, onConfigChange, aiService }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [enabled, setEnabled] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const saved = loadFromStorage();
    setApiKey(saved.apiKey);
    setModel(saved.model);
    setEnabled(saved.enabled);
    setTestStatus('idle');
    setTestMsg('');
  }, [isOpen]);

  const handleTest = async () => {
    if (!apiKey) { setTestStatus('error'); setTestMsg('请先输入 API Key'); return; }
    if (!aiService) { setTestStatus('error'); setTestMsg('AI 服务尚未初始化'); return; }

    setTestStatus('testing');
    setTestMsg('');
    aiService.setApiKey(apiKey);

    try {
      // 用最简单的请求排查 400 错误
      await aiService.complete(
        [{ role: 'user', content: 'hi' }],
        { timeoutMs: 10000, useJsonMode: false },
      );
      setTestStatus('success');
      setTestMsg('连接成功');
    } catch (err) {
      const msg = err instanceof AiServiceError ? err.message : '连接失败';
      // 把错误信息也记到 localStorage 方便排查
      try { localStorage.setItem('ai_last_error', msg); } catch {}
      setTestStatus('error');
      setTestMsg(msg);
    }
  };

  const handleSave = () => {
    saveToStorage({ apiKey, model, enabled });
    onConfigChange({ apiKey, model, enabled });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-96 rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-medium text-sm">AI 配置</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-sm leading-none px-1">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/50 block mb-1.5">API Key</label>
            <input type="password" value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); setTestMsg(''); }}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-400/40 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1.5">模型</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-red-400/40 transition-colors">
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">AI 解析</span>
            <button type="button" role="switch" aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={'relative w-10 h-5 rounded-full transition-colors duration-200 ' + (enabled ? 'bg-red-500' : 'bg-white/20')}>
              <span className={'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ' + (enabled ? 'translate-x-5' : '')} />
            </button>
          </div>
          <p className="text-xs text-white/30 -mt-2">
            {enabled ? 'AI 解析复杂指令，失败自动降级规则引擎' : '关闭后将使用规则引擎解析指令'}
          </p>
          {testMsg && (
            <div className={'text-xs px-3 py-2 rounded-lg ' + (testStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
              {testMsg}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={handleTest} disabled={testStatus === 'testing' || !apiKey}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 hover:text-white/80 disabled:opacity-40 transition-all">
              {testStatus === 'testing' ? '测试中...' : '测试连接'}
            </button>
            <button onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-400 active:scale-95 transition-all">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}