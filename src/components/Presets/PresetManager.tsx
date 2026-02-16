import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Plus, Trash2, Power, CheckCircle2, Settings, Star, Zap, Coins, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal, ConfirmModal } from '../common/Modal';
import { toast } from '../common/Toast';
import { savePreset, loadPreset, listPresets, deletePreset, getPresetInfo, getPresetMeta, getOmoConfig, getBuiltinPresets, applyBuiltinPreset, getConfigModificationTime } from '../../services/tauri';
import { usePresetStore } from '../../store/presetStore';
import { usePreloadStore } from '../../store/preloadStore';
import type { BuiltinPresetInfo } from '../../services/tauri';

interface PresetCardProps {
  name: string;
  agentCount: number;
  categoryCount: number;
  updatedAt: number | null;
  isActive?: boolean;
  onLoad: () => void;
  onDelete: () => void;
  loadLabel: string;
  deleteLabel: string;
}

function PresetCard({ name, agentCount, categoryCount, updatedAt, isActive, onLoad, onDelete, loadLabel, deleteLabel }: PresetCardProps) {
  const { t } = useTranslation();

  const formatUpdatedTime = (timestamp: number | null): string => {
    if (!timestamp) return t('presetCard.unknown');
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-');
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Bookmark className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 truncate" title={name}>
            {name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('presetCard.lastUpdated')}: {formatUpdatedTime(updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500 flex-shrink-0">
          <span className="whitespace-nowrap">
            {agentCount} agents, {categoryCount} categories
          </span>

          {isActive && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('presetCard.active')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoad}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <Power className="w-4 h-4" />
              <span className="hidden sm:inline">{loadLabel}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isActive}
            className={isActive ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50'}
            title={isActive ? t('presetManager.deleteDisabledHint') : deleteLabel}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PresetWithInfo {
  name: string;
  agentCount: number;
  categoryCount: number;
  createdAt: string;
  updatedAt: number | null;
}

interface DefaultPresetCardProps {
  isActive: boolean;
  agentCount: number;
  categoryCount: number;
  modifiedTime: number | null;
  onLoad?: () => void;
  loadLabel?: string;
}

function DefaultPresetCard({ isActive, agentCount, categoryCount, modifiedTime, onLoad, loadLabel }: DefaultPresetCardProps) {
  const { t } = useTranslation();

  const formatModifiedTime = (timestamp: number | null): string => {
    if (!timestamp) return t('presetCard.unknown');
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\//g, '-');
  };

  return (
    <div 
      className="group bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer"
      onClick={!isActive ? onLoad : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800 truncate flex-1 min-w-0">
          {t('presetManager.defaultPreset')}
        </h3>
        <div className="flex flex-col items-end gap-1">
          <span className="whitespace-nowrap text-sm text-slate-500">
            {agentCount} agents, {categoryCount} categories
          </span>
          <p className="text-xs text-slate-400">
            {t('presetCard.lastUpdated')}: {formatModifiedTime(modifiedTime)}
          </p>
        </div>
        {isActive ? (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {t('presetCard.active')}
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLoad?.();
            }}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Power className="w-4 h-4" />
            <span className="hidden sm:inline">{loadLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// 内置预设卡片属性
interface BuiltinPresetCardProps {
  preset: BuiltinPresetInfo;
  agentCount: number;
  categoryCount: number;
  isActive?: boolean;
  isLoading?: boolean;
  onApply: () => void;
  applyLabel: string;
}

// 内置预设卡片组件 - 带特殊样式，无删除按钮
function BuiltinPresetCard({ preset, agentCount, categoryCount, isActive, isLoading, onApply, applyLabel }: BuiltinPresetCardProps) {
  const { t } = useTranslation();

  // 根据预设类型选择图标和颜色
  const getIconAndColor = (id: string) => {
    switch (id) {
      case 'official-default':
        return { Icon: Star, gradient: 'from-amber-400 to-orange-500' };
      case 'economy':
        return { Icon: Coins, gradient: 'from-emerald-400 to-teal-500' };
      case 'high-performance':
        return { Icon: Zap, gradient: 'from-violet-500 to-purple-600' };
      default:
        return { Icon: Star, gradient: 'from-slate-400 to-slate-500' };
    }
  };

  const { Icon, gradient } = getIconAndColor(preset.id);

  return (
    <div className="group bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-amber-200/60 p-3 hover:shadow-md hover:border-amber-300 transition-all duration-200 relative overflow-hidden">
      {/* 装饰性背景 */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-200/20 to-transparent rounded-bl-full" />

      <div className="flex items-center gap-3 relative">
        <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 truncate" title={preset.name}>
              {preset.name}
            </h3>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium">
              {t('presetManager.builtin')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate" title={preset.description}>
            {preset.description}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500 flex-shrink-0">
          <span className="whitespace-nowrap">
            {agentCount} agents, {categoryCount} categories
          </span>

          {isActive && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('presetCard.active')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onApply}
              disabled={isLoading}
              className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <Power className="w-4 h-4" />
              <span className="hidden sm:inline">{applyLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PresetManager() {
  const { t } = useTranslation();
  const { activePreset, setActivePreset, clearActivePreset } = usePresetStore();
  // 从 preloadStore 获取已缓存的 omoConfig 数据
  const cachedOmoConfig = usePreloadStore(s => s.omoConfig.data);
  const lastSyncTime = usePreloadStore(s => s.upstreamUpdateStatus.lastChecked);
  // 获取版本信息，检测 Oh My OpenCode 是否已安装
  const versions = usePreloadStore(s => s.versions.data);
  const omoInfo = versions?.find(v => v.name === 'Oh My OpenCode');
  const omoInstalled = omoInfo?.installed ?? true;  // 默认假设已安装，避免闪烁
  const [presets, setPresets] = useState<PresetWithInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultPresetInfo, setDefaultPresetInfo] = useState({
    agentCount: 0,
    categoryCount: 0
  });
  const [configModifiedTime, setConfigModifiedTime] = useState<number | null>(null);
  const [builtinPresets, setBuiltinPresets] = useState<BuiltinPresetInfo[]>([]);
  const [activeBuiltinPreset, setActiveBuiltinPreset] = useState<string | null>(null);
  const [builtinPresetStats, setBuiltinPresetStats] = useState<Record<string, { agentCount: number; categoryCount: number }>>({});
  const [builtinExpanded, setBuiltinExpanded] = useState(true);
  const [myPresetsExpanded, setMyPresetsExpanded] = useState(true);

  const loadPresetList = async () => {
    try {
      setIsLoading(true);
      const names = await listPresets();

      const presetsWithInfo = await Promise.all(
        names.map(async (name) => {
          const [agentCount, categoryCount, createdAt] = await getPresetInfo(name);
          let updatedAt: number | null = null;
          try {
            const meta = await getPresetMeta(name);
            updatedAt = meta.updated_at;
          } catch {
            updatedAt = null;
          }
          return { name, agentCount, categoryCount, createdAt, updatedAt };
        })
      );

      setPresets(presetsWithInfo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('presetManager.loadListFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultPresetInfo = async () => {
    try {
      // 优先使用缓存数据，避免重复请求
      const config = cachedOmoConfig || await getOmoConfig();
      setDefaultPresetInfo({
        agentCount: Object.keys(config.agents || {}).length,
        categoryCount: Object.keys(config.categories || {}).length
      });
      const modifiedTime = await getConfigModificationTime();
      setConfigModifiedTime(modifiedTime);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load default preset info:', error);
      }
    }
  };

  const loadBuiltinPresets = async () => {
    try {
      const presets = await getBuiltinPresets();
      setBuiltinPresets(presets);

      // 优先使用缓存数据，避免重复请求
      const config = cachedOmoConfig || await getOmoConfig();
      const currentAgentCount = Object.keys(config.agents || {}).length;
      const currentCategoryCount = Object.keys(config.categories || {}).length;

      // 为每个内置预设设置相同的统计信息（基于当前配置）
      const stats: Record<string, { agentCount: number; categoryCount: number }> = {};
      presets.forEach(preset => {
        stats[preset.id] = {
          agentCount: currentAgentCount,
          categoryCount: currentCategoryCount
        };
      });
      setBuiltinPresetStats(stats);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load builtin presets:', error);
      }
    }
  };

  useEffect(() => {
    loadPresetList();
    loadDefaultPresetInfo();
    loadBuiltinPresets();
  }, []);

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      setError(t('presetManager.presetNameEmpty'));
      return;
    }

    try {
      setIsLoading(true);
      await savePreset(newPresetName.trim());
      setShowSaveModal(false);
      setNewPresetName('');
      await loadPresetList();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('presetManager.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPreset = async (name: string) => {
    try {
      setIsLoading(true);
      await loadPreset(name);
      setActivePreset(name);
      toast.success(t('presetManager.loadSuccess', { name }));
      setError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetManager.loadFailed'));
      setError(err instanceof Error ? err.message : t('presetManager.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 加载默认预设
   */
  const handleLoadDefault = async () => {
    try {
      setIsLoading(true);
      clearActivePreset();
      setActiveBuiltinPreset(null);
      toast.success(t('presetManager.loadSuccess', { name: t('presetManager.defaultPreset') }));
      setError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetManager.loadFailed'));
      setError(err instanceof Error ? err.message : t('presetManager.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 应用内置预设
   */
  const handleApplyBuiltinPreset = async (presetId: string) => {
    try {
      setIsLoading(true);
      await applyBuiltinPreset(presetId);
      setActiveBuiltinPreset(presetId);
      setActivePreset(`__builtin__${presetId}`);

      const preset = builtinPresets.find(p => p.id === presetId);
      toast.success(t('presetManager.loadSuccess', { name: preset?.name || presetId }));
      setError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetManager.loadFailed'));
      setError(err instanceof Error ? err.message : t('presetManager.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    try {
      setIsLoading(true);
      await deletePreset(selectedPreset);
      
      if (activePreset === selectedPreset) {
        clearActivePreset();
      }
      
      toast.success(t('presetManager.deleteSuccess', { name: selectedPreset }));
      setShowDeleteModal(false);
      setSelectedPreset(null);
      await loadPresetList();
      setError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetManager.deleteFailed'));
      setError(err instanceof Error ? err.message : t('presetManager.deleteFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (name: string) => {
    setSelectedPreset(name);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      {omoInstalled === false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800">预设功能需要 Oh My OpenCode</h4>
              <p className="text-sm text-amber-700 mt-1">
                请先安装 Oh My OpenCode 插件后再使用预设功能。
              </p>
              <code className="mt-2 inline-block text-xs bg-amber-100 px-2 py-1 rounded text-amber-900">
                bunx oh-my-opencode install
              </code>
            </div>
          </div>
        </div>
      )}
      {/* 内置预设区域 */}
      <div>
        <button
          onClick={() => setBuiltinExpanded(!builtinExpanded)}
          className="flex items-center gap-2 w-full text-left py-2 hover:bg-slate-50 rounded-lg transition-colors mb-3"
        >
          {builtinExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t('presetManager.builtinPresets')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('presetManager.builtinPresetsDescription')}
            </p>
          </div>
        </button>
        {builtinExpanded && (
          <>
            <div className="flex flex-col gap-3">
              {builtinPresets.map((preset) => (
                <BuiltinPresetCard
                  key={preset.id}
                  preset={preset}
                  agentCount={builtinPresetStats[preset.id]?.agentCount || 0}
                  categoryCount={builtinPresetStats[preset.id]?.categoryCount || 0}
                  isActive={activeBuiltinPreset === preset.id}
                  isLoading={isLoading}
                  onApply={() => handleApplyBuiltinPreset(preset.id)}
                  applyLabel={t('presetManager.apply')}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {t('presetManager.lastSync')}: {lastSyncTime
                ? new Date(lastSyncTime).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).replace(/\//g, '-')
                : t('presetManager.notSynced')}
            </p>
          </>
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-200" />

      {/* 我的预设区域 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMyPresetsExpanded(!myPresetsExpanded)}
          className="flex items-center gap-2 text-left py-2 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {myPresetsExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t('presetManager.myPresets')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('presetManager.presetCount', { count: presets.length })}
            </p>
          </div>
        </button>
        <Button
          variant="primary"
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('presetManager.saveCurrentConfig')}
        </Button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {myPresetsExpanded && (
        <>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-slate-500 mt-4">{t('presetManager.loading')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <DefaultPresetCard
                isActive={activePreset === null}
                agentCount={defaultPresetInfo.agentCount}
                categoryCount={defaultPresetInfo.categoryCount}
                modifiedTime={configModifiedTime}
                onLoad={handleLoadDefault}
                loadLabel={t('presetManager.load')}
              />
              {presets.length === 0 ? (
                <div className="text-center py-8 text-slate-500">{t('presetManager.noPresets')}</div>
              ) : (
                presets.map((preset) => (
                  <PresetCard
                    key={preset.name}
                    name={preset.name}
                    agentCount={preset.agentCount}
                    categoryCount={preset.categoryCount}
                    updatedAt={preset.updatedAt}
                    isActive={activePreset === preset.name}
                    onLoad={() => handleLoadPreset(preset.name)}
                    onDelete={() => openDeleteModal(preset.name)}
                    loadLabel={t('presetManager.load')}
                    deleteLabel={t('presetManager.delete')}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title={t('presetManager.savePreset')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              {t('presetManager.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSavePreset} isLoading={isLoading}>
              {t('presetManager.save')}
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
            />
          </div>
          <p className="text-sm text-slate-500">
            {t('presetManager.saveDescription')}
          </p>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePreset}
        title={t('presetManager.confirmDelete')}
        message={t('presetManager.deleteMessage', { name: selectedPreset })}
        confirmText={t('presetManager.delete')}
        confirmVariant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
