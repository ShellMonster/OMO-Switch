# OMO Model Switcher - Work Plan

## TL;DR

> **Quick Summary**: Build a Tauri 2 desktop GUI application that manages oh-my-opencode (OMO) agent model configurations. Users can visually switch which AI model each OMO agent uses, manage preset configurations, browse available models, and import/export configs.
>
> **Deliverables**:
> - Tauri 2 desktop app (macOS)
> - Agent model switching UI (core feature)
> - Preset configuration management
> - Config status overview dashboard
> - Config import/export
> - Model library browser (from local cache + models.dev)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 (scaffold) -> Task 2 (config engine) -> Task 4 (agent switching UI) -> Task 7 (presets)

---

## Context

### Original Request
Build an OMO plugin (desktop GUI) for switching different model roles in oh-my-opencode. Reference cc-switch for architecture and the local text-to-image project for UI/UX patterns.

### Interview Summary
**Key Discussions**:
- Product form: Tauri 2 desktop app (Rust backend + React frontend)
- Target: OMO existing agent roles (15+ agents including Sisyphus, Oracle, Librarian, etc.)
- Model providers: All opencode supports (Anthropic, OpenAI, Google, Azure, Bedrock, xAI, Mistral, Groq, OpenRouter)
- Switching mechanism: Modify OMO JSON config files
- Features: Agent model switching, preset management, config overview, import/export, model browser

**Research Findings**:
- OMO config is plain JSON (not JSONC) at ~/.config/opencode/oh-my-opencode.json
- OMO uses a "category" system: agents reference categories, categories define models
- Models have "variants" (max, high, etc.) controlling reasoning effort - UI must support this
- Agent list is dynamic (15+), not hardcoded
- Local cache at ~/.cache/oh-my-opencode/provider-models.json has all available models
- connected-providers.json shows which providers have API keys configured
- JSON schema available at OMO repo for validation

### Metis Review
**Identified Gaps** (addressed):
- Config format is JSON not JSONC - simplified Rust implementation (serde_json)
- Variants are first-class concept - added variant selection to UI
- Agent list is dynamic (15+) - UI renders dynamically, no hardcoded list
- Local model cache exists - use as primary data source, models.dev as enrichment
- Config backup before write - mandatory safety measure
- cc-switch not on disk - use local text-to-image project as sole architecture reference

---

## Work Objectives

### Core Objective
A Tauri 2 desktop application providing a visual interface for managing OMO agent model configurations, replacing manual JSON file editing with an intuitive GUI.

### Concrete Deliverables
- Tauri 2 app with React frontend
- Agent model switching view (list all agents, current model+variant, click to change)
- Preset management (save/load/delete named configuration sets)
- Config status dashboard (file paths, validation status, agent count)
- Config import/export (file dialog based)
- Model library browser (searchable, filterable by provider)

### Definition of Done
- [ ] App launches and displays current OMO config
- [ ] User can switch any agent model and variant via GUI
- [ ] Changes written to ~/.config/opencode/oh-my-opencode.json
- [ ] Preset save/load/delete works correctly
- [ ] Config import/export via file dialogs works
- [ ] Model browser shows all available models from local cache
- [ ] Config backup created before every write operation

### Must Have
- Read/write OMO JSON config files correctly
- Preserve all unknown fields when writing (no data loss)
- Backup config before every write
- Dynamic agent list rendering (not hardcoded)
- Model + variant selection for each agent
- Preset save/load with named presets
- Config validation against OMO schema

### Must NOT Have (Guardrails)
- NO runtime hot-switching (config file modification only)
- NO API Key management (out of scope)
- NO direct OMO plugin integration (standalone desktop app)
- NO hardcoded agent names (must be dynamic)
- NO over-engineered abstractions (keep it simple)
- NO custom component library (Tailwind utility classes only)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL tasks verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: Tests-after
- **Framework**: vitest (frontend) + cargo test (Rust backend)

### Verification Tools

| Type | Tool | How |
|------|------|-----|
| Frontend UI | Playwright | Navigate, interact, assert DOM, screenshot |
| Rust backend | Bash (cargo test) | Run unit tests, assert pass |
| Config read/write | Bash (cat + python3) | Read file, validate JSON structure |
| Full app | Playwright | Launch app, complete user flows |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
  Task 1: Tauri 2 project scaffold
  Task 3: Model data service (Rust)

Wave 2 (After Wave 1):
  Task 2: Rust config engine
  Task 5: Frontend shell

Wave 3 (After Wave 2):
  Task 4: Agent model switching UI
  Task 6: Config status dashboard

Wave 4 (After Wave 3):
  Task 7: Preset management
  Task 8: Config import/export
  Task 9: Model library browser

