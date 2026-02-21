import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { ProviderList, type ProviderInfo } from '../components/Providers/ProviderList';
import { ProviderStatus } from '../components/Models/ProviderStatus';
import { ApiKeyModal } from '../components/Providers/ApiKeyModal';
import { CustomProviderModal } from '../components/Providers/CustomProviderModal';
import { KeyRound, Wifi, Settings, RefreshCw } from 'lucide-react';
import { cn } from '../components/common/cn';
import { ProviderStatusSkeleton } from '../components/common/Skeleton';

type TabType = 'status' | 'config';

export function ProviderPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<ProviderInfo | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ProviderInfo | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const providerList = await invoke<ProviderInfo[]>('get_provider_status');
      setProviders(providerList);
    } catch (err) {
      toast.error(t('provider.loadFailed'));
      console.error('Failed to load provider data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = (provider: ProviderInfo) => {
    setSelectedProvider(provider);
  };

  const handleEdit = (provider: ProviderInfo) => {
    setSelectedProvider(provider);
  };

  const handleDelete = (provider: ProviderInfo) => {
    setDeleteConfirm(provider);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await invoke('delete_provider_auth', { providerId: deleteConfirm.id });
      toast.success(t('provider.deleteSuccess'));
      loadData();
    } catch (err) {
      toast.error(t('provider.deleteFailed'));
      console.error('Failed to delete provider auth:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleAddCustom = () => {
    setShowCustomModal(true);
  };

  const handleSuccess = () => {
    loadData();
  };

  const configuredProviders = providers.filter(p => p.is_configured);
  const unconfiguredProviders = providers.filter(p => !p.is_configured && p.is_builtin);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面头部骨架 */}
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100/50 animate-pulse">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-slate-200 rounded w-48" />
            <div className="h-4 bg-slate-200 rounded w-64" />
          </div>
        </div>

        {/* Tab 骨架 */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit animate-pulse">
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
        </div>

        {/* 内容区骨架 */}
        {activeTab === 'status' ? (
          <ProviderStatusSkeleton />
        ) : (
          <div className="space-y-4 animate-pulse">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-800">{t('provider.title')}</h2>
          <p className="text-slate-600 mt-1">{t('provider.description')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('status')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'status'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          )}
        >
          <Wifi className="w-4 h-4" />
          {t('provider.tabs.status')}
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === 'config'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
          )}
        >
          <Settings className="w-4 h-4" />
          {t('provider.tabs.config')}
        </button>
      </div>

      {activeTab === 'status' ? (
        <ProviderStatus />
      ) : (
        <ProviderList
          configuredProviders={configuredProviders}
          unconfiguredProviders={unconfiguredProviders}
          onConfigure={handleConfigure}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddCustom={handleAddCustom}
        />
      )}

      {selectedProvider && (
        <ApiKeyModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onSuccess={handleSuccess}
        />
      )}

      {showCustomModal && (
        <CustomProviderModal
          onClose={() => setShowCustomModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={t('provider.confirmDelete')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('button.delete')}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-slate-700">
            {deleteConfirm && t('provider.confirmDeleteMessage', { name: deleteConfirm.name })}
          </p>
          <p className="text-sm text-slate-500">
            {t('provider.confirmDeleteHint')}
          </p>
        </div>
      </Modal>
    </div>
  );
}
