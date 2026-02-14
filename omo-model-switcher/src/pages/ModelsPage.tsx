import { Database } from 'lucide-react';
import { ModelBrowser } from '../components/Models/ModelBrowser';
import { useState } from 'react';

/**
 * 模型库页面
 * 
 * 集成 ModelBrowser 组件，展示所有可用模型
 * 支持搜索、过滤、查看详情
 */
export function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState<string>();

  const handleSelectModel = (modelId: string, provider: string) => {
    setSelectedModel(modelId);
    console.log('Selected model:', modelId, 'from provider:', provider);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-800">模型库</h2>
          <p className="text-slate-600 mt-1">
            浏览和管理您的 AI 模型，查看提供商、定价和能力信息
          </p>
        </div>
        {selectedModel && (
          <div className="px-4 py-2 bg-white rounded-lg border border-emerald-200 shadow-sm">
            <span className="text-xs text-slate-500 uppercase tracking-wider">当前选择</span>
            <p className="text-sm font-medium text-emerald-700 truncate max-w-xs">
              {selectedModel}
            </p>
          </div>
        )}
      </div>

      {/* 模型浏览器 */}
      <ModelBrowser 
        onSelectModel={handleSelectModel}
        selectedModel={selectedModel}
        showApplyButton={true}
      />
    </div>
  );
}