Wave 5 (After Wave 4):
  Task 10: Polish, testing, build
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|-----------------|
| 1 | None | 2, 3, 5 | 3 |
| 2 | 1 | 4, 6, 7, 8 | 5 |
| 3 | 1 | 9 | 2, 5 |
| 4 | 2, 5 | 7 | 6 |
| 5 | 1 | 4, 6 | 2, 3 |
| 6 | 2, 5 | None | 4 |
| 7 | 4 | 10 | 8, 9 |
| 8 | 2 | 10 | 7, 9 |
| 9 | 3, 5 | 10 | 7, 8 |
| 10 | 7, 8, 9 | None | None (final) |

---

## TODOs

- [x] 1. Tauri 2 项目脚手架

  **做什么**:
  - 使用 npm create tauri-app@latest 初始化 Tauri 2 项目（React + TypeScript + Vite）
  - 安装依赖：zustand, tailwindcss, lucide-react, clsx, tailwind-merge
  - 配置 Tailwind CSS（tailwind.config.js, index.css）
  - 设置窗口配置：1000x700, 标题 "OMO Model Switcher"
  - 创建目录结构：src/components/, src/store/, src/services/, src-tauri/src/commands/, src-tauri/src/services/

  **不要做**: 不要添加任何业务逻辑，只搭空架子

  **推荐 Agent**: Category: quick, Skills: [frontend-ui-ux]

  **并行**: Wave 1，无依赖，阻塞 Task 2/3/5

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src-tauri/tauri.conf.json — Tauri 窗口配置
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/package.json — 依赖配置
  - /Users/daozhang/Trae_AI/文生图前后端/frontend/tailwind.config.js — Tailwind 配置

  **验收标准**:
  - [ ] cd src-tauri && cargo build 输出包含 Finished
  - [ ] npm run build 退出码为 0

  **提交**: feat: scaffold Tauri 2 project with React + Tailwind

---

- [x] 2. Rust 配置引擎（读写 OMO 配置）

  **做什么**:
  - 创建 src-tauri/src/services/config_service.rs
  - read_omo_config() — 读取 ~/.config/opencode/oh-my-opencode.json
  - write_omo_config() — 先创建 .bak 备份，再写入 JSON，用 serde_json::Value 保留所有未知字段
  - get_config_path() — 返回配置文件路径
  - validate_config() — 基本结构验证（有 agents、categories 键）
  - 创建 src-tauri/src/commands/config_commands.rs — Tauri 命令包装器
  - 用 serde_json::Value 作为根配置类型，确保不丢失任何字段

  **不要做**: 不要用 JSONC 解析器，不要修改不理解的字段，不要无备份写入

  **推荐 Agent**: Category: unspecified-high, Skills: []

  **并行**: Wave 2，依赖 Task 1，阻塞 Task 4/6/7/8，可与 Task 5 并行

  **参考文件**:
  - ~/.config/opencode/oh-my-opencode.json — 实际配置文件结构
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src-tauri/Cargo.toml — Rust 依赖参考

  **验收标准**:
  - [ ] cd src-tauri && cargo test 全部通过
  - [ ] 写入测试配置后读回，往返保留所有字段
  - [ ] 写入时 .bak 备份文件被创建

  **提交**: feat(backend): OMO config read/write/backup engine

---

- [x] 3. 模型数据服务（Rust）

  **做什么**:
  - 创建 src-tauri/src/services/model_service.rs
  - get_available_models() — 读取 ~/.cache/oh-my-opencode/provider-models.json，按提供商分组
  - get_connected_providers() — 读取 ~/.cache/oh-my-opencode/connected-providers.json
  - fetch_models_dev() — 从 models.dev/api.json 获取模型描述/定价，带超时和降级
  - 创建 src-tauri/src/commands/model_commands.rs

  **不要做**: 不要要求 models.dev 必须可用（优雅降级），不要修改缓存文件

  **推荐 Agent**: Category: unspecified-low, Skills: []

  **并行**: Wave 1，无依赖，阻塞 Task 9，可与 Task 1 并行

  **参考文件**:
  - ~/.cache/oh-my-opencode/provider-models.json — 本地模型缓存格式
  - ~/.cache/oh-my-opencode/connected-providers.json — 已连接提供商

  **验收标准**:
  - [ ] cd src-tauri && cargo test 全部通过
  - [ ] get_available_models 返回非空的按提供商分组的模型列表

  **提交**: feat(backend): model data service with local cache

---

