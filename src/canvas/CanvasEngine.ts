import { Canvas, Circle, Rect, Triangle, Line } from 'fabric';
import type { ShapeSize, ShapePosition, DrawShapeOptions } from './types';

const SIZE_PRESETS: Record<ShapeSize, { circleRadius: number; rectSide: number; triangleSide: number }> = {
  small: { circleRadius: 28, rectSide: 50, triangleSide: 50 },
  medium: { circleRadius: 55, rectSide: 100, triangleSide: 100 },
  large: { circleRadius: 90, rectSide: 170, triangleSide: 170 },
};

const POSITION_PRESETS: Record<ShapePosition, { leftFrac: number; topFrac: number }> = {
  'top-left': { leftFrac: 0.15, topFrac: 0.15 },
  'top-center': { leftFrac: 0.5, topFrac: 0.15 },
  'top-right': { leftFrac: 0.85, topFrac: 0.15 },
  'center-left': { leftFrac: 0.15, topFrac: 0.5 },
  'center': { leftFrac: 0.5, topFrac: 0.5 },
  'center-right': { leftFrac: 0.85, topFrac: 0.5 },
  'bottom-left': { leftFrac: 0.15, topFrac: 0.85 },
  'bottom-center': { leftFrac: 0.5, topFrac: 0.85 },
  'bottom-right': { leftFrac: 0.85, topFrac: 0.85 },
};

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  white: '#ffffff',
  black: '#000000',
  gray: '#6b7280',
  cyan: '#06b6d4',
  brown: '#8B4513',
};

function resolveColor(color: string | undefined): string {
  if (!color) return '#ffffff';
  return COLOR_MAP[color.toLowerCase()] || color;
}

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

  // ── Circle ──

  drawCircle(options: DrawShapeOptions = {}): Circle {
    const size = SIZE_PRESETS[options.size ?? 'medium'];
    const radius = options.radius ?? size.circleRadius;
    const fill = resolveColor(options.color);
    const { left, top } = this.resolvePosition(options, radius * 2, radius * 2);

    const circle = new Circle({
      left,
      top,
      radius,
      fill,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(circle);
    this.canvas.renderAll();
    return circle;
  }

  // ── Rectangle ──

  drawRect(options: DrawShapeOptions = {}): Rect {
    const size = SIZE_PRESETS[options.size ?? 'medium'];
    const w = options.width ?? size.rectSide;
    const h = options.height ?? size.rectSide;
    const fill = resolveColor(options.color);
    const { left, top } = this.resolvePosition(options, w, h);

    const rect = new Rect({
      left,
      top,
      width: w,
      height: h,
      fill,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(rect);
    this.canvas.renderAll();
    return rect;
  }

  // ── Triangle ──

  drawTriangle(options: DrawShapeOptions = {}): Triangle {
    const size = SIZE_PRESETS[options.size ?? 'medium'];
    const side = options.width ?? size.triangleSide;
    const fill = resolveColor(options.color);
    const { left, top } = this.resolvePosition(options, side, side);

    const triangle = new Triangle({
      left,
      top,
      width: side,
      height: side,
      fill,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(triangle);
    this.canvas.renderAll();
    return triangle;
  }

  // ── Line ──

  drawLine(options: DrawShapeOptions = {}): Line {
    const stroke = resolveColor(options.color);
    const strokeWidth = options.strokeWidth ?? 3;

    const cw = this.width;
    const ch = this.height;
    let y = ch / 2;

    if (options.top !== undefined) {
      y = options.top;
    } else if (options.position) {
      y = ch * POSITION_PRESETS[options.position].topFrac;
    }

    const line = new Line([cw * 0.1, y, cw * 0.9, y], {
      stroke,
      strokeWidth,
    });

    this.canvas.add(line);
    this.canvas.renderAll();
    return line;
  }

  // ── Helpers ──

  private resolvePosition(
    options: DrawShapeOptions,
    objW: number,
    objH: number,
  ): { left: number; top: number } {
    if (options.left !== undefined && options.top !== undefined) {
      return { left: options.left, top: options.top };
    }

    const pos = options.position ?? 'center';
    const p = POSITION_PRESETS[pos];

    return {
      left: this.width * p.leftFrac,
      top: this.height * p.topFrac,
    };
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
