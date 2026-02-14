import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PresetState {
  activePreset: string | null;  // null = "(默认配置)"
  setActivePreset: (name: string | null) => void;
  clearActivePreset: () => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set) => ({
      activePreset: null,
      setActivePreset: (name) => set({ activePreset: name }),
      clearActivePreset: () => set({ activePreset: null }),
    }),
    {
      name: 'omo-active-preset',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
