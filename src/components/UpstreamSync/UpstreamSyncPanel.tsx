import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  WifiOff,
  Star,
  Coins,
  Zap,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '../common/cn';
import { toast } from '../common/Toast';
import {
  checkUpstreamUpdate,
  getBuiltinPresets,
  applyBuiltinPreset,
  UpstreamSyncResult,
  BuiltinPresetInfo,
} from '../../services/tauri';

/**
 * 上游配置同步面板组件
 *
 * 功能：
 * - 显示当前内置预设版本（上次同步时间）
 * - 提供"检查更新"按钮
 * - 显示更新检查结果（有更新/已是最新/网络错误）
 * - 显示变更摘要（category/agent 的默认模型变化）
 * - 提供"更新内置预设"按钮应用更新
 */
export function UpstreamSyncPanel() {
  const { t } = useTranslation();

  // 状态管理
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [syncResult, setSyncResult] = useState<UpstreamSyncResult | null>(null);
  const [presets, setPresets] = useState<BuiltinPresetInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('official-default');

  // 组件挂载时获取预设列表
  useEffect(() => {
    loadPresets();
  }, []);

  /**
   * 加载内置预设列表
   */
  const loadPresets = async () => {
    try {
      const presetList = await getBuiltinPresets();
      setPresets(presetList);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('加载预设列表失败:', err);
      }
    }
  };

  /**
   * 处理检查更新
   */
  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await checkUpstreamUpdate();
      setSyncResult(result);
      setLastCheckTime(new Date().toLocaleString());

      if (result.has_update) {
        toast.info(t('upstreamSync.updateAvailable', { defaultValue: '发现上游配置更新' }));
      } else {
        toast.success(t('upstreamSync.upToDate', { defaultValue: '已是最新版本' }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error(t('upstreamSync.checkFailed', { defaultValue: '检查更新失败' }));
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 处理应用预设
   */
  const handleApplyPreset = async () => {
    setIsApplying(true);

    try {
      await applyBuiltinPreset(selectedPreset);
      toast.success(
        t('upstreamSync.applySuccess', {
          preset: presets.find(p => p.id === selectedPreset)?.name || selectedPreset,
          defaultValue: '预设应用成功',
        })
      );
      // 清除同步结果，需要重新检查
      setSyncResult(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(t('upstreamSync.applyFailed', { error: errorMsg, defaultValue: '应用预设失败' }));
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * 获取预设图标
   */
  const getPresetIcon = (iconName?: string) => {
    switch (iconName) {
      case 'star':
        return <Star className="w-4 h-4" />;
      case 'coins':
        return <Coins className="w-4 h-4" />;
      case 'zap':
        return <Zap className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  /**
   * 生成变更摘要
   */
  const generateChangeSummary = (result: UpstreamSyncResult) => {
    const categories = Object.keys(result.categories);
    const agents = Object.keys(result.agent_requirements);

    return {
      categoryCount: categories.length,
      agentCount: agents.length,
      categories: categories.slice(0, 5),
      agents: agents.slice(0, 5),
    };
  };

  // 判断是否显示网络错误（错误信息包含特定关键词）
  const isNetworkError = error?.toLowerCase().includes('http') ||
                         error?.toLowerCase().includes('network') ||
                         error?.toLowerCase().includes('connection') ||
                         error?.toLowerCase().includes('timeout');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 头部区域 */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Cloud className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">
              {t('upstreamSync.title', { defaultValue: '上游配置同步' })}
            </h3>
            <p className="text-sm text-slate-500">
              {t('upstreamSync.description', { defaultValue: '同步 oh-my-opencode 官方预设配置' })}
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6 space-y-5">
        {/* 上次检查时间 */}
        {lastCheckTime && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>
              {t('upstreamSync.lastCheck', { defaultValue: '上次检查' })}: {lastCheckTime}
            </span>
          </div>
        )}

        {/* 检查更新按钮 */}
        <button
          onClick={handleCheckUpdate}
          disabled={isChecking}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
            'bg-sky-50 text-sky-600 font-medium',
            'hover:bg-sky-100 transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isChecking
            ? t('upstreamSync.checking', { defaultValue: '正在检查...' })
            : t('upstreamSync.checkUpdate', { defaultValue: '检查更新' })}
        </button>

        {/* 网络错误提示 */}
        {error && isNetworkError && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
              <WifiOff className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">
                {t('upstreamSync.networkError', { defaultValue: '无法连接 GitHub' })}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {t('upstreamSync.usingCache', { defaultValue: '使用本地缓存的预设配置' })}
              </p>
            </div>
          </div>
        )}

        {/* 其他错误提示 */}
        {error && !isNetworkError && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
            <div className="p-1.5 bg-rose-100 rounded-lg flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="font-medium text-rose-800">
                {t('upstreamSync.error', { defaultValue: '检查失败' })}
              </p>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 已是最新提示 */}
        {syncResult && !syncResult.has_update && !error && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-medium text-emerald-800">
              {t('upstreamSync.alreadyLatest', { defaultValue: '已是最新版本' })}
            </p>
          </div>
        )}

        {/* 有更新提示 */}
        {syncResult && syncResult.has_update && !error && (
          <div className="space-y-4">
            {/* 更新提示头部 */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  {t('upstreamSync.updateAvailable', { defaultValue: '发现配置更新' })}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('upstreamSync.updateHint', {
                    categoryCount: generateChangeSummary(syncResult).categoryCount,
                    agentCount: generateChangeSummary(syncResult).agentCount,
                    defaultValue: `包含 ${generateChangeSummary(syncResult).categoryCount} 个分类和 ${generateChangeSummary(syncResult).agentCount} 个 Agent 的默认配置`,
                  })}
                </p>
              </div>
            </div>

            {/* 变更摘要 */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h4 className="font-medium text-slate-700">
                {t('upstreamSync.changeSummary', { defaultValue: '变更摘要' })}
              </h4>

              {/* Category 变更 */}
              {generateChangeSummary(syncResult).categories.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    {t('upstreamSync.categories', { defaultValue: '分类默认模型' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generateChangeSummary(syncResult).categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-1 bg-white rounded-lg text-sm text-slate-700 border border-slate-200"
                      >
                        {cat}
                      </span>
                    ))}
                    {generateChangeSummary(syncResult).categoryCount > 5 && (
                      <span className="px-2.5 py-1 text-sm text-slate-400">
                        +{generateChangeSummary(syncResult).categoryCount - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Agent 变更 */}
              {generateChangeSummary(syncResult).agents.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    {t('upstreamSync.agents', { defaultValue: 'Agent 默认模型' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {generateChangeSummary(syncResult).agents.map((agent) => (
                      <span
                        key={agent}
                        className="px-2.5 py-1 bg-white rounded-lg text-sm text-slate-700 border border-slate-200"
                      >
                        {agent}
                      </span>
                    ))}
                    {generateChangeSummary(syncResult).agentCount > 5 && (
                      <span className="px-2.5 py-1 text-sm text-slate-400">
                        +{generateChangeSummary(syncResult).agentCount - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 预设选择 */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-700">
                {t('upstreamSync.selectPreset', { defaultValue: '选择要应用的预设' })}
              </h4>
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                      selectedPreset === preset.id
                        ? 'border-sky-500 bg-sky-50/50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        selectedPreset === preset.id
                          ? 'bg-sky-100 text-sky-600'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {getPresetIcon(preset.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium',
                          selectedPreset === preset.id ? 'text-sky-700' : 'text-slate-700'
                        )}
                      >
                        {preset.name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{preset.description}</p>
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        selectedPreset === preset.id ? 'text-sky-500' : 'text-slate-400'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 应用更新按钮 */}
            <button
              onClick={handleApplyPreset}
              disabled={isApplying}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                'bg-indigo-600 text-white font-medium',
                'hover:bg-indigo-700 transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isApplying
                ? t('upstreamSync.applying', { defaultValue: '正在应用...' })
                : t('upstreamSync.applyUpdate', { defaultValue: '更新内置预设' })}
            </button>
          </div>
        )}


      </div>
    </div>
  );
}

export default UpstreamSyncPanel;
