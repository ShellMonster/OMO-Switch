import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { ImportExportPanel } from '../components/ImportExport/ImportExportPanel';

export function ImportExportPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
          <Download className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('importExportPage.title')}</h2>
          <p className="text-slate-600 mt-1">{t('importExportPage.description')}</p>
        </div>
      </div>

      <ImportExportPanel />
    </div>
  );
}
