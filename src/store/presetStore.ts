import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PresetState {
  // 当前激活的预设（null = 默认配置）
  activePreset: string | null;
  setActivePreset: (name: string | null) => void;
  clearActivePreset: () => void;

  // 预设列表缓存（避免重复 API 调用）
  presetList: string[];
  setPresetList: (list: string[]) => void;
  isLoadingPresetList: boolean;
  setIsLoadingPresetList: (loading: boolean) => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set) => ({
      activePreset: null,
      setActivePreset: (name) => set({ activePreset: name }),
      clearActivePreset: () => set({ activePreset: null }),

      // 预设列表缓存
      presetList: [],
      setPresetList: (presetList) => set({ presetList }),
      isLoadingPresetList: false,
      setIsLoadingPresetList: (isLoadingPresetList) => set({ isLoadingPresetList }),
    }),
    {
      name: 'omo-active-preset',
      storage: createJSONStorage(() => localStorage),
      // presetList 不持久化，每次启动从后端重新获取最新数据
      partialize: (state) => ({
        activePreset: state.activePreset,
      }),
    }
  )
);
