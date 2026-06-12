 # VoiceDraw — PR & Commit Plan
 
 基于 [DESIGN.md](E:\race\some\DESIGN.md) 的功能规划与优先级，整理为以下 7 个 PR，按 24 小时冲刺的依赖顺序排列。每个 PR 包含对应的 Commit 列表。
 
 ---
 
 ## PR 1: 项目脚手架与语音基础设施
 
 **描述**：搭建 React + Vite + TypeScript + Tailwind 工程基础，封装 Web Speech API 语音识别层，实现实时字幕和麦克风状态 UI。此 PR 完成后，项目具备完整的语音输入链路。
 
 **优先级**：P0 — 必须完成，决定能不能参赛
 
 **关联文档章节**：§3 当前实现基线、§4.1 技术选型
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: scaffold React + Vite + TypeScript + Tailwind project` | 初始化工程结构，配置 Vite、Tailwind、TypeScript，全屏暗色主题布局 |
 | 2 | `feat: implement VoiceRecognizer (Web Speech API wrapper)` | 封装 VoiceRecognizer，支持中文识别、interim results、错误处理、静音停止 |
 | 3 | `feat: add SpeechBubble component for real-time transcription` | 实时语音字幕组件，显示 interim 文本和 final 识别状态 |
 | 4 | `feat: add MicButton with listening state, waveform and error hints` | 麦克风按钮组件，含监听状态动画、波形效果、权限/网络/语言错误提示 |
 | 5 | `chore: add Fabric.js dependency` | 安装 fabric 包，为画布引擎做准备 |
 
 **验收标准**：
 - `npm run dev` 启动后可见全屏暗色界面，麦克风按钮可交互
 - Chrome/Edge 中可授权麦克风，语音识别启动后实时字幕显示识别文本
 - 静音 8 秒后自动停止识别，错误状态有对应提示
 
 ---
 
 ## PR 2: 画布引擎与基础绘图
 
 **描述**：接入 Fabric.js，创建 CanvasEngine 和 DrawingCanvas 组件，替换当前占位块。实现圆形、矩形、三角形、线条四种基础图形的绘制。
 
 **优先级**：P0 — 必须完成，决定能不能参赛
 
 **关联文档章节**：§4.2 系统架构、§5.1 P0 基础图形、§7 2-5h 阶段
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: create CanvasEngine and DrawingCanvas component` | 初始化 Fabric 画布实例，封装 CanvasEngine 类，暴露 drawShape/clear/getJSON 等方法；DrawingCanvas 组件挂载画布 |
 | 2 | `feat: implement basic shape drawing — Circle, Rect, Triangle, Line` | 通过 CanvasEngine 支持 drawCircle、drawRect、drawTriangle、drawLine，含颜色/大小/位置参数 |
 | 3 | `feat: wire DrawingCanvas into App.tsx replacing placeholder` | 将 App.tsx 中的画布占位块替换为真正的 Fabric 画布 |
 
 **验收标准**：
 - 页面中显示真正的画布区域（不再是灰色占位块）
 - 通过控制台调用 CanvasEngine 可绘制圆、矩形、三角形、线条
 - 图形带指定颜色、大小、出现在大致正确位置
 
 ---
 
 ## PR 3: 指令解析器与语音-画布链路
 
 **描述**：实现 CommandParser 指令解析器，含意图识别、参数抽取、颜色/位置/大小词典映射。打通"语音文本 -> 指令解析 -> 画布执行"的主链路，并添加命令日志组件。
 
 **优先级**：P0 — 必须完成，决定能不能参赛
 
 **关联文档章节**：§5.1 P0、§6 指令解析设计、§7 5-8h 阶段
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: implement CommandParser with intent recognition` | 核心解析器：标准化 → 意图识别(draw/edit/delete/history/export/help) → 参数抽取 → 缺省补全 → Command[] |
 | 2 | `feat: add color dictionary (12+ Chinese colors → HEX)` | 颜色词典，支持 12+ 中文颜色名映射为 HEX 值，含同义词 |
 | 3 | `feat: add size dictionary (small/medium/large → dimensions)` | 大小词典，small/medium/large 三级映射到具体像素值 |
 | 4 | `feat: add position dictionary (9-grid mapping)` | 九宫格位置映射：左上/中上/右上/左中/中心/右中/左下/中下/右下 |
 | 5 | `feat: wire voice-to-canvas pipeline in App.tsx` | 监听 VoiceRecognizer 的 final 结果，送入 CommandParser，执行 CanvasEngine 命令 |
 | 6 | `feat: add CommandLog component for visible command history` | 命令日志组件，显示识别文本、解析结构、执行状态 |
 
 **验收标准**：
 - 说出"画一个红色圆形"后，画布上出现一个红色圆
 - 说出"画蓝色矩形在右下角"等变体，结果正确
 - 命令日志面板能逐条显示解析和执行过程
 - 至少支持 10 条自然语言绘图命令
 
 ---
 
 ## PR 4: 历史操作与画布管理
 
 **描述**：实现 HistoryManager 管理撤销/重做栈，支持清空画布（含语音确认流程），以及 PNG 导出功能。形成基本的产品使用闭环。
 
 **优先级**：P0 — 必须完成，决定能不能参赛
 
 **关联文档章节**：§5.1 P0 撤销/重做/清空、§7 8-10h 阶段
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: implement HistoryManager with undo/redo stack` | 基于 Fabric JSON 快照的撤销/重做栈，每次操作自动保存状态 |
 | 2 | `feat: add voice-triggered undo and redo commands` | "撤销""重做"指令 → HistoryManager.undo()/redo() |
 | 3 | `feat: add canvas clear with voice confirmation` | "清空"指令：首次语音确认 + 二次语音确认执行；或直接"重新开始"执行 |
 | 4 | `feat: add PNG export via voice command` | "导出图片""保存作品" → canvas.toDataURL → 下载 PNG |
 
 **验收标准**：
 - 画图 → "撤销" → 上一步图形消失 → "重做" → 恢复
 - "清空"后画布归零
 - "导出图片"触发 PNG 下载
 
 ---
 
 ## PR 5: 语音反馈系统 (TTS)
 
 **描述**：封装 SpeechSynthesis，在每条命令执行后播报语音反馈（成功/失败/提示），让纯语音闭环更加完整。
 
 **优先级**：P0 — 必须完成
 
 **关联文档章节**：§5.1 P0 语音反馈、§7 17-19h 阶段
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: implement SpeechSynthesis wrapper for TTS feedback` | 封装 VoiceFeedback 类，支持中文语音播报、暂停/继续、语速控制 |
 | 2 | `feat: add success/failure/error voice feedback for each command` | 命令执行成功后播报"已画红色圆形"，失败时播报提示信息 |
 | 3 | `feat: add status bar showing current system state` | 页面状态条组件：显示"监听中…"、"正在画图…"、"已就绪"等状态 |
 
 **验收标准**：
 - 画图成功后听到语音反馈
 - 不支持的命令有语音提示
 - 状态条与语音反馈状态同步
 
 ---
 
 ## PR 6: 高阶指令理解能力
 
 **描述**：实现复杂指令拆解（一句话拆成多个动作）、上下文连续编辑（代词/对象引用）、场景模板、文本绘制和对象选择。此 PR 是区分普通作品和冲击 8 强的关键增量。
 
 **优先级**：P1 — 冲 8 强的关键增量
 
 **关联文档章节**：§5.2 P1、§6.3 复杂指令示例、§7 10-15h 阶段
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: implement complex command decomposition` | 按连接词（然后/再/接着/并且/，）拆句，每条子句独立解析，生成有序 Command[] 队列 |
 | 2 | `feat: add context-aware editing with pronoun resolution` | "它""上一个""太阳"等代词/引用解析，关联最近/命名对象 |
 | 3 | `feat: add object selection by name and position` | "选择太阳""选择最后一个图形" → 激活 Fabric 对象，支撑后续编辑 |
 | 4 | `feat: add move, resize, recolor editing commands` | "把它变大""向左移一点""改成红色" → 对当前选中对象操作 |
 | 5 | `feat: add scene templates (sunrise, flowchart, smiley)` | 2-3 个场景模板命令："画一张日出风景" → 自动绘制多对象组合 |
 | 6 | `feat: add text drawing on canvas` | "添加标题 xxx" → Fabric IText 对象，支持颜色/大小 |
 
 **验收标准**：
 - 说出"画一个黄色太阳在上面，下面画三座绿色的山" → 按顺序绘制多个图形
 - 说出"把太阳变大" → 太阳对象缩放
 - 说出"画一张日出风景" → 自动生成多图形组合画面
 - 命令日志展示拆解过程
 
 ---
 
 ## PR 7: 容错、演示与文档收尾
 
 **描述**：完善容错策略、帮助命令、UI 打磨、演示脚本固化、文档更新。确保 npm run build 通过，准备正式演示。
 
 **优先级**：P1~P2（P1 容错与帮助；P2 高级图形等留到赛后）
 
 **关联文档章节**：§6.2 容错策略、§7 19-24h 阶段、§10 验收标准、§11 风险应对
 
 ### Commits
 
 | # | Commit 信息 | 说明 |
 |---|-------------|------|
 | 1 | `feat: add help voice command listing all supported commands` | "帮助""支持哪些命令" → 语音播报 + 日志显示能力列表 |
 | 2 | `feat: improve error-tolerant strategies (synonyms, fuzzy match)` | 增强同义词表、容错词表、相似词纠正；歧义命令语音询问 |
 | 3 | `fix: polish UI interactions for pure-voice demo flow` | 确保全流程无需键盘鼠标：从唤醒→绘图→撤销→清空→导出全部语音可完成 |
 | 4 | `docs: update README and DESIGN with completion status and demo script` | 更新文档，说明完成/未完成部分，附演示剧本和备用短命令 |
 | 5 | `chore: ensure npm run build passes and final bundle check` | 构建验证，只修阻塞问题 |
 
 **验收标准**：
 - npm run build 通过
 - 演示剧本可稳定跑通（启动→画背景/太阳/山/树/河→编辑→撤销→标题→导出）
 - 有备用短命令应对识别波动
 - 文档清晰说明完成与未完成部分
 
 ---
 
 ## 附录：能力与 PR 映射矩阵
 
 | 能力 | 优先级 | 所属 PR | 来源章节 |
 |------|--------|---------|----------|
 | React + Vite + TS + Tailwind 工程 | P0 (基线) | PR1 | §3 |
 | VoiceRecognizer (Web Speech) | P0 | PR1 | §3, §4.1 |
 | SpeechBubble 实时字幕 | P0 | PR1 | §3 |
 | MicButton 状态 UI | P0 | PR1 | §3 |
 | Fabric 画布引擎 | P0 | PR2 | §4.2, §5.1 |
 | 基础图形 (圆/矩/三角/线) | P0 | PR2 | §5.1 |
 | CommandParser 指令解析 | P0 | PR3 | §5.1, §6 |
 | 颜色/大小/位置词典 | P0 | PR3 | §5.1 |
 | 命令日志 | P0 | PR3 | §5.1 |
 | 撤销/重做 | P0 | PR4 | §5.1 |
 | 清空画布 | P0 | PR4 | §5.1 |
 | PNG 导出 | P0 | PR4 | §5.1 |
 | TTS 语音反馈 | P0 | PR5 | §5.1 |
 | 状态条 | P0 | PR5 | §5.1 |
 | 复杂指令拆解 | P1 | PR6 | §5.2, §6.3 |
 | 上下文编辑 (代词/引用) | P1 | PR6 | §5.2 |
 | 对象选择 | P1 | PR6 | §5.2 |
 | 编辑命令 (移动/缩放/改色) | P1 | PR6 | §5.2 |
 | 场景模板 | P1 | PR6 | §5.2 |
 | 文本绘制 | P1 | PR6 | §5.2 |
 | 容错策略 (同义词/模糊匹配) | P1 | PR7 | §6.2 |
 | 帮助命令 | P1 | PR7 | §7 |
 | 演示/文档收尾 | P1 | PR7 | §7, §10 |
 | 自由手绘 / 云 AI / 多语言 / 图层 | P2 | (赛后) | §5.3 |
 | 高级图形 (贝塞尔) / 协作存储 | P2 | (赛后) | §5.3 |
 
 ---
 
 *生成依据：DESIGN.md v2.0 (2026-06-13)，24 小时冲刺版*
 *按 P0 → P1 → P2 优先级和实现依赖关系编排*
