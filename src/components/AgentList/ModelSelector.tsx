import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { SearchableSelect } from '../common/SearchableSelect';
import { toast } from '../common/Toast';
import type { AgentConfig } from '../../services/tauri';

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  currentConfig: AgentConfig;
  providerModels: Record<string, string[]>;
  connectedProviders: string[];
  onSave: (model: string, variant: AgentConfig['variant']) => Promise<void>;
  isSaving?: boolean;
}

const VARIANT_OPTIONS_KEYS = ['max', 'high', 'medium', 'low', 'none'] as const;
const LAST_VARIANT_KEY = 'omo-switch-last-variant';

function extractProvider(model: string): string {
  const slashIndex = model.indexOf('/');
  return slashIndex > 0 ? model.substring(0, slashIndex) : '';
}

function extractModelName(model: string): string {
  const slashIndex = model.indexOf('/');
  return slashIndex > 0 ? model.substring(slashIndex + 1) : model;
}

export function ModelSelector({
  isOpen,
  onClose,
  agentName,
  currentConfig,
  providerModels,
  connectedProviders,
  onSave,
  isSaving = false,
}: ModelSelectorProps) {
  const { t } = useTranslation();
  const currentProvider = extractProvider(currentConfig.model);
  const currentModelName = extractModelName(currentConfig.model);

  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [selectedModelName, setSelectedModelName] = useState(currentModelName);
  const [selectedVariant, setSelectedVariant] = useState<AgentConfig['variant']>(
    currentConfig.variant || 'none'
  );

  useEffect(() => {
    if (isOpen) {
      const provider = extractProvider(currentConfig.model);
      setSelectedProvider(provider);
      setSelectedModelName(extractModelName(currentConfig.model));
      const savedVariant = localStorage.getItem(LAST_VARIANT_KEY);
      setSelectedVariant(savedVariant as AgentConfig['variant'] || currentConfig.variant || 'none');
    }
  }, [isOpen, currentConfig]);

  const isProviderDisconnected = currentProvider !== '' && !connectedProviders.includes(currentProvider);

  const providerOptions = useMemo(() => {
    const options = connectedProviders.map((p) => ({
      value: p,
      label: p,
    }));
    if (isProviderDisconnected && currentProvider) {
      options.unshift({
        value: currentProvider,
        label: `${currentProvider} (${t('importExport.disconnected', { defaultValue: 'disconnected' })})`,
      });
    }
    return options;
  }, [connectedProviders, isProviderDisconnected, currentProvider]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (provider === currentProvider) {
      setSelectedModelName(currentModelName);
    } else {
      const models = providerModels[provider] || [];
      setSelectedModelName(models[0] || '');
    }
  };

  const fullModelPath = selectedProvider && selectedModelName
    ? `${selectedProvider}/${selectedModelName}`
    : selectedModelName || '';

  // 处理保存
  const handleSave = async () => {
    if (!fullModelPath) return;
    try {
      const variantToSave = selectedVariant || 'none';
      localStorage.setItem(LAST_VARIANT_KEY, variantToSave);
      await onSave(fullModelPath, variantToSave);
      toast.success(t('modelSelector.updateSuccess', { name: agentName }));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('modelSelector.saveFailed'));
    }
  };

  const displayName = agentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const currentFullModel = currentConfig.model;

  const variantOptions = VARIANT_OPTIONS_KEYS.map((key) => ({
    value: key,
    label: t(`variantOptions.${key}`),
  }));

  const modelOptions = useMemo(() => {
    return (providerModels[selectedProvider] || []).map((model) => ({
      value: model,
      label: model,
      badge: (selectedProvider === currentProvider && model === currentModelName)
        ? t('modelSelector.current', { defaultValue: 'Current' })
        : undefined,
    }));
  }, [providerModels, selectedProvider, currentProvider, currentModelName, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('modelSelector.title', { name: displayName })}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t('modelSelector.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!fullModelPath}
          >
            {t('modelSelector.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {isProviderDisconnected && selectedProvider === currentProvider && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">
                Provider &ldquo;{currentProvider}&rdquo; {t('modelSelector.disconnected', { defaultValue: 'is disconnected' })}
              </p>
              <p className="text-amber-600 mt-0.5">
                {t('modelSelector.disconnectedHint', { defaultValue: 'Current model can still be used, but switching to a connected provider is recommended.' })}
              </p>
            </div>
          </div>
        )}

        <Select
          label="Provider"
          value={selectedProvider}
          onChange={handleProviderChange}
          options={providerOptions}
          placeholder={t('modelSelector.selectProvider', { defaultValue: 'Select Provider...' })}
        />

        <SearchableSelect
          label={t('modelSelector.selectModel')}
          value={selectedModelName}
          onChange={setSelectedModelName}
          options={modelOptions}
          placeholder={t('modelSelector.selectModel', { defaultValue: 'Select Model...' })}
          searchPlaceholder={t('modelSelector.searchPlaceholder')}
        />

        <Select
          label={t('modelSelector.intensityLevel')}
          value={selectedVariant || 'none'}
          onChange={(value) => setSelectedVariant(value as AgentConfig['variant'])}
          options={variantOptions}
        />

        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            {t('modelSelector.currentSelection')}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="text-slate-500 w-20">{t('modelSelector.provider')}:</span>
              <span className="font-medium text-slate-700">{selectedProvider || '-'}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-20">{t('modelSelector.model')}</span>
              <span className="font-mono text-slate-700 truncate">{fullModelPath || '-'}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-20">{t('modelSelector.intensity')}</span>
              <span className="font-medium text-slate-700">{selectedVariant || 'none'}</span>
            </div>
          </div>
          {fullModelPath !== currentFullModel && fullModelPath && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-400 mb-1">{t('modelSelector.changeDiff', { defaultValue: 'Change comparison' })}</div>
              <div className="text-xs font-mono space-y-0.5">
                <div className="text-rose-500 line-through">{currentFullModel}</div>
                <div className="text-emerald-600">{fullModelPath}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
