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
}

export const SEMANTIC_PRESETS: Record<string, SemanticPreset> = {
  sun:      { shape: 'circle',   color: 'yellow', size: 'large',  description: '黄色大圆形' },
  mountain: { shape: 'triangle', color: 'green',  size: 'large',  description: '绿色大三角形' },
  river:    { shape: 'line',     color: 'blue',   size: undefined, description: '蓝色线' },
  tree:     { shape: 'triangle', color: 'green',  size: 'medium', description: '绿色中三角形' },
  flower:   { shape: 'circle',   color: 'pink',   size: 'small',  description: '粉色小圆形' },
  house:    { shape: 'rect',     color: 'brown',  size: 'medium', description: '棕色中矩形' },
  cloud:    { shape: 'circle',   color: 'white',  size: 'medium', description: '白色中圆形' },
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
