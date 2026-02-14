import { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { SearchInput } from '../common/SearchInput';
import { Select } from '../common/Select';
import { cn } from '../common/cn';
import { toast } from '../common/Toast';
import type { AgentConfig } from '../../services/tauri';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  currentConfig: AgentConfig;
  availableModels: ModelOption[];
  onSave: (model: string, variant: AgentConfig['variant']) => Promise<void>;
  isSaving?: boolean;
}

const VARIANT_OPTIONS = [
  { value: 'max', label: 'max - 最高强度' },
  { value: 'high', label: 'high - 高强度' },
  { value: 'medium', label: 'medium - 中等强度' },
  { value: 'low', label: 'low - 低强度' },
  { value: 'none', label: 'none - 无强度' },
];

/**
 * 模型选择器弹窗
 * 
 * 功能：
 * - 搜索可用模型
 * - 选择 variant 等级
 * - 保存配置变更
 */
export function ModelSelector({
  isOpen,
  onClose,
  agentName,
  currentConfig,
  availableModels,
  onSave,
  isSaving = false,
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(currentConfig.model);
  const [selectedVariant, setSelectedVariant] = useState<AgentConfig['variant']>(
    currentConfig.variant || 'none'
  );

  // 过滤模型列表
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return availableModels;
    const query = searchQuery.toLowerCase();
    return availableModels.filter(
      (model) =>
        model.name.toLowerCase().includes(query) ||
        model.provider.toLowerCase().includes(query)
    );
  }, [searchQuery, availableModels]);

  // 按提供商分组
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelOption[]> = {};
    filteredModels.forEach((model) => {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    });
    return groups;
  }, [filteredModels]);

  // 处理保存
  const handleSave = async () => {
    try {
      await onSave(selectedModel, selectedVariant);
      toast.success(`已更新 ${agentName} 的模型配置`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 格式化 agent 名称显示
  const displayName = agentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`编辑 ${displayName}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!selectedModel}
          >
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Variant 选择 */}
        <Select
          label="强度等级"
          value={selectedVariant || 'none'}
          onChange={(value) => setSelectedVariant(value as AgentConfig['variant'])}
          options={VARIANT_OPTIONS}
        />

        {/* 模型搜索 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            选择模型
          </label>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜索模型名称或提供商..."
            className="mb-3"
          />

          {/* 模型列表 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                未找到匹配的模型
              </div>
            ) : (
              Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider} className="border-b border-slate-100 last:border-0">
                  {/* 提供商标题 */}
                  <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {provider}
                  </div>
                  {/* 模型选项 */}
                  <div className="divide-y divide-slate-50">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left flex items-center justify-between transition-colors",
                          selectedModel === model.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span className="font-medium text-sm">{model.name}</span>
                        {selectedModel === model.id && (
                          <svg
                            className="w-5 h-5 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 当前选择预览 */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            当前选择
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="text-slate-500 w-16">模型:</span>
              <span className="font-medium text-slate-700">{selectedModel}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-16">强度:</span>
              <span className="font-medium text-slate-700">{selectedVariant || 'none'}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