- [x] 4. Agent 模型切换 UI（核心功能）

  **做什么**:
  - 创建 src/components/AgentList/ 目录
  - AgentCard 组件：显示 agent 名称、当前模型、当前 variant、编辑按钮
  - AgentList 组件：从配置动态渲染所有 agent（不硬编码名称）
  - ModelSelector 弹窗：下拉/搜索选择模型，variant 选择器（max/high/medium/low/none）
  - 模型变更时调用 Tauri 命令更新配置，Toast 通知成功/失败
  - Zustand store（src/store/configStore.ts）管理配置状态
  - Tailwind CSS 样式，Lucide 图标

  **不要做**: 不要硬编码 agent 名称，不要允许不备份就保存，不要用组件库

  **推荐 Agent**: Category: visual-engineering, Skills: [frontend-ui-ux]

  **并行**: Wave 3，依赖 Task 2+5，阻塞 Task 7，可与 Task 6 并行

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/common/Button.tsx — Button 组件模式
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/store/configStore.ts — Zustand store 模式
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/Settings/ — 设置面板 UI 参考

  **验收标准**:
  - [ ] 页面显示所有 agent 及其当前模型和 variant
  - [ ] 点击 agent 可打开模型选择弹窗
  - [ ] 选择新模型后配置文件被更新
  - [ ] Toast 通知显示成功/失败

  **QA 场景**:
  Playwright: 导航到应用 -> 断言 agent 列表可见 -> 点击某个 agent 的编辑按钮 -> 断言 ModelSelector 弹窗出现 -> 选择新模型 -> 断言 Toast 显示成功 -> 截图 .sisyphus/evidence/task-4-agent-switch.png

  **提交**: feat(ui): agent model switching view

---

- [x] 5. 前端基础框架（布局、路由、Store）

  **做什么**:
  - 创建 src/components/Layout/MainLayout.tsx — 侧边栏 + 主内容区
  - 侧边栏导航：Agent 切换、配置总览、预设管理、模型库、导入导出
  - 创建 Zustand stores：configStore.ts, modelStore.ts, presetStore.ts, uiStore.ts
  - 创建 src/services/tauri.ts — 封装所有 Tauri invoke 调用
  - 创建通用组件：Button, Modal, Toast, Select, SearchInput
  - 参考文生图项目的 Button 组件模式（variants, sizes, clsx+tailwind-merge）

  **不要做**: 不要实现业务逻辑，只搭 UI 框架和空页面

  **推荐 Agent**: Category: visual-engineering, Skills: [frontend-ui-ux]

  **并行**: Wave 2，依赖 Task 1，阻塞 Task 4/6，可与 Task 2/3 并行

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/Layout/ — 布局组件参考
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/common/Button.tsx — 通用组件参考
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/store/ — Zustand store 模式参考

  **验收标准**:
  - [ ] 应用显示侧边栏 + 主内容区布局
  - [ ] 侧边栏导航项可点击切换页面
  - [ ] 通用组件（Button, Modal, Toast）可正常渲染

  **提交**: feat(ui): frontend shell with layout and stores

---

- [x] 6. 配置状态总览仪表板

  **做什么**:
  - 创建 src/components/Dashboard/ConfigDashboard.tsx
  - 显示：配置文件路径、最后修改时间、agent 总数、已配置模型数
  - 显示：每个 agent 的模型分配概览（表格形式）
  - 显示：已连接的提供商列表
  - 显示：配置验证状态（有效/无效 + 错误信息）

  **不要做**: 不要允许在此页面编辑配置（只读展示）

  **推荐 Agent**: Category: visual-engineering, Skills: [frontend-ui-ux]

  **并行**: Wave 3，依赖 Task 2+5，可与 Task 4 并行

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/Settings/SettingsModal.tsx — 信息展示 UI 参考

  **验收标准**:
  - [ ] 仪表板显示配置文件路径
  - [ ] 显示 agent 总数和模型分配表格
  - [ ] 显示已连接提供商

  **提交**: feat(ui): config status dashboard

---

- [x] 7. 预设方案管理

  **做什么**:
  - Rust 端：创建 src-tauri/src/services/preset_service.rs
  - save_preset(name) — 将当前 OMO 配置保存为预设到 ~/.config/omo-model-switcher/presets/{name}.json
  - load_preset(name) — 读取预设并应用到 OMO 配置（先备份）
  - list_presets() — 列出所有已保存的预设
  - delete_preset(name) — 删除预设
  - 前端：创建 src/components/Presets/PresetManager.tsx
  - 预设列表、保存当前配置为新预设、加载预设、删除预设
  - 预设卡片显示：名称、包含的 agent 数、创建时间

  **不要做**: 不要允许加载预设时不备份当前配置

  **推荐 Agent**: Category: unspecified-high, Skills: [frontend-ui-ux]

  **并行**: Wave 4，依赖 Task 4，可与 Task 8/9 并行

  **参考文件**:
  - Task 2 的 config_service.rs — 配置读写模式复用
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/TemplateMarket/ — 列表/卡片 UI 参考

  **验收标准**:
  - [ ] 可以保存当前配置为命名预设
  - [ ] 可以加载预设并更新 OMO 配置
  - [ ] 预设列表正确显示所有已保存预设
  - [ ] 删除预设正常工作
  - [ ] 加载预设前自动备份当前配置

  **提交**: feat: preset configuration management

