import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Plus, Trash2, Power, CheckCircle2, ChevronDown, ChevronRight, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal, ConfirmModal } from '../common/Modal';
import { toast } from '../common/Toast';
import { savePreset, loadPreset, deletePreset, renamePreset, getPresetInfo, getPresetMeta, saveConfigSnapshot } from '../../services/tauri';
import { usePresetStore } from '../../store/presetStore';
import { usePreloadStore } from '../../store/preloadStore';

interface PresetCardProps {
  name: string;
  agentCount: number;
  categoryCount: number;
  updatedAt: number | null;
  isActive?: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (oldName: string, newName: string) => Promise<void>;
  loadLabel: string;
  deleteLabel: string;
}

function PresetCard({ name, agentCount, categoryCount, updatedAt, isActive, onLoad, onDelete, onRename, loadLabel, deleteLabel }: PresetCardProps) {
  const { t } = useTranslation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

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

  const startRename = () => {
    setRenameDraft(name);
    setRenameError(null);
    setIsEditingName(true);
  };

  const cancelRename = () => {
    setRenameDraft(name);
    setRenameError(null);
    setIsEditingName(false);
  };

  const confirmRename = async () => {
    const next = renameDraft.trim();
    if (!next) {
      setRenameError(t('presetManager.presetNameEmpty'));
      return;
    }
    try {
      setIsRenaming(true);
      setRenameError(null);
      await onRename(name, next);
      setIsEditingName(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : t('presetManager.renameFailed'));
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Bookmark className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="space-y-1">
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void confirmRename();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                placeholder={t('presetManager.renamePlaceholder')}
                className="w-full max-w-xs px-2 py-1 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
              {renameError && <p className="text-xs text-rose-600">{renameError}</p>}
            </div>
          ) : (
            <h3 className="font-semibold text-slate-800 truncate" title={name === 'default' ? t('presetManager.defaultPreset') : name}>
              {name === 'default' ? t('presetManager.defaultPreset') : name}
            </h3>
          )}
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
          {isEditingName ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void confirmRename()}
                isLoading={isRenaming}
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title={t('presetManager.renameSave')}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelRename}
                disabled={isRenaming}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                title={t('presetManager.cancel')}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
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
              {name !== 'default' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startRename}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  title={t('presetManager.rename')}
                >
                  <Pencil className="w-4 h-4" />
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
            </>
          )}
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

export function PresetManager() {
  const { t } = useTranslation();
  const { activePreset, setActivePreset, refreshPresetList } = usePresetStore();
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
  const [myPresetsExpanded, setMyPresetsExpanded] = useState(true);

  const loadPresetList = async () => {
    try {
      setIsLoading(true);
      const names = await refreshPresetList(true);

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

  useEffect(() => {
    void loadPresetList();
  }, [refreshPresetList]);

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
      await saveConfigSnapshot();  // 新增：更新配置快照，避免误报"配置被外部修改"
      toast.success(t('presetManager.loadSuccess', { name }));
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
        setActivePreset('default');
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
    // 检查是否只剩一个预设
    if (presets.length <= 1) {
      toast.warning(t('presetManager.cannotDeleteLastPreset'));
      return;
    }
    setSelectedPreset(name);
    setShowDeleteModal(true);
  };

  const handleRenamePreset = async (oldName: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error(t('presetManager.presetNameEmpty'));
    }
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      throw new Error(t('presetManager.presetNameInvalidPath'));
    }
    if (trimmedName !== oldName && presets.some((preset) => preset.name === trimmedName)) {
      throw new Error(t('presetManager.presetNameExists'));
    }

    await renamePreset(oldName, trimmedName);

    setPresets((prev) =>
      prev
        .map((preset) => (preset.name === oldName ? { ...preset, name: trimmedName } : preset))
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    if (activePreset === oldName) {
      setActivePreset(trimmedName);
    }
    if (selectedPreset === oldName) {
      setSelectedPreset(trimmedName);
    }

    await refreshPresetList(true);
    toast.success(t('presetManager.renameSuccess', { name: trimmedName }));
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
        <div className="relative">
          {/* Loading Overlay - 遮罩层，避免 DOM 变化导致滚动重置 */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-slate-500 mt-4">{t('presetManager.loading')}</p>
              </div>
            </div>
          )}

          {/* 预设列表 - 始终渲染，不随 loading 状态卸载 */}
          <div className="flex flex-col gap-3">
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
                  onRename={handleRenamePreset}
                  loadLabel={t('presetManager.load')}
                  deleteLabel={t('presetManager.delete')}
                />
              ))
            )}
          </div>
        </div>
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
