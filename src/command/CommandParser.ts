import type { Command, CommandIntent, ShapeType, ParseResult, NormalizedToken } from './types';
import { lookupColor } from './dictionary/colors';
import { lookupSize } from './dictionary/sizes';
import { lookupPosition } from './dictionary/positions';

/**
 * 将拆分后的单句解析为一个 Command
 */
function parseSingle(raw: string): Command | null {
  const text = raw.trim();
  if (!text) return null;

  const intent = recognizeIntent(text);
  if (!intent) return null;

  const params = extractParams(text, intent);
  const filled = fillDefaults(intent, params);

  return { intent, raw: text, params: filled };
}

/**
 * 按连接词拆分长句
 */
function splitSentences(text: string): string[] {
  // 先按连接词拆分，保留每个子句
  const parts = text.split(
    /[,，、。；;！!？?]+|然后|再|再然后|接着|并且|还有|最后|之后|随后|下一步/,
  );
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * 意图识别 — 按优先级匹配
 */
function recognizeIntent(text: string): CommandIntent | null {
  // 帮助
  if (/帮助|怎么用|支持|指令|help|功能|说明|教程/.test(text)) return 'help';
  // 撤销
  if (/撤销|回退|上一步|后退|undo/.test(text)) return 'undo';
  // 重做
  if (/重做|恢复|redo|前进/.test(text)) return 'redo';
  // 清空
  if (/清空|清除|重新开始|重置|clear|全部删/.test(text)) return 'clear';
  // 导出
  if (/导出|保存|下载|export|save|png|图片/.test(text)) return 'export';
  // 删除
  if (/删除|删掉|移除|去掉|delete|remove|擦/.test(text)) return 'delete';
  // 编辑
  if (/(改成?|变(成|大|小|色|颜色|红|蓝|绿|黄)|放大|缩小|移动|向(左|右|上|下)|变大|变小|换色|旋转)/.test(text)) return 'edit';
  // 绘图（默认最多）
  if (/画|绘|添加|加一?[个条座棵只]|create|draw/.test(text)) return 'draw';

  // 没有任何明确意图 → 尝试按 draw 处理
  if (/(圆|圈|方形|三角|线|太阳|山|河|树|花)/.test(text)) return 'draw';

  return null;
}

/**
 * 参数抽取
 */
function extractParams(text: string, intent: CommandIntent): Record<string, unknown> {
  switch (intent) {
    case 'draw':
      return extractDrawParams(text);
    case 'edit':
      return extractEditParams(text);
    case 'delete':
      return extractDeleteParams(text);
    default:
      return {};
  }
}

/**
 * 抽取绘图参数
 */
function extractDrawParams(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  // 形状
  const shape = resolveShape(text);
  if (shape) params.shape = shape;

  // 数量
  const count = extractCount(text);
  if (count > 1) params.count = count;

  // 颜色关键词（原始值，不做映射 — 映射在 commit 2 的词典中）
  const color = resolveColorToken(text);
  if (color) params.color = color;

  // 大小关键词（原始值 — commit 3 加映射）
  const size = resolveSizeToken(text);
  if (size) params.size = size;

  // 位置关键词（原始值 — commit 4 加映射）
  const position = resolvePositionToken(text);
  if (position) params.position = position;

  // 语义名称（如 "太阳" "山" "河"）
  const semantic = resolveSemanticName(text);
  if (semantic) params.semanticName = semantic;

  return params;
}

/**
 * 抽取编辑参数
 */
function extractEditParams(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (/变(大|长|宽|高)/.test(text)) params.size = 'large';
  else if (/变(小|短|窄)/.test(text)) params.size = 'small';

  const color = resolveColorToken(text);
  if (color) params.color = color;

  if (/向(左|右|上|下)/.test(text)) {
    const dirMatch = text.match(/向(左|右|上|下)/);
    if (dirMatch) params.moveDirection = dirMatch[1];
  }

  // 目标对象
  if (/它|这个|那个|当前|选中/.test(text)) params.target = 'selected';
  else if (/太阳|山|河|树|花/.test(text)) {
    const semantic = resolveSemanticName(text);
    if (semantic) params.target = semantic;
  } else if (/上?一个|最近|最后/.test(text)) params.target = 'last';

  return params;
}

/**
 * 抽取删除参数
 */
function extractDeleteParams(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (/它|这个|那个|当前|选中/.test(text)) params.target = 'selected';
  else if (/所有|全部|everything/.test(text)) params.target = 'all';
  else {
    const semantic = resolveSemanticName(text);
    if (semantic) params.target = semantic;
  }
  return params;
}

/**
 * 缺省补全
 */
function fillDefaults(intent: CommandIntent, params: Record<string, unknown>): Record<string, unknown> {
  switch (intent) {
    case 'draw':
      return {
        shape: 'circle',
        count: 1,
        ...params,
      };
    default:
      return params;
  }
}

// ════════════════════════════════════════
//  提取器（后续 commit 会增强替换）
// ════════════════════════════════════════

function resolveShape(text: string): ShapeType | null {
  if (/圆|圈|球|o/.test(text)) return 'circle';
  if (/矩形|方形|正方|长方|rect/.test(text)) return 'rect';
  if (/三角|△/.test(text)) return 'triangle';
  if (/线|直线|线条|line|条/.test(text)) return 'line';
  return null;
}

function extractCount(text: string): number {
  const cn: Record<string, number> =
    { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  // 匹配 "三个" "5个" "三条" "5条" "三座" "座" 等
  const match = text.match(/([一二两三四五六七八九十\d]+)[个条座棵只]?/);
  if (!match) return 1;
  const raw = match[1];
  return cn[raw] ?? parseInt(raw) ?? 1;
}

function resolveColorToken(text: string): string | null {
  const result = lookupColor(text);
  return result ? result.name : null;
}

function resolveSizeToken(text: string): string | null {
  const fromDict = lookupSize(text);
  if (fromDict) return fromDict;
  // 原 regex 兜底（处理词典未覆盖的边缘情况）
  if (/很大?|巨大|超大|大大/.test(text)) return 'large';
  if (/(很小?|迷你|tiny|细小)/.test(text)) return 'small';
  if (/中(等|号|间)/.test(text)) return 'medium';
  return null;
}

function resolvePositionToken(text: string): string | null {
  return lookupPosition(text);
}

function resolveSemanticName(text: string): string | null {
  if (/太阳/.test(text)) return 'sun';
  if (/山/.test(text)) return 'mountain';
  if (/河|河流|江/.test(text)) return 'river';
  if (/树|树木/.test(text)) return 'tree';
  if (/花/.test(text)) return 'flower';
  if (/(房子|屋|建筑)/.test(text)) return 'house';
  if (/云/.test(text)) return 'cloud';
  return null;
}

/**
 * 标准化：去空格、统一常见同义词、纠正常见识别错字
 */
function normalize(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，、]+/g, '，')
    .replace(/[。；;！!？?]+/g, '')
    .replace(/原形|园形|圆形|圆圈/g, '圆形')
    .replace(/长?方型|矩型/g, '矩形')
    .replace(/三解形|三角型/g, '三角形')
    .replace(/直钱|现/g, '线')
    .replace(/话一个|画一?个/g, '画一个')
    .replace(/划/g, '画')
    .replace(/的(?=[大小颜色位置圆方三角线])/g, '');
}

