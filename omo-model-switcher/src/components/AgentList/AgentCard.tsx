import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Bot, Cpu, Sparkles, Eye, Search, Hammer, BookOpen, Palette, Brain, Shield, Map, Wrench, FileText, Users, Zap, BarChart3 } from 'lucide-react';
import { cn } from '../common/cn';
import type { AgentConfig } from '../../services/tauri';

interface AgentCardProps {
  agentName: string;
  config: AgentConfig;
  onEdit: () => void;
  isCategory?: boolean;
}

export function getAgentDescription(name: string, t: (key: string) => string, isCategory = false): string {
  if (isCategory) {
    const key = `categoryDescriptions.${name}`;
    const val = t(key);
    return val !== key ? val : t('categoryDescriptions.custom');
  }
  const key = `agentDescriptions.${name}`;
  const val = t(key);
  return val !== key ? val : t('agentDescriptions.custom');
}

export function getAgentLocalizedName(name: string, t: (key: string) => string, isCategory = false): string {
  const prefix = isCategory ? 'categoryNames' : 'agentNames';
  const key = `${prefix}.${name}`;
  const val = t(key);
  return val !== key ? val : name;
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

function getAgentIcon(agentName: string, isCategory = false): React.ReactNode {
  const iconClass = "w-5 h-5";
  
  // Category icon mappings
  if (isCategory) {
    const categoryIconMap: Record<string, React.ReactNode> = {
      'visual-engineering': <Palette className={iconClass} />,
      'ultrabrain': <Brain className={iconClass} />,
      'deep': <Search className={iconClass} />,
      'artistry': <Sparkles className={iconClass} />,
      'quick': <Zap className={iconClass} />,
      'unspecified-low': <FileText className={iconClass} />,
      'unspecified-high': <FileText className={iconClass} />,
      'writing': <BookOpen className={iconClass} />,
      'visual': <Eye className={iconClass} />,
      'business-logic': <Cpu className={iconClass} />,
      'data-analysis': <BarChart3 className={iconClass} />,
    };
    return categoryIconMap[agentName] || <Bot className={iconClass} />;
  }
  
  // Agent icon mappings
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

function getProviderColor(provider: string): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    'openai': { bg: 'bg-green-100', text: 'text-green-700' },
    'anthropic': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'google': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'deepseek': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'moonshot': { bg: 'bg-pink-100', text: 'text-pink-700' },
    'alibaba': { bg: 'bg-red-100', text: 'text-red-700' },
    'baidu': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'tencent': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    'xai': { bg: 'bg-slate-100', text: 'text-slate-700' },
    'mistral': { bg: 'bg-teal-100', text: 'text-teal-700' },
    'cohere': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };
  return colors[provider.toLowerCase()] || { bg: 'bg-slate-100', text: 'text-slate-600' };
}

export function AgentCard({ agentName, config, onEdit, isCategory }: AgentCardProps) {
  const { t } = useTranslation();
  const variantStyle = getVariantStyle(config.variant);
  const icon = getAgentIcon(agentName, isCategory);
  const displayName = formatAgentName(agentName);
  const localizedName = getAgentLocalizedName(agentName, t, isCategory);
  const description = getAgentDescription(agentName, t, isCategory);
  const shortModelName = config.model.split('/').pop() || config.model;
  const provider = config.model.split('/')[0] || 'unknown';
  const providerColor = getProviderColor(provider);

  return (
    <div
      className={cn(
        "group relative flex flex-col p-4 bg-white rounded-xl border transition-all duration-200",
        "hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5",
        "border-slate-200"
      )}
    >
      <button
        onClick={onEdit}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-lg transition-all duration-200",
          "bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100",
          "hover:bg-indigo-50 hover:text-indigo-600",
          "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        )}
        title={t('agentCard.editConfig')}
      >
        <Edit2 className="w-4 h-4" />
      </button>

      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
        "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
      )}>
        {icon}
      </div>

      <div className="mb-2">
        <h3 className="font-semibold text-slate-800 text-base leading-tight">
          {displayName} · {localizedName}
        </h3>
      </div>

      <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2 flex-1">
        {description}
      </p>

      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-100">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
          providerColor.bg,
          providerColor.text
        )}>
          {provider}
        </span>

        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
          variantStyle.bg,
          variantStyle.text,
          variantStyle.border
        )}>
          {config.variant || 'none'}
        </span>
      </div>

      <div className="mt-2">
        <span
          className="text-xs text-slate-400 font-mono truncate block"
          title={config.model}
        >
          {shortModelName}
        </span>
      </div>
    </div>
  );
}
