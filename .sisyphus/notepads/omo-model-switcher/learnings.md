# Learnings - OMO Model Switcher

## Conventions & Patterns

(Accumulated wisdom from task execution)

## Tauri 2 项目脚手架初始化

### 项目结构
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Rust + Tauri 2
- **窗口配置**: 1000x700, 标题 "OMO Model Switcher"

### 关键配置文件
1. **package.json**: 包含 React, Tauri API, Zustand, Tailwind CSS, Lucide React 等依赖
2. **tauri.conf.json**: 窗口配置、构建命令、安全策略
3. **Cargo.toml**: Rust 依赖（tauri v2, serde, serde_json）
4. **tailwind.config.js**: Tailwind CSS 配置，content 指向 src/**/*.{js,ts,jsx,tsx}
5. **vite.config.ts**: Vite 配置，React 插件，开发服务器端口 5173

### 目录结构
```
omo-model-switcher/
├── src/                          # 前端源代码
│   ├── components/               # React 组件（空）
│   ├── store/                    # Zustand 状态管理（空）
│   ├── services/                 # API 服务（空）
│   ├── main.tsx                  # 入口文件
│   ├── App.tsx                   # 主应用组件
│   ├── App.css                   # 应用样式
│   └── index.css                 # Tailwind 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # Tauri 主程序
│   │   ├── commands/             # Tauri 命令（空）
│   │   └── services/             # Rust 服务（空）
│   ├── Cargo.toml                # Rust 依赖
│   ├── build.rs                  # 构建脚本
│   ├── tauri.conf.json           # Tauri 配置
│   └── icons/                    # 应用图标
├── index.html                    # HTML 入口
├── vite.config.ts                # Vite 配置
├── tailwind.config.js            # Tailwind 配置
├── postcss.config.js             # PostCSS 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json                  # npm 依赖

```

### 构建验证
- ✅ `npm run build` 成功，输出到 dist/
- ✅ `cargo build` 成功，编译 Rust 后端
- ✅ 所有依赖已安装（202 packages）

### 技术栈版本
- React: 18.3.1
- TypeScript: 5.6.3
- Vite: 6.0.7
- Tauri: 2.x
- Tailwind CSS: 3.4.17
- Zustand: 5.0.2
- Lucide React: 0.468.0

### 注意事项
1. Tauri 版本使用 `^2` 而非 `^2.9`，以避免版本冲突
2. 图标文件已创建（占位符），生产环境需替换为真实图标
3. Tailwind 警告"No utility classes detected"是正常的，因为 App.tsx 使用了 CSS 类而非 Tailwind 类
4. 开发服务器端口为 5173（Vite 默认）
5. Tauri 开发 URL 配置为 http://localhost:5173


## Task 3: 模型数据服务实现 (2026-02-14)

### 缓存文件格式
- `provider-models.json`: `{ "models": { "provider_name": ["model1", "model2"] } }`
- `connected-providers.json`: `{ "connected": ["provider1"], "updatedAt": "ISO8601" }`
- 缓存位置: `~/.cache/oh-my-opencode/`

### Rust 服务层 (model_service.rs)
- `get_cache_dir()`: 获取缓存目录路径
- `get_available_models()`: 读取 provider-models.json
- `get_connected_providers()`: 读取 connected-providers.json
- `fetch_models_dev()`: 开发模式，返回模拟数据

### Rust 命令层 (model_commands.rs)
- `get_available_models`: Tauri 命令，调用服务层
- `get_connected_providers`: Tauri 命令，调用服务层
- `fetch_models_dev`: Tauri 命令，返回模拟数据

### 前端服务层 (modelService.ts)
- `getAvailableModels()`: 调用 Tauri 命令
- `getConnectedProviders()`: 调用 Tauri 命令
- `fetchModelsDev()`: 调用 Tauri 命令（开发模式）

### 验证结果
- ✅ Rust 编译成功
- ✅ TypeScript 编译成功
- ✅ 命令已在 main.rs 中注册
- ✅ 前端服务层已创建

### 技术栈
- Rust: serde, serde_json, std::fs
- TypeScript: @tauri-apps/api/core
- Tauri: invoke 命令系统

### 注意事项
1. 缓存文件不存在时返回空数据，不报错
2. 开发模式提供模拟数据，便于前端开发
3. 所有文件操作都有错误处理
4. 使用 `serde_json::Value` 保持灵活性


## Task 4: 配置读写服务实现 (2026-02-14)

### OMO 配置文件路径
- 位置: `~/.config/opencode/oh-my-opencode.json`
- 格式: JSON，包含 `agents` 和 `categories` 字段

### Rust 服务层 (config_service.rs)
- `get_config_path()`: 获取配置文件路径
- `read_omo_config()`: 读取配置文件，返回 `serde_json::Value`
- `write_omo_config()`: 写入配置文件，先创建 `.bak` 备份
- `validate_config()`: 验证配置文件基本结构（必须包含 `agents` 和 `categories`）

