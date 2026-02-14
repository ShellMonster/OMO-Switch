import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  Search, 
  ChevronDown, 
  Server,
  Zap,
  DollarSign,
  Info,
  CheckCircle2,
  Loader2,
  Filter
} from 'lucide-react';
import { cn } from '../common/cn';
import { SearchInput } from '../common/SearchInput';
import { 
  getAvailableModels, 
  getConnectedProviders, 
  fetchModelsDev,
  ModelInfo 
} from '../../services/tauri';

// ==================== 类型定义 ====================

interface GroupedModels {
  provider: string;
  models: string[];
}

interface ModelBrowserProps {
  onSelectModel?: (modelId: string, provider: string) => void;
  selectedModel?: string;
  showApplyButton?: boolean;
}

// ==================== 工具函数 ====================

/**
 * 格式化模型ID为显示名称
 */
function formatModelName(modelId: string): string {
  // 移除 provider/ 前缀
  const parts = modelId.split('/');
  const name = parts[parts.length - 1];
  
  // 将 kebab-case 转换为更友好的格式
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 格式化价格显示
 */
function formatPrice(price?: number, currency?: string): string {
  if (price === undefined || price === null) return '免费';
  if (price === 0) return '免费';
  
  const symbol = currency === 'USD' ? '$' : currency || '$';
  return `${symbol}${price.toFixed(6)}/1K tokens`;
}

/**
 * 获取提供商图标颜色
 */
function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'bg-emerald-500',
    anthropic: 'bg-orange-500',
    google: 'bg-blue-500',
    groq: 'bg-pink-500',
    together: 'bg-purple-500',
    cohere: 'bg-teal-500',
    mistral: 'bg-indigo-500',
    aicodewith: 'bg-rose-500',
    'kimi-for-coding': 'bg-amber-500',
  };
  
  return colors[provider.toLowerCase()] || 'bg-slate-500';
}

// ==================== 子组件 ====================

/**
 * 模型卡片组件
 */
