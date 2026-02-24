import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePreloadStore } from '../store/preloadStore';
import { getOmoConfig, mergeAndSave, acceptExternalChanges } from '../services/tauri';
import { AgentList } from '../components/AgentList';
import { PresetSelector } from '../components/Presets';
import { ConfigChangeAlert } from '../components/ConfigChangeAlert';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { cn } from '../components/common/cn';
import { toast } from '../components/common/Toast';
import { useConfigChangeDetection } from '../hooks/useConfigChangeDetection';

/**
 * 错误状态组件 - 显示加载失败信息和重试按钮
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <p className="text-slate-600 mb-4">{error}</p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        重试
      </Button>
    </div>
  );
}

export function AgentPage() {
  const { t } = useTranslation();
  
  // 精确订阅状态，避免不必要的重渲染
  const { loadOmoConfig, refreshModels } = usePreloadStore();
  const omoConfig = usePreloadStore(useShallow(state => state.omoConfig));
  const modelsGrouped = usePreloadStore(state => state.models.grouped);
  const modelsProviders = usePreloadStore(state => state.models.providers);

  // 首次加载状态 - 先显示骨架屏，避免卡顿
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChangeAlert, setShowChangeAlert] = useState(false);

  const {
    hasChanges,
    changes,
    checkChanges,
    ignoreChanges,
  } = useConfigChangeDetection();

  /**
   * 组件挂载时检查数据是否已有缓存
   * 不再主动刷新模型数据，依赖 ProviderStatus 的本地同步
   * 只在数据完全为空时才加载（首次启动）
   * 同时检测配置变更
   */
  useEffect(() => {
    const { omoConfig, models } = usePreloadStore.getState();
    
    if (!omoConfig.data) {
      void loadOmoConfig();
    }
    if (!models.grouped) {
      // 首屏先出配置，模型列表延后后台刷新，避免启动瞬间堆积任务
      setTimeout(() => {
        void refreshModels();
      }, 1200);
    }
    void checkChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasChanges && !showChangeAlert) {
      setShowChangeAlert(true);
    }
  }, [hasChanges, showChangeAlert]);

  // 数据准备好后，关闭初始加载状态
  useEffect(() => {
    if (omoConfig.data && isInitialLoad) {
      requestAnimationFrame(() => {
        setIsInitialLoad(false);
      });
    }
  }, [omoConfig.data, isInitialLoad]);

  const handleRestoreFromCache = useCallback(async () => {
    try {
      await mergeAndSave();
      loadOmoConfig();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('从缓存恢复失败:', err);
      }
    }
  }, [loadOmoConfig]);

  const handleRestoreFromPreset = useCallback(() => {
    setShowChangeAlert(false);
  }, []);

  // 接受外部变更：以磁盘配置为准，原子同步快照和当前预设，并立即刷新 UI
  const handleAcceptChanges = useCallback(async () => {
    const result = await acceptExternalChanges();

    usePreloadStore.setState((state) => ({
      omoConfig: {
        ...state.omoConfig,
        data: result.config,
        loading: false,
        error: null,
      },
    }));

    await ignoreChanges();

    if (result.preset_sync_error) {
      toast.warning(
        t('configChange.acceptedButPresetSyncFailed', {
          defaultValue: '已接受外部变更，但同步预设失败',
        })
      );
    } else if (result.preset_synced && result.active_preset) {
      toast.success(t('configChange.presetUpdated', { name: result.active_preset }));
    }

    setShowChangeAlert(false);
  }, [ignoreChanges, t]);

  const handleCloseAlert = useCallback(() => {
    setShowChangeAlert(false);
  }, []);

  /**
   * 统一刷新处理函数
   */
  const handleRefresh = useCallback(() => {
    loadOmoConfig();
    refreshModels();
  }, [loadOmoConfig, refreshModels]);

  /**
   * 预设加载回调
   */
  const handlePresetLoad = useCallback(async () => {
    const config = await getOmoConfig();
    loadOmoConfig();
    return config;
  }, [loadOmoConfig]);

  const config = omoConfig.data;
  const isSectionLoading = isInitialLoad || (!config && omoConfig.loading);
  const hasLoadError = Boolean(omoConfig.error) && !config;
  const agentsCount = Object.keys(config?.agents || {}).length;
  const categoriesCount = Object.keys(config?.categories || {}).length;
  const providerModels: Record<string, string[]> = modelsGrouped
    ? Object.fromEntries(modelsGrouped.map(g => [g.provider, g.models]))
    : {};
  const connectedProviders = modelsProviders || [];

  return (
    <div className="space-y-6">
      {showChangeAlert && changes.length > 0 && (
        <ConfigChangeAlert
          changes={changes}
          onRestore={handleRestoreFromCache}
          onRestoreFromPreset={handleRestoreFromPreset}
          onAccept={handleAcceptChanges}
          onClose={handleCloseAlert}
        />
      )}

      {/* 页面头部 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-800">{t('agentPage.title')}</h2>
          <p className="text-slate-600 mt-1">{t('agentPage.description')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isSectionLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isSectionLoading && 'animate-spin')} />
          {t('agentList.refresh')}
        </Button>
      </div>

      {/* 预设选择器和搜索框 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-2/3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('agentPage.searchPlaceholder')}
            disabled={isSectionLoading}
          />
        </div>
        <div className="w-full sm:w-1/3">
          <PresetSelector onLoadPreset={handlePresetLoad} />
        </div>
      </div>

      {hasLoadError && (
        <ErrorState
          error={omoConfig.error || '配置文件不存在'}
          onRetry={() => loadOmoConfig()}
        />
      )}

      {/* Agents 区域 */}
      <div>
        <button
          onClick={() => setAgentsExpanded(!agentsExpanded)}
          className="flex items-center justify-between w-full group mb-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-200',
              !agentsExpanded && '-rotate-90'
            )} />
            <h3 className="text-lg font-semibold text-slate-700">{t('agentPage.agentsSection')}</h3>
          </div>
          <span className="text-sm text-slate-500">
            {t('agentPage.agentsCount', { count: agentsCount })}
          </span>
        </button>
        {agentsExpanded && (
          <AgentList
            dataSource="agents"
            data={config?.agents || {}}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
            searchQuery={searchQuery}
            isLoading={isSectionLoading}
            extraStats={{ count: categoriesCount, label: 'categories' }}
          />
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-200 my-8" />

      {/* Categories 区域 */}
      <div>
        <button
          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
          className="flex items-center justify-between w-full group mb-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-200',
              !categoriesExpanded && '-rotate-90'
            )} />
            <h3 className="text-lg font-semibold text-slate-700">{t('agentPage.categoriesSection')}</h3>
          </div>
          <span className="text-sm text-slate-500">
            {t('agentPage.categoriesCount', { count: categoriesCount })}
          </span>
        </button>
        {categoriesExpanded && (
          <AgentList
            dataSource="categories"
            data={config?.categories || {}}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
            searchQuery={searchQuery}
            isLoading={isSectionLoading}
          />
        )}
      </div>
    </div>
  );
}
