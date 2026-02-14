import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 配置状态管理 Store
 * 
 * 管理应用配置：
 * - Ollama 连接配置
 * - 默认模型设置
 * - 系统参数配置
 */
export interface ConfigState {
  // Ollama 连接配置
  ollamaHost: string;
  ollamaPort: number;
  setOllamaHost: (host: string) => void;
  setOllamaPort: (port: number) => void;

  // 默认设置
  defaultModel: string;
  defaultTimeout: number;
  setDefaultModel: (model: string) => void;
  setDefaultTimeout: (timeout: number) => void;

  // 系统参数
  temperature: number;
  topP: number;
  maxTokens: number;
  setTemperature: (temp: number) => void;
  setTopP: (topP: number) => void;
  setMaxTokens: (tokens: number) => void;

  // 重置配置
  reset: () => void;
}

const defaultConfig = {
  ollamaHost: 'localhost',
  ollamaPort: 11434,
  defaultModel: '',
  defaultTimeout: 60,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...defaultConfig,

      setOllamaHost: (ollamaHost) => set({ ollamaHost }),
      setOllamaPort: (ollamaPort) => set({ ollamaPort }),

      setDefaultModel: (defaultModel) => set({ defaultModel }),
      setDefaultTimeout: (defaultTimeout) => set({ defaultTimeout }),

      setTemperature: (temperature) => set({ temperature }),
      setTopP: (topP) => set({ topP }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),

      reset: () => set(defaultConfig),
    }),
    {
      name: 'omo-config-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
