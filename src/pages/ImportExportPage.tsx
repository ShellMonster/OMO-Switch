import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';

const ImportExportPanel = lazy(() =>
  import('../components/ImportExport/ImportExportPanel').then((m) => ({
    default: m.ImportExportPanel,
  }))
);

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

      <Suspense
        fallback={
          <div className="p-6 bg-white rounded-2xl border border-slate-200">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-64 bg-slate-100 rounded" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          </div>
        }
      >
        <ImportExportPanel />
      </Suspense>
    </div>
  );
}
