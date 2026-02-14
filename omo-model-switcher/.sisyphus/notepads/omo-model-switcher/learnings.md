## Task 2: Rust 配置引擎

### 实现模式
- **服务层**：`config_service.rs` 包含核心业务逻辑
  - `get_config_path()` - 路径解析
  - `read_omo_config()` - 读取配置
  - `write_omo_config()` - 写入配置（带备份）
  - `validate_config()` - 结构验证
- **命令层**：`config_commands.rs` 仅做 Tauri 命令包装
  - 使用 `#[tauri::command]` 宏暴露给前端
  - 命令层调用服务层函数

### 关键技术决策
1. **使用 `serde_json::Value` 作为配置类型**
   - 保留所有未知字段（如 `$schema`、自定义字段）
   - 避免定义严格的 struct，增强灵活性
   - 测试验证：往返序列化不丢失任何字段

2. **备份策略**
   - 写入前先 `fs::copy()` 创建 `.bak` 文件
   - 备份文件名：`oh-my-opencode.json.bak`
   - 测试验证：备份文件存在且内容正确

3. **配置验证**
   - 仅验证必需字段：`agents` 和 `categories`
   - 不验证字段内部结构（保持灵活性）
   - 允许额外字段存在

### 测试覆盖
- ✅ 配置路径生成
- ✅ 配置验证（有效/缺少字段/类型错误）
- ✅ 往返序列化保留所有字段
- ✅ 备份文件创建

### 模块注册
- `services/mod.rs` 添加 `pub mod config_service;`
- `commands/mod.rs` 添加 `pub mod config_commands;`
- `main.rs` 注册 4 个命令：
  - `get_config_path`
  - `read_omo_config`
  - `write_omo_config`
  - `validate_config`

### 依赖
- `serde_json = "1"` - JSON 序列化（已有）
- `serde = { version = "1", features = ["derive"] }` - 序列化框架（已有）
- 无需新增依赖

### 配置文件格式
- 路径：`~/.config/opencode/oh-my-opencode.json`
- 结构：
  ```json
  {
    "$schema": "...",
    "agents": { "agent-name": { "model": "...", "variant": "..." } },
    "categories": { "category-name": { "model": "..." } }
  }
  ```
- 所有字段都通过 `Value` 保留，不做强制类型检查



## Task 6: 配置状态总览仪表板

### 实现模式
- 组件位置: src/components/Dashboard/ConfigDashboard.tsx
- 设计理念: 工业/实用主义美学
  - 深色主题（slate-900）配合霓虹色点缀（cyan/violet/emerald）
  - 高信息密度但层次分明
  - 卡片式布局组织不同类型的信息
  - 表格形式清晰展示 Agent 模型分配

### 组件结构
ConfigDashboard
├── 统计卡片网格 (4个卡片)
│   ├── Agent 总数
│   ├── 已配置模型数（去重）
│   ├── 连接提供商数
│   └── 配置验证状态
├── 配置文件元数据卡片
│   ├── 文件路径
│   ├── 最后修改时间
│   └── 文件大小
├── Agent 模型分配表格
│   ├── 名称列（带首字母图标）
│   ├── 类型列（Agent/分类标签）
│   ├── 分配模型列（代码样式）
│   └── 变体列
└── 已连接提供商列表
    └── 卡片式网格布局

### 数据获取模式
- 使用 Promise.allSettled 并行加载多个 Tauri 命令
- 错误处理：每个命令独立处理，不影响其他数据加载
- 加载状态：统一的 isLoading 状态管理
- 数据转换：前端计算 Agent 列表和去重模型数

### Tauri 命令调用
- invoke<string>("get_config_path") - 获取配置文件路径
- invoke<OmoConfig>("get_omo_config") - 读取 OMO 配置
- invoke<string[]>("get_connected_providers") - 获取已连接提供商
- invoke("validate_config", { config }) - 验证配置

### 样式模式
- 统计卡片: 渐变背景 + 图标 + 大数字展示
- 表格: 深色表头 + 悬停效果 + 状态标签
- 提供商卡片: 悬停边框变化 + 渐变图标背景
- 验证状态: 有效/无效两种视觉状态（emerald/rose）

### 工具函数
- getAgentModelList(): 合并 agents 和 categories
- getUniqueModelCount(): 计算去重后的模型数
- formatFileSize(): 字节转可读格式
- formatDateTime(): ISO 时间转本地格式

### 设计决策
1. 深色主题: 与系统整体风格一致，降低视觉疲劳
2. 霓虹色点缀: cyan/violet/emerald 区分不同类型信息
3. 表格展示: Agent 模型分配使用表格，信息密度高且清晰
4. 卡片布局: 不同类型信息用卡片分隔，层次分明
5. 只读展示: 本页面仅展示状态，不提供编辑功能
