

## Task 9: 模型库浏览器组件 (2026-02-14)

### 组件结构

#### ModelBrowser.tsx
- **数据加载**: 调用 `getAvailableModels()`, `getConnectedProviders()`, `fetchModelsDev()`
- **数据分组**: 按提供商分组显示模型列表
- **搜索过滤**: 支持按名称、描述搜索，按提供商过滤
- **模型详情**: 展开显示描述、定价信息（输入/输出价格）
- **选择功能**: 点击卡片选择模型，显示勾选标记
- **应用按钮**: 可选的"应用此模型"按钮

#### 子组件设计
1. **ModelCard**: 单个模型卡片
   - 模型名称（格式化显示）
   - 原始模型ID
   - 提供商标签（彩色圆点）
   - 定价标签（免费/价格）
   - 可展开的详情区域

2. **ProviderGroup**: 提供商分组
   - 可折叠的标题栏
   - 显示提供商名称和模型数量
   - 网格布局展示模型卡片

### 数据流
```
Tauri Backend (Rust)
  ├── get_available_models() → HashMap<provider, models[]>
  ├── get_connected_providers() → Vec<provider>
  └── fetch_models_dev() → Vec<ModelInfo>
        ↓
ModelBrowser (React)
  ├── 状态: groupedModels, connectedProviders, modelInfos
  ├── 过滤: searchQuery, selectedProvider
  └── 展开状态: expandedProviders
```

### 类型定义 (tauri.ts 新增)
```typescript
interface ModelPricing {
  prompt?: number;
  completion?: number;
  currency?: string;
}

interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  pricing?: ModelPricing;
}
```

### API 函数 (tauri.ts 新增)
- `getAvailableModels()`: 获取按提供商分组的模型
- `getConnectedProviders()`: 获取已连接的提供商
- `fetchModelsDev()`: 获取 models.dev 的详细信息

### UI 设计
- **头部统计**: 3 个卡片显示可用模型数、提供商数、已连接数
- **搜索栏**: 使用已创建的 SearchInput 组件
- **过滤下拉框**: 按提供商过滤
- **彩色标签**: 不同提供商使用不同颜色标识
- **展开动画**: 平滑的展开/折叠过渡

### 集成
- ModelsPage.tsx 集成 ModelBrowser
- 显示当前选择的模型
- 支持一键应用模型

### 验证结果
- ✅ npm run build: 成功（1.11s）
- ✅ TypeScript 无错误
- ✅ 所有新命令已添加到 tauri.ts

### 技术栈
- React: useState, useEffect, useMemo, useCallback
- Lucide React: Database, Server, Zap, DollarSign, Filter 等
- Tailwind CSS: 渐变、阴影、过渡动画

### 关键模式
- **并行加载**: 使用 `Promise.all()` 同时加载三类数据
- **默认展开**: 前3个提供商默认展开
- **空状态处理**: 搜索无结果时显示提示
- **错误降级**: API 失败时显示友好错误信息
- **格式化工具**: `formatModelName()`, `formatPrice()` 工具函数

