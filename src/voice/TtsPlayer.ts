/**
 * TTS 语音播放器
 * 封装 Web Speech API (speechSynthesis)，提供：
 * - 文本转语音播报
 * - zh-CN 优先语音选择
 * - 播报中断重播
 */
export class TtsPlayer {
  speak(text: string): void {
    if (!this.isSupported()) return;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // 优先选择 zh-CN 语音
    const voices = window.speechSynthesis.getVoices();
    const zhVoice =
      voices.find((v) => v.lang.startsWith('zh-CN')) ??
      voices.find((v) => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    window.speechSynthesis.speak(utterance);
  }

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  }
}