// ════════════════════════════════════════
//  公开 API
// ════════════════════════════════════════

export class CommandParser {
  /**
   * 解析语音文本为可执行命令列表
   */
  parse(text: string): Command[] {
    if (!text || !text.trim()) return [];

    const cleaned = normalize(text);

    // 先尝试整体解析一次（单句）
    const single = parseSingle(cleaned);
    if (single) return [single];

    // 单句失败 → 拆句逐条解析
    const sentences = splitSentences(cleaned);
    const commands: Command[] = [];
    for (const s of sentences) {
      const cmd = parseSingle(s);
      if (cmd) commands.push(cmd);
    }
    return commands;
  }

  /**
   * 解析并返回详细的解析过程（用于 CommandLog）
   */
  parseWithDetail(text: string): ParseResult {
    if (!text || !text.trim()) return { commands: [], tokens: [] };

    const cleaned = normalize(text);
    const sentences = splitSentences(cleaned);

    const tokens: NormalizedToken[] = [];
    const commands: Command[] = [];

    for (const s of sentences) {
      tokens.push({ raw: s, clean: s });
      const cmd = parseSingle(s);
      if (cmd) commands.push(cmd);
    }

    return { commands, tokens };
  }

  /**
   * 获取当前支持的所有分类
   */
  getSupportedIntents(): CommandIntent[] {
    return ['draw', 'edit', 'delete', 'undo', 'redo', 'clear', 'export', 'help'];
  }
}

export { parseSingle, splitSentences, recognizeIntent, normalize };
