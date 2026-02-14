import { Bot, Sparkles } from 'lucide-react';

export function AgentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Agent 切换</h2>
          <p className="text-slate-600 mt-1">选择和管理您的 AI Agent 配置</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                就绪
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">Agent {i}</h3>
            <p className="text-sm text-slate-500">配置描述占位符</p>
          </div>
        ))}
      </div>
    </div>
  );
}
