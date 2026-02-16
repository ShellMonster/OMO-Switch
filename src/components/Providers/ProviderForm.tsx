import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Save, X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import type { ProviderPreset, ProviderConfig } from './ProviderList';

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

interface ProviderFormProps {
  preset: ProviderPreset;
  initialConfig?: ProviderConfig;
  onSave: (config: ProviderConfig) => void;
  onCancel: () => void;
}

export function ProviderForm({ preset, initialConfig, onSave, onCancel }: ProviderFormProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState(initialConfig?.api_key || '');
  const [baseUrl, setBaseUrl] = useState(initialConfig?.base_url || preset.base_url || '');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleSaveWithTest = async () => {
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    setIsTesting(true);
    setTestResult(null);
    
    try {
      if (preset.npm) {
        const result = await invoke<ConnectionTestResult>('test_provider_connection', {
          npm: preset.npm,
          baseUrl: baseUrl.trim() || null,
          apiKey: apiKey.trim(),
        });
        setTestResult(result);
        
        if (result.success) {
          const config: ProviderConfig = {
            preset_id: preset.id,
            api_key: apiKey.trim(),
            base_url: baseUrl.trim() || null,
            is_active: true,
          };
          await onSave(config);
        }
      } else {
        const config: ProviderConfig = {
          preset_id: preset.id,
          api_key: apiKey.trim(),
          base_url: baseUrl.trim() || null,
          is_active: true,
        };
        await onSave(config);
        setTestResult({ success: true, message: 'Config saved' });
      }
    } catch (err) {
      setTestResult({ success: false, message: String(err) });
    } finally {
      setIsSaving(false);
      setIsTesting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKey.trim() && !isSaving) {
      handleSaveWithTest();
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`${preset.name} ${t('provider.configuration')}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            {t('button.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveWithTest}
            isLoading={isSaving}
            disabled={!apiKey.trim()}
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('provider.testing')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('provider.saveAndTest')}
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('provider.apiKey')}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('provider.apiKeyPlaceholder')}
              className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t('provider.apiKeyHint', { website: preset.website_url || preset.name })}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('provider.baseUrl')}
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder={preset.base_url || t('provider.baseUrlPlaceholder')}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">
            {t('provider.baseUrlHint')}
          </p>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            testResult.success 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-rose-50 text-rose-700'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">
              {testResult.success ? t('provider.testSuccess') : t('provider.testFailed')}
            </span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          {t('provider.modelsAutoHint')}
        </p>
      </div>
    </Modal>
  );
}
