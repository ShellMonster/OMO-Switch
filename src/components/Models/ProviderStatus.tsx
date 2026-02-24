import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Server,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Wifi,
  WifiOff,
  Plus,
  X,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../common/cn';
import { getCustomModels, removeCustomModel } from '../../services/tauri';
import { usePreloadStore } from '../../store/preloadStore';

const removeProviderModel = (provider: string, modelId: string) => {
  usePreloadStore.getState().removeProviderModel(provider, modelId);
};
import { AddModelModal } from './AddModelModal';
import { ApplyModelModal } from './ApplyModelModal';
import { ConfirmPopover } from '../common/ConfirmPopover';
import { ProviderStatusSkeleton } from '../common/Skeleton';

/**
 * 供应商状态接口
 */
interface ProviderStatus {
  name: string;
  isConnected: boolean;
  modelCount: number;
}

type GroupedProviderModels = { provider: string; models: string[] };

function compareProviderName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortModelNames(models: string[]): string[] {
  return [...models].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function normalizeAndSortGroupedModels(
  groupedModels: GroupedProviderModels[]
): GroupedProviderModels[] {
  return groupedModels
    .map((group) => ({
      provider: group.provider,
      models: sortModelNames(group.models),
    }))
    .sort((a, b) => {
      if (b.models.length !== a.models.length) {
        return b.models.length - a.models.length;
      }
      return compareProviderName(a.provider, b.provider);
    });
}

/**
 * 获取供应商图标颜色
 */
function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'bg-emerald-500',
    anthropic: 'bg-orange-500',
    google: 'bg-blue-500',
    groq: 'bg-pink-500',
    together: 'bg-purple-500',
    cohere: 'bg-teal-500',
    mistral: 'bg-indigo-500',
    aicodewith: 'bg-rose-500',
    'kimi-for-coding': 'bg-amber-500',
  };

  return colors[provider.toLowerCase()] || 'bg-slate-500';
}

interface ProviderCardProps {
  provider: ProviderStatus;
  models?: string[];
  providerModels: Record<string, string[]>;
  customModels: string[];
  onModelAdded: () => void;
}

