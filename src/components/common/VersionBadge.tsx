import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpCircle, Github, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdaterStore } from '../../store/updaterStore';
import { isTauriEnvironment } from '../../utils/tauri';
import { cn } from './cn';

/**
 * 版本徽章组件
 * 
 * 功能：
 * - 显示当前应用版本号
 * - 点击版本号检查更新
 * - 显示更新状态（检查中、有更新、下载中、下载完成）
 * - GitHub 图标可点击跳转到仓库
 * 
 * 定位：固定在右下角 (fixed right-4 bottom-4)
 */
export function VersionBadge() {
  const { t } = useTranslation();
  
  // 版本号状态
  const [version, setVersion] = useState<string>('');
  
  // 手动提示状态（点击后显示的临时提示）
  const [manualHint, setManualHint] = useState<'checking' | 'latest' | 'error' | 'available' | 'not-tauri' | null>(null);
  
  // 提示定时器引用
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 从 updaterStore 获取状态和方法
  const status = useUpdaterStore((s) => s.status);
  const update = useUpdaterStore((s) => s.update);
  const progress = useUpdaterStore((s) => s.progress);
  const openUpdater = useUpdaterStore((s) => s.open);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);

  /**
   * 组件挂载时加载版本号
   * 使用 @tauri-apps/api/app 的 getVersion 获取
   */
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        // 检测是否在 Tauri 环境中运行
        if (isTauriEnvironment()) {
          const { getVersion } = await import('@tauri-apps/api/app');
          const v = await getVersion();
          if (!canceled) setVersion(v);
          return;
        }
      } catch {
        // 忽略错误
      }
      // 非 Tauri 环境显示 dev 或空字符串
      if (!canceled) setVersion(import.meta.env.DEV ? 'dev' : '');
    };

    load();
    return () => {
      canceled = true;
    };
  }, []);

  /**
   * 组件卸载时清理定时器
   */
  useEffect(() => {
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    };
  }, []);

  // 计算更新相关状态
  const hasUpdate = status === 'available' && Boolean(update);
  const isDownloading = status === 'downloading';
  const isDownloaded = status === 'downloaded';
  const isInstalling = status === 'installing';
  const isBusy = isDownloading || isDownloaded || isInstalling;

  /**
   * 计算下载进度百分比
   */
  const percent = useMemo(() => {
    const total = progress?.total || 0;
    const downloaded = progress?.downloaded || 0;
    if (total <= 0) return isDownloaded ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)));
  }, [progress?.downloaded, progress?.total, isDownloaded]);

  /**
   * 按钮悬停提示文本
   */
  const title = useMemo(() => {
    if (isDownloading) return t('versionBadge.downloading', { percent });
    if (isInstalling) return t('versionBadge.installing');
    if (isDownloaded) return t('versionBadge.downloaded');
    if (hasUpdate) return t('versionBadge.available', { version: update?.version || '' });
    return t('versionBadge.check');
  }, [hasUpdate, isDownloaded, isDownloading, isInstalling, percent, t, update?.version]);

  /**
   * 手动提示文本
   */
  const hintText = useMemo(() => {
    switch (manualHint) {
      case 'checking':
        return t('versionBadge.checking');
      case 'latest':
        return t('versionBadge.latest');
      case 'error':
        return t('versionBadge.error');
      case 'available':
        return t('versionBadge.availableShort');
      case 'not-tauri':
        return t('versionBadge.desktopOnly');
      default:
        return '';
    }
  }, [manualHint, t]);

  /**
   * 设置带自动清除的提示
   */
  const setHintWithAutoClear = (next: typeof manualHint, durationMs = 2000) => {
    setManualHint(next);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    if (durationMs > 0) {
      hintTimerRef.current = setTimeout(() => {
        setManualHint(null);
        hintTimerRef.current = null;
      }, durationMs);
    }
  };

  /**
   * 点击版本徽章处理函数
   * - 如果有更新或正在处理，打开更新弹窗
   * - 否则执行检查更新
   */
  const handleClick = async () => {
    // 如果有更新或正在下载/安装，打开更新弹窗
    if (hasUpdate || isBusy) {
      openUpdater();
      return;
    }
    
    // 正在检查中，跳过
    if (manualHint === 'checking' || status === 'checking') return;

    // 检测是否在 Tauri 环境中
    const isTauri = isTauriEnvironment();
    if (!isTauri) {
      setHintWithAutoClear('not-tauri', 2000);
      return;
    }

    // 开始检查更新
    setHintWithAutoClear('checking', 0);
    try {
      await checkForUpdates({ silent: true, openIfAvailable: false });
    } catch {
      // 忽略错误
    }

    // 检查更新后的状态（兜底：等待 store 从 checking 进入终态）
    let latest = useUpdaterStore.getState();
    if (latest.status === 'checking') {
      await new Promise((resolve) => setTimeout(resolve, 150));
      latest = useUpdaterStore.getState();
    }
    if (latest.status === 'available' && latest.update) {
      setHintWithAutoClear('available', 2500);
      openUpdater();
      return;
    }
    if (latest.status === 'error') {
      setHintWithAutoClear('error', 2500);
      return;
    }
    setHintWithAutoClear('latest', 2000);
  };

  // 从环境变量获取 GitHub 仓库地址
  const repoUrl = import.meta.env.VITE_GITHUB_REPO_URL || '';

  /**
   * 打开 GitHub 仓库
   * 使用 @tauri-apps/plugin-opener 的 openUrl
   */
  const handleOpenRepo = async () => {
    if (!repoUrl) return;
    try {
      if (isTauriEnvironment()) {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(repoUrl);
        return;
      }
      // 非 Tauri 环境使用浏览器打开
      window.open(repoUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Open repo failed:', err);
    }
  };

  /**
   * 显示的文本内容
   */
  const displayText = useMemo(() => {
    if (isDownloading) return t('versionBadge.updateProgress', { percent });
    if (isInstalling) return t('versionBadge.installingShort');
    if (isDownloaded) return t('versionBadge.pendingInstall');
    if (manualHint) return hintText;
    return t('versionBadge.version', { version: version || '—' });
  }, [hintText, isDownloaded, isDownloading, isInstalling, manualHint, percent, t, version]);

  // 是否显示加载动画
  const showSpinner = manualHint === 'checking' || isDownloading || isInstalling;
  // 是否显示更新图标
  const showUpdateIcon = !showSpinner && (hasUpdate || isDownloaded);
  // 按钮提示文本
  const buttonTitle = manualHint && !isBusy ? hintText : title;

  return (
    <div
      className="fixed right-4 bottom-4 z-[55] inline-flex items-center gap-2"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* GitHub 图标按钮 */}
      <button
        type="button"
        onClick={handleOpenRepo}
        title={repoUrl || t('versionBadge.repoMissing')}
        className={cn(
          'inline-flex items-center justify-center p-2 rounded-xl',
          'bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm',
          'text-slate-500 hover:text-slate-700 hover:bg-white transition-colors'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Github className="w-4 h-4" />
      </button>

      {/* 版本徽章按钮 */}
      <button
        type="button"
        onClick={handleClick}
        title={buttonTitle}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl',
          'bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm',
          'text-xs text-slate-500 hover:text-slate-700 hover:bg-white transition-colors'
        )}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {showSpinner ? (
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        ) : (
          showUpdateIcon && <ArrowUpCircle className="w-4 h-4 text-blue-600" />
        )}
        <span className="font-mono font-bold">
          {displayText}
        </span>
      </button>
    </div>
  );
}
