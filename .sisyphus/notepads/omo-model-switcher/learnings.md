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

### HTTP 客户端选择
- 使用 `ureq` v2 而非 v3（Tauri 2 兼容性）
- 需要 `json` feature: `ureq = { version = "2", features = ["json"] }`
- 超时设置: `ureq::get(url).timeout(Duration::from_secs(5))`

### 优雅降级模式
- models.dev API 不可用时返回 `Ok(Vec::new())` 而非 `Err`
- 应用可完全依赖本地缓存运行，外部 API 仅用于增强功能
- 测试验证了 95 个提供商成功从缓存读取

### Tauri 命令模式
- 服务层 (`services/`) 包含业务逻辑
- 命令层 (`commands/`) 仅做 `#[tauri::command]` 包装
- `main.rs` 通过 `invoke_handler` 注册命令
- 需要 `mod.rs` 声明子模块

### 测试策略
- 单元测试放在服务模块内 (`#[cfg(test)] mod tests`)
- 测试优雅降级而非强制外部依赖可用
- 使用 `--nocapture` 查看测试输出验证数据

## 优雅降级修复验证 (2026-02-14)

### 问题分析
- 初始实现在 JSON 解析时使用 `?` 操作符，解析失败会返回 `Err`
- 违反了函数文档承诺的"优雅降级"行为

### 修复方案
- 将 `resp.into_json()` 包装在 `match` 语句中
- 解析成功 → 返回 `Ok(models)`
- 解析失败 → 打印错误日志，返回 `Ok(Vec::new())`
- 网络失败 → 打印错误日志，返回 `Ok(Vec::new())`

### 验证结果
- `test_fetch_models_dev_graceful_degradation` 通过（30秒超时测试）
- 所有 10 个测试通过，包括新增的 config_service 测试
- 优雅降级行为符合预期：API 不可用时返回空列表而非错误

### 关键教训
- 外部依赖（网络 API）必须有完整的错误处理链
- 不能在中间环节使用 `?` 提前返回错误
- 所有可能失败的步骤都需要显式 `match` 处理
