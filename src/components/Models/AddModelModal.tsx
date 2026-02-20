import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { cn } from '../common/cn';
import { addCustomModel } from '../../services/tauri';

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProviderId: string;
  onModelAdded: () => void;
  providerModels: Record<string, string[]>;
}

export function AddModelModal({
  isOpen,
  onClose,
  currentProviderId,
  onModelAdded,
  providerModels,
}: AddModelModalProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = useMemo(() => {
    const models: Array<{ modelId: string; providerName: string }> = [];

    Object.entries(providerModels).forEach(([providerName, modelList]) => {
      if (providerName.toLowerCase() === currentProviderId.toLowerCase()) {
        return;
      }

      modelList.forEach((modelId) => {
        models.push({
          modelId,
          providerName,
        });
      });
    });

    return models;
  }, [providerModels, currentProviderId]);

  const handleAddModel = async (modelId: string) => {
    try {
      setIsAdding(true);
      setError(null);

      await addCustomModel(currentProviderId, modelId);

      onModelAdded();

      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('customModel.addModelError')
      );
    } finally {
      setIsAdding(false);
    }
  };

  const getProviderColor = (provider: string): string => {
    const colors: Record<string, string> = {
      openai: 'bg-emerald-500',
      anthropic: 'bg-orange-500',
      google: 'bg-blue-500',
      groq: 'bg-pink-500',
      together: 'bg-purple-500',
      cohere: 'bg-teal-500',
      mistral: 'bg-indigo-500',
      aicodewith: 'bg-rose-500',
      'kimi-for-coding': 'bg-amber-500',
    };

    return colors[provider.toLowerCase()] || 'bg-slate-500';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('customModel.addModel')}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {t('customModel.selectModelToAdd')}
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="text-sm text-rose-600">{error}</span>
          </div>
        )}

        {availableModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">
              {t('customModel.noModelsAvailable')}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {availableModels.map(({ modelId, providerName }) => (
              <button
                key={`${providerName}-${modelId}`}
                onClick={() => handleAddModel(modelId)}
                disabled={isAdding}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  'hover:border-emerald-300 hover:bg-emerald-50/50',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                  isAdding && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    getProviderColor(providerName)
                  )}
                />

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700 truncate block">
                    {modelId}
                  </span>
                  <span className="text-xs text-slate-500">
                    {providerName}
                  </span>
                </div>

                <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={isAdding}>
            {t('button.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AddModelModal;
