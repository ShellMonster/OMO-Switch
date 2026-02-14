import { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, Download, Calendar, Users } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal, ConfirmModal } from '../common/Modal';
import { savePreset, loadPreset, listPresets, deletePreset, getPresetInfo } from '../../services/tauri';

interface PresetCardProps {
  name: string;
  agentCount: number;
  createdAt: string;
  onLoad: () => void;
  onDelete: () => void;
}

function PresetCard({ name, agentCount, createdAt, onLoad, onDelete }: PresetCardProps) {
  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{name}</h3>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{agentCount} agents</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoad}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            加载
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PresetWithInfo {
  name: string;
  agentCount: number;
  createdAt: string;
}

export function PresetManager() {
  const [presets, setPresets] = useState<PresetWithInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPresetList = async () => {
    try {
      setIsLoading(true);
      const names = await listPresets();
      
      const presetsWithInfo = await Promise.all(
        names.map(async (name) => {
          const [agentCount, createdAt] = await getPresetInfo(name);
          return { name, agentCount, createdAt };
        })
      );
      
      setPresets(presetsWithInfo);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预设列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPresetList();
  }, []);

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      setError('预设名称不能为空');
      return;
    }

    try {
      setIsLoading(true);
      await savePreset(newPresetName.trim());
      setShowSaveModal(false);
      setNewPresetName('');
      await loadPresetList();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存预设失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPreset = async (name: string) => {
    try {
      setIsLoading(true);
      await loadPreset(name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预设失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    try {
      setIsLoading(true);
      await deletePreset(selectedPreset);
      setShowDeleteModal(false);
      setSelectedPreset(null);
      await loadPresetList();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除预设失败');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (name: string) => {
    setSelectedPreset(name);
    setShowDeleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">我的预设</h3>
          <p className="text-sm text-slate-500 mt-1">
            {presets.length} 个预设配置
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          保存当前配置
        </Button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {isLoading && presets.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 mt-4">加载中...</p>
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">还没有保存任何预设</p>
          <p className="text-sm text-slate-400 mt-1">点击上方按钮保存当前配置</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <PresetCard
              key={preset.name}
              name={preset.name}
              agentCount={preset.agentCount}
              createdAt={preset.createdAt}
              onLoad={() => handleLoadPreset(preset.name)}
              onDelete={() => openDeleteModal(preset.name)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="保存预设"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSavePreset} isLoading={isLoading}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              预设名称
            </label>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="例如：开发环境配置"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
          </div>
          <p className="text-sm text-slate-500">
            将保存当前所有 Agent 的模型配置
          </p>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePreset}
        title="删除预设"
        message={`确定要删除预设 "${selectedPreset}" 吗？此操作无法撤销。`}
        confirmText="删除"
        confirmVariant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
