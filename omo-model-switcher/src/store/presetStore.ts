import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 预设配置接口
 */
export interface PresetConfig {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 预设状态管理 Store
 * 
 * 管理模型预设：
 * - 预设列表
 * - 当前激活预设
 * - 预设 CRUD 操作
 */
interface PresetState {
  // 预设列表
  presets: PresetConfig[];
  
  // 当前激活预设
  activePresetId: string | null;
  
  // 添加预设
  addPreset: (preset: Omit<PresetConfig, 'id' | 'createdAt' | 'updatedAt'>) => PresetConfig;
  
  // 更新预设
  updatePreset: (id: string, updates: Partial<PresetConfig>) => void;
  
  // 删除预设
  deletePreset: (id: string) => void;
  
  // 设置激活预设
  setActivePreset: (id: string | null) => void;
  
  // 获取激活预设
  getActivePreset: () => PresetConfig | null;
  
  // 导入预设
  importPresets: (presets: PresetConfig[]) => void;
  
  // 导出预设
  exportPresets: () => PresetConfig[];
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      addPreset: (presetData) => {
        const now = new Date().toISOString();
        const newPreset: PresetConfig = {
          ...presetData,
          id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          presets: [...state.presets, newPreset],
        }));
        
        return newPreset;
      },

      updatePreset: (id, updates) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id
              ? { ...preset, ...updates, updatedAt: new Date().toISOString() }
              : preset
          ),
        }));
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }));
      },

      setActivePreset: (id) => {
        set({ activePresetId: id });
      },

      getActivePreset: () => {
        const { presets, activePresetId } = get();
        if (!activePresetId) return null;
        return presets.find((p) => p.id === activePresetId) || null;
      },

      importPresets: (newPresets) => {
        set((state) => ({
          presets: [...state.presets, ...newPresets],
        }));
      },

      exportPresets: () => {
        return get().presets;
      },
    }),
    {
      name: 'omo-preset-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
