import { useTranslation } from 'react-i18next';

export interface ConfigChange {
  path: string;
  change_type: string;
  old_value: unknown;
  new_value: unknown;
}

interface DiffViewProps {
  changes: ConfigChange[];
  maxDisplay?: number;
  isExpanded?: boolean;
}

export function DiffView({ changes, maxDisplay = 5, isExpanded = false }: DiffViewProps) {
  const { t } = useTranslation();

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'added':
        return t('configChange.added', { defaultValue: '新增' });
      case 'removed':
        return t('configChange.removed', { defaultValue: '删除' });
      case 'modified':
        return t('configChange.modified', { defaultValue: '修改' });
      default:
        return type;
    }
  };

  const getChangeTypeStyle = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-emerald-100 text-emerald-700';
      case 'removed':
        return 'bg-rose-100 text-rose-700';
      case 'modified':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const displayChanges = isExpanded ? changes : changes.slice(0, maxDisplay);
  const hasMore = changes.length > maxDisplay;
  const remainingCount = changes.length - maxDisplay;

  return (
    <div className="space-y-3">
      {displayChanges.map((change, index) => (
        <div
          key={`${change.path}-${index}`}
          className="bg-slate-50 rounded-lg p-3 border border-slate-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-slate-700 truncate flex-1">
              {change.path}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getChangeTypeStyle(
                change.change_type
              )}`}
            >
              {getChangeTypeLabel(change.change_type)}
            </span>
          </div>

          <div className="text-xs font-mono space-y-1">
            {change.change_type !== 'added' && (
              <div className="text-rose-500 line-through break-all">
                {formatValue(change.old_value)}
              </div>
            )}
            {change.change_type !== 'removed' && (
              <div className="text-emerald-600 break-all">
                {formatValue(change.new_value)}
              </div>
            )}
          </div>
        </div>
      ))}

      {!isExpanded && hasMore && (
        <div className="text-center text-sm text-slate-500 py-2">
          {t('configChange.moreChanges', { count: remainingCount, defaultValue: `还有 ${remainingCount} 项变更...` })}
        </div>
      )}
    </div>
  );
}
