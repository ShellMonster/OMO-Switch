import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  FileText, 
  Clock, 
  Users, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Server,
  Database,
  Shield,
  Activity,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { cn } from '../common/cn';
import type { OmoConfig } from '../../services/tauri';

/**
 * 配置元数据接口
 */
interface ConfigMetadata {
  path: string;
  lastModified: string;
  size: number;
}

/**
 * 配置验证结果接口
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Agent模型分配信息
 */
interface AgentModelInfo {
  name: string;
  model: string;
  variant?: string;
  category?: string;
}

/**
 * 配置状态总览仪表板
 * 
 * 设计理念：
 * - 浅色主题，与 App 整体风格一致
 * - 信息密度高但层次分明
 * - 使用卡片式布局组织不同类型的信息
 * - 表格形式清晰展示Agent模型分配
 * 
 * 显示内容：
 * 1. 配置文件元数据（路径、修改时间）
 * 2. 配置统计（Agent总数、模型数）
 * 3. Agent模型分配表格
 * 4. 已连接提供商列表
 * 5. 配置验证状态
 */
export function ConfigDashboard() {
  // 状态管理
  const [configPath, setConfigPath] = useState<string>('');
  const [omoConfig, setOmoConfig] = useState<OmoConfig | null>(null);
  const [configMetadata, setConfigMetadata] = useState<ConfigMetadata | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载所有配置相关数据
   */
  useEffect(() => {
    const loadConfigData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 并行加载所有数据
        const [pathResult, configResult, providersResult] = await Promise.allSettled([
          invoke<string>('get_config_path'),
          invoke<OmoConfig>('read_omo_config'),
          invoke<string[]>('get_connected_providers'),
        ]);

        // 处理配置文件路径
        if (pathResult.status === 'fulfilled') {
          setConfigPath(pathResult.value);
          
          // 尝试获取文件元数据
          try {
            const metadata = await invoke<ConfigMetadata>('get_config_metadata');
            setConfigMetadata(metadata);
          } catch {
            // 如果后端没有实现，使用模拟数据
            setConfigMetadata({
              path: pathResult.value,
              lastModified: new Date().toISOString(),
              size: 0,
            });
          }
        }

        // 处理配置数据
        if (configResult.status === 'fulfilled') {
          setOmoConfig(configResult.value);
          
          // 验证配置
          try {
            await invoke('validate_config', { config: configResult.value });
            setValidation({ valid: true, errors: [] });
          } catch (err) {
            setValidation({ 
              valid: false, 
              errors: [err instanceof Error ? err.message : '配置验证失败'] 
            });
          }
        } else {
          setValidation({ 
            valid: false, 
            errors: [configResult.reason instanceof Error ? configResult.reason.message : '无法读取配置'] 
          });
        }

        // 处理提供商数据
        if (providersResult.status === 'fulfilled') {
          setProviders(providersResult.value);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : '加载配置数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigData();
  }, []);

  /**
   * 获取Agent模型分配列表
   */
  const getAgentModelList = (): AgentModelInfo[] => {
    if (!omoConfig) return [];

    const agents: AgentModelInfo[] = [];

    // 处理agents
    if (omoConfig.agents) {
      Object.entries(omoConfig.agents).forEach(([name, config]) => {
        agents.push({
          name,
          model: config.model,
          variant: config.variant,
          category: 'agent',
        });
      });
    }

    // 处理categories
    if (omoConfig.categories) {
      Object.entries(omoConfig.categories).forEach(([name, config]) => {
        agents.push({
          name,
          model: config.model,
          variant: config.variant,
          category: 'category',
        });
      });
    }

    return agents;
  };

  /**
   * 获取已配置的模型数量（去重）
   */
  const getUniqueModelCount = (): number => {
    if (!omoConfig) return 0;
    const models = new Set<string>();
    
    Object.values(omoConfig.agents || {}).forEach(agent => models.add(agent.model));
    Object.values(omoConfig.categories || {}).forEach(cat => models.add(cat.model));
    
    return models.size;
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-500 text-sm">正在加载配置数据...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">加载失败</h3>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const agentList = getAgentModelList();
  const uniqueModels = getUniqueModelCount();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-white rounded-2xl border border-slate-200 shadow-xl">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Database className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">配置状态总览</h2>
          <p className="text-slate-400 mt-1">查看和管理您的 OMO 配置文件状态</p>
        </div>
      </div>

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Agent总数 */}
        <StatCard
          icon={Users}
          label="Agent 总数"
          value={agentList.length}
          color="cyan"
          subtitle="已配置的 agents"
        />
        
        {/* 模型数 */}
        <StatCard
          icon={Cpu}
          label="已配置模型"
          value={uniqueModels}
          color="violet"
          subtitle="去重后的模型数"
        />
        
        {/* 提供商数 */}
        <StatCard
          icon={Server}
          label="连接提供商"
          value={providers.length}
          color="emerald"
          subtitle="可用的模型源"
        />
        
        {/* 验证状态 */}
        <ValidationCard validation={validation} />
      </div>

      {/* 配置文件元数据 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-800">配置文件信息</h3>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 文件路径 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                配置文件路径
              </label>
              <div className="flex items-start gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                <FolderOpen className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <code className="text-sm text-indigo-600 font-mono break-all">
                  {configPath || '未找到配置文件'}
                </code>
              </div>
            </div>

            {/* 最后修改时间 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                最后修改时间
              </label>
              <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">
                  {configMetadata?.lastModified 
                    ? formatDateTime(configMetadata.lastModified)
                    : '未知'
                  }
                </span>
              </div>
            </div>

            {/* 文件大小 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                文件大小
              </label>
              <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">
                  {configMetadata?.size !== undefined 
                    ? formatFileSize(configMetadata.size)
                    : '未知'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent模型分配表格 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Agent 模型分配</h3>
            </div>
            <span className="text-sm text-slate-400">
              共 {agentList.length} 个配置
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  分配模型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  变体
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {agentList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-slate-500">暂无 Agent 配置</p>
                    </div>
                  </td>
                </tr>
              ) : (
                agentList.map((agent, index) => (
                  <tr 
                    key={agent.name}
                    className="hover:bg-slate-50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          agent.category === 'agent' 
                            ? 'bg-indigo-50' 
                            : 'bg-violet-50'
                        )}>
                          <span className={cn(
                            'text-xs font-bold',
                            agent.category === 'agent'
                              ? 'text-indigo-600'
                              : 'text-violet-600'
                          )}>
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-700">
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        agent.category === 'agent'
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : 'bg-violet-50 text-violet-600 border border-violet-200'
                      )}>
                        {agent.category === 'agent' ? 'Agent' : '分类'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-emerald-600 font-mono bg-emerald-50 px-2 py-1 rounded">
                        {agent.model}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {agent.variant ? (
                        <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                          <Shield className="w-3.5 h-3.5" />
                          {agent.variant}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 已连接提供商 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-800">已连接提供商</h3>
          </div>
        </div>

        <div className="p-6">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Server className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-500">暂无连接的提供商</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {providers.map((provider, index) => (
                <div
                  key={provider}
                  className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200 hover:border-emerald-200 transition-all group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">
                      {provider}
                    </p>
                    <p className="text-xs text-slate-500">已连接</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-600 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 统计卡片组件
 */
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'cyan' | 'violet' | 'emerald' | 'rose';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorClasses = {
    cyan: 'from-cyan-500 to-blue-600 shadow-indigo-500/10',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/20',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/20',
  };

  const textColors = {
    cyan: 'text-indigo-600',
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
  };

  return (
    <div className="relative p-6 bg-white rounded-2xl border border-slate-200 overflow-hidden group hover:border-indigo-300 transition-all">
      {/* 背景装饰 */}
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2',
        colorClasses[color].split(' ')[0].replace('from-', 'bg-')
      )} />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className={cn('text-3xl font-bold mt-2', textColors[color])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * 验证状态卡片组件
 */
interface ValidationCardProps {
  validation: ValidationResult | null;
}

function ValidationCard({ validation }: ValidationCardProps) {
  if (!validation) {
    return (
      <StatCard
        icon={Shield}
        label="配置状态"
        value={0}
        color="rose"
        subtitle="等待验证"
      />
    );
  }

  if (validation.valid) {
    return (
      <div className="relative p-6 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-emerald-600/80 text-sm font-medium">配置状态</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-600">有效</span>
            </div>
            <p className="text-emerald-600 text-xs mt-1">配置格式正确</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-200 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-rose-600 text-sm font-medium">配置状态</p>
          <div className="flex items-center gap-2 mt-2">
            <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <span className="text-2xl font-bold text-rose-600">无效</span>
          </div>
          <div className="mt-2 space-y-1">
            {validation.errors.map((error, i) => (
              <p key={i} className="text-rose-500 text-xs truncate">
                • {error}
              </p>
            ))}
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20 flex-shrink-0 ml-4">
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
