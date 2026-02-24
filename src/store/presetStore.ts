import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { listPresets } from '../services/tauri';

interface PresetState {
  // 当前激活的预设（'default' = 默认预设）
  activePreset: string | null;
  setActivePreset: (name: string | null) => void;
  clearActivePreset: () => void;

  // 预设列表缓存（避免重复 API 调用）
  presetList: string[];
  setPresetList: (list: string[]) => void;
  isLoadingPresetList: boolean;
  setIsLoadingPresetList: (loading: boolean) => void;
  refreshPresetList: (force?: boolean) => Promise<string[]>;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      activePreset: 'default',
      setActivePreset: (name) => set({ activePreset: name }),
      clearActivePreset: () => set({ activePreset: 'default' }),

      // 预设列表缓存
      presetList: [],
      setPresetList: (presetList) => set({ presetList }),
      isLoadingPresetList: false,
      setIsLoadingPresetList: (isLoadingPresetList) => set({ isLoadingPresetList }),
      refreshPresetList: async (force = false) => {
        const { presetList, isLoadingPresetList } = get();
        if (isLoadingPresetList) {
          return presetList;
        }
        if (!force && presetList.length > 0) {
          return presetList;
        }

        set({ isLoadingPresetList: true });
        try {
          const names = await listPresets();
          set({ presetList: names });
          return names;
        } finally {
          set({ isLoadingPresetList: false });
        }
      },
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
