import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { X, Key, Loader2, Globe, Boxes, ChevronDown } from 'lucide-react';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';
import type { ProviderInfo } from './ProviderList';

interface ApiKeyModalProps {
  provider: ProviderInfo;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProviderConfigSnapshot {
  api_key: string | null;
  base_url: string | null;
  provider_type: string | null;
  default_provider_type: string;
}

const PROVIDER_TYPE_OPTIONS = [
  { value: '@ai-sdk/openai', labelKey: 'provider.typeOptions.openai' },
  { value: '@ai-sdk/openai-compatible', labelKey: 'provider.typeOptions.openaiCompatible' },
  { value: '@ai-sdk/anthropic', labelKey: 'provider.typeOptions.anthropic' },
  { value: '@openrouter/ai-sdk-provider', labelKey: 'provider.typeOptions.openrouter' },
  { value: '@ai-sdk/groq', labelKey: 'provider.typeOptions.groq' },
] as const;

export function ApiKeyModal({ provider, onClose, onSuccess }: ApiKeyModalProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [providerType, setProviderType] = useState(provider.npm ?? '@ai-sdk/openai');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProviderConfig = async () => {
      setIsFetchingConfig(true);
      try {
        const config = await invoke<ProviderConfigSnapshot>('get_provider_config', {
          providerId: provider.id,
        });
        if (cancelled) return;
        setApiKey(config.api_key ?? '');
        setBaseUrl(config.base_url ?? '');
        setProviderType(config.provider_type ?? config.default_provider_type);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load provider config:', err);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingConfig(false);
        }
      }
    };

    void loadProviderConfig();

    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error(t('provider.apiKeyRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await invoke('set_provider_api_key', {
        providerId: provider.id,
        apiKey: apiKey.trim(),
        baseUrl: provider.supports_base_url ? (baseUrl.trim() || null) : null,
        providerType,
      });
      toast.success(t('provider.saveSuccess'));
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(t('provider.saveFailed'));
      console.error('Failed to save API key:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {t('provider.setApiKey')}
              </h3>
              <p className="text-sm text-slate-500">
                {t('provider.setApiKeyDesc', { name: provider.name })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {provider.supports_base_url && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                {t('provider.baseUrl')}
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                }}
                placeholder={t('provider.baseUrlPlaceholder')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                         transition-all duration-200"
                disabled={isFetchingConfig}
              />
              <p className="mt-2 text-xs text-slate-500">
                {provider.id === 'openai'
                  ? t('provider.openaiBaseUrlHint')
                  : t('provider.compatibleBaseUrlHint')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Boxes className="w-4 h-4 inline mr-1" />
              {t('provider.type')}
            </label>
            <div className="relative">
              <select
                value={providerType}
                onChange={(e) => {
                  setProviderType(e.target.value);
                }}
                className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl
                         text-slate-700 appearance-none cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                         transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isFetchingConfig}
              >
                {PROVIDER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('provider.apiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
              }}
              placeholder={t('provider.apiKeyPlaceholder')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                       transition-all duration-200"
              disabled={isFetchingConfig}
            />
            {provider.website_url && (
              <p className="mt-2 text-xs text-slate-500">
                {t('provider.apiKeyHint', { website: provider.name })}
              </p>
            )}
          </div>

        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {t('button.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || isFetchingConfig || !apiKey.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('button.save')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
