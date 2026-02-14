import { Database, Download, Trash2 } from 'lucide-react';
import { SearchInput } from '../components/common/SearchInput';

export function ModelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">模型库</h2>
          <p className="text-slate-600 mt-1">查看和管理您的本地 Ollama 模型</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput 
            value="" 
            onChange={() => {}} 
            placeholder="搜索模型..."
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-sm font-medium text-slate-600 border-b border-slate-200">
          <div className="col-span-4">模型名称</div>
          <div className="col-span-3">参数规模</div>
          <div className="col-span-3">大小</div>
          <div className="col-span-2 text-right">操作</div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {['llama2:latest', 'mistral:7b', 'codellama:13b', 'phi3:mini'].map((model, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors"
            >
              <div className="col-span-4 font-medium text-slate-800">{model}</div>
              <div className="col-span-3 text-sm text-slate-600">7B</div>
              <div className="col-span-3 text-sm text-slate-600">3.8 GB</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button className="p-2 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
