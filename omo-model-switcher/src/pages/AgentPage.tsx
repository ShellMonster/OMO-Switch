import { Bot } from 'lucide-react';
import { AgentList } from '../components/AgentList';

export function AgentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Agent 模型切换</h2>
          <p className="text-slate-600 mt-1">管理每个 Agent 使用的 AI 模型和强度等级</p>
        </div>
      </div>

      <AgentList />
    </div>
  );
}
