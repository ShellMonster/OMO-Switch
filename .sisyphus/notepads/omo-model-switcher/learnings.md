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

## Task 5: 前端基础框架 (2026-02-14)

### 组件架构模式

#### 1. 通用组件设计模式
- **Button 组件**: 使用 variants + sizes 模式，支持 primary/secondary/danger/ghost/outline 变体
- **clsx + tailwind-merge**: 通过 `cn()` 工具函数合并类名，解决 Tailwind 冲突
- **组件结构**: 使用 `React.forwardRef` 支持 ref 转发，便于表单集成

#### 2. 样式处理规范
```typescript
// cn.ts 工具函数
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### 3. Store 设计模式

**Zustand + Persist 中间件**:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useXXXStore = create<State>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'storage-key',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**创建的 4 个 Store**:
1. `uiStore.ts`: 管理当前页面、侧边栏状态、主题
2. `configStore.ts`: 管理 Ollama 连接配置、系统参数
3. `modelStore.ts`: 管理模型列表、选中模型、加载状态
4. `presetStore.ts`: 管理预设配置（CRUD 操作）

#### 4. 布局组件结构

**MainLayout.tsx**:
- 左侧可折叠侧边栏（64px/256px 切换）
- 顶部标题栏显示当前页面名称
- 导航项使用 Lucide 图标 + 标签
- 支持响应式交互

#### 5. 服务层封装

**tauri.ts 服务层**:
- 所有 Tauri invoke 调用集中封装
- 定义 TypeScript 接口与后端 Rust 结构对应
- 按功能模块分组：配置命令、模型命令

```typescript
// 调用示例
export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}
```

#### 6. 页面组件模式

创建了 5 个空页面组件（仅 UI 框架）：
- `AgentPage.tsx`: Agent 切换页面
- `ConfigPage.tsx`: 配置总览页面  
- `PresetPage.tsx`: 预设管理页面
- `ModelsPage.tsx`: 模型库页面
- `ImportExportPage.tsx`: 导入导出页面

每个页面使用渐变色标题栏 + 卡片式布局。

#### 7. TypeScript 严格模式注意事项

- 未使用的 import 会报错（`TS6133`）
- 未使用的变量也会报错
- 必须使用 `edit` 修改现有文件

### 依赖检查
- `lucide-react`: 图标库（已安装）
- `zustand`: 状态管理（已安装）
- `clsx`: 条件类名（已安装）
- `tailwind-merge`: Tailwind 类名合并（已安装）
- `@tauri-apps/api/core`: Tauri invoke（已安装）

### 文件清单
```
src/
├── components/
│   ├── Layout/
│   │   └── MainLayout.tsx       # 主布局组件
│   └── common/
│       ├── Button.tsx            # 按钮组件
│       ├── cn.ts                 # 类名合并工具
│       ├── Modal.tsx             # 模态框组件
│       ├── Toast.tsx             # Toast 通知组件
│       ├── Select.tsx            # 下拉选择组件
│       └── SearchInput.tsx       # 搜索输入框组件
├── store/
│   ├── uiStore.ts                # UI 状态
│   ├── configStore.ts            # 配置状态
│   ├── modelStore.ts             # 模型状态
│   └── presetStore.ts            # 预设状态
├── services/
│   └── tauri.ts                  # Tauri 服务封装
└── pages/
    ├── AgentPage.tsx             # Agent 页面
    ├── ConfigPage.tsx            # 配置页面
    ├── PresetPage.tsx            # 预设页面
    ├── ModelsPage.tsx            # 模型库页面
    └── ImportExportPage.tsx      # 导入导出页面
```

### 验证结果
- ✅ `npm run build` 成功（无 TypeScript 错误）
- ✅ 所有组件类型检查通过
- ✅ 输出文件: dist/index.html, dist/assets/*

