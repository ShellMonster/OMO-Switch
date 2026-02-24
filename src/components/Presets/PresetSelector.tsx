import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { toast } from '../common/Toast';
import { loadPreset, savePreset, saveConfigSnapshot } from '../../services/tauri';
import { usePresetStore } from '../../store/presetStore';

interface PresetSelectorProps {
  onLoadPreset?: () => void;
  compact?: boolean;
}

export function PresetSelector({ onLoadPreset, compact }: PresetSelectorProps) {
  const { t } = useTranslation();

  const {
    activePreset,
    setActivePreset,
    presetList,
    refreshPresetList,
  } = usePresetStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Compact mode dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    void refreshPresetList(true);
  }, [refreshPresetList]);

  const handleSelectChange = async (value: string) => {
    setIsLoading(true);
    try {
      await loadPreset(value);
      await saveConfigSnapshot();
      setActivePreset(value);
      toast.success(
        t('presetSelector.switchSuccess', {
          name: value === 'default' ? t('presetSelector.default') : value,
        })
      );
      onLoadPreset?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetSelector.switchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAs = async () => {
    if (!newPresetName.trim()) {
      return;
    }

    const name = newPresetName.trim();
    setIsSaving(true);

    try {
      await savePreset(name);
      setActivePreset(name);
      await refreshPresetList(true);
      setShowSaveModal(false);
      setNewPresetName('');
      toast.success(t('presetSelector.saveSuccess', { name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('presetSelector.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const selectOptions = [
    { value: 'default', label: t('presetSelector.default') },
    ...presetList.filter((name: string) => name !== 'default').map((name: string) => ({ value: name, label: name })),
  ];

  const currentValue = activePreset ?? 'default';

  // Compact mode with glassmorphism
  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/50 backdrop-blur-sm hover:bg-white/70 rounded-lg text-sm border border-slate-200/50 transition-colors disabled:opacity-50"
        >
          <span className="text-slate-500">{t('presetSelector.label') || '预设:'}</span>
          <span className="font-medium text-slate-700">{activePreset || t('presetSelector.default')}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/50 z-50 py-2">
            {selectOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  handleSelectChange(option.value);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  currentValue === option.value
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <Modal
          isOpen={showSaveModal}
          onClose={() => {
            setShowSaveModal(false);
            setNewPresetName('');
          }}
          title={t('presetSelector.saveAs')}
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowSaveModal(false);
                  setNewPresetName('');
                }}
                disabled={isSaving}
              >
                {t('button.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAs}
                isLoading={isSaving}
                disabled={!newPresetName.trim()}
              >
                {t('button.save')}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPresetName.trim() && !isSaving) {
                    handleSaveAs();
                  }
                }}
              />
            </div>
            <p className="text-sm text-slate-500">
              {t('presetManager.saveDescription')}
            </p>
          </div>
        </Modal>
      </div>
    );
  }

  // Normal mode
  return (
    <>
      <Select
        value={currentValue}
        onChange={handleSelectChange}
        options={selectOptions}
        disabled={isLoading}
        placeholder={t('select.placeholder')}
      />

      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setNewPresetName('');
        }}
        title={t('presetSelector.saveAs')}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSaveModal(false);
                setNewPresetName('');
              }}
              disabled={isSaving}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAs}
              isLoading={isSaving}
              disabled={!newPresetName.trim()}
            >
              {t('button.save')}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPresetName.trim() && !isSaving) {
                  handleSaveAs();
                }
              }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {t('presetManager.saveDescription')}
          </p>
        </div>
      </Modal>
    </>
  );
}