function ProviderCard({ provider, models, providerModels, customModels, onModelAdded }: ProviderCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ model: string; isOpen: boolean }>({
    model: '',
    isOpen: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [applyModal, setApplyModal] = useState<{ provider: string; model: string } | null>(null);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddModelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, model: string) => {
    e.stopPropagation();
    setDeleteConfirm({ model, isOpen: true });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.model) return;
    try {
      setIsDeleting(true);
      await removeCustomModel(provider.name, deleteConfirm.model);
      setDeleteConfirm({ model: '', isOpen: false });
      
      // 本地更新 store，无需重新加载
      removeProviderModel(provider.name, deleteConfirm.model);
    } catch {
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ model: '', isOpen: false });
  };

  const isCustomModel = (model: string) => customModels.includes(model);

  return (
    <>
      <div
        className={cn(
          'p-4 rounded-xl border transition-all group cursor-pointer',
          provider.isConnected
            ? 'bg-slate-50 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              provider.isConnected
                ? 'bg-emerald-50 group-hover:bg-emerald-100'
                : 'bg-slate-200 group-hover:bg-slate-300',
              'transition-colors'
            )}
          >
            {provider.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full flex-shrink-0',
                  getProviderColor(provider.name)
                )}
              />
              <p className="font-semibold text-slate-700 capitalize truncate">
                {provider.name}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  provider.isConnected
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                )}
              >
                {provider.isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    {t('providerStatus.connected')}
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    {t('providerStatus.notConnected')}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {provider.modelCount}
              </span>
              <span className="text-xs text-slate-400">
                {t('providerStatus.models')}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {isExpanded && models && models.length > 0 && (
          <div className="relative mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2">{t('providerStatus.models')}</div>
            <div className="flex flex-wrap gap-2">
              {models.map((model) => (
                <span
                  key={model}
                  className="relative group px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md flex items-center gap-1"
                >
                  <span>{model}</span>
                  
                  {provider.isConnected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setApplyModal({ provider: provider.name, model });
                      }}
                      className="w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-all"
                      title="应用到 Agents"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                  )}
                  
                  {isCustomModel(model) && (
                    <>
                      <button
                        onClick={(e) => handleDeleteClick(e, model)}
                        disabled={isDeleting}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <ConfirmPopover
                        isOpen={deleteConfirm.isOpen && deleteConfirm.model === model}
                        onConfirm={handleConfirmDelete}
                        onCancel={handleCancelDelete}
                        message={t('customModel.confirmDelete')}
                        className="absolute left-0 top-full mt-1 z-50"
                      />
                    </>
                  )}
                </span>
              ))}
            </div>
            {provider.isConnected && (
              <button
                onClick={handleAddModelClick}
                className={cn(
                  'mt-3 w-full py-2 px-3 rounded-lg border border-dashed',
                  'border-emerald-300 text-emerald-600 text-sm font-medium',
                  'hover:bg-emerald-50 hover:border-emerald-400',
                  'transition-colors flex items-center justify-center gap-2'
                )}
              >
                <Plus className="w-4 h-4" />
                {t('customModel.addModel')}
              </button>
            )}
          </div>
        )}

        {isExpanded && (!models || models.length === 0) && provider.isConnected && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2">{t('providerStatus.models')}</div>
            <button
              onClick={handleAddModelClick}
              className={cn(
                'w-full py-2 px-3 rounded-lg border border-dashed',
                'border-emerald-300 text-emerald-600 text-sm font-medium',
                'hover:bg-emerald-50 hover:border-emerald-400',
                'transition-colors flex items-center justify-center gap-2'
              )}
            >
              <Plus className="w-4 h-4" />
              {t('customModel.addModel')}
            </button>
          </div>
        )}
      </div>

      <AddModelModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentProviderId={provider.name}
        providerModels={providerModels}
        onModelAdded={onModelAdded}
      />

      {applyModal && (
        <ApplyModelModal
          isOpen={true}
          onClose={() => setApplyModal(null)}
          provider={applyModal.provider}
          modelName={applyModal.model}
        />
      )}
    </>
  );
}

