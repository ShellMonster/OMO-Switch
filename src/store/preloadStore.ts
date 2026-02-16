import { create } from 'zustand';
import {
  getAvailableModels,
  getConnectedProviders,
  fetchModelsDev,
  checkVersions,
  getOmoConfig,
  type ModelInfo,
  type VersionInfo,
  type OmoConfig,
} from '../services/tauri';

interface GroupedModels {
  provider: string;
  models: string[];
}

interface PreloadState {
  // OMO 配置状态
  omoConfig: {
    data: OmoConfig | null;
    loading: boolean;
    error: string | null;
  };
  models: {
    grouped: GroupedModels[] | null;
    providers: string[];
    infos: Record<string, ModelInfo>;
    loading: boolean;
    error: string | null;
  };
  versions: {
    data: VersionInfo[] | null;
    loading: boolean;
    error: string | null;
  };
  isPreloading: boolean;
  preloadComplete: boolean;
  // 请求锁 - 防止重复请求（内部状态，不对外暴露）
  _modelsRefreshing: boolean;
  _omoConfigRefreshing: boolean;
  _versionsRefreshing: boolean;
  startPreload: () => void;
  loadOmoConfig: (force?: boolean) => Promise<void>;
  refreshModels: (force?: boolean) => Promise<void>;
  refreshVersions: (force?: boolean) => Promise<void>;
  retryAll: () => void;
}

export const usePreloadStore = create<PreloadState>((set, get) => ({
  // OMO 配置状态
  omoConfig: {
    data: null,
    loading: false,
    error: null,
  },

  models: {
    grouped: null,
    providers: [],
    infos: {},
    loading: false,
    error: null,
  },

  versions: {
    data: null,
    loading: false,
    error: null,
  },

  isPreloading: false,
  preloadComplete: false,

  // 请求锁初始值
  _modelsRefreshing: false,
  _omoConfigRefreshing: false,
  _versionsRefreshing: false,

  startPreload: () => {
    const state = get();
    if (state.preloadComplete || state.isPreloading) {
      return;
    }

    set({ isPreloading: true });

    // 使用 allSettled 保证部分失败不影响其他数据可用性。
    Promise.allSettled([get().loadOmoConfig(), get().refreshModels(), get().refreshVersions()]).finally(() => {
      set({ isPreloading: false, preloadComplete: true });
    });
  },

loadOmoConfig: async (force = false) => {
  const state = get();
  
  // 防止重复请求
  if (state._omoConfigRefreshing) {
    return;
  }

  if (!force && state.omoConfig.data) {
    return;
  }

  set({ _omoConfigRefreshing: true, omoConfig: { data: null, loading: true, error: null } });

  try {
    const data = await getOmoConfig();
    set({
      omoConfig: { data, loading: false, error: null },
      _omoConfigRefreshing: false,
    });
  } catch (error) {
    set({
      omoConfig: { 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : '加载配置文件失败' 
      },
      _omoConfigRefreshing: false,
    });
  }
},

refreshModels: async (force = false) => {
  const state = get();
  
  // 防止重复请求
  if (state._modelsRefreshing) {
    return;
  }

  // 如果已有数据且不是强制刷新，不刷新（让数据稳定）
  if (!force && state.models.grouped) {
    return;
  }

  set({ _modelsRefreshing: true, models: { ...state.models, loading: true, error: null } });

  try {
    const [modelsData, providersData, modelDetails] = await Promise.all([
      getAvailableModels(),
      getConnectedProviders(),
      fetchModelsDev(),
    ]);

    // 稳定排序：先按模型数量降序，数量相同按 provider 名称升序
    const grouped: GroupedModels[] = Object.entries(modelsData)
      .map(([provider, models]) => ({ provider, models }))
      .sort((a, b) => {
        if (b.models.length !== a.models.length) {
          return b.models.length - a.models.length;
        }
        return a.provider.localeCompare(b.provider);
      });

    const infos: Record<string, ModelInfo> = {};
    modelDetails.forEach((info) => {
      infos[info.id] = info;
    });

    set({
      models: { grouped, providers: providersData, infos, loading: false, error: null },
      _modelsRefreshing: false,
    });
  } catch (error) {
    set((current) => ({
      models: { 
        ...current.models, 
        loading: false, 
        error: error instanceof Error ? error.message : '加载模型数据失败' 
      },
      _modelsRefreshing: false,
    }));
  }
},

refreshVersions: async (force = false) => {
  const state = get();
  
  // 防止重复请求
  if (state._versionsRefreshing) {
    return;
  }

  // 如果已有数据且不是强制刷新，不刷新
  if (!force && state.versions.data) {
    return;
  }

  set({ _versionsRefreshing: true, versions: { ...state.versions, loading: true, error: null } });

  try {
    const data = await checkVersions();
    set({
      versions: { data, loading: false, error: null },
      _versionsRefreshing: false,
    });
  } catch (error) {
    set((current) => ({
      versions: { 
        ...current.versions, 
        loading: false, 
        error: error instanceof Error ? error.message : '检测版本信息失败' 
      },
      _versionsRefreshing: false,
    }));
  }
},

retryAll: () => {
  const state = get();
  
  // 防止重复触发
  if (state.isPreloading) {
    return;
  }
  
  set({ preloadComplete: false, isPreloading: true });
  
  // 使用 Promise.allSettled 等待所有请求完成
  Promise.allSettled([
    get().loadOmoConfig(true),
    get().refreshModels(true),
    get().refreshVersions(true),
  ]).finally(() => {
    set({ isPreloading: false });
  });
},
}));

export type { GroupedModels, PreloadState };
