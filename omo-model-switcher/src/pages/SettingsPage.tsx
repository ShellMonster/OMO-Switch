import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getVersion, getName } from '@tauri-apps/api/app';
import {
  Settings,
  Globe,
  Info,
  FileText,
  Folder,
  Package,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Copy,
  Github,
  RefreshCw
} from 'lucide-react';
import { cn } from '../components/common/cn';
import { supportedLanguages } from '../i18n';
import { checkVersions, VersionInfo } from '../services/tauri';
import { useUpdaterStore } from '../store/updaterStore';

let cachedVersions: VersionInfo[] | null = null;
let cachedConfigPath: string | null = null;
let cachedAppVersion: string | null = null;
let cachedAppName: string | null = null;

/**
 * 设置页面组件
 * 
 * 包含功能：
 * - 语言切换器（5种语言）
 * - 关于应用信息（版本、配置路径、缓存目录）
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [configPath, setConfigPath] = useState<string>(cachedConfigPath ?? '');
  const [isLoadingPath, setIsLoadingPath] = useState(!cachedConfigPath);

  const [versions, setVersions] = useState<VersionInfo[]>(cachedVersions ?? []);
  const [isLoadingVersions, setIsLoadingVersions] = useState(!cachedVersions);

  // 合并应用信息状态，减少 re-render
  const [appInfo, setAppInfo] = useState({
    version: cachedAppVersion ?? '',
    name: cachedAppName ?? 'OMO Switch'
  });
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // 从 updaterStore 获取更新相关状态和方法
  const updaterStatus = useUpdaterStore((s) => s.status);
  const update = useUpdaterStore((s) => s.update);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const openUpdater = useUpdaterStore((s) => s.open);
  const [isChecking, setIsChecking] = useState(false);
  const [updateHint, setUpdateHint] = useState<{ type: 'checking' | 'latest' | 'available' | 'error'; message: string } | null>(null);

  // 合并 appVersion 和 appName 的加载逻辑，减少 useEffect 数量
  useEffect(() => {
    // 如果缓存都存在，直接使用
    if (cachedAppVersion && cachedAppName) {
      return;
    }
    
    // 并行获取应用信息，减少等待时间
    Promise.all([
      cachedAppVersion ? Promise.resolve(cachedAppVersion) : getVersion(),
      cachedAppName ? Promise.resolve(cachedAppName) : getName()
    ]).then(([version, name]) => {
      cachedAppVersion = version;
      cachedAppName = name;
      setAppInfo({ version, name });
    }).catch(() => {
      setAppInfo({ version: '0.0.0', name: 'OMO Switch' });
    });
  }, []);

  useEffect(() => {
    if (cachedConfigPath) {
      setConfigPath(cachedConfigPath);
      setIsLoadingPath(false);
    } else {
      setIsLoadingPath(true);
      invoke<string>('get_config_path').then(path => {
        cachedConfigPath = path;
        setConfigPath(path);
      }).catch(() => setConfigPath(t('settings.configPathError'))).finally(() => setIsLoadingPath(false));
    }
  }, [t]);

  // 延迟加载版本检测，避免阻塞首次渲染
  useEffect(() => {
    const timer = setTimeout(() => loadVersions(), 0);
    return () => clearTimeout(timer);
  }, []);

  const loadVersions = async (forceRefresh = false) => {
    // 有缓存且非强制刷新: 先显示缓存，后台更新
    if (cachedVersions && !forceRefresh) {
      setVersions(cachedVersions);
      setIsLoadingVersions(false);

      // 后台静默获取最新版本信息
      try {
        const v = await checkVersions();
        cachedVersions = v;
        setVersions(v);
      } catch (error) {
        console.error('Failed to refresh versions:', error);
      }
      return;
    }

    // 无缓存或强制刷新: 显示 loading 状态
    setIsLoadingVersions(true);
    try {
      const v = await checkVersions();
      cachedVersions = v;
      setVersions(v);
    } catch (error) {
      console.error('Failed to check versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('settingsPage.title')}</h2>
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
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="ml-2 text-slate-500">{t('versionCheck.loading')}</span>
            </div>
          ) : (
            versions.map((v) => (
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
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {t('versionCheck.upToDate')}
                    </span>
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
                          setCopiedCommand(v.name);
                          setTimeout(() => setCopiedCommand(null), 2000);
                        }}
                        className="p-2 text-amber-700 hover:bg-amber-200 rounded transition-colors flex-shrink-0"
                        title={copiedCommand === v.name ? '已复制' : '复制'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

           {!isLoadingVersions && (
             <button
               onClick={() => loadVersions(true)}
               className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
             >
               <Download className="w-4 h-4" />
               {t('versionCheck.checkUpdate')}
             </button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Info className="w-4 h-4 text-purple-600" />
            </div>
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
                <code className="block px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 font-mono break-all">
                  {configPath}
                </code>
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
              <code className="block px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 font-mono break-all">
                {configPath ? configPath.replace(/config\.json$/, 'cache/') : t('settings.configPathError')}
              </code>
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
              <Package className="w-7 h-7 text-white" />
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
                  <Github className="w-4 h-4" />
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
