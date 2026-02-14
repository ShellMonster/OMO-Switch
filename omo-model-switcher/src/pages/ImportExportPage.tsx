import { Download, Upload, FileJson, Database } from 'lucide-react';
import { Button } from '../components/common/Button';

export function ImportExportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
          <Download className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">导入导出</h2>
          <p className="text-slate-600 mt-1">备份和恢复您的配置与预设</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">导入配置</h3>
              <p className="text-sm text-slate-500">从 JSON 文件导入配置</p>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
            <FileJson className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-1">点击或拖拽文件到此处</p>
            <p className="text-xs text-slate-400">支持 .json 格式</p>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">导出配置</h3>
              <p className="text-sm text-slate-500">导出所有配置为 JSON</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Database className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">预设配置</p>
                <p className="text-xs text-slate-500">4 个预设</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <FileJson className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">应用设置</p>
                <p className="text-xs text-slate-500">系统参数</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded" />
            </div>
            
            <Button variant="primary" className="w-full mt-4">
              <Download className="w-4 h-4 mr-2" />
              导出配置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