### Rust 命令层 (config_commands.rs)
- `get_config_path`: 返回配置文件路径字符串
- `read_omo_config`: 读取配置文件
- `write_omo_config`: 写入配置文件
- `validate_config`: 验证配置文件

### 关键设计决策
1. **使用 `serde_json::Value`**: 保留所有未知字段，不丢失数据
2. **自动备份**: 写入前自动创建 `.bak` 备份文件
3. **格式化输出**: 使用 `to_string_pretty` 生成可读的 JSON
4. **错误处理**: 所有操作都返回 `Result<T, String>`，错误信息清晰

### 测试覆盖
- ✅ 读取不存在的配置文件（返回错误）
- ✅ 读取有效配置文件
- ✅ 验证有效配置
- ✅ 验证无效配置（缺少必需字段）
- ✅ 写入配置时创建备份

### 验证结果
- ✅ cargo test: 5 个测试全部通过
- ✅ cargo build: 编译成功
- ✅ 命令已在 main.rs 中注册

### 技术栈
- Rust: serde, serde_json, std::fs, std::path
- Tauri: #[tauri::command] 宏

### 注意事项
1. 配置文件不存在时不会自动创建，需要手动创建
2. 备份文件命名为 `oh-my-opencode.json.bak`
3. 验证只检查基本结构，不检查字段值的有效性
4. 使用 `HOME` 环境变量获取用户目录


## Task 5: Agent 配置管理服务 (2026-02-14)

### Agent 配置结构
```rust
pub struct AgentConfig {
    pub model: String,
    pub variant: Option<String>,  // "max" | "high" | "medium" | "low" | "none"
}
```

### Rust 服务层 (agent_service.rs)
- `get_agent_config(agent_name)`: 获取指定 Agent 的配置
- `update_agent_config(agent_name, model, variant)`: 更新 Agent 配置
- `list_all_agents()`: 列出所有 Agent 名称
- `get_all_agents_config()`: 获取所有 Agent 的完整配置

### 关键实现细节
1. **配置查找顺序**: 先查 `agents`，再查 `categories`
2. **配置更新**: 只更新 `agents` 字段，不修改 `categories`
3. **自动备份**: 更新前自动创建 `.bak` 备份（复用 `write_omo_config`）
4. **字段保留**: 使用 `serde_json::Value` 保留所有未知字段

### Rust 命令层 (agent_commands.rs)
- `get_agent_config(agent_name)`: 获取单个 Agent 配置
- `update_agent_config(agent_name, model, variant)`: 更新单个 Agent
- `list_all_agents()`: 列出所有 Agent 名称
- `get_all_agents_config()`: 获取所有 Agent 配置

### 测试覆盖
- ✅ 获取存在的 Agent 配置
- ✅ 获取不存在的 Agent（返回错误）
- ✅ 更新 Agent 配置
- ✅ 列出所有 Agent
- ✅ 获取所有 Agent 配置

### 验证结果
- ✅ cargo test: 10 个测试全部通过（5 个 config_service + 5 个 agent_service）
- ✅ cargo build: 编译成功
- ✅ 命令已在 main.rs 中注册

### 技术栈
- Rust: serde, serde_json, std::collections::HashMap
- Tauri: #[tauri::command] 宏

### 注意事项
1. Agent 名称区分大小写
2. `variant` 字段可选，不传则不设置
3. 更新操作会自动创建备份
4. 配置查找优先级：`agents` > `categories`


## Task 6: 预设管理服务实现 (2026-02-14)

### 预设文件结构
- 位置: `~/.config/opencode/presets/`
- 命名: `{preset_name}.json`
- 格式: 完整的 OMO 配置 JSON（包含 agents 和 categories）

### Rust 服务层 (preset_service.rs)
- `get_presets_dir()`: 获取预设目录路径
- `save_preset(name)`: 保存当前配置为预设
- `load_preset(name)`: 加载预设（先备份当前配置）
- `list_presets()`: 列出所有预设名称
- `delete_preset(name)`: 删除指定预设
- `get_preset_info(name)`: 获取预设信息（agent 数量、创建时间）

