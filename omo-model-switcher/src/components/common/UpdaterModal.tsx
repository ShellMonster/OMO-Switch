import { useEffect, useMemo, useRef } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from './cn';
import { useUpdaterStore } from '../../store/updaterStore';
import i18n from '../../i18n';

/**
 * 格式化字节数为人类可读的字符串
 * @param bytes - 字节数
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * 更新弹窗组件
 *
 * 功能：
 * - 显示新版本信息（版本号、发布日期、更新说明）
 * - 显示下载进度条（百分比和字节数）
 * - 根据状态显示不同的操作按钮
 * - 生产环境启动时自动检查更新（延迟1.5秒）
 *
 * 使用方式：
 * 该组件会自动在 App.tsx 中渲染，无需手动调用。
 * 它会在生产环境启动时自动检查更新，并在有可用更新时自动打开弹窗。
 */
export function UpdaterModal() {
  const { t } = useTranslation();
  const { isOpen, status, update, progress, error, close, checkForUpdates, downloadUpdate, installUpdate } =
    useUpdaterStore();

  // 防止重复检查更新的引用
  const autoCheckedRef = useRef(false);

  /**
   * 自动检查更新效果
   * - 只在生产环境（PROD）自动检查
   * - 避免开发时 StrictMode 重复触发
   * - 只在 Tauri 桌面端环境中执行
   * - 延迟1.5秒后执行，避免启动时阻塞
   */
  useEffect(() => {
    if (autoCheckedRef.current) return;
    autoCheckedRef.current = true;

    // 只在桌面端生产环境自动检查，避免开发时 StrictMode 重复触发和打扰
    if (!import.meta.env.PROD) return;
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    const t = window.setTimeout(() => {
      checkForUpdates({ silent: true, openIfAvailable: true }).catch(() => {});
    }, 1500);

    return () => window.clearTimeout(t);
  }, [checkForUpdates]);

  /**
   * 计算下载进度百分比
   */
  const percent = useMemo(() => {
    const total = progress?.total || 0;
    const downloaded = progress?.downloaded || 0;
    if (total <= 0) return status === 'downloaded' ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)));
  }, [progress?.downloaded, progress?.total, status]);

  // 是否正在下载中
  const isDownloading = status === 'downloading';
  // 是否可以关闭弹窗（安装中不能关闭）
  const canClose = status !== 'installing';
  // 关闭按钮文字
  const dismissLabel = isDownloading ? t('updater.dismiss.background') : t('updater.dismiss.later');

  /**
   * 根据状态获取弹窗标题
   */
  const title = (() => {
    if (status === 'checking') return t('updater.title.checking');
    if (status === 'downloading') return t('updater.title.downloading');
    if (status === 'downloaded') return t('updater.title.downloaded');
    if (status === 'installing') return t('updater.title.installing');
    if (status === 'installed') return t('updater.title.installed');
    if (status === 'error') return t('updater.title.error');
    return t('updater.title.available');
  })();

  /**
   * 获取更新说明内容
   */
  const body = (() => {
    if (!update) return '';
    const notes = String(update.body || '').trim();
    return notes;
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!canClose) return;
        close();
      }}
      title={title}
      size="lg"
    >
      <div className="space-y-5">
        {/* 版本信息卡片 */}
        {update && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-500">{t('updater.newVersion')}</div>
                <div className="text-xl font-black text-slate-900 tracking-tight truncate">
                  v{update.version}
                </div>
              </div>
              {update.date ? (
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(update.date).toLocaleString(i18n.language, { hour12: false })}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 下载进度条 */}
        {status === 'downloading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t('updater.progress')}</span>
              <span className="font-mono tabular-nums">
                {percent}% {progress?.total ? `(${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)})` : ''}
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">
              {t('updater.downloadHint')}
            </div>
          </div>
        )}

        {/* 下载完成提示 */}
        {status === 'downloaded' && (
          <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
            {t('updater.downloadedHint')}
          </div>
        )}

        {/* 安装中状态 */}
        {status === 'installing' && (
          <div className="flex items-center gap-2 text-sm text-indigo-600 font-bold">
            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            {t('updater.installingHint')}
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
            {error || t('updater.errorFallback')}
            <div className="text-xs text-red-500 mt-1">
              {t('updater.errorExtra')}
            </div>
          </div>
        )}

        {/* 更新说明 */}
        {body && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
            {body}
          </div>
        )}

        {/* 操作按钮区 */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => close()}
            disabled={!canClose}
            className={cn(!canClose && 'opacity-50')}
          >
            {dismissLabel}
          </Button>

          {/* 可用更新时显示下载按钮 */}
          {status === 'available' && (
            <Button type="button" onClick={() => downloadUpdate()}>
              <Download className="w-4 h-4 mr-2" />
              {t('updater.actions.download')}
            </Button>
          )}

          {/* 下载完成时显示安装按钮 */}
          {status === 'downloaded' && (
            <Button type="button" onClick={() => installUpdate()}>
              <Download className="w-4 h-4 mr-2" />
              {t('updater.actions.install')}
            </Button>
          )}

          {/* 空闲或错误状态时显示重试按钮 */}
          {(status === 'idle' || status === 'error') && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => checkForUpdates({ silent: false, openIfAvailable: true })}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('updater.actions.retry')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
