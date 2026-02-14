import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { useConfigStore } from '../store/configStore';
import { getOmoConfig, getAvailableModels, getConnectedProviders } from '../services/tauri';
import { AgentList } from '../components/AgentList';
import { Button } from '../components/common/Button';
import { toast } from '../components/common/Toast';
import { cn } from '../components/common/cn';

export function AgentPage() {
  const { t } = useTranslation();
  const { 
    omoConfig, 
    setOmoConfig, 
    setOmoConfigLoading, 
    setOmoConfigError 
  } = useConfigStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  /**
   * 加载 OMO 配置文件
   */
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setOmoConfigLoading(true);
    try {
      const config = await getOmoConfig();
      setOmoConfig(config);
      setOmoConfigError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('agentList.loadConfigFailed');
      setOmoConfigError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setOmoConfigLoading(false);
    }
  }, [setOmoConfig, setOmoConfigLoading, setOmoConfigError, t]);

  /**
   * 加载模型元数据（提供商模型列表和已连接提供商）
   */
  const loadModelMeta = useCallback(async () => {
    try {
      const [models, providers] = await Promise.all([
        getAvailableModels(),
        getConnectedProviders(),
      ]);
      setProviderModels(models);
      setConnectedProviders(providers);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('agentList.loadConfigFailed');
      toast.error(msg);
    }
  }, [t]);

  /**
   * 统一刷新处理函数
   */
  const handleRefresh = useCallback(() => {
    loadConfig();
    loadModelMeta();
  }, [loadConfig, loadModelMeta]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadConfig();
    loadModelMeta();
  }, [loadConfig, loadModelMeta]);

  // 加载中状态
  if (isLoading || !omoConfig) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-600">{t('agentList.loading')}</span>
      </div>
    );
  }

  const agentsCount = Object.keys(omoConfig.agents).length;
  const categoriesCount = Object.keys(omoConfig.categories).length;

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-800">{t('agentPage.title')}</h2>
          <p className="text-slate-600 mt-1">{t('agentPage.description')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          {t('agentList.refresh')}
        </Button>
      </div>

      {/* Agents 区域 */}
      <div>
        <button
          onClick={() => setAgentsExpanded(!agentsExpanded)}
          className="flex items-center justify-between w-full group mb-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-200',
              !agentsExpanded && '-rotate-90'
            )} />
            <h3 className="text-lg font-semibold text-slate-700">{t('agentPage.agentsSection')}</h3>
          </div>
          <span className="text-sm text-slate-500">
            {t('agentPage.agentsCount', { count: agentsCount })}
          </span>
        </button>
        {agentsExpanded && (
          <AgentList
            dataSource="agents"
            data={omoConfig.agents}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
          />
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-slate-200 my-8" />

      {/* Categories 区域 */}
      <div>
        <button
          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
          className="flex items-center justify-between w-full group mb-4"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-200',
              !categoriesExpanded && '-rotate-90'
            )} />
            <h3 className="text-lg font-semibold text-slate-700">{t('agentPage.categoriesSection')}</h3>
          </div>
          <span className="text-sm text-slate-500">
            {t('agentPage.categoriesCount', { count: categoriesCount })}
          </span>
        </button>
        {categoriesExpanded && (
          <AgentList
            dataSource="categories"
            data={omoConfig.categories}
            providerModels={providerModels}
            connectedProviders={connectedProviders}
          />
        )}
      </div>
    </div>
  );
}
