import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI 状态管理 Store
 * 
 * 管理界面相关的状态：
 * - 当前页面
 * - 侧边栏折叠状态
 * - 主题设置
 */
interface UIState {
  // 当前页面
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // 侧边栏折叠状态
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // 主题
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentPage: 'agent',
      setCurrentPage: (currentPage) => set({ currentPage }),

      isSidebarCollapsed: false,
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),

      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'omo-ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
