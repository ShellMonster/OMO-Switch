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

