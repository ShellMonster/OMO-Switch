import React, { useState } from 'react';
import { Edit2, Bot, Cpu, Sparkles, Eye, Search, Hammer, BookOpen, Palette, Brain, Shield, Map, Wrench, FileText, Users } from 'lucide-react';
import { cn } from '../common/cn';
import { Button } from '../common/Button';
import type { AgentConfig } from '../../services/tauri';

interface AgentCardProps {
  agentName: string;
  config: AgentConfig;
  onEdit: () => void;
  index: number;
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'sisyphus': '主执行者，负责执行工作计划中的任务，持续推进直到完成',
  'sisyphus-junior': '轻量执行者，处理被委派的子任务，适合中小型工作',
  'hephaestus': '代码工匠，专注于代码实现、构建和工程细节',
  'oracle': '技术顾问，提供架构建议和深度技术分析',
  'librarian': '知识检索员，搜索文档、API 参考和最佳实践',
  'explore': '代码探索者，分析代码库结构、查找引用和模式',
  'multimodal-looker': '多模态观察者，分析图片、PDF 等视觉内容',
  'prometheus': '战略规划师，负责需求分析和工作计划制定',
  'metis': '计划审查员，检查计划的完整性和潜在遗漏',
  'momus': '质量审计员，严格验证计划的每个细节',
  'atlas': '任务调度器，协调多任务并行执行和依赖管理',
  'build': '构建代理，处理编译、打包和部署相关任务',
  'plan': '计划代理，辅助任务规划和分解',
  'OpenCode-Builder': 'OpenCode 构建器，核心代码生成和修改代理',
  'general': '通用代理，处理未分类的一般性任务',
  'frontend-ui-ux-engineer': '前端工程师，专注 UI/UX 设计和前端实现',
  'document-writer': '文档撰写者，负责技术文档和说明编写',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'visual-engineering': '视觉工程类任务：前端、UI/UX、设计、样式、动画',
  'ultrabrain': '高难度逻辑任务：复杂算法、架构设计、深度推理',
  'deep': '深度研究任务：需要彻底理解后再行动的复杂问题',
  'artistry': '创意类任务：非常规方案、创新设计、突破性思路',
  'quick': '快速任务：单文件修改、拼写修复、简单调整',
  'unspecified-low': '低复杂度未分类任务',
  'unspecified-high': '高复杂度未分类任务',
  'writing': '写作类任务：文档、技术写作、说明文档',
  'visual': '视觉类任务：图表、可视化、界面相关',
  'business-logic': '业务逻辑类任务：核心功能、数据处理、API',
  'data-analysis': '数据分析类任务：统计、报表、数据处理',
};

export function getAgentDescription(name: string, isCategory = false): string {
  if (isCategory) {
    return CATEGORY_DESCRIPTIONS[name] || '自定义分类';
  }
  return AGENT_DESCRIPTIONS[name] || '自定义代理';
}

function formatAgentName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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

function getAgentIcon(agentName: string): React.ReactNode {
  const iconClass = "w-5 h-5";
  const iconMap: Record<string, React.ReactNode> = {
    'sisyphus': <Hammer className={iconClass} />,
    'sisyphus-junior': <Wrench className={iconClass} />,
    'hephaestus': <Cpu className={iconClass} />,
    'oracle': <Brain className={iconClass} />,
    'librarian': <BookOpen className={iconClass} />,
    'explore': <Search className={iconClass} />,
    'multimodal-looker': <Eye className={iconClass} />,
    'prometheus': <Sparkles className={iconClass} />,
    'metis': <Shield className={iconClass} />,
    'momus': <Search className={iconClass} />,
    'atlas': <Map className={iconClass} />,
    'build': <Cpu className={iconClass} />,
    'plan': <Sparkles className={iconClass} />,
    'frontend-ui-ux-engineer': <Palette className={iconClass} />,
    'document-writer': <FileText className={iconClass} />,
    'general': <Users className={iconClass} />,
  };
  return iconMap[agentName] || <Bot className={iconClass} />;
}

export function AgentCard({ agentName, config, onEdit, index }: AgentCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const variantStyle = getVariantStyle(config.variant);
  const icon = getAgentIcon(agentName);
  const displayName = formatAgentName(agentName);
  const description = getAgentDescription(agentName);
  const shortModelName = config.model.split('/').pop() || config.model;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 px-4 py-3 bg-white rounded-xl border transition-all duration-150",
        "hover:shadow-md hover:border-indigo-300",
        "border-slate-200"
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Hover 预览浮层 */}
      {showTooltip && (
        <div className="absolute z-30 left-4 right-4 -top-2 -translate-y-full">
          <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <p className="font-medium mb-0.5">{displayName}</p>
            <p className="text-slate-300 leading-relaxed">{description}</p>
            <p className="text-slate-400 mt-1 font-mono text-[10px]">{config.model}</p>
            <div className="absolute left-8 -bottom-1 w-2 h-2 bg-slate-800 rotate-45" />
          </div>
        </div>
      )}

      {/* 序号 */}
      <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0 font-mono">
        {index + 1}
      </span>

      {/* 图标 */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
        "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
      )}>
        {icon}
      </div>

      {/* 名称 + 描述 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight">
          {displayName}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{description}</p>
      </div>

      {/* 模型 */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        <span
          className="text-xs font-medium text-slate-600 font-mono"
          title={config.model}
        >
          {shortModelName}
        </span>
      </div>

      {/* Variant 标签 */}
      <span className={cn(
        "flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variantStyle.bg,
        variantStyle.text,
        variantStyle.border
      )}>
        {config.variant || 'none'}
      </span>

      {/* 编辑按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-3.5 h-3.5 mr-1" />
        编辑
      </Button>
    </div>
  );
}
