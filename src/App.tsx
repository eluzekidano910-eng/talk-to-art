import { useEffect, useRef, useState } from 'react';
import { AiService, AiInterpreter } from './ai';
import type { AiConfig } from './ai';
import { SettingsPanel } from './components/SettingsPanel';

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  const aiServiceRef = useRef<AiService | null>(null);
  const aiInterpreterRef = useRef<AiInterpreter | null>(null);

  // 初始化 AI 服务
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

    return () => {
      interpreter.destroy();
      service.destroy();
      aiServiceRef.current = null;
      aiInterpreterRef.current = null;
    };
  }, []);

  const handleConfigChange = (config: AiConfig) => {
    const service = aiServiceRef.current;
    if (!service) return;
    service.setApiKey(config.apiKey);
    service.setModel(config.model);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full h-full bg-[#1a1a2e]" />

      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 text-white text-lg
                        border border-white/10 shadow-xl">
          等待语音输入...
        </div>
      </div>

      <button
        onClick={() => { setSettingsKey(k => k + 1); setSettingsOpen(true); }}
        className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center
                   rounded-lg bg-white/5 border border-white/10 text-white/40
                   hover:bg-white/10 hover:text-white/70 transition-all z-50"
        aria-label="设置"
      >⚙</button>

      <button className="absolute bottom-8 left-1/2 -translate-x-1/2
                         w-16 h-16 rounded-full bg-red-500 hover:bg-red-400
                         flex items-center justify-center text-2xl
                         shadow-lg shadow-red-500/30 transition-all
                         active:scale-90">
        🎤
      </button>

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