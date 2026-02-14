import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { ModelSelector } from './ModelSelector';
import { Button } from '../common/Button';
import { cn } from '../common/cn';
import { useConfigStore } from '../../store/configStore';
import { usePresetStore } from '../../store/presetStore';
import {
  updateAgentModel,
  updatePreset,
  type AgentConfig,
} from '../../services/tauri';

/**
 * AgentList 组件的 Props 接口
 * 
 * 支持两种数据源：
 * - 'agents': 代理列表
 * - 'categories': 分类列表
 */
interface AgentListProps {
  // 数据源类型
  dataSource: 'agents' | 'categories';
  // 代理或分类数据
  data: Record<string, AgentConfig>;
  // 提供商模型映射
  providerModels: Record<string, string[]>;
  // 已连接的提供商列表
  connectedProviders: string[];
  // 是否加载中
  isLoading?: boolean;
  // 错误信息
  error?: string | null;
  // 刷新回调
  onRefresh?: () => void;
}

export function AgentList({
  dataSource,
  data,
  providerModels,
  connectedProviders,
  isLoading = false,
  error = null,
  onRefresh,
}: AgentListProps) {
  const { t } = useTranslation();
  const { updateAgentConfig, updateCategoryConfig } = useConfigStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = useCallback((agentName: string) => {
    setSelectedAgent(agentName);
    setIsSelectorOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsSelectorOpen(false);
    setSelectedAgent(null);
  }, []);

  const handleSave = useCallback(
    async (model: string, variant: AgentConfig['variant']) => {
      if (!selectedAgent) return;

      setIsSaving(true);
      try {
        await updateAgentModel(selectedAgent, model, variant);
        // 根据数据源类型调用不同的 store 方法
        if (dataSource === 'agents') {
          updateAgentConfig(selectedAgent, { model, variant });
        } else {
          updateCategoryConfig(selectedAgent, { model, variant });
        }

        // 如果有激活预设，同步更新到预设文件
        const activePreset = usePresetStore.getState().activePreset;
        if (activePreset) {
          try {
            await updatePreset(activePreset);
          } catch (error) {
            console.error('Failed to sync preset:', error);
          }
        }
      } finally {
        setIsSaving(false);
      }
    },
    [selectedAgent, dataSource, updateAgentConfig, updateCategoryConfig]
  );

  const selectedAgentConfig = selectedAgent ? data[selectedAgent] : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-600">{t('agentList.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">{error}</p>
        <Button variant="primary" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('agentList.retry')}
        </Button>
      </div>
    );
  }

  if (Object.keys(data).length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">{t('agentList.empty')}</p>
      </div>
    );
  }

  const items = Object.entries(data);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-500">
          {t('agentList.total', { count: items.length })}
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {t('agentList.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(([agentName, config]) => (
          <AgentCard
            key={agentName}
            agentName={agentName}
            config={config}
            isCategory={dataSource === 'categories'}
            onEdit={() => handleEdit(agentName)}
          />
        ))}
      </div>

      {selectedAgent && selectedAgentConfig && (
        <ModelSelector
          isOpen={isSelectorOpen}
          onClose={handleClose}
          agentName={selectedAgent}
          currentConfig={selectedAgentConfig}
          providerModels={providerModels}
          connectedProviders={connectedProviders}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