function ModelCard({
  modelId,
  provider,
  modelInfo,
  isSelected,
  onSelect,
  showApplyButton,
  onApply,
}: {
  modelId: string;
  provider: string;
  modelInfo?: ModelInfo;
  isSelected: boolean;
  onSelect: () => void;
  showApplyButton?: boolean;
  onApply?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayName = modelInfo?.name || formatModelName(modelId);
  const description = modelInfo?.description;
  const pricing = modelInfo?.pricing;
  
  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-100'
          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* 头部：名称和选择状态 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 truncate">
                {displayName}
              </h4>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono truncate">
              {modelId}
            </p>
          </div>
          
          {/* 展开按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronDown 
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} 
            />
          </button>
        </div>
        
        {/* 标签区域 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* 提供商标签 */}
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white',
            getProviderColor(provider)
          )}>
            <Server className="w-3 h-3" />
            {provider}
          </span>
          
          {/* 定价标签 */}
          {pricing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              <DollarSign className="w-3 h-3" />
              {pricing.prompt === 0 && pricing.completion === 0 
                ? '免费' 
                : `${formatPrice(pricing.prompt, pricing.currency)}`
              }
            </span>
          )}
        </div>
        
        {/* 展开详情 */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {description && (
              <div>
                <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  描述
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {description}
                </p>
              </div>
            )}
            
            {pricing && (pricing.prompt !== undefined || pricing.completion !== undefined) && (
              <div>
                <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                  定价
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">输入:</span>
                    <span className="ml-2 text-slate-700 font-medium">
                      {formatPrice(pricing.prompt, pricing.currency)}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <span className="text-slate-500">输出:</span>
                    <span className="ml-2 text-slate-700 font-medium">
                      {formatPrice(pricing.completion, pricing.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 应用按钮 */}
        {showApplyButton && isSelected && onApply && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" />
              应用此模型
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 提供商分组组件
 */
function ProviderGroup({
  provider,
  models,
  modelInfos,
  expanded,
  onToggle,
  selectedModel,
  onSelectModel,
  showApplyButton,
  onApplyModel,
}: {
  provider: string;
  models: string[];
  modelInfos: Record<string, ModelInfo>;
  expanded: boolean;
  onToggle: () => void;
  selectedModel?: string;
  onSelectModel: (modelId: string) => void;
  showApplyButton?: boolean;
  onApplyModel?: (modelId: string, provider: string) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* 提供商标题栏 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={cn(
            'w-3 h-3 rounded-full',
            getProviderColor(provider)
          )} />
          <h3 className="font-semibold text-slate-800 capitalize">
            {provider}
          </h3>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
            {models.length}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )} 
        />
      </button>
      
      {/* 模型列表 */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((modelId) => (
            <ModelCard
              key={modelId}
              modelId={modelId}
              provider={provider}
              modelInfo={modelInfos[modelId]}
              isSelected={selectedModel === modelId}
              onSelect={() => onSelectModel(modelId)}
              showApplyButton={showApplyButton}
              onApply={() => onApplyModel?.(modelId, provider)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export function ModelBrowser({
  onSelectModel,
  selectedModel,
  showApplyButton = false,
}: ModelBrowserProps) {
  // 状态
  const [groupedModels, setGroupedModels] = useState<GroupedModels[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [modelInfos, setModelInfos] = useState<Record<string, ModelInfo>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // 并行加载所有数据
        const [modelsData, providersData, modelDetails] = await Promise.all([
          getAvailableModels(),
          getConnectedProviders(),
          fetchModelsDev(),
        ]);
        
        // 转换模型数据为分组格式
        const grouped: GroupedModels[] = Object.entries(modelsData).map(
          ([provider, models]) => ({
            provider,
            models,
          })
        );
        
        // 按模型数量排序
        grouped.sort((a, b) => b.models.length - a.models.length);
        
        setGroupedModels(grouped);
        setConnectedProviders(providersData);
        
        // 构建模型信息映射表
        const infoMap: Record<string, ModelInfo> = {};
        modelDetails.forEach((info) => {
          infoMap[info.id] = info;
        });
        setModelInfos(infoMap);
        
        // 默认展开前3个提供商
        const topProviders = new Set(grouped.slice(0, 3).map(g => g.provider));
        setExpandedProviders(topProviders);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载模型数据失败');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // 过滤模型
  const filteredGroups = useMemo(() => {
    if (!searchQuery && selectedProvider === 'all') {
      return groupedModels;
    }
    
    const query = searchQuery.toLowerCase();
    
    return groupedModels
      .map((group) => {
        // 如果按提供商过滤，检查是否匹配
        if (selectedProvider !== 'all' && group.provider !== selectedProvider) {
          return null;
        }
        
        // 过滤模型
        const filteredModels = group.models.filter((modelId) => {
          const info = modelInfos[modelId];
          const searchText = [
            modelId,
            info?.name,
            info?.description,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          
          return searchText.includes(query);
        });
        
        return filteredModels.length > 0
          ? { ...group, models: filteredModels }
          : null;
      })
      .filter((group): group is GroupedModels => group !== null);
  }, [groupedModels, modelInfos, searchQuery, selectedProvider]);

  // 切换提供商展开状态
  const toggleProvider = useCallback((provider: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  }, []);

  // 处理模型选择
  const handleSelectModel = useCallback((modelId: string) => {
    onSelectModel?.(modelId, selectedProvider);
  }, [onSelectModel, selectedProvider]);

  // 处理应用模型
  const handleApplyModel = useCallback((modelId: string, provider: string) => {
    onSelectModel?.(modelId, provider);
  }, [onSelectModel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500">正在加载模型数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          加载失败
        </h3>
        <p className="text-slate-500 text-center max-w-md mb-4">
          {error}
        </p>
        <p className="text-sm text-slate-400 text-center">
          请确保已安装并运行 Oh My OpenCode 主应用
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm">可用模型</p>
              <p className="text-2xl font-bold">
                {groupedModels.reduce((sum, g) => sum + g.models.length, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm">提供商</p>
              <p className="text-2xl font-bold">{groupedModels.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-amber-100 text-sm">已连接</p>
              <p className="text-2xl font-bold">{connectedProviders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜索模型名称、描述..."
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">全部提供商</option>
            {groupedModels.map((group) => (
              <option key={group.provider} value={group.provider}>
                {group.provider} ({group.models.length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 模型列表 */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            未找到匹配的模型
          </h3>
          <p className="text-slate-500">
            尝试调整搜索词或过滤器
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <ProviderGroup
              key={group.provider}
              provider={group.provider}
              models={group.models}
              modelInfos={modelInfos}
              expanded={expandedProviders.has(group.provider)}
              onToggle={() => toggleProvider(group.provider)}
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              showApplyButton={showApplyButton}
              onApplyModel={handleApplyModel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelBrowser;
