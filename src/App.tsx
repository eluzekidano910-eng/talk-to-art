function App() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 画布占位 — 后续替换为 Fabric Canvas */}
      <div className="w-full h-full bg-[#1a1a1a]" />

      {/* 语音气泡 — 后续替换为 SpeechBubble 组件 */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 text-white text-lg
                        border border-white/10 shadow-xl">
          等待语音输入...
        </div>
      </div>

      {/* 麦克风按钮 — 后续替换为 MicButton 组件 */}
      <button className="absolute bottom-8 left-1/2 -translate-x-1/2
                         w-16 h-16 rounded-full bg-red-500 hover:bg-red-400
                         flex items-center justify-center text-2xl
                         shadow-lg shadow-red-500/30 transition-all
                         active:scale-90">
        🎤
      </button>
    </div>
  );
}

export default App;
