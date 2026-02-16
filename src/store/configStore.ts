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

      // Ollama 配置
      setOllamaHost: (ollamaHost) => set({ ollamaHost }),
      setOllamaPort: (ollamaPort) => set({ ollamaPort }),

      // 默认设置
      setDefaultModel: (defaultModel) => set({ defaultModel }),
      setDefaultTimeout: (defaultTimeout) => set({ defaultTimeout }),

      // 系统参数
      setTemperature: (temperature) => set({ temperature }),
      setTopP: (topP) => set({ topP }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),

      // 重置配置
      reset: () => set(defaultConfig),
    }),
    {
      name: 'omo-config-storage',
      storage: createJSONStorage(() => localStorage),
      // OMO 配置不从 localStorage 恢复，而是从文件读取
      partialize: (state) => ({
        ollamaHost: state.ollamaHost,
        ollamaPort: state.ollamaPort,
        defaultModel: state.defaultModel,
        defaultTimeout: state.defaultTimeout,
        temperature: state.temperature,
        topP: state.topP,
        maxTokens: state.maxTokens,
      }),
    }
  )
);
