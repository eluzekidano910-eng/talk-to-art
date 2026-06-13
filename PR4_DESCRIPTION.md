# PR 4：撤销/编辑/删除/导出 — 编辑闭环

## 概述

在 PR3 打通"说话 -> 画图"主链路后，PR4 补齐**撤销、编辑、删除、导出**四个关键操作，让用户不仅能画图，还能用语音调整、修复和保存作品。配合 CanvasEngine 基于 Fabric JSON 快照的历史栈、按语义名/形状/位置查找的 `findObjects`、以及自动选中机制，形成完整的"画 -> 改 -> 删 -> 存"闭环。

## 依赖

- PR1（语音识别）— 提供语音文本输入
- PR2（画布引擎）— 提供绘图执行能力
- PR3（指令解析器 + 词典 + 语音链路）— 提供指令解析和执行集成

本分支从 `feature/command-parser` 切出。

## 主提交（4 个）

### Commit 1 — 撤销/重做历史栈

**文件：** `src/canvas/CanvasEngine.ts`、`src/App.tsx`

**实现：**

- `CanvasEngine` 新增 `history: string[]` 栈 + `historyIndex` 指针
- `saveState()`：每次 `drawCircle`/`drawRect`/`drawTriangle`/`drawLine`/`clear` 前自动调用，保存当前画布的 Fabric JSON 快照。新操作后自动截断重做栈（`history.slice(0, index + 1)`）
- `undo()`：`historyIndex--`，调用 `loadJSON()` 加载上一个快照
- `redo()`：`historyIndex++`，调用 `loadJSON()` 加载下一个快照
- 历史栈上限 **50 步**，超出时丢弃最旧的快照
- `App.tsx` 的 `executeCanvasCommand` 新增 `case 'undo'` 和 `case 'redo'`，直接调用引擎方法

**关键设计：**

- 快照基于 `canvas.toJSON()`，包含所有对象的属性（位置、大小、颜色、旋转等），撤销/重做后画布完全恢复到之前状态
- 不保存选中状态（选中状态不影响画布内容，撤销时自动清除）

### Commit 2 — 编辑已有对象

**文件：** `src/canvas/CanvasEngine.ts`、`src/canvas/types.ts`、`src/App.tsx`

**实现：**

- `DrawShapeOptions` 新增 `name?: string` 字段，用于标记语义对象名称
- 各 `draw*` 方法创建 Fabric 对象时传入 `name` 属性，方便后续查找
- `findObjects(target: string)`：按目标查找画布对象
  - `'last'` — 返回最近绘制的对象
  - `'selected'` — 返回当前选中的对象（`canvas.getActiveObject()`）
  - `'circle'`/`'rect'`/`'triangle'`/`'line'` — 按 Fabric 对象类型过滤
  - 语义名（如 `'sun'`/`'mountain'`）— 按 `object.name` 精确匹配
  - `'all'` — 返回全部对象
- `editObjects(target, changes)`：编辑对象
  - `changes.color` — 通过 `resolveColor()` 映射中文色名到 HEX，调用 `obj.set('fill', hex)`
  - `changes.size === 'large'` — 缩放 1.5 倍
  - `changes.size === 'small'` — 缩放 0.6 倍
  - `changes.moveDirection` — 按 `左/右/上/下` 移动 50px
  - 位置过滤：当指定了 `changes.position` 且命中多个对象时，取离目标位置最近的那个
  - 自动选中：编辑后调用 `canvas.setActiveObject()` 高亮显示
  - 仅在有实际修改时调用 `saveState()`，纯选操作不产生历史记录
- `App.tsx` 的 `executeCanvasCommand` 新增 `case 'edit'`，根据有无当前选中智能决定目标

### Commit 3 — 删除对象

**文件：** `src/canvas/CanvasEngine.ts`、`src/App.tsx`

**实现：**

- `deleteObjects(target)`：按目标查找并移除
  - `'all'` — 删除全部对象
  - 其他目标 — 复用 `findObjects()` 查找
  - 删除前调用 `saveState()` 保存撤销快照
- `case 'delete'` 集成到 `executeCanvasCommand`

### Commit 4 — 导出 PNG

**文件：** `src/canvas/CanvasEngine.ts`、`src/App.tsx`

**实现：**

