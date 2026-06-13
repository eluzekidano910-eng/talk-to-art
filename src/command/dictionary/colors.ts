export interface ColorEntry {
  name: string;
  hex: string;
  aliases: string[];
}

export const COLOR_DICT: ColorEntry[] = [
  {
    name: 'red',
    hex: '#ef4444',
    aliases: ['红', '红色', '朱红', '大红', '鲜红', '殷红', '赤红', '通红', '红彤彤', '红艳艳'],
  },
  {
    name: 'blue',
    hex: '#3b82f6',
    aliases: ['蓝', '蓝色', '天蓝', '蔚蓝', '湛蓝', '深蓝', '淡蓝', '浅蓝', '宝蓝', '蓝晶晶'],
  },
  {
    name: 'green',
    hex: '#22c55e',
    aliases: ['绿', '绿色', '翠绿', '碧绿', '嫩绿', '草绿', '墨绿', '葱绿', '绿油油'],
  },
  {
    name: 'yellow',
    hex: '#eab308',
    aliases: ['黄', '黄色', '金黄', '橘黄', '淡黄', '浅黄', '米黄', '黄灿灿', '黄澄澄'],
  },
  {
    name: 'purple',
    hex: '#a855f7',
    aliases: ['紫', '紫色', '紫红', '紫罗兰', '浅紫', '深紫', '绛紫'],
  },
  {
    name: 'pink',
    hex: '#ec4899',
    aliases: ['粉', '粉色', '粉红', '桃红', '浅粉', '淡粉', '胭脂'],
  },
  {
    name: 'orange',
    hex: '#f97316',
    aliases: ['橙', '橙色', '橘色', '橙黄', '杏黄'],
  },
  {
    name: 'white',
    hex: '#ffffff',
    aliases: ['白', '白色', '雪白', '纯白', '乳白', '银白', '白花花', '白茫茫'],
  },
  {
    name: 'black',
    hex: '#000000',
    aliases: ['黑', '黑色', '漆黑', '乌黑', '墨黑', '炭黑', '黑洞洞'],
  },
  {
    name: 'gray',
    hex: '#6b7280',
    aliases: ['灰', '灰色', '浅灰', '深灰', '银灰', '烟灰', '灰蒙蒙'],
  },
  {
    name: 'cyan',
    hex: '#06b6d4',
    aliases: ['青', '青色', '天青', '靛青', '青绿', '青蓝', '湖蓝'],
  },
  {
    name: 'brown',
    hex: '#8B4513',
    aliases: ['棕', '棕色', '褐', '褐色', '咖啡', '土黄', '赭石', '茶色'],
  },
];

export function lookupColor(text: string): { name: string; hex: string } | null {
  for (const entry of COLOR_DICT) {
    for (const alias of entry.aliases) {
      if (text.includes(alias)) {
        return { name: entry.name, hex: entry.hex };
      }
    }
  }
  return null;
}