function ProviderGroup({
  title,
  icon: Icon,
  iconColor,
  providers,
  providerModels,
  customModels,
  emptyMessage,
  onModelAdded,
  showValidationLoading = false,
  validationLoadingLabel,
  validationHint,
  showValidationFallback = false,
  validationFallbackLabel,
  validationFallbackHint,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  providers: ProviderStatus[];
  providerModels: Record<string, string[]>;
  customModels: Record<string, string[]>;
  emptyMessage: string;
  onModelAdded: () => void;
  showValidationLoading?: boolean;
  validationLoadingLabel?: string;
  validationHint?: string;
  showValidationFallback?: boolean;
  validationFallbackLabel?: string;
  validationFallbackHint?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              iconColor
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              {providers.length} {title.includes('已') ? '个已连接' : '个未连接'}
              {showValidationLoading && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600"
                  title={validationHint}
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {validationLoadingLabel}
                </span>
              )}
              {showValidationFallback && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-amber-600"
                  title={validationFallbackHint}
                >
                  <AlertCircle className="w-3 h-3" />
                  {validationFallbackLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="p-4">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.name}
                  provider={provider}
                  models={providerModels[provider.name] ?? []}
                  providerModels={providerModels}
                  customModels={customModels[provider.name] ?? []}
                  onModelAdded={onModelAdded}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 供应商状态总览组件
 *
 * 设计理念：
 * - 清晰展示已连接和未连接的供应商状态
 * - 可折叠的分组设计，便于快速浏览
 * - 显示每个供应商的模型数量
 */
export function ProviderStatus() {
  const { t } = useTranslation();
  const groupedModels = usePreloadStore((s) => s.models.grouped);
  const connectedProviderIds = usePreloadStore((s) => s.models.providers);
  const validating = usePreloadStore((s) => s.models.validating);
  const source = usePreloadStore((s) => s.models.source);
  const fallbackReason = usePreloadStore((s) => s.models.fallbackReason);
  const refreshModels = usePreloadStore((s) => s.refreshModels);

  const [customModelsData, setCustomModelsData] = useState<Record<string, string[]>>(
    {}
  );
  const [customModelsLoaded, setCustomModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshModels().catch(() => {
      // 校验失败由后续加载逻辑兜底
    });
  }, [refreshModels]);

  useEffect(() => {
    async function loadCustomModels() {
      try {
        setError(null);
        const customModels = await getCustomModels();
        setCustomModelsData(customModels);
        setCustomModelsLoaded(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('providerStatus.loadFailed')
        );
      }
    }

    loadCustomModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 构建供应商状态数据
  function buildProviderStatus(
    groupedModels: { provider: string; models: string[] }[],
    connectedProviders: string[]
  ): ProviderStatus[] {
    const connectedSet = new Set(connectedProviders.map((p) => p.toLowerCase()));

    return groupedModels.map((group) => ({
      name: group.provider,
      isConnected: connectedSet.has(group.provider.toLowerCase()),
      modelCount: group.models.length,
    }));
  }

  const grouped = useMemo(
    () => normalizeAndSortGroupedModels(groupedModels || []),
    [groupedModels]
  );

  const providerModels = useMemo(
    () => Object.fromEntries(grouped.map((group) => [group.provider, group.models])),
    [grouped]
  );

  const providers = useMemo(
    () => buildProviderStatus(grouped, connectedProviderIds || []),
    [grouped, connectedProviderIds]
  );

  const { connected, notConnected } = useMemo(() => {
    return {
      connected: providers.filter((p) => p.isConnected),
      notConnected: providers.filter((p) => !p.isConnected),
    };
  }, [providers]);

  async function handleModelAdded() {
    try {
      await refreshModels();
      const customModels = await getCustomModels();
      setCustomModelsData(customModels);
    } catch (error) {
      console.error('[ProviderStatus] Failed to refresh models:', error);
    }
  }

  const initialLoading = (!groupedModels || !connectedProviderIds || !customModelsLoaded) && !error;

  if (initialLoading) {
    return <ProviderStatusSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {t('providerStatus.loadFailed')}
        </h3>
        <p className="text-slate-500 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Server className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {t('providerStatus.noData')}
        </h3>
        <p className="text-slate-500 text-center max-w-md mb-4">
          {t('providerStatus.noDataHint')}
        </p>
      </div>
    );
  }

  // 统计信息
  const totalProviders = providers.length;
  const connectedCount = connected.length;
  const notConnectedCount = notConnected.length;
  const totalModels = providers.reduce((sum, p) => sum + p.modelCount, 0);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm">{t('providerStatus.totalProviders')}</p>
              <p className="text-2xl font-bold">{totalProviders}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm">{t('providerStatus.connected')}</p>
              <p className="text-2xl font-bold">{connectedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-100 text-sm">{t('providerStatus.notConnected')}</p>
              <p className="text-2xl font-bold">{notConnectedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-amber-100 text-sm">{t('providerStatus.totalModels')}</p>
              <p className="text-2xl font-bold">{totalModels}</p>
            </div>
          </div>
        </div>
      </div>

      <ProviderGroup
        title={t('providerStatus.connectedProviders')}
        icon={Wifi}
        iconColor="bg-emerald-500"
        providers={connected}
        providerModels={providerModels}
        customModels={customModelsData}
        emptyMessage={t('providerStatus.noConnectedProviders')}
        onModelAdded={handleModelAdded}
        showValidationLoading={validating}
        validationLoadingLabel={t('providerStatus.modelValidationLoading')}
        validationHint={t('providerStatus.modelValidationHint')}
        showValidationFallback={!validating && source === 'cache_fallback'}
        validationFallbackLabel={t('providerStatus.modelValidationFallback')}
        validationFallbackHint={
          fallbackReason || t('providerStatus.modelValidationFallbackHint')
        }
      />

      <ProviderGroup
        title={t('providerStatus.notConnectedProviders')}
        icon={WifiOff}
        iconColor="bg-slate-500"
        providers={notConnected}
        providerModels={providerModels}
        customModels={customModelsData}
        emptyMessage={t('providerStatus.noNotConnectedProviders')}
        onModelAdded={handleModelAdded}
      />
    </div>
  );
}

export default ProviderStatus;
