import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Plus, Trash2, Power, CheckCircle2, Settings } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal, ConfirmModal } from '../common/Modal';
import { toast } from '../common/Toast';
import { savePreset, loadPreset, listPresets, deletePreset, getPresetInfo, getOmoConfig } from '../../services/tauri';
import { usePresetStore } from '../../store/presetStore';

interface PresetCardProps {
  name: string;
  agentCount: number;
  categoryCount: number;
  isActive?: boolean;  // 是否为当前激活的预设
  onLoad: () => void;
  onDelete: () => void;
  loadLabel: string;
  deleteLabel: string;
}

function PresetCard({ name, agentCount, categoryCount, isActive, onLoad, onDelete, loadLabel, deleteLabel }: PresetCardProps) {
  const { t } = useTranslation();
  
  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Bookmark className="w-5 h-5 text-white" />
        </div>
        
        <h3 className="font-semibold text-slate-800 truncate flex-1 min-w-0" title={name}>
          {name}
        </h3>
        
        <div className="flex items-center gap-3 text-sm text-slate-500 flex-shrink-0">
          <span className="whitespace-nowrap">
            {agentCount} agents, {categoryCount} categories
          </span>
          
          {/* 启用中标签 */}
          {isActive && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {t('presetCard.active')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 只有非激活状态才显示加载按钮 */}
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
}

interface DefaultPresetCardProps {
  isActive: boolean;
  agentCount: number;
  categoryCount: number;
  onLoad?: () => void;
  loadLabel?: string;
}

function DefaultPresetCard({ isActive, agentCount, categoryCount, onLoad, loadLabel }: DefaultPresetCardProps) {
  const { t } = useTranslation();

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
        <div className="flex items-center gap-3 text-sm text-slate-500 flex-shrink-0">
          <span className="whitespace-nowrap">
            {agentCount} agents, {categoryCount} categories
          </span>
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

export function PresetManager() {
  const { t } = useTranslation();
  const { activePreset, setActivePreset, clearActivePreset } = usePresetStore();
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

  const loadPresetList = async () => {
    try {
      setIsLoading(true);
      const names = await listPresets();

      const presetsWithInfo = await Promise.all(
        names.map(async (name) => {
          const [agentCount, categoryCount, createdAt] = await getPresetInfo(name);
          return { name, agentCount, categoryCount, createdAt };
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
      const config = await getOmoConfig();
      setDefaultPresetInfo({
        agentCount: Object.keys(config.agents || {}).length,
        categoryCount: Object.keys(config.categories || {}).length
      });
    } catch (error) {
      console.error('Failed to load default preset info:', error);
    }
  };

  useEffect(() => {
    loadPresetList();
    loadDefaultPresetInfo();
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
      toast.success(t('presetManager.loadSuccess', { name: t('presetManager.defaultPreset') }));
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{t('presetManager.myPresets')}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {t('presetManager.presetCount', { count: presets.length })}
          </p>
        </div>
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
