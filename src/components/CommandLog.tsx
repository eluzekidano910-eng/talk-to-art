import { useEffect, useRef, useState } from 'react';
import type { CommandIntent } from '../command';

export interface LogEntry {
  id: number;
  rawText: string;
  commands: Array<{ intent: CommandIntent; params: Record<string, unknown> }>;
  status: 'success' | 'error';
  error?: string;
}

// ── 格式化展示 ──

const INTENT_LABEL: Record<string, string> = {
  draw: '绘图', edit: '修改', delete: '删除',
  undo: '撤销', redo: '重做', clear: '清空',
  export: '导出', help: '帮助',
  sleep: '休眠', wake: '唤醒',
};

const SHAPE_LABEL: Record<string, string> = {
  circle: '圆', rect: '矩形', triangle: '三角形', line: '线',
};

function formatParams(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (key === 'shape' && typeof val === 'string') {
      parts.push(SHAPE_LABEL[val] ?? val);
    } else if (key === 'color' && typeof val === 'string') {
      parts.push(val);
    } else if (key === 'size' && typeof val === 'string') {
      parts.push({ small: '小', medium: '中', large: '大' }[val] ?? val);
    } else if (key === 'position' && typeof val === 'string') {
      const posLabels: Record<string, string> = {
        'top-left': '左上', 'top-center': '上方', 'top-right': '右上',
        'center-left': '左边', 'center': '中间', 'center-right': '右边',
        'bottom-left': '左下', 'bottom-center': '下方', 'bottom-right': '右下',
      };
      parts.push(posLabels[val] ?? val);
      } else if (key === 'count' && typeof val === 'number') {
        if (val > 1) parts.push(`${val}个`);
      } else if (key === 'moveDirection' && typeof val === 'string') {
        parts.push(`向${val}`);
      } else if (key === 'target' && typeof val === 'string') {
        const targetLabels: Record<string, string> = {
          selected: '选中', last: '最后一个',
          sun: '太阳', mountain: '山', river: '河', tree: '树', flower: '花',
        };
        parts.push(targetLabels[val] ?? val);
      }
    }
    return parts.join('、') || '—';
}

  function formatCommand(cmd: { intent: CommandIntent; params: Record<string, unknown> }): string {
    const label = INTENT_LABEL[cmd.intent] ?? cmd.intent;
    if (cmd.intent === 'clear') return `${label}画布`;
    if (cmd.intent === 'export') return `${label}图片`;
    const paramsStr = formatParams(cmd.params);
    return paramsStr ? `${label} → ${paramsStr}` : label;
  }

// ── 组件 ──

interface CommandLogProps {
  entries: LogEntry[];
  maxHeight?: number;
}

export function CommandLog({ entries, maxHeight = 240 }: CommandLogProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新增条目时自动滚到底部
  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, collapsed]);

  if (entries.length === 0) return null;

  return (
    <div className="absolute bottom-28 right-6 z-40 w-72 select-none">
      <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-xs text-white/50 font-medium tracking-wide">
            📋 命令日志
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/30 hover:text-white/60 transition-colors text-sm leading-none px-1"
            aria-label={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>

        {/* 列表 */}
        {!collapsed && (
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-start gap-2">
                  {/* 状态图标 */}
                  <span className="mt-0.5 text-xs shrink-0">
                    {entry.status === 'success' ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* 识别文本 */}
                    <p className="text-xs text-white/60 truncate">{entry.rawText}</p>
                    {/* 解析结果 */}
                    {entry.commands.length > 0 ? (
                      <div className="mt-0.5 space-y-0.5">
                        {entry.commands.map((cmd, i) => (
                          <p key={i} className="text-xs text-emerald-300/90 font-mono truncate">
                            {formatCommand(cmd)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-red-400/80">
                        {entry.error ?? '无法解析'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