### 关键实现细节
1. **预设名称验证**: 不允许包含 `/`, `\`, `.`, `..`
2. **加载前备份**: 加载预设前自动备份当前配置（使用 `write_omo_config`）
3. **预设验证**: 加载前验证预设文件结构（使用 `validate_config`）
4. **时间格式化**: 使用 `chrono` 格式化创建时间为 `YYYY-MM-DD HH:MM:SS`

### Rust 命令层 (preset_commands.rs)
- `save_preset(name)`: 保存预设
- `load_preset(name)`: 加载预设
- `list_presets()`: 列出预设
- `delete_preset(name)`: 删除预设
- `get_preset_info(name)`: 获取预设信息（返回 `[agent_count, created_at]`）

### 测试覆盖
- ✅ 保存预设
- ✅ 加载预设
- ✅ 列出预设
- ✅ 删除预设
- ✅ 无效预设名称（包含非法字符）

### 验证结果
- ✅ cargo test: 16 个测试全部通过
- ✅ cargo build: 编译成功
- ✅ 命令已在 main.rs 中注册

### 技术栈
- Rust: chrono 0.4（时间格式化）
- Rust: serde, serde_json, std::fs
- Tauri: #[tauri::command] 宏

### 注意事项
1. 预设名称不能包含路径分隔符和相对路径符号
2. 加载预设会自动备份当前配置
3. 预设文件必须是有效的 OMO 配置格式
4. 预设目录不存在时会自动创建


## Task 7: 预设管理前端组件 (2026-02-14)

### 组件结构

#### PresetManager.tsx
- 预设列表展示（卡片式布局）
- 保存当前配置为新预设（Modal 输入）
- 加载预设（自动备份当前配置）
- 删除预设（二次确认）
- 预设卡片显示：名称、agent 数量、创建时间

#### UI 特性
- 使用通用组件：Button, Modal, ConfirmModal
- 加载状态指示器
- 错误提示（红色警告框）
- 空状态提示（无预设时）
- 悬停效果（卡片阴影、按钮显示）

#### 集成点
- PresetPage.tsx 集成 PresetManager
- tauri.ts 添加 5 个预设命令类型定义
- 命令已在 main.rs 中注册

### 验证结果
- ✅ cargo test: 16 passed
- ✅ npm run build: 成功（1.03s）
- ✅ TypeScript 无错误
- ✅ 所有预设命令已注册

### 技术栈
- Rust: chrono 0.4（时间格式化）
- React: useState, useEffect（状态管理）
- Tauri: invoke（命令调用）
- Lucide React: Bookmark, Plus, Trash2, Download, Calendar, Users（图标）


## Task 8: 配置导入/导出功能 (2026-02-14)

### Rust 后端实现

#### import_export_service.rs
- **导出功能** (`export_config`): 读取当前配置 → 验证 → 写入指定路径
- **导入功能** (`import_config`): 读取文件 → 验证 → 备份当前配置 → 应用新配置
- **验证功能** (`validate_import_file`): 预验证导入文件，不应用
- **备份机制** (`backup_current_config`): 使用时间戳命名（`oh-my-opencode_YYYYMMDD_HHMMSS.json`）
- **历史记录** (`get_backup_history`): 读取 `~/.config/opencode/backups/` 目录，返回备份列表

#### 备份目录结构
```
~/.config/opencode/
├── oh-my-opencode.json          # 当前配置
├── oh-my-opencode.json.bak      # 最近一次备份（write_omo_config 自动创建）
└── backups/                     # 导入时的时间戳备份
    ├── oh-my-opencode_20260214_143022.json
    └── oh-my-opencode_20260214_150135.json
```

#### import_export_commands.rs
- 4 个 Tauri 命令：
  - `export_omo_config(path)`: 导出配置
  - `import_omo_config(path)`: 导入配置
  - `validate_import(path)`: 验证导入文件
  - `get_import_export_history()`: 获取备份历史

### 前端实现

#### ImportExportPanel.tsx
- **导出流程**: 点击按钮 → Tauri 文件保存对话框 → 调用 `export_omo_config`
- **导入流程**: 点击按钮 → Tauri 文件选择对话框 → 验证 → 预览 Modal → 确认 → 调用 `import_omo_config`
- **历史记录**: 显示备份文件列表（文件名、创建时间、文件大小）
- **状态管理**: 加载状态、错误提示、成功提示

#### UI 特性
- 使用 `@tauri-apps/plugin-dialog` 的 `open()` 和 `save()` API
- 预览 Modal 显示导入配置的 agents 和 categories 数量
- 历史记录按时间倒序排列
- 文件大小格式化（B/KB/MB）
- 错误/成功提示（AlertCircle/CheckCircle 图标）

### 依赖项
- **Rust**: `tauri-plugin-dialog = "2.6.0"`（新增）
- **npm**: `@tauri-apps/plugin-dialog`（新增）
- **Tauri 配置**: `tauri.conf.json` 添加 `plugins.dialog` 配置
- **main.rs**: 注册 `.plugin(tauri_plugin_dialog::init())`

### 验证结果
- ✅ cargo build: 成功（23.55s）
- ✅ npm run build: 成功（1.04s）
- ✅ TypeScript 无错误
- ✅ 4 个导入/导出命令已注册

### 技术栈
- Rust: chrono（时间戳）, serde_json（JSON 处理）
- React: useState, useEffect（状态管理）
- Tauri: dialog plugin（文件对话框）
- Lucide React: Download, Upload, FileJson, Clock, HardDrive, AlertCircle, CheckCircle

### 关键模式
- **三步验证**: 读取 → 解析 → 验证结构（防止导入无效配置）
- **双重备份**: `.bak` 文件（每次写入）+ 时间戳备份（导入时）
- **预览确认**: 导入前显示配置摘要，用户确认后才应用
- **错误处理**: 所有文件操作都有详细错误信息
