import { Bookmark, Plus, MoreVertical } from 'lucide-react';
import { Button } from '../components/common/Button';

export function PresetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">预设管理</h2>
            <p className="text-slate-600 mt-1">创建和管理您的模型预设配置</p>
          </div>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建预设
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-800">预设 {i}</h3>
                  <p className="text-sm text-slate-500">模型: llama2 · Temp: 0.8</p>
                </div>
              </div>
              
              <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
