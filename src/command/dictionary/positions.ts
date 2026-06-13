export interface PositionEntry {
  name: string;
  aliases: string[];
}

export const POSITION_DICT: PositionEntry[] = [
  { name: 'top-left',     aliases: ['左上角', '左上', '左上方', '左上面'] },
  { name: 'top-center',   aliases: ['上面', '上方', '上边', '顶部', '上端', '上侧'] },
  { name: 'top-right',    aliases: ['右上角', '右上', '右上方', '右上面'] },
  { name: 'center-left',  aliases: ['左边', '左侧', '左方', '左面', '中间偏左'] },
  { name: 'center',       aliases: ['正中间', '正中央', '中间', '中央', '正中', '中心', '中部', '居中'] },
  { name: 'center-right', aliases: ['右边', '右侧', '右方', '右面', '中间偏右'] },
  { name: 'bottom-left',  aliases: ['左下角', '左下', '左下方', '左下面'] },
  { name: 'bottom-center',aliases: ['下面', '下方', '下边', '底部', '底端', '底下', '下侧'] },
  { name: 'bottom-right', aliases: ['右下角', '右下', '右下方', '右下面'] },
];

/**
 * 查位置别名 → 返回位置 key（如 'top-left'）
 * NOTE: 别名按长度降序匹配，避免 "左上角" 被 "左" 或 "上" 抢先匹配
 */
export function lookupPosition(text: string): string | null {
  // 展平为 (alias, name) 列表并按 alias 长度降序排列
  const pairs: { alias: string; name: string }[] = [];
  for (const entry of POSITION_DICT) {
    for (const alias of entry.aliases) {
      pairs.push({ alias, name: entry.name });
    }
  }
  pairs.sort((a, b) => b.alias.length - a.alias.length);

  for (const { alias, name } of pairs) {
    if (text.includes(alias)) return name;
  }
  return null;
}
