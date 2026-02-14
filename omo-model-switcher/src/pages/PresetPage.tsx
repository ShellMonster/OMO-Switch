import { useTranslation } from 'react-i18next';
import { Bookmark } from 'lucide-react';
import { PresetManager } from '../components/Presets';

export function PresetPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{t('presetPage.title')}</h2>
            <p className="text-slate-600 mt-1">{t('presetPage.description')}</p>
          </div>
        </div>
      </div>

      <PresetManager />
    </div>
  );
}
