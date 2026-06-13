export type SoundType = 'ready' | 'success' | 'error' | 'empty';

/**
 * 音效播放器 — 使用 Web Audio API 生成短音效
 * 替代 TTS 语音播报，纯音效反馈，不需要网络和权限
 */
export class SoundPlayer {
  private ctx: AudioContext | null = null;
  private active: OscillatorNode[] = [];

  private getCtx(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext ?? (window as any).webkitAudioContext)();
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** 播放指定音效 */
  play(type: SoundType): void {
    this.stop();
    const ctx = this.getCtx();
    if (!ctx) return;
    const map: Record<SoundType, () => void> = {
      ready:   () => this.ready(ctx),
      success: () => this.tone(ctx, 1000, 0.15, 'sine',  0.4),
      error:   () => this.tone(ctx, 200,  0.3,  'square', 0.5),
      empty:   () => { this.tone(ctx, 300, 0.15, 'square', 0.4); setTimeout(() => this.tone(ctx, 300, 0.15, 'square', 0.4), 250); },
    };
    map[type]();
  }

  /** 停止所有正在播放的音效 */
  stop(): void {
    for (const o of this.active) { try { o.stop(); } catch {} }
    this.active = [];
  }

  /** 释放 AudioContext */
  destroy(): void { this.stop(); this.ctx?.close(); this.ctx = null; }

  // ── 音效实现 ──

  private ready(ctx: AudioContext): void {
    this.tone(ctx, 600, 0.1, 'sine', 0.3);
    setTimeout(() => this.tone(ctx, 900, 0.1, 'sine', 0.3), 150);
  }

  private tone(ctx: AudioContext, freq: number, dur: number, type: OscillatorType, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    this.active.push(osc);
    osc.onended = () => { this.active = this.active.filter(o => o !== osc); };
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  }
}
