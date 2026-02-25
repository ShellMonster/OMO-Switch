import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getVersion, getName } from '@tauri-apps/api/app';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import {
  Globe,
  FileText,
  Folder,
  Package,
  MonitorSmartphone,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Copy,
  RefreshCw
} from 'lucide-react';
import { cn } from '../components/common/cn';
import { toast } from '../components/common/Toast';
import { supportedLanguages } from '../i18n';
import { usePreloadStore } from '../store/preloadStore';
import { useUpdaterStore } from '../store/updaterStore';
import appLogo from '../assets/logo.png';

/**
 * 设置页面组件
 * 
 * 包含功能：
 * - 语言切换器（5种语言）
 * - 关于应用信息（版本、配置路径、缓存目录）
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  
  // configPath 和 cacheDir 每次挂载都重新获取，不使用缓存
  const [configPath, setConfigPath] = useState<string>('');
  const [isLoadingPath, setIsLoadingPath] = useState(true);
  const [cacheDir, setCacheDir] = useState<string>('');
  const [isLoadingCacheDir, setIsLoadingCacheDir] = useState(true);

  // 应用信息使用 useRef 缓存（运行期间不会变），但不是模块级变量
  const appInfoCache = useRef<{ version: string; name: string } | null>(null);
  const [appInfo, setAppInfo] = useState(() => {
    // 初始化时检查 ref 缓存
    if (appInfoCache.current) {
      return appInfoCache.current;
    }
    return { version: '', name: 'OMO Switch' };
  });


  // 从 updaterStore 获取更新相关状态和方法
  const updaterStatus = useUpdaterStore((s) => s.status);
  const update = useUpdaterStore((s) => s.update);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const openUpdater = useUpdaterStore((s) => s.open);
  const versionsData = usePreloadStore((s) => s.versions);
  const refreshVersions = usePreloadStore((s) => s.refreshVersions);
  const [isChecking, setIsChecking] = useState(false);
  const [updateHint, setUpdateHint] = useState<{ type: 'checking' | 'latest' | 'available' | 'error'; message: string } | null>(null);
  const isLoadingVersions = versionsData.loading;
  const versions = versionsData.data || [];

  // 获取应用信息，使用 useRef 缓存（运行期间不会变）
  useEffect(() => {
    if (appInfoCache.current) {
      setAppInfo(appInfoCache.current);
      return;
    }
    
    Promise.all([getVersion(), getName()])
      .then(([version, name]) => {
        appInfoCache.current = { version, name };
        setAppInfo({ version, name });
      })
      .catch(() => {
        setAppInfo({ version: '0.0.0', name: 'OMO Switch' });
      });
  }, []);

  // 页面进入时刷新版本信息（仅在数据为空时刷新）
  useEffect(() => {
    const { versions } = usePreloadStore.getState();
    if (!versions.data) {
      refreshVersions();
    }
  }, []);

  useEffect(() => {
    setIsLoadingPath(true);
    invoke<string>('get_config_path')
      .then(path => setConfigPath(path))
      .catch(() => setConfigPath(t('settings.configPathError')))
      .finally(() => setIsLoadingPath(false));
  }, [t]);

  useEffect(() => {
    setIsLoadingCacheDir(true);
    invoke<string>('get_omo_cache_dir').then(dir => {
      setCacheDir(dir);
    }).catch(() => setCacheDir('')).finally(() => setIsLoadingCacheDir(false));
  }, []);

  const handleRefreshVersions = () => {
    refreshVersions();
  };

  // 处理语言切换
  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    // i18n.ts 中已经监听了 languageChanged 事件并保存到 localStorage
  };

  // 从环境变量获取 GitHub 仓库地址
  const repoUrl = import.meta.env.VITE_GITHUB_REPO_URL || '';

  /**
   * 打开 GitHub 仓库页面
   */
  const handleOpenRepo = async () => {
    if (!repoUrl) return;
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(repoUrl);
    } catch (err) {
      console.error('Open repo failed:', err);
      window.open(repoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * 处理检查更新
   */
  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setUpdateHint({ type: 'checking', message: t('settings.update.checking') });

    try {
      await checkForUpdates({ silent: true, openIfAvailable: false });

      const state = useUpdaterStore.getState();
      if (state.status === 'available' && state.update) {
        setUpdateHint({
          type: 'available',
          message: t('settings.update.available', { version: state.update.version })
        });
      } else if (state.status === 'error') {
        setUpdateHint({
          type: 'error',
          message: state.error || t('settings.update.failed')
        });
      } else {
        setUpdateHint({
          type: 'latest',
          message: t('settings.update.latest')
        });
      }
    } catch {
      setUpdateHint({
        type: 'error',
        message: t('settings.update.failed')
      });
    } finally {
      setIsChecking(false);
      // 3秒后清除提示
      setTimeout(() => setUpdateHint(null), 3000);
    }
  };

  /**
   * 打开更新弹窗
   */
  const handleOpenUpdater = () => {
    openUpdater();
  };

  // 使用 useMemo 缓存样式计算，避免每次渲染重新计算
  const updateHintStyle = useMemo(() => {
    if (!updateHint) return '';
    switch (updateHint.type) {
      case 'checking':
        return 'text-blue-600';
      case 'latest':
        return 'text-emerald-600';
      case 'available':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return '';
    }
  }, [updateHint]);

  // 获取当前语言
  const currentLanguage = i18n.language;

  // 版本检测区域骨架屏组件
  const VersionSkeleton = () => (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="py-3 border-b border-slate-100 last:border-0 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 w-24 bg-slate-200 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 rounded"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
            <div className="h-4 w-28 bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 overflow-hidden bg-white">
          <img
            src={appLogo}
            alt={appInfo.name}
            className="w-10 h-10 object-contain"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{appInfo.name}</h2>
          <p className="text-slate-600 mt-1">{t('settingsPage.description')}</p>
        </div>
      </div>

      {/* 语言设置卡片 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('settings.language.title')}</h3>
              <p className="text-sm text-slate-500">{t('settings.language.description')}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            {t('settings.language.selectLabel')}
          </label>
          <div className="relative">
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={cn(
                'w-full px-4 py-3 bg-white border border-slate-300 rounded-xl',
                'text-slate-700 font-medium',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                'transition-all duration-200',
                'appearance-none cursor-pointer'
              )}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            {/* 下拉箭头 */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {t('settings.language.hint')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('versionCheck.title')}</h3>
              <p className="text-sm text-slate-500">{t('versionCheck.description')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isLoadingVersions && versions.length === 0 ? (
            <VersionSkeleton />
          ) : (
            versions.map((v) => {
              const checkFailed = v.installed && !v.latest_version;
              const canConfirmUpToDate = v.installed && !!v.current_version && !!v.latest_version && !v.has_update;
              return (
              <div key={v.name} className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800">{v.name}</span>
                  {!v.installed ? (
                    <span className="text-sm text-slate-400">{t('versionCheck.notInstalled')}</span>
                  ) : v.has_update ? (
                    <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      {t('versionCheck.updateAvailable')}
                    </span>
                  ) : checkFailed ? (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <AlertCircle className="w-4 h-4" />
                      {t('versionCheck.checkFailed')}
                    </span>
                  ) : canConfirmUpToDate ? (
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-sm text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('versionCheck.upToDate')}
                      </span>
                      {v.latest_version && (
                        <span className="text-xs text-slate-400 mt-0.5 font-mono">
                          v{v.latest_version}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </div>

                {v.installed && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      {t('versionCheck.currentVersion')}:
                      <span className="font-mono text-slate-700 ml-1">{v.current_version || '-'}</span>
                    </span>
                    {v.latest_version && (
                      <span className="text-slate-500">
                        {t('versionCheck.latestVersion')}:
                        <span className="font-mono text-slate-700 ml-1">{v.latest_version}</span>
                      </span>
                    )}
                  </div>
                )}

                {v.installed && v.has_update && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-sm text-amber-800 mb-2">{v.update_hint}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-amber-100 px-3 py-2 rounded text-amber-900">
                        {v.update_command}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(v.update_command);
                          toast.success(t('versionCheck.copied'));
                        }}
                        className="p-2 text-amber-700 hover:bg-amber-200 rounded transition-colors flex-shrink-0"
                        title={t('versionCheck.copied')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}

            {versions.length > 0 && (
              <button
                onClick={handleRefreshVersions}
                disabled={isLoadingVersions}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingVersions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isLoadingVersions ? t('versionCheck.checking') : t('versionCheck.checkUpdate')}
             </button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <img 
              src={appLogo} 
              alt="App Logo"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <div>
              <h3 className="font-semibold text-slate-800">{t('settings.about.title')}</h3>
              <p className="text-sm text-slate-500">{t('settings.about.description')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* 应用名称和版本 */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">{t('settings.about.appName')}</p>
                <p className="text-sm text-slate-500">{appInfo.name}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-600">
              {t('settings.about.version')}: {appInfo.version}
            </span>
          </div>

          {/* 配置文件路径 */}
          <div className="flex items-start gap-3 py-3 border-b border-slate-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 mb-1">{t('settings.about.configPath')}</p>
              {isLoadingPath ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg",
                    configPath && "cursor-pointer hover:bg-slate-200 transition-colors"
                  )}
                  onClick={() => {
                    if (configPath) {
                      revealItemInDir(configPath).catch(() => {});
                    }
                  }}
                  title={configPath ? "点击在文件管理器中打开" : undefined}
                >
                  <code className="text-sm text-slate-600 font-mono break-all">
                    {configPath}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* 缓存目录 */}
          <div className="flex items-start gap-3 py-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Folder className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 mb-1">{t('settings.about.cacheDirectory')}</p>
              {isLoadingCacheDir ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-sm">{t('common.loading')}</span>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg",
                    cacheDir && "cursor-pointer hover:bg-slate-200 transition-colors"
                  )}
onClick={async () => {
                     if (cacheDir) {
                       try {
                         await revealItemInDir(cacheDir);
                       } catch (err) {
                         if (import.meta.env.DEV) {
                           console.error('Failed to reveal cache directory:', err);
                         }
                         // 缓存目录可能尚未创建（首次使用），提示用户
                      toast.info(t('settings.cacheDirNotExist', { defaultValue: '缓存目录尚未创建，使用应用后会自动生成' }));
                       }
                     }
                   }}
                  title={cacheDir ? "点击在文件管理器中打开" : undefined}
                >
                  <code className="text-sm text-slate-600 font-mono break-all">
                    {cacheDir || t('settings.configPathError')}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 软件更新卡片 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('settings.update.title')}</h3>
              <p className="text-sm text-slate-500">{t('settings.update.description')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* 应用信息区域 */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <MonitorSmartphone className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{appInfo.name}</span>
                <span className="text-sm font-mono text-slate-500">v{appInfo.version}</span>
              </div>
              {repoUrl && (
                <button
                  type="button"
                  onClick={handleOpenRepo}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline underline-offset-2"
                >
<img
                     src={appLogo}
                     alt={appInfo.name}
                     className="w-4 h-4 rounded object-contain"
                   />
                  <span className="truncate">{repoUrl}</span>
                </button>
              )}
            </div>
          </div>

          {/* 检查更新按钮 */}
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isChecking}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
              'bg-indigo-50 text-indigo-600 font-medium',
              'hover:bg-indigo-100 transition-colors',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isChecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isChecking ? t('settings.update.checkingShort') : t('settings.update.check')}
          </button>

          {/* 更新状态提示 */}
          {updateHint && (
            <div className={`text-sm font-medium flex items-center gap-2 ${updateHintStyle}`}>
              {updateHint.type === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
              {updateHint.type === 'latest' && <CheckCircle2 className="w-4 h-4" />}
              {updateHint.type === 'available' && <AlertCircle className="w-4 h-4" />}
              {updateHint.type === 'error' && <AlertCircle className="w-4 h-4" />}
              <span>{updateHint.message}</span>
              {updateHint.type === 'available' && (
                <button
                  type="button"
                  onClick={handleOpenUpdater}
                  className="underline underline-offset-2 text-amber-700 hover:text-amber-800"
                >
                  {t('settings.update.view')}
                </button>
              )}
            </div>
          )}

          {/* 显示当前 store 中的可用更新状态 */}
          {!updateHint && updaterStatus === 'available' && update && (
            <div className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>{t('settings.update.available', { version: update.version })}</span>
              <button
                type="button"
                onClick={handleOpenUpdater}
                className="underline underline-offset-2 text-amber-700 hover:text-amber-800"
              >
                {t('settings.update.view')}
              </button>
            </div>
          )}

          {/* 自动更新说明 */}
          <p className="text-sm text-slate-500 leading-relaxed">
            {t('settings.update.autoNote')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