- `exportPNG()`：调用 `canvas.toDataURL({ format: 'png', multiplier: 2 })` 生成 2x 高清 PNG
- 创建 `<a>` 元素自动触发浏览器下载，文件名为 `voicedraw-{timestamp}.png`
- `case 'export'` 集成到 `executeCanvasCommand`

## 修复提交（5 个）

| 提交 | 问题 | 修复 |
|------|------|------|
| PR4-commit2-fix | 编辑参数提取缺失 "放大/缩小"；日志不显示 target/direction | `extractEditParams` 补充正则；`formatParams` 增加 target/moveDirection 映射 |
| PR4-commit2-fix2 | 日志滚动到旧条目；export 日志显示不友好 | 改为正序显示（新在最下）；`formatCommand` 补 export 文字 |
| PR4-commit2-fix3 | 无目标时默认 `selected`，但无选中则无操作 | 改为 `last`，默认操作最近对象 |
| PR4-commit2-fix4 | "选中中间的圆形"被误判为 draw 画新圆 | `recognizeIntent` 加 `选中` 模式；`findObjects` 支持形状类型；`editObjects` 加位置过滤+自动选中 |
| PR4-commit2-fix5 | 听到"圆形"就画新图；绘制后未高亮；不能多选 | 去掉形状回退匹配（必须含"画/生成/新建"才 draw）；draw 后 `setActiveObject`；`ActiveSelection` 支持多选 |

## 验收标准

### 撤销/重做
- [ ] 说"画一个红色的圆" -> 画圆
- [ ] 说"画一个蓝色的矩形" -> 画矩形
- [ ] 说"撤销" -> 矩形消失
- [ ] 说"撤销" -> 圆形消失
- [ ] 说"重做" -> 圆形重新出现
- [ ] 说"重做" -> 矩形重新出现

### 编辑
- [ ] 说"把太阳变大" -> 最后一个叫"太阳"的对象缩放 1.5x
- [ ] 说"变成蓝色" -> 最后一个对象变蓝
- [ ] 说"改成红色" -> 最后一个对象变红
- [ ] 说"向左移" -> 最后一个对象左移 50px
- [ ] 说"放大" -> 无选中时操作最后一个对象

### 删除
- [ ] 说"删除它" -> 删除选中的对象（可撤销）
- [ ] 说"删掉太阳" -> 删除名为"太阳"的对象
- [ ] 说"删除所有" -> 全部清空
- [ ] 说"撤销" -> 删除的对象恢复

### 导出
- [ ] 说"导出图片" -> 浏览器下载 2x PNG 文件

### 选中/多选
- [ ] 说"全选" -> 全部对象蓝色多选框选中
- [ ] 说"选中所有圆形" -> 所有圆形被选中
- [ ] 说"选中中间的圆形" -> 找到中间的圆形选中（不画新圆）
- [ ] draw 后自动选中新画的图形
- [ ] 说"选中最后一个" -> 最近画的图形被选中

## 架构示意

```
用户语音
  -> VoiceRecognizer(PR1)       -> 文字 "把太阳变大"
  -> CommandParser(PR3)          -> { intent:'edit', target:'sun', size:'large' }
  -> CanvasEngine(PR2 + 本PR)
      -> HistoryManager.saveState()   -> Fabric JSON 快照入栈
      -> findObjects('sun')           -> 按语义名 / 形状 / 位置查找
      -> editObjects()                -> 缩放 / 改色 / 移动
      -> setActiveObject()            -> 自动高亮选中
      -> canvas.toDataURL()           -> 导出 2x PNG
  -> SoundPlayer(PR5)                  -> play('success'|'error')
  -> CommandLog(PR3 + PR5)             -> 记录日志（含耗时 + 展开详情）
```

## 技术决策

| 决策 | 选项 | 选择理由 |
|------|------|----------|
| 历史栈存储格式 | Fabric JSON / 增量 diff | JSON 快照：实现简单，undo/redo 后状态完全确定，无累积误差 |
| 编辑目标查找 | 语义名 / 形状类型 / 对象引用 | 优先语义名（精确），其次形状类型（灵活），兼容用户口语习惯 |
| 多选实现 | `ActiveSelection` / 遍历修改 | `ActiveSelection` 在 Fabric 6+ 原生支持，修改后自动分组选中 |
| 导出分辨率 | 1x / 2x | 2x 适配高清屏，展示效果更好 |