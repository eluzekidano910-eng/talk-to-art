import { Canvas } from 'fabric';

export class CanvasEngine {
  readonly canvas: Canvas;

  constructor(canvasEl: HTMLCanvasElement) {
    this.canvas = new Canvas(canvasEl, {
      width: canvasEl.clientWidth || canvasEl.width,
      height: canvasEl.clientHeight || canvasEl.height,
      backgroundColor: '#1a1a2e',
      selection: true,
      preserveObjectStacking: true,
    });
  }

  get width(): number {
    return this.canvas.width ?? 0;
  }

  get height(): number {
    return this.canvas.height ?? 0;
  }

  clear(): void {
    this.canvas.clear();
    this.canvas.backgroundColor = '#1a1a2e';
    this.canvas.renderAll();
  }

  getJSON(): string {
    return JSON.stringify(this.canvas.toJSON());
  }

  loadJSON(json: string): Promise<void> {
    return this.canvas.loadFromJSON(JSON.parse(json)).then(() => {
      this.canvas.renderAll();
    });
  }

  removeSelected(): void {
    const active = this.canvas.getActiveObject();
    if (active) {
      this.canvas.remove(active);
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
    }
  }

  resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
  }
}
