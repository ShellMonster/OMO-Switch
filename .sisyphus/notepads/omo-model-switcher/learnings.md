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

