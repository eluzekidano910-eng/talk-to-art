import { Canvas, Circle, Rect, Triangle, Line, ActiveSelection } from 'fabric';
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
  private history: string[] = [];
  private historyIndex: number = -1;
  private readonly MAX_HISTORY = 50;

  constructor(canvasEl: HTMLCanvasElement) {
    this.canvas = new Canvas(canvasEl, {
      width: canvasEl.clientWidth || canvasEl.width,
      height: canvasEl.clientHeight || canvasEl.height,
      backgroundColor: '#1a1a2e',
      selection: true,
      preserveObjectStacking: true,
    });
    this.saveState(); // 保存初始空白状态
  }

  get width(): number {
    return this.canvas.width ?? 0;
  }

  get height(): number {
    return this.canvas.height ?? 0;
  }

  // ── Circle ──

  drawCircle(options: DrawShapeOptions = {}): Circle {
    this.saveState();
    const size = SIZE_PRESETS[options.size ?? 'medium'];
    const radius = options.radius ?? size.circleRadius;
    const fill = resolveColor(options.color);
    const { left, top } = this.resolvePosition(options, radius * 2, radius * 2);

    const circle = new Circle({
      left,
      top,
      radius,
      fill,
      name: options.name,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(circle);
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(circle);
    this.canvas.renderAll();
    return circle;
  }

  // ── Rectangle ──

  drawRect(options: DrawShapeOptions = {}): Rect {
    this.saveState();
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
      name: options.name,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(rect);
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(rect);
    this.canvas.renderAll();
    return rect;
  }

  // ── Triangle ──

  drawTriangle(options: DrawShapeOptions = {}): Triangle {
    this.saveState();
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
      name: options.name,
      stroke: options.stroke,
      strokeWidth: options.strokeWidth ?? 0,
      originX: 'center',
      originY: 'center',
    });

    this.canvas.add(triangle);
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(triangle);
    this.canvas.renderAll();
    return triangle;
  }

  // ── Line ──

  drawLine(options: DrawShapeOptions = {}): Line {
    this.saveState();
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
      name: options.name,
    });

    this.canvas.add(line);
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(line);
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
    this.saveState();
    this.canvas.clear();
    this.canvas.backgroundColor = '#1a1a2e';
    this.canvas.renderAll();
  }

  /** 按目标查找画布对象 */
  findObjects(target: string): any[] {
    const all = this.canvas.getObjects();
    if (target === 'last') return all.length > 0 ? [all[all.length - 1]] : [];
    if (target === 'all') return [...all];
    if (target === 'selected') {
      const active = this.canvas.getActiveObject();
      return active ? [active] : [];
    }
    // 按形状类型查找（circle / rect / triangle / line）
    const SHAPE_TYPE_MAP: Record<string, string> = {
      circle: 'circle', rect: 'rect', triangle: 'triangle', line: 'line',
    };
    if (SHAPE_TYPE_MAP[target]) {
      return all.filter(o => (o as any).type === SHAPE_TYPE_MAP[target]);
    }
    const byName = all.filter((o: any) => o.name === target);
    return byName.length > 0 ? byName : [];
  }

  /** 编辑对象：移动/缩放/改色 */
  editObjects(target: string, changes: Record<string, unknown>): boolean {
    let objects = this.findObjects(target);
    if (objects.length === 0) return false;

    // 位置过滤：命中多个时取距离最近者
    if (typeof changes.position === 'string' && objects.length > 1) {
      const pos = (POSITION_PRESETS as any)[changes.position];
      if (pos) {
        const cx = this.width * pos.leftFrac;
        const cy = this.height * pos.topFrac;
        let minDist = Infinity;
        let closest: any = null;
        for (const obj of objects) {
          const dx = (obj.left ?? 0) - cx;
          const dy = (obj.top ?? 0) - cy;
          const d = dx * dx + dy * dy;
          if (d < minDist) { minDist = d; closest = obj; }
        }
        if (closest) objects = [closest];
      }
    }

    // 仅在有实际修改时保存快照，纯选中不产生历史记录
    const hasChanges = typeof changes.color === 'string' ||
      changes.size === 'large' || changes.size === 'small' ||
      typeof changes.moveDirection === 'string';

    if (hasChanges) this.saveState();

    for (const obj of objects) {
      if (typeof changes.color === 'string') {
        obj.set('fill', resolveColor(changes.color));
      }
      if (changes.size === 'large') {
        obj.set('scaleX', 1.5);
        obj.set('scaleY', 1.5);
      } else if (changes.size === 'small') {
        obj.set('scaleX', 0.6);
        obj.set('scaleY', 0.6);
      }
      if (typeof changes.moveDirection === 'string') {
        const step = 50;
        switch (changes.moveDirection) {
          case '左': obj.set('left', (obj.left ?? 0) - step); break;
          case '右': obj.set('left', (obj.left ?? 0) + step); break;
          case '上': obj.set('top', (obj.top ?? 0) - step); break;
          case '下': obj.set('top', (obj.top ?? 0) + step); break;
        }
      }
      obj.setCoords();
    }

    // 自动选中被操作的对象（便于视觉反馈）
    if (objects.length > 0) {
      this.canvas.discardActiveObject();
      if (changes.selectAll && objects.length > 1) {
        const sel = new ActiveSelection(objects, { canvas: this.canvas });
        this.canvas.setActiveObject(sel);
      } else {
        this.canvas.setActiveObject(objects[0]);
      }
    }

    this.canvas.renderAll();
    return true;
  }

  /** 删除对象（按目标查找并移除） */
  deleteObjects(target: string): boolean {
    let objects: any[];
    if (target === 'all') {
      objects = this.canvas.getObjects();
    } else {
      objects = this.findObjects(target);
    }
    if (objects.length === 0) return false;

    this.saveState();
    for (const obj of objects) {
      this.canvas.remove(obj);
    }
    this.canvas.renderAll();
    return true;
  }

  /** 导出画布为 PNG 并触发下载 */
  exportPNG(): void {
    const dataURL = this.canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `voicedraw-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getJSON(): string {
    return JSON.stringify(this.canvas.toJSON());
  }

  /** 保存当前画布快照到历史栈 */
  private saveState(): void {
    // 清除重做栈（新操作后不可重做）
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.getJSON());
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  /** 撤销：回到上一个历史状态 */
  undo(): boolean {
    if (this.historyIndex <= 0) return false;
    this.historyIndex--;
    this.loadJSON(this.history[this.historyIndex]);
    return true;
  }

  /** 重做：前进到下一个历史状态 */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false;
    this.historyIndex++;
    this.loadJSON(this.history[this.historyIndex]);
    return true;
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

  // -- Freehand Drawing --

  startFreehand(options: { color?: string; width?: number } = {}): void {
    this.canvas.isDrawingMode = true;
    if (options.color) this.canvas.freeDrawingBrush.color = resolveColor(options.color);
    if (options.width) this.canvas.freeDrawingBrush.width = options.width;
    this.canvas.renderAll();
  }

  stopFreehand(): void {
    this.canvas.isDrawingMode = false;
    this.canvas.renderAll();
  }

  setBrushColor(color: string): void {
    this.canvas.freeDrawingBrush.color = resolveColor(color);
    this.canvas.renderAll();
  }

  setBrushWidth(width: number): void {
    this.canvas.freeDrawingBrush.width = width;
    this.canvas.renderAll();
  }

  resize(width: number, height: number): void {
    this.canvas.setDimensions({ width, height });
    this.canvas.renderAll();
  }
}
