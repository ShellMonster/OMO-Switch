import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { SearchInput } from '../common/SearchInput';
import { toast } from '../common/Toast';
import { usePreloadStore } from '../../store/preloadStore';
import { usePresetStore } from '../../store/presetStore';
import {
  updateAgentsBatch,
  saveConfigSnapshot,
  updatePreset,
  type AgentConfig,
  type AgentUpdateRequest,
} from '../../services/tauri';

interface ApplyModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  modelName: string;
}

const VARIANT_OPTIONS = [
  { value: 'max', label: 'Max' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
] as const;

export function ApplyModelModal({
  isOpen,
  onClose,
  provider,
  modelName,
}: ApplyModelModalProps) {
  const { t } = useTranslation();
  const fullModelPath = `${provider}/${modelName}`;

  const omoConfig = usePreloadStore((state) => state.omoConfig);
  const updateAgentInConfig = usePreloadStore((state) => state.updateAgentInConfig);
  const updateCategoryInConfig = usePreloadStore((state) => state.updateCategoryInConfig);
  const activePreset = usePresetStore((state) => state.activePreset);

  const isBuiltinPreset = activePreset?.startsWith('__builtin__');

  const [variant, setVariant] = useState<AgentConfig['variant']>('none');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVariant('none');
      setSelectedAgents(new Set());
      setSelectedCategories(new Set());
      setAgentSearch('');
      setCategorySearch('');
    }
  }, [isOpen]);

  const agents = omoConfig.data?.agents || {};
  const categories = omoConfig.data?.categories || {};

  const filteredAgents = useMemo(() => {
    const entries = Object.entries(agents);
    if (!agentSearch.trim()) return entries;
    const query = agentSearch.toLowerCase();
    return entries.filter(([name]) => name.toLowerCase().includes(query));
  }, [agents, agentSearch]);

  const filteredCategories = useMemo(() => {
    const entries = Object.entries(categories);
    if (!categorySearch.trim()) return entries;
    const query = categorySearch.toLowerCase();
    return entries.filter(([name]) => name.toLowerCase().includes(query));
  }, [categories, categorySearch]);

  const selectedAgentCount = selectedAgents.size;
  const selectedCategoryCount = selectedCategories.size;
  const totalSelected = selectedAgentCount + selectedCategoryCount;

  const toggleAgent = useCallback((agentName: string) => {
    setSelectedAgents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(agentName)) {
        newSet.delete(agentName);
      } else {
        newSet.add(agentName);
      }
      return newSet;
    });
  }, []);

  const toggleCategory = useCallback((categoryName: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  const selectAllAgents = useCallback(() => {
    setSelectedAgents(new Set(filteredAgents.map(([name]) => name)));
  }, [filteredAgents]);

  const clearAgents = useCallback(() => {
    setSelectedAgents(new Set());
  }, []);

  const selectAllCategories = useCallback(() => {
    setSelectedCategories(new Set(filteredCategories.map(([name]) => name)));
  }, [filteredCategories]);

  const clearCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  const handleApply = async () => {
    if (totalSelected === 0) {
      toast.error(t('applyModel.noSelection'));
      return;
    }

    if (isBuiltinPreset) {
      toast.info(t('agentList.builtinPresetEditHint'));
      return;
    }

    setIsApplying(true);
    try {
      const updates: AgentUpdateRequest[] = [];

      selectedAgents.forEach((agentName) => {
        updates.push({
          agentName,
          model: fullModelPath,
          variant,
        });
        updateAgentInConfig(agentName, { model: fullModelPath, variant });
      });

      selectedCategories.forEach((categoryName) => {
        updates.push({
          agentName: categoryName,
          model: fullModelPath,
          variant,
        });
        updateCategoryInConfig(categoryName, { model: fullModelPath, variant });
      });

      await updateAgentsBatch(updates);
      await saveConfigSnapshot();

      if (activePreset && !activePreset.startsWith('__builtin__')) {
        try {
          await updatePreset(activePreset);
        } catch (error) {
          console.error('Failed to sync preset:', error);
        }
      }

      toast.success(
        t('applyModel.success', { model: modelName, count: totalSelected })
      );
      onClose();
    } catch (error) {
      toast.error(t('applyModel.failed'));
      console.error('Failed to apply model:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const renderSelectItem = (
    name: string,
    config: AgentConfig,
    isSelected: boolean,
    onToggle: () => void
  ) => {
    const currentModelShort = config.model.split('/').pop() || config.model;
    return (
      <label
        key={name}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Select ${name}`}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="flex-1 text-sm font-medium text-slate-700">{name}</span>
        <span className="text-xs text-slate-400 truncate max-w-[150px]">
          {t('applyModel.currentModel', { model: currentModelShort })}
        </span>
      </label>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('applyModel.title', { model: modelName })}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isApplying}>
            {t('applyModel.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            isLoading={isApplying}
            disabled={totalSelected === 0}
          >
            {t('applyModel.apply', { count: totalSelected })}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Select
          label={t('applyModel.intensityLevel')}
          value={variant || 'none'}
          onChange={(value) => setVariant(value as AgentConfig['variant'])}
          options={VARIANT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: t(`variantOptions.${opt.value}`),
          }))}
        />

        <div className="border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-800">
              {t('applyModel.agents')} ({Object.keys(agents).length})
            </h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllAgents}>
                {t('applyModel.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAgents}>
                {t('applyModel.clearAll')}
              </Button>
            </div>
          </div>
          <SearchInput
            value={agentSearch}
            onChange={setAgentSearch}
            placeholder={t('applyModel.searchPlaceholder')}
            className="mb-2"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredAgents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {t('applyModel.noResults')}
              </p>
            ) : (
              filteredAgents.map(([name, config]) =>
                renderSelectItem(name, config, selectedAgents.has(name), () => toggleAgent(name))
              )
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-800">
              {t('applyModel.categories')} ({Object.keys(categories).length})
            </h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllCategories}>
                {t('applyModel.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCategories}>
                {t('applyModel.clearAll')}
              </Button>
            </div>
          </div>
          <SearchInput
            value={categorySearch}
            onChange={setCategorySearch}
            placeholder={t('applyModel.searchPlaceholder')}
            className="mb-2"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredCategories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {t('applyModel.noResults')}
              </p>
            ) : (
              filteredCategories.map(([name, config]) =>
                renderSelectItem(name, config, selectedCategories.has(name), () => toggleCategory(name))
              )
            )}
          </div>
        </div>

        {totalSelected > 0 && (
          <p className="text-sm text-slate-600 text-center">
            {t('applyModel.selected', {
              agents: selectedAgentCount,
              categories: selectedCategoryCount,
            })}
          </p>
        )}
      </div>
    </Modal>
  );
}
