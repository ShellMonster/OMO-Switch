import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';
import { DiffView, ConfigChange } from './DiffView';

interface ConfigChangeAlertProps {
  changes: ConfigChange[];
  onRestore: () => void;
  onRestoreFromPreset: () => void;
  onAccept: () => Promise<void>;
  onClose: () => void;
}

export function ConfigChangeAlert({
  changes,
  onRestore,
  onRestoreFromPreset,
  onAccept,
  onClose,
}: ConfigChangeAlertProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRestore = async () => {
    setIsProcessing(true);
    try {
      await onRestore();
      toast.success(t('configChange.restoreSuccess', { defaultValue: '已从缓存恢复配置' }));
      onClose();
    } catch {
      toast.error(t('configChange.restoreFailed', { defaultValue: '恢复配置失败' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromPreset = async () => {
    setIsProcessing(true);
    try {
      await onRestoreFromPreset();
      toast.success(t('configChange.restoreFromPresetSuccess', { defaultValue: '已从预设恢复配置' }));
      onClose();
    } catch {
      toast.error(t('configChange.restoreFromPresetFailed', { defaultValue: '从预设恢复失败' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept();
      toast.success(t('configChange.accepted', { defaultValue: '已接受外部变更' }));
      onClose();
    } catch {
      toast.error(t('configChange.acceptFailed', { defaultValue: '接受外部变更失败' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const getSummaryText = (change: ConfigChange) => {
    const pathParts = change.path.split('.');
    const displayPath = pathParts.slice(-2).join('.');

    switch (change.change_type) {
      case 'added':
        return t('configChange.summaryAdded', {
          path: displayPath,
          defaultValue: `新增 ${displayPath}`,
        });
      case 'removed':
        return t('configChange.summaryRemoved', {
          path: displayPath,
          defaultValue: `删除 ${displayPath}`,
        });
      case 'modified':
        return t('configChange.summaryModified', {
          path: displayPath,
          oldValue: String(change.old_value).split('/').pop() || change.old_value,
          newValue: String(change.new_value).split('/').pop() || change.new_value,
          defaultValue: `${displayPath}: ${change.old_value} → ${change.new_value}`,
        });
      default:
        return change.path;
    }
  };

  const summaryChanges = changes.slice(0, 5);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('configChange.title', { defaultValue: '配置文件已被外部修改' })}
      size="lg"
      showCloseButton={true}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDetails}
            disabled={isProcessing}
          >
            {showDetails
              ? t('configChange.hideDetails', { defaultValue: '隐藏详情' })
              : t('configChange.viewDetails', { defaultValue: '查看详情' })}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRestore}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            {t('configChange.restoreFromCache', { defaultValue: '从缓存恢复' })}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRestoreFromPreset}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            {t('configChange.restoreFromPreset', { defaultValue: '从预设恢复' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAccept}
            disabled={isProcessing}
          >
            {t('configChange.accept', { defaultValue: '接受外部变更' })}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-700 mb-2">
              {t('configChange.description', {
                count: changes.length,
                defaultValue: `检测到 ${changes.length} 处配置变更：`,
              })}
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              {summaryChanges.map((change, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="truncate">{getSummaryText(change)}</span>
                </li>
              ))}
              {changes.length > 5 && !showDetails && (
                <li className="text-slate-400 text-xs pl-3.5">
                  {t('configChange.moreItems', {
                    count: changes.length - 5,
                    defaultValue: `还有 ${changes.length - 5} 项变更...`,
                  })}
                </li>
              )}
            </ul>
          </div>
        </div>

        {showDetails && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              {t('configChange.details', { defaultValue: '变更详情' })}
            </h4>
            <DiffView changes={changes} isExpanded={true} />
          </div>
        )}
      </div>
    </Modal>
  );
}

export type { ConfigChange };
export { DiffView };
