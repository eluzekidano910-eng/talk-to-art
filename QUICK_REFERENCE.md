# VoiceDraw 实现速查卡

> 纯语音绘画工具 — 无鼠标键盘，24h 完成

---

## 技术栈（4 选，够用）

| 层 | 选什么 | 一句话理由 |
|---|--------|-----------|
| 框架 | React + TypeScript + Vite | HMR 快 |
| 画布 | Fabric.js 6 | 内置形状/画笔/编辑，不用手写 |
| 语音 | Web Speech API | 浏览器自带，免费零延迟 |
| 样式 | Tailwind CSS | 不写 CSS 文件 |

---

## 功能清单（按实现顺序）

### P0 · 核心必达 · 12小时

| # | 做啥 | 怎么实现 | 验收 |
|---|------|----------|------|
| 1 | **语音激活** | 按钮触发 `SpeechRecognition.start()`，`lang='zh-CN'`，点击开/关 | 点按钮说话，UI 出现波形 |
| 2 | **画圆** | 解析"画圆"→ `new fabric.Circle()` 加到 canvas | 说"画红色的圆"→画布出红圆 |
| 3 | **画矩形** | 解析"画矩形"→ `new fabric.Rect()` | 同上 |
| 4 | **画三角形** | 解析"画三角形"→ `new fabric.Triangle()` | 同上 |
| 5 | **画线** | 解析"画线"→ `new fabric.Line()` | 同上 |
| 6 | **自由绘制** | "开始画"→ `canvas.isDrawingMode = true`，"停止"→ 设回 false | 说两句切换模式成功 |
| 7 | **切换颜色** | 维护颜色映射表 `{红:red,蓝:blue,…}` 15种，改 `canvas.freeDrawingBrush.color` | 说"蓝色"→笔刷变蓝 |
| 8 | **撤销** | 数组存快照 `history.push(canvas.toJSON())`，撤销时 `loadFromJSON(history.pop())` | 说"撤销"→上一步消失 |
| 9 | **清空** | `canvas.clear()` + 重置背景 | 说"清空"→画布空白 |
| 10 | **导出** | `canvas.toDataURL('png')` → 创建 `<a download>` 触发点击 | 说"保存"→下载 PNG |
| 11 | **语音反馈** | 执行后调 `speechSynthesis.speak(new SpeechSynthesisUtterance("已画出红色圆形"))` | 耳边听到确认语音 |
| 12 | **状态栏** | 纯展示组件，显示当前颜色+模式+最后指令 | UI 实时更新 |

### P1 · 体验完整 · 7小时

| # | 做啥 | 怎么实现 |
|---|------|----------|
| 13 | **多参数指令** | 正则在同一句话里提取 shape+color+size+position："画大的红色圆在中间" |
| 14 | **笔刷粗细** | 监听"粗/细/粗细5"，改 `canvas.freeDrawingBrush.width` |
| 15 | **写文字** | "添加文字Hello"→ `new fabric.IText(text)` 放画布中央 |
| 16 | **删除选中** | "删除"→ `canvas.remove(canvas.getActiveObject())` |
| 17 | **椭圆/多边形** | `new fabric.Ellipse()` / Polygon 用顶点坐标算 |
| 18 | **连续识别** | `recognition.continuous = true`，说完不停，自动听下一句 |
| 19 | **填充/描边** | "填充"/"只有边框"切换 `shape.fill` / `shape.stroke` |
| 20 | **背景色** | "背景黑"→ `canvas.setBackgroundColor()` |
| 21 | **指令日志** | 数组存最近 5 条识别文本，UI 列表渲染 |
| 22 | **容错** | 同音字映射 `{园:圆, 举行:矩形}` + 编辑距离匹配 |

### P2 · 出彩 · 4小时

| # | 做啥 | 怎么实现 |
|---|------|----------|
| 23 | **移动对象** | "左移"→ `obj.left -= 20` + `canvas.renderAll()` |
| 24 | **缩放对象** | "放大"→ `obj.scale(1.2)` |
| 25 | **连续指令** | 按"然后/接着/再"拆分字符串，逐条执行 |
| 26 | **箭头/星形** | Arrow 用三角形+线组合，Star 用 Polygon 算顶点 |
| 27 | **帮助** | "帮助"→ TTS 朗读指令列表 |
| 28 | **透明度** | "半透明"→ `obj.opacity = 0.5` |

---

## 架构（3 个模块串起来）

```
语音说出 "画红色圆"
    │
    ▼
VoiceRecognizer.ts     →  拿到文本 "画红色圆"
    │
    ▼
CommandParser.ts       →  意图=DRAW_SHAPE, shape=circle, color=red
    │
    ▼
CanvasEngine.ts        →  new fabric.Circle({fill:'red', radius:100})
    │
    ▼
VoiceFeedback.ts       →  TTS 说 "已画出红色圆形"
```

---

## 核心代码骨架（按文件建）

```
src/
├── voice/
│   ├── VoiceRecognizer.ts    # 封装 SpeechRecognition，暴露 start/stop/onResult
│   └── VoiceFeedback.ts      # 封装 SpeechSynthesis，暴露 speak(text)
├── parser/
│   ├── CommandParser.ts      # 主解析器：文本进 → {intent, params} 出
│   ├── rules.ts              # 关键词规则表
│   └── colorMap.ts           # 颜色中英文映射 {红:red, 蓝:blue, ...}
├── canvas/
│   └── CanvasEngine.ts       # 封装 Fabric.js，暴露 drawCircle/undo/export 等
├── state/
│   └── DrawingState.ts       # useReducer 管理 color/brushSize/mode/history
├── components/
│   ├── DrawingCanvas.tsx     # <canvas> 容器，初始化 Fabric
│   ├── AudioVisualizer.tsx   # 麦克风音量动画条
│   └── StatusBar.tsx         # 底部状态栏（颜色/模式/最后指令）
└── App.tsx                   # 组装所有组件
```

---

## 时间节奏

| 时段 | 干的事 | 产出 |
|------|--------|------|
| 0-0.5h | `npm create vite`，装依赖，建文件结构 | 骨架 |
| 0.5-3.5h | CanvasEngine 封装 | 画布能画形状+自由线 |
| 3.5-6h | VoiceRecognizer + VoiceFeedback | 能识别中文+能说话 |
| 6-8.5h | CommandParser + 规则表 | 文本能变成指令 |
| 8.5-12h | 拼起来，P0 全跑通 | 🎯 核心可演示 |
| 12-19h | P1 逐个加 | 体验完整 |
| 19-23h | P2 择优加 | 有亮点 |
| 23-24h | 测一遍 + 补文档 | 交付 |

---

## 每阶段结束的动作

```bash
git checkout -b feature/xxx      # 切分支
git add . && git commit -m "..."  # 提交
git push -u origin feature/xxx    # 推送
# → GitHub 网页创建 PR → 自己 Merge → git checkout main → git pull
```

一共 7 个 PR，均匀分布在 24 小时内。
