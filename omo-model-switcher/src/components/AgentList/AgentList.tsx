import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { ModelSelector } from './ModelSelector';
import { Button } from '../common/Button';
import { toast } from '../common/Toast';
import { cn } from '../common/cn';
import { useConfigStore } from '../../store/configStore';
import {
  getOmoConfig,
  updateAgentModel,
  type AgentConfig,
} from '../../services/tauri';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

/**
 * Agent 列表组件
 * 
 * 功能：
 * - 从配置动态加载所有 agent
 * - 渲染 AgentCard 网格
 * - 管理 ModelSelector 弹窗状态
 * - 处理配置更新
 */
export function AgentList() {
  const { omoConfig, setOmoConfig, updateAgentConfig, setOmoConfigLoading, setOmoConfigError } =
    useConfigStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);

  // 加载 OMO 配置
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setOmoConfigLoading(true);
    try {
      const config = await getOmoConfig();
      setOmoConfig(config);
      setOmoConfigError(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '加载配置失败';
      setOmoConfigError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setOmoConfigLoading(false);
    }
  }, [setOmoConfig, setOmoConfigLoading, setOmoConfigError]);

  // 初始加载
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 生成可用模型列表（模拟数据，实际应从模型服务获取）
  useEffect(() => {
    if (omoConfig) {
      const models: ModelOption[] = [];
      const seen = new Set<string>();

      // 从当前配置中提取所有使用的模型
      Object.entries(omoConfig.agents).forEach(([_, config]) => {
        if (!seen.has(config.model)) {
          seen.add(config.model);
          const parts = config.model.split('/');
          models.push({
            id: config.model,
            name: parts[parts.length - 1],
            provider: parts[0] || 'unknown',
          });
        }
      });

      // 从 categories 中提取
      Object.entries(omoConfig.categories).forEach(([_, config]) => {
        if (!seen.has(config.model)) {
          seen.add(config.model);
          const parts = config.model.split('/');
          models.push({
            id: config.model,
            name: parts[parts.length - 1],
            provider: parts[0] || 'unknown',
          });
        }
      });

      setAvailableModels(models);
    }
  }, [omoConfig]);

  // 打开编辑弹窗
  const handleEdit = useCallback((agentName: string) => {
    setSelectedAgent(agentName);
    setIsSelectorOpen(true);
  }, []);

  // 关闭编辑弹窗
  const handleClose = useCallback(() => {
    setIsSelectorOpen(false);
    setSelectedAgent(null);
  }, []);

  // 保存配置
  const handleSave = useCallback(
    async (model: string, variant: AgentConfig['variant']) => {
      if (!selectedAgent) return;

      setIsSaving(true);
      try {
        await updateAgentModel(selectedAgent, model, variant);
        // 更新本地状态
        updateAgentConfig(selectedAgent, { model, variant });
      } finally {
        setIsSaving(false);
      }
    },
    [selectedAgent, updateAgentConfig]
  );

  // 获取选中 agent 的当前配置
  const selectedAgentConfig = selectedAgent
    ? omoConfig?.agents[selectedAgent]
    : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-600">加载 Agent 配置...</span>
      </div>
    );
  }

  if (!omoConfig) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">无法加载配置</p>
        <Button variant="primary" onClick={loadConfig}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  const agents = Object.entries(omoConfig.agents);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-500">
          共 {agents.length} 个 Agent
        </div>
        <Button variant="ghost" size="sm" onClick={loadConfig} disabled={isLoading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map(([agentName, config]) => (
          <AgentCard
            key={agentName}
            agentName={agentName}
            config={config}
            onEdit={() => handleEdit(agentName)}
          />
        ))}
      </div>

      {selectedAgent && selectedAgentConfig && (
        <ModelSelector
          isOpen={isSelectorOpen}
          onClose={handleClose}
          agentName={selectedAgent}
          currentConfig={selectedAgentConfig}
          availableModels={availableModels}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </>
  );
}
