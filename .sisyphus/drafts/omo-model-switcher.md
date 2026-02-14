# Draft: OMO 模型切换插件

## 研究发现

### oh-my-opencode (OMO)
- 是 OpenCode 的插件，不是独立工具
- 管理 11+ 个专用 AI agent（Sisyphus, Oracle, Librarian 等）
- 使用"category"系统分配模型 — agent 引用 category，category 定义模型
- 配置格式：JSONC，Zod 验证，多级层次（项目 → 用户 → 默认）
- 已有 agent override 系统，可以自定义每个 agent 的模型
- 已有模型选择逻辑：`src/tools/delegate-task/model-selection.ts`

### opencode
- TypeScript 编写的开源编码代理
- JSONC 配置格式
- 插件系统：`@opencode-ai/plugin` 接口
- Agent 类型：coder, task, title，可配置模型
- 模型来自 models.dev 数据库，格式 `providerID/modelID`

### cc-switch（架构参考）
- Tauri 2 桌面应用（Rust + React）
- 清晰的命令层模式：commands/ → services/ → config
- 前端：React + Context API
- 管理多个 CLI 工具的配置
- 通过 IPC 命令切换模型

### 文生图前后端（UI/UX 参考）
- Tauri 2 + React 18 + TypeScript
- Zustand 状态管理（persist middleware）
- Tailwind CSS（无组件库）
- Lucide 图标
- 虚拟滚动、Modal 系统、Toast 通知

## 需求（已确认）
- [x] 产品形态：Tauri 桌面 GUI 应用
- [x] "角色"定义：OMO 现有的 agent 角色（Sisyphus, Oracle, Librarian 等）
- [x] 模型提供商：全部支持（opencode 已支持的所有提供商）
- [x] 切换机制：修改 OMO 的 JSONC 配置文件
- [x] 预设方案管理：需要（一键切换整套配置）

## 功能清单（已确认）
1. **Agent 模型切换**（核心）— 查看每个 agent 当前模型，点击切换
2. **预设方案管理** — 保存/加载/切换整套配置方案（如"省钱模式"、"高质量模式"）
3. **配置状态总览** — 当前 OMO 配置状态、配置文件路径
4. **配置导入/导出** — 导入/导出配置文件，方便分享或备份
5. **模型库浏览** — 从 models.dev 获取最新模型列表，显示模型能力信息

## 技术决策
- 产品形态：Tauri 2 桌面应用（参考 cc-switch 架构）
- 前端：React + TypeScript + Zustand + Tailwind CSS（参考文生图项目 UI）
- 后端：Rust（Tauri 命令层）
- 配置管理：读写 OMO 的 JSONC 配置文件
- 模型数据：从 models.dev API 获取

## 范围边界
- INCLUDE: Agent 模型切换、预设方案、配置总览、导入导出、模型库浏览
- EXCLUDE: （待确认 — 运行时热切换、OMO 内部插件开发、API Key 管理）

## 开放问题
- 测试策略？
- 应用名称？
