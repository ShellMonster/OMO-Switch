import { Settings, Server, Gauge } from 'lucide-react';

export function ConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">配置总览</h2>
          <p className="text-slate-600 mt-1">管理您的 Ollama 连接和默认参数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Server className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Ollama 连接</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">主机地址</span>
              <span className="font-medium text-slate-700">localhost</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">端口号</span>
              <span className="font-medium text-slate-700">11434</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Gauge className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-800">生成参数</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Temperature</span>
              <span className="font-medium text-slate-700">0.7</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Top P</span>
              <span className="font-medium text-slate-700">0.9</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
