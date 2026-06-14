/**
 * 语义对象默认参数表
 *
 * 当用户说"画一个太阳"且未指定颜色/形状时，
 * 用这里预设的默认值回填，保证语义对象有合理外观。
 *
 * 合并原则：{ ...preset, ...userParams } — 用户显式指定和 AI 推断结果不被覆盖。
 */

export interface SemanticPreset {
  shape: string;
  color?: string;
  size?: string;
  description: string;
  compound?: CompoundShapeDef[];
}

/** 组合形状定义 — 多个基本形状组合为一个语义对象 */
export interface CompoundShapeDef {
  shape: string;
  color?: string;
  dx?: number;
  dy?: number;
  radius?: number;
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
}

export const SEMANTIC_PRESETS: Record<string, SemanticPreset> = {
  sun:      { shape: 'circle',   color: 'yellow', size: 'large',  description: '黄色大圆形' },
  mountain: { shape: 'triangle', color: 'green',  size: 'large',  description: '绿色大三角形' },
  river:    { shape: 'line',     color: 'blue',   size: undefined, description: '蓝色线' },
  tree: {
    shape: 'triangle', color: 'green', size: 'medium', description: '绿色三角形树冠+棕色树干',
    compound: [
      { shape: 'rect',     color: '#8B4513', width: 20,  height: 60,  dy: 35 },
      { shape: 'triangle', color: 'green',   width: 120, height: 100, dy: -25 },
    ],
  },
  flower: {
    shape: 'circle', color: 'pink', size: 'small', description: '粉色小花',
    compound: [
      { shape: 'circle', color: 'pink',   radius: 12, dy: -22 },
      { shape: 'circle', color: 'pink',   radius: 12, dx: 22 },
      { shape: 'circle', color: 'pink',   radius: 12, dy: 22 },
      { shape: 'circle', color: 'pink',   radius: 12, dx: -22 },
      { shape: 'circle', color: 'yellow', radius: 10 },
    ],
  },
  house: {
    shape: 'rect', color: 'brown', size: 'medium', description: '棕色中矩形',
    compound: [
      { shape: 'rect',     color: '#8B4513', width: 100, height: 75 },
      { shape: 'triangle', color: '#c0392b', width: 115, height: 55, dy: -65 },
      { shape: 'rect',     color: '#5D3A1A', width: 20,  height: 32, dy: 22 },
    ],
  },
  cloud: {
    shape: 'circle', color: 'white', size: 'medium', description: '白色中圆形',
    compound: [
      { shape: 'circle', color: 'white', radius: 38 },
      { shape: 'circle', color: 'white', radius: 28, dx: -35, dy: 8 },
      { shape: 'circle', color: 'white', radius: 28, dx: 35,  dy: 8 },
      { shape: 'circle', color: 'white', radius: 20, dx: -18, dy: -20 },
      { shape: 'circle', color: 'white', radius: 20, dx: 18,  dy: -20 },
    ],
  },
};

/** 查找语义对象的默认参数 */
export function lookupSemantic(name: string): Partial<Record<string, unknown>> | null {
  const preset = SEMANTIC_PRESETS[name];
  if (!preset) return null;
  const result: Record<string, unknown> = { shape: preset.shape };
  if (preset.color) result.color = preset.color;
  if (preset.size) result.size = preset.size;
  return result;
}

/** 获取语义对象的组合形状定义（null = 非组合对象，使用单形状绘制） */
export function getCompoundShapes(name: string): CompoundShapeDef[] | null {
  return SEMANTIC_PRESETS[name]?.compound ?? null;
}

/** 将预设表生成为 SYSTEM_PROMPT 追加文本 */
export function buildPresetPromptBlock(): string {
  const lines = [
    '',
    '## 语义对象默认外观',
    '',
    '以下是语义对象的默认颜色和形状，当用户未指定颜色/大小时请使用这些默认值：',
    '',
  ];
  for (const [name, preset] of Object.entries(SEMANTIC_PRESETS)) {
    lines.push(`- ${name} = ${preset.description}`);
  }
  return lines.join('\n');
}
