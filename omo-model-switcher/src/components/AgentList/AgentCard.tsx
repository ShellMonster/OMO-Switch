import React from 'react';
import { Edit2, Bot, Cpu, Sparkles } from 'lucide-react';
import { cn } from '../common/cn';
import { Button } from '../common/Button';
import type { AgentConfig } from '../../services/tauri';

interface AgentCardProps {
  agentName: string;
  config: AgentConfig;
  onEdit: () => void;
}

/**
 * 将 agent 名称转换为可读格式
 */
function formatAgentName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 根据 variant 获取对应的颜色样式
 */
function getVariantStyle(variant?: string): { bg: string; text: string; border: string } {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    max: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    high: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    medium: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    low: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    none: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  };
  return styles[variant || 'none'] || styles.none;
}

/**
 * 根据 agent 名称获取图标
 */
function getAgentIcon(agentName: string): React.ReactNode {
  const iconClass = "w-5 h-5";
  
  if (agentName.includes('build') || agentName.includes('hephaestus')) {
    return <Cpu className={iconClass} />;
  }
  if (agentName.includes('oracle') || agentName.includes('plan')) {
    return <Sparkles className={iconClass} />;
  }
  return <Bot className={iconClass} />;
}

/**
 * Agent 卡片组件
 * 
 * 显示单个 agent 的配置信息：
 * - agent 名称（格式化显示）
 * - 当前使用的模型
 * - variant 等级标签
 * - 编辑按钮
 */
export function AgentCard({ agentName, config, onEdit }: AgentCardProps) {
  const variantStyle = getVariantStyle(config.variant);
  const icon = getAgentIcon(agentName);
  const displayName = formatAgentName(agentName);
  
  // 简化模型名称显示（只显示最后一部分）
  const shortModelName = config.model.split('/').pop() || config.model;

  return (
    <div className={cn(
      "group relative p-5 bg-white rounded-2xl border transition-all duration-200",
      "hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5",
      "border-slate-200"
    )}>
      {/* 头部：图标和编辑按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
          "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
        )}>
          {icon}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          编辑
        </Button>
      </div>

      {/* Agent 名称 */}
      <h3 className="font-semibold text-slate-800 mb-3 text-base">
        {displayName}
      </h3>

      {/* 模型信息 */}
      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="text-slate-500 mr-2">模型:</span>
          <span 
            className="font-medium text-slate-700 truncate"
            title={config.model}
          >
            {shortModelName}
          </span>
        </div>
        
        {/* Variant 标签 */}
        <div className="flex items-center text-sm">
          <span className="text-slate-500 mr-2">强度:</span>
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            variantStyle.bg,
            variantStyle.text,
            variantStyle.border
          )}>
            {config.variant || 'none'}
          </span>
        </div>
      </div>
    </div>
  );
}
