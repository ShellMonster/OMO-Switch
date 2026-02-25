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
  applyUpdatesToPreset,
  getPresetConfig,
  updateAgentsBatch,
  saveConfigSnapshot,
  updatePreset,
  type AgentConfig,
  type AgentUpdateRequest,
  type OmoConfig,
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
type VariantValue = NonNullable<AgentConfig['variant']>;
const VARIANT_PRIORITY: VariantValue[] = ['max', 'high', 'medium', 'low', 'none'];
const VARIANT_BADGE_STYLE: Record<VariantValue, string> = {
  max: 'border-rose-200 bg-rose-50 text-rose-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  medium: 'border-blue-200 bg-blue-50 text-blue-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  none: 'border-slate-200 bg-slate-50 text-slate-600',
};
const VARIANT_BADGE_TEXT: Record<VariantValue, string> = {
  max: 'M',
  high: 'H',
  medium: 'M',
  low: 'L',
  none: 'N',
};

function normalizeVariant(value?: string): VariantValue {
  if (value === 'max' || value === 'high' || value === 'medium' || value === 'low' || value === 'none') {
    return value;
  }
  return 'none';
}

function toCamelCaseProvider(value: string): string {
  if (!value) return 'unknown';
  const parts = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return 'unknown';
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

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
  const refreshPresetList = usePresetStore((state) => state.refreshPresetList);

  const [variant, setVariant] = useState<VariantValue>('none');
  const [presetOptions, setPresetOptions] = useState<string[]>([]);
  const [targetPreset, setTargetPreset] = useState<string>('');
  const [draftConfig, setDraftConfig] = useState<OmoConfig | null>(null);
  const [isPresetLoading, setIsPresetLoading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [agentSearch, setAgentSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const resolveDefaultVariant = useCallback(
    (config?: OmoConfig | null): VariantValue => {
      if (!config) return 'none';
      const allConfigs = [
        ...Object.values(config.agents || {}),
        ...Object.values(config.categories || {}),
      ];
      const variants = allConfigs
        .filter((item) => item?.model === fullModelPath)
        .map((item) => normalizeVariant(item.variant));

      if (variants.length === 0) {
        return 'none';
      }

      const unique = new Set(variants);
      if (unique.size === 1) {
        return variants[0];
      }

      const counts = new Map<VariantValue, number>();
      variants.forEach((item) => {
        counts.set(item, (counts.get(item) || 0) + 1);
      });

      let best: VariantValue = 'none';
      let bestCount = -1;
      VARIANT_PRIORITY.forEach((candidate) => {
        const count = counts.get(candidate) || 0;
        if (count > bestCount) {
          best = candidate;
          bestCount = count;
        }
      });
      return best;
    },
    [fullModelPath]
  );

  const loadPresetDraft = useCallback(
    async (presetName: string): Promise<OmoConfig | null> => {
      if (!presetName) return null;
      setIsPresetLoading(true);
      try {
        const config = await getPresetConfig(presetName);
        setDraftConfig(config);
        return config;
      } catch (error) {
        const fallbackConfig = omoConfig.data || null;
        setDraftConfig(fallbackConfig);
        toast.error(
          error instanceof Error
            ? error.message
            : t('applyModel.loadPresetFailed', { defaultValue: '加载预设配置失败' })
        );
        return fallbackConfig;
      } finally {
        setIsPresetLoading(false);
      }
    },
    [omoConfig.data, t]
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const initModal = async () => {
      setSelectedAgents(new Set());
      setSelectedCategories(new Set());
      setAgentSearch('');
      setCategorySearch('');
      setDraftConfig(null);

      try {
        const presets = await refreshPresetList(true);
        const options = presets.length > 0 ? presets : ['default'];
        if (cancelled) return;
        setPresetOptions(options);

        const initialPreset =
          activePreset && options.includes(activePreset)
            ? activePreset
            : options.includes('default')
              ? 'default'
              : options[0];

        setTargetPreset(initialPreset);
        const presetConfig = await loadPresetDraft(initialPreset);
        if (!cancelled) {
          setVariant(resolveDefaultVariant(presetConfig));
        }
      } catch {
        if (cancelled) return;
        setPresetOptions(['default']);
        setTargetPreset('default');
        const presetConfig = await loadPresetDraft('default');
        if (!cancelled) {
          setVariant(resolveDefaultVariant(presetConfig));
        }
      }
    };

    void initModal();

    return () => {
      cancelled = true;
    };
  }, [isOpen, activePreset, loadPresetDraft, refreshPresetList, resolveDefaultVariant]);

  const agents = draftConfig?.agents || {};
  const categories = draftConfig?.categories || {};

  const filteredAgents = useMemo(() => {
    const entries = Object.entries(agents);
    if (!agentSearch.trim()) return entries;
    const query = agentSearch.toLowerCase();
    return entries.filter(([name, config]) => {
      const model = (config.model || '').toLowerCase();
      const shortModel = model.split('/').pop() || '';
      return (
        name.toLowerCase().includes(query) ||
        model.includes(query) ||
        shortModel.includes(query)
      );
    });
  }, [agents, agentSearch]);

  const filteredCategories = useMemo(() => {
    const entries = Object.entries(categories);
    if (!categorySearch.trim()) return entries;
    const query = categorySearch.toLowerCase();
    return entries.filter(([name, config]) => {
      const model = (config.model || '').toLowerCase();
      const shortModel = model.split('/').pop() || '';
      return (
        name.toLowerCase().includes(query) ||
        model.includes(query) ||
        shortModel.includes(query)
      );
    });
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

    if (!targetPreset) {
      toast.error(
        t('applyModel.presetRequired', { defaultValue: '请先选择目标预设' })
      );
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

      const currentEditablePreset = activePreset || null;

      if (currentEditablePreset && targetPreset === currentEditablePreset) {
        await updateAgentsBatch(updates);
        await saveConfigSnapshot();
        await updatePreset(targetPreset);
      } else {
        await applyUpdatesToPreset(targetPreset, updates);
      }

      toast.success(
        t('applyModel.successToPreset', {
          model: modelName,
          count: totalSelected,
          preset: targetPreset,
          defaultValue: `已将 ${modelName} 应用到预设 ${targetPreset}`,
        })
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
    const modelPath = config.model || '';
    const modelSegments = modelPath.split('/');
    const hasProvider = modelSegments.length > 1;
    const providerName = hasProvider ? modelSegments[0] : 'unknown';
    const providerDisplayName = toCamelCaseProvider(providerName);
    const modelId = hasProvider ? modelSegments.slice(1).join('/') : modelPath;
    const currentVariant = normalizeVariant(config.variant);

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
        <span
          className="flex items-center gap-1.5 max-w-[260px] min-w-0"
          title={t('applyModel.currentModel', { model: `${providerDisplayName}/${modelId}` })}
        >
          <span className="px-1.5 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-[10px] font-medium text-indigo-700 shrink-0">
            {providerDisplayName}
          </span>
          <span className="text-xs text-slate-500 truncate">
            {modelId}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold shrink-0 ${VARIANT_BADGE_STYLE[currentVariant]}`}
            title={t(`variantOptions.${currentVariant}`)}
          >
            {VARIANT_BADGE_TEXT[currentVariant]}
          </span>
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
          label={t('applyModel.targetPreset', { defaultValue: '目标预设' })}
          value={targetPreset}
          onChange={(value) => {
            setTargetPreset(value);
            setSelectedAgents(new Set());
            setSelectedCategories(new Set());
            setAgentSearch('');
            setCategorySearch('');
            void (async () => {
              const presetConfig = await loadPresetDraft(value);
              setVariant(resolveDefaultVariant(presetConfig));
            })();
          }}
          options={presetOptions.map((preset) => ({
            value: preset,
            label: preset,
          }))}
        />

        {isPresetLoading && (
          <p className="text-xs text-slate-500 -mt-2">
            {t('applyModel.loadingPreset', { defaultValue: '正在加载所选预设配置...' })}
          </p>
        )}

        <Select
          label={t('applyModel.intensityLevel')}
          value={variant || 'none'}
          onChange={(value) => setVariant(normalizeVariant(value))}
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
