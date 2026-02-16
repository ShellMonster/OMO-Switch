import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { ModelSelector } from './ModelSelector';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { toast } from '../common/Toast';
import { cn } from '../common/cn';
import { useConfigStore } from '../../store/configStore';
import { usePresetStore } from '../../store/presetStore';
import {
  updateAgentModel,
  updatePreset,
  savePreset,
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
  // 搜索关键词
  searchQuery?: string;
  // 是否加载中
  isLoading?: boolean;
  // 错误信息
  error?: string | null;
  // 刷新回调
  onRefresh?: () => void;
  extraStats?: {
    count: number;
    label: string;
  };
}

export function AgentList({
  dataSource,
  data,
  providerModels,
  connectedProviders,
  searchQuery = '',
  isLoading = false,
  error = null,
  onRefresh,
  extraStats,
}: AgentListProps) {
  const { t } = useTranslation();
  const { updateAgentConfig, updateCategoryConfig } = useConfigStore();
  const { setActivePreset } = usePresetStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 保存预设相关状态
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

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

  /**
   * 处理保存预设
   */
  const handleSavePreset = useCallback(async () => {
    if (!newPresetName.trim()) return;

    const name = newPresetName.trim();
    setIsSavingPreset(true);

    try {
      await savePreset(name);
      setActivePreset(name);
      setShowSaveModal(false);
      setNewPresetName('');
      toast.success(t('presetSelector.saveSuccess', { name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetSelector.saveFailed'));
    } finally {
      setIsSavingPreset(false);
    }
  }, [newPresetName, setActivePreset, t]);

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

  const items = useMemo(() => {
    const allItems = Object.entries(data);
    if (!searchQuery.trim()) return allItems;
    
    const query = searchQuery.toLowerCase();
    return allItems.filter(([name, config]) => {
      // 检查原名
      const nameMatch = name.toLowerCase().includes(query);
      // 检查模型名称
      const modelMatch = config.model?.toLowerCase().includes(query);
      // 检查 i18n 名称（agentNames 或 categoryNames）
      const i18nKey = dataSource === 'agents' ? 'agentNames' : 'categoryNames';
      const i18nName = t(`${i18nKey}.${name}`);
      const i18nMatch = i18nName.toLowerCase().includes(query);
      
      return nameMatch || modelMatch || i18nMatch;
    });
  }, [data, searchQuery, t, dataSource]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* 只在 Agents 区域显示保存按钮 */}
          {dataSource === 'agents' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveModal(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t('agentList.saveAsTemplate')}
            </Button>
          )}
          <span className="text-sm text-slate-500">
            {dataSource === 'agents' 
              ? t('agentList.total', { count: items.length })
              : t('agentList.totalCategories', { count: items.length })
            }
            {extraStats && dataSource === 'agents' && (
              <span className="ml-2 text-slate-400">
                · {extraStats.count} {extraStats.label}
              </span>
            )}
          </span>
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

      {/* 保存预设弹窗 */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setNewPresetName('');
        }}
        title={t('agentList.saveAsTemplate')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSaveModal(false);
                setNewPresetName('');
              }}
              disabled={isSavingPreset}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePreset}
              isLoading={isSavingPreset}
              disabled={!newPresetName.trim()}
            >
              {t('button.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('presetManager.presetName')}
            </label>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={t('presetManager.presetNamePlaceholder')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPresetName.trim() && !isSavingPreset) {
                  handleSavePreset();
                }
              }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {t('presetManager.saveDescription')}
          </p>
        </div>
      </Modal>
    </>
  );
}