---

- [ ] 8. 配置导入/导出

  **做什么**:
  - Rust 端：使用 Tauri dialog 插件实现文件选择/保存对话框
  - export_config() — 打开保存对话框，将当前 OMO 配置导出为 JSON 文件
  - import_config() — 打开文件选择对话框，读取 JSON 文件，验证格式，应用到 OMO 配置（先备份）
  - 前端：在配置总览页面添加导入/导出按钮
  - 导入前显示预览（将要变更的 agent 列表）

  **不要做**: 不要导入未经验证的配置，不要导入时不备份

  **推荐 Agent**: Category: unspecified-low, Skills: []

  **并行**: Wave 4，依赖 Task 2，可与 Task 7/9 并行

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src-tauri/Cargo.toml — Tauri dialog 插件依赖
  - Task 2 的 config_service.rs — 配置读写模式

  **验收标准**:
  - [ ] 导出按钮打开保存对话框，生成有效 JSON 文件
  - [ ] 导入按钮打开文件选择对话框，正确读取并应用配置
  - [ ] 导入前创建备份

  **提交**: feat: config import/export

---

- [ ] 9. 模型库浏览器

  **做什么**:
  - 创建 src/components/ModelBrowser/ModelBrowser.tsx
  - 显示所有可用模型，按提供商分组
  - 搜索框：按模型名称/提供商过滤
  - 模型卡片：显示模型名称、提供商、可用 variant、上下文窗口大小
  - 如果 models.dev 数据可用，额外显示描述和定价信息
  - 点击模型可快速分配给某个 agent

  **不要做**: 不要在 models.dev 不可用时报错（优雅降级到本地缓存）

  **推荐 Agent**: Category: visual-engineering, Skills: [frontend-ui-ux]

  **并行**: Wave 4，依赖 Task 3+5，可与 Task 7/8 并行

  **参考文件**:
  - /Users/daozhang/Trae_AI/文生图前后端/desktop/src/components/TemplateMarket/ — 浏览器/网格 UI 参考
  - /Users/daozhang/Trae_AI/文生图前后端/frontend/src/components/HistoryPanel/ — 虚拟滚动参考（如模型很多）

  **验收标准**:
  - [ ] 模型列表按提供商分组显示
  - [ ] 搜索过滤正常工作
  - [ ] 模型卡片显示基本信息

  **提交**: feat(ui): model library browser

---

- [ ] 10. 打磨、测试、构建

  **做什么**:
  - 添加 vitest 前端测试（关键组件和 store）
  - 添加 cargo test 后端测试（配置读写、预设管理）
  - 添加 Playwright E2E 测试（完整用户流程）
  - UI 打磨：加载状态、错误处理、空状态
  - 构建生产版本：cargo tauri build

  **不要做**: 不要跳过测试，不要忽略构建警告

  **推荐 Agent**: Category: unspecified-high, Skills: [frontend-ui-ux, playwright]

  **并行**: Wave 5，依赖 Task 7/8/9（所有功能完成后）

  **验收标准**:
  - [ ] npm run test (vitest) 全部通过
  - [ ] cd src-tauri && cargo test 全部通过
  - [ ] npx playwright test 全部通过
  - [ ] cargo tauri build 生成 DMG

  **提交**: chore: polish, tests, production build

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 1 | feat: scaffold Tauri 2 project with React + Tailwind | cargo build and npm run build pass |
| 2 | feat(backend): OMO config read/write/backup engine | cargo test passes |
| 3 | feat(backend): model data service with local cache | cargo test passes |
| 4+5 | feat(ui): agent model switching view | Playwright tests pass |
| 6 | feat(ui): config status dashboard | Playwright screenshot |
| 7 | feat: preset configuration management | Playwright + cargo test |
| 8 | feat: config import/export | File dialog flow works |
| 9 | feat(ui): model library browser | Playwright screenshot |
| 10 | chore: polish, tests, production build | Full test suite passes |

---

## Success Criteria

### Verification Commands
```bash
# Build check
cd src-tauri && cargo build  # Expected: Finished
npm run build  # Expected: exit code 0

# Config integrity
cat ~/.config/opencode/oh-my-opencode.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('agents:', len(d.get('agents',{})))"

# Backup exists after write
ls ~/.config/opencode/oh-my-opencode.json.bak

# Presets directory
ls ~/.config/omo-model-switcher/presets/
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] App builds for macOS
- [ ] Config round-trip preserves all fields
