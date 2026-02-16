import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { X, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';
import type { ProviderInfo } from './ProviderList';

interface ApiKeyModalProps {
  provider: ProviderInfo;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApiKeyModal({ provider, onClose, onSuccess }: ApiKeyModalProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error(t('provider.apiKeyRequired'));
      return;
    }

    setIsTesting(true);
    setTestStatus('idle');
    try {
      await invoke('test_provider_connection', {
        npm: provider.npm,
        baseUrl: null,
        apiKey: apiKey.trim(),
      });
      setTestStatus('success');
      toast.success(t('provider.testSuccess'));
    } catch (err) {
      setTestStatus('error');
      toast.error(t('provider.testFailed'));
      console.error('Connection test failed:', err);
    } finally {
      setIsTesting(false);
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('provider.apiKey')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestStatus('idle');
              }}
              placeholder={t('provider.apiKeyPlaceholder')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                       transition-all duration-200"
            />
            {provider.website_url && (
              <p className="mt-2 text-xs text-slate-500">
                {t('provider.apiKeyHint', { website: provider.name })}
              </p>
            )}
          </div>

          {testStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4" />
              {t('provider.testSuccess')}
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {t('provider.testFailed')}
            </div>
          )}
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
            variant="secondary"
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            className="flex-1"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('provider.testing')}
              </>
            ) : (
              t('provider.testConnection')
            )}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || !apiKey.trim()}
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
