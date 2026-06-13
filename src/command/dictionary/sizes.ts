export interface SizeEntry {
  name: string;
  aliases: string[];
}

export const SIZE_DICT: SizeEntry[] = [
  {
    name: 'small',
    aliases: [
      '很小', '小小的', '超小', '极小', '微小', '迷你',
      '小小',
      '细小', 'tiny', '小号', '小尺寸', '最小',
    ],
  },
  {
    name: 'medium',
    aliases: [
      '中等', '中等大小', '中号', '适中', '中尺寸',
      '不大不小', '中等的',
    ],
  },
  {
    name: 'large',
    aliases: [
      '很大', '大大的', '超大', '巨大', '极大', '特大',
      '大大',
      '非常大', '硕大', '宏大', '庞大', '大号',
      '最大', '大尺寸',
    ],
  },
];

/** 注意：单个字 "大" / "小" 因为匹配面太宽，不作为别名，由 CommandParser 的 regex 兜底 */
export function lookupSize(text: string): string | null {
  for (const entry of SIZE_DICT) {
    for (const alias of entry.aliases) {
      if (text.includes(alias)) {
        return entry.name;
      }
    }
  }
  return null;
}
