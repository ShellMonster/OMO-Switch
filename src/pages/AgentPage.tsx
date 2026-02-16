import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { usePreloadStore } from '../store/preloadStore';
import { usePresetStore } from '../store/presetStore';
import { getOmoConfig, mergeAndSave, updatePreset } from '../services/tauri';
import { AgentList } from '../components/AgentList';
import { PresetSelector } from '../components/Presets';
import { ConfigChangeAlert } from '../components/ConfigChangeAlert';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { cn } from '../components/common/cn';
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

/**
 * 骨架屏组件 - 加载中显示
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100/50">
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-96" />
        </div>
        <div className="h-8 w-20 bg-slate-200 rounded-lg" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-2/3 h-10 bg-slate-200 rounded-lg" />
        <div className="w-full sm:w-1/3 h-10 bg-slate-200 rounded-lg" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="h-6 bg-slate-200 rounded w-24" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-slate-200 rounded w-20" />
                  <div className="h-3 bg-slate-200 rounded w-16" />
                </div>
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 my-8" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="h-6 bg-slate-200 rounded w-24" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-3 bg-slate-200 rounded w-12" />
                </div>
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentPage() {
  const { t } = useTranslation();
  const { omoConfig, models, loadOmoConfig, refreshModels, softRefreshAll } = usePreloadStore();

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
   * 组件挂载时刷新数据（乐观更新模式）
   * 已有数据时静默后台刷新，首次加载时显示 loading
   * 同时检测配置变更
   */
  useEffect(() => {
    softRefreshAll();
    checkChanges();
  }, [softRefreshAll, checkChanges]);

  useEffect(() => {
    if (hasChanges && !showChangeAlert) {
      setShowChangeAlert(true);
    }
  }, [hasChanges, showChangeAlert]);

  const handleRestoreFromCache = useCallback(async () => {
    await mergeAndSave();
    loadOmoConfig();
  }, [loadOmoConfig]);

  const handleRestoreFromPreset = useCallback(() => {
    setShowChangeAlert(false);
  }, []);

  const handleIgnoreChanges = useCallback(async () => {
    await ignoreChanges();
    const currentPreset = usePresetStore.getState().activePreset;
    if (currentPreset) {
      try {
        await updatePreset(currentPreset);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('同步预设失败:', err);
        }
      }
    }
  }, [ignoreChanges]);

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

  // 加载中状态
  if (omoConfig.loading) {
    return <LoadingSkeleton />;
  }

  // 加载失败状态
  if (omoConfig.error || !omoConfig.data) {
    return (
      <ErrorState
        error={omoConfig.error || '配置文件不存在'}
        onRetry={() => loadOmoConfig()}
      />
    );
  }

  const config = omoConfig.data;
  const agentsCount = Object.keys(config.agents).length;
  const categoriesCount = Object.keys(config.categories).length;
  const providerModels: Record<string, string[]> = models.grouped
    ? Object.fromEntries(models.grouped.map(g => [g.provider, g.models]))
    : {};
  const connectedProviders = models.providers || [];

  return (
    <div className="space-y-6">
      {showChangeAlert && changes.length > 0 && (
        <ConfigChangeAlert
          changes={changes}
          onRestore={handleRestoreFromCache}
          onRestoreFromPreset={handleRestoreFromPreset}
          onIgnore={handleIgnoreChanges}
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
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={omoConfig.loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', omoConfig.loading && 'animate-spin')} />
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
          />
        </div>
        <div className="w-full sm:w-1/3">
          <PresetSelector onLoadPreset={handlePresetLoad} />
        </div>
      </div>

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
            data={config.agents}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
            searchQuery={searchQuery}
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
            data={config.categories}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
