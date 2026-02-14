import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileJson, Clock, HardDrive, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  exportOmoConfig,
  importOmoConfig,
  validateImport,
  getImportExportHistory,
  BackupInfo,
  OmoConfig,
} from '../../services/tauri';
import { open, save } from '@tauri-apps/plugin-dialog';

export function ImportExportPanel() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [previewModal, setPreviewModal] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<OmoConfig | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getImportExportHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const filePath = await save({
        defaultPath: 'oh-my-opencode.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) {
        setLoading(false);
        return;
      }

      await exportOmoConfig(filePath);
      setSuccess(t('importExport.exportSuccess', { path: filePath }));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!selected || typeof selected !== 'string') {
        setLoading(false);
        return;
      }

      const config = await validateImport(selected);
      setPreviewConfig(config);
      setImportPath(selected);
      setPreviewModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPath) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setPreviewModal(false);

      await importOmoConfig(importPath);
      setSuccess(t('importExport.importSuccess'));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setImportPath(null);
      setPreviewConfig(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{t('common.error')}</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">{t('common.success')}</p>
            <p className="text-sm text-emerald-600 mt-1">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('importExport.import')}</h3>
              <p className="text-sm text-slate-500">{t('importExport.importDescription')}</p>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleImportClick}
            disabled={loading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? t('importExport.processing') : t('importExport.selectFileImport')}
          </Button>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('importExport.export')}</h3>
              <p className="text-sm text-slate-500">{t('importExport.exportDescription')}</p>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleExport}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? t('importExport.exporting') : t('importExport.export')}
          </Button>
        </div>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
              <h3 className="font-semibold text-slate-800">{t('importExport.backupHistory')}</h3>
              <p className="text-sm text-slate-500">{t('importExport.viewBackups')}</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileJson className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('importExport.noHistory')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((backup) => (
              <div
                key={backup.path}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FileJson className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {backup.filename}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {backup.created_at}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(backup.size)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={previewModal}
        onClose={() => {
          setPreviewModal(false);
          setPreviewConfig(null);
          setImportPath(null);
        }}
        title={t('importExport.preview')}
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('importExport.previewHint')}
            </p>
          </div>

          {previewConfig && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">{t('importExport.agentsConfig')}</p>
                <p className="text-xs text-slate-600">
                  {Object.keys(previewConfig.agents || {}).length} agents
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">{t('importExport.categoriesConfig')}</p>
                <p className="text-xs text-slate-600">
                  {Object.keys(previewConfig.categories || {}).length} categories
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setPreviewModal(false);
                setPreviewConfig(null);
                setImportPath(null);
              }}
            >
              {t('importExport.cancel')}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirmImport}
              disabled={loading}
            >
              {loading ? t('importExport.importing') : t('importExport.confirmImport')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
