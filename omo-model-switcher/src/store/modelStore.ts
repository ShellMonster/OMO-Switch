import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 模型信息接口
 */
export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  parameterSize?: string;
  quantization?: string;
  family?: string;
  description?: string;
  tags?: string[];
}

/**
 * 模型状态管理 Store
 * 
 * 管理模型相关数据：
 * - 本地模型列表
 * - 当前选中模型
 * - 模型详情缓存
 */
interface ModelState {
  // 模型列表
  models: ModelInfo[];
  setModels: (models: ModelInfo[]) => void;

  // 当前选中模型
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;

  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;

  // 刷新模型列表
  refreshModels: () => Promise<void>;

  // 清除状态
  clear: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      models: [],
      setModels: (models) => set({ models }),

      selectedModel: '',
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      error: null,
      setError: (error) => set({ error }),

      refreshModels: async () => {
        set({ isLoading: true, error: null });
        try {
          // 实际实现时会调用 tauri 服务
          // const models = await tauriService.listLocalModels();
          // set({ models, isLoading: false });
          set({ isLoading: false });
        } catch (err) {
          set({ 
            error: err instanceof Error ? err.message : '刷新模型列表失败', 
            isLoading: false 
          });
        }
      },

      clear: () => set({ 
        models: [], 
        selectedModel: '', 
        error: null 
      }),
    }),
    {
      name: 'omo-model-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    }
  )
);
