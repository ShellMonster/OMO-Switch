import { create } from 'zustand';
import {
  getAvailableModels,
  getConnectedProviders,
  fetchModelsDev,
  checkVersions,
  getOmoConfig,
  checkUpstreamUpdate,
  type ModelInfo,
  type VersionInfo,
  type OmoConfig,
  type AgentConfig,
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
  // 上游配置更新状态
  upstreamUpdateStatus: {
    hasUpdate: boolean | null;  // null = 未检查，true = 有更新，false = 无更新
    lastChecked: string | null; // ISO 时间戳
    loading: boolean;
    error: string | null;
  };
  isPreloading: boolean;
  preloadComplete: boolean;
  // 请求锁 - 防止重复请求（内部状态，不对外暴露）
  _modelsRefreshing: boolean;
  _omoConfigRefreshing: boolean;
  _versionsRefreshing: boolean;
  _upstreamRefreshing: boolean;
  startPreload: () => void;
  loadOmoConfig: () => Promise<void>;
  refreshModels: () => Promise<void>;
  refreshVersions: () => Promise<void>;
  checkUpstreamUpdate: () => Promise<void>;  // 检查上游配置更新
  softRefreshAll: () => void;
  retryAll: () => void;
  // 更新 omoConfig 中特定 agent 或 category 的配置
  updateAgentInConfig: (agentName: string, config: AgentConfig) => void;
  updateCategoryInConfig: (categoryName: string, config: AgentConfig) => void;
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
  _upstreamRefreshing: false,

  // 上游配置更新状态初始值
  upstreamUpdateStatus: {
    hasUpdate: null,
    lastChecked: null,
    loading: false,
    error: null,
  },

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

loadOmoConfig: async () => {
  const state = get();

  // 防止重复请求
  if (state._omoConfigRefreshing) {
    return;
  }

  // 判断是否为首次加载（没有现有数据）
  const isFirstLoad = !state.omoConfig.data;

  // 乐观更新模式：
  // - 首次加载：显示 loading 状态
  // - 已有数据：静默后台刷新，不显示 loading（避免 UI 闪烁）
  if (isFirstLoad) {
    set({ _omoConfigRefreshing: true, omoConfig: { data: null, loading: true, error: null } });
  } else {
    set({ _omoConfigRefreshing: true });
  }

  try {
    const data = await getOmoConfig();
    set({
      omoConfig: { data, loading: false, error: null },
      _omoConfigRefreshing: false,
    });
  } catch (error) {
    set((current) => ({
      omoConfig: {
        // 首次加载失败清空数据，已有数据时保留旧数据（乐观更新）
        data: isFirstLoad ? null : current.omoConfig.data,
        loading: false,
        error: error instanceof Error ? error.message : '加载配置文件失败'
      },
      _omoConfigRefreshing: false,
    }));
  }
},

refreshModels: async () => {
  const state = get();

  // 防止重复请求
  if (state._modelsRefreshing) {
    return;
  }

  // 判断是否为首次加载
  const isFirstLoad = !state.models.grouped;

  // 乐观更新模式：已有数据时静默刷新，不显示 loading
  if (isFirstLoad) {
    set({ _modelsRefreshing: true, models: { grouped: null, providers: [], infos: {}, loading: true, error: null } });
  } else {
    set({ _modelsRefreshing: true });
  }

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

refreshVersions: async () => {
  const state = get();

  // 防止重复请求
  if (state._versionsRefreshing) {
    return;
  }

  // 判断是否为首次加载
  const isFirstLoad = !state.versions.data;

  // 乐观更新模式：已有数据时静默刷新，不显示 loading
  if (isFirstLoad) {
    set({ _versionsRefreshing: true, versions: { data: null, loading: true, error: null } });
  } else {
    set({ _versionsRefreshing: true });
  }

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

// 检查上游配置更新（静默执行，用于启动时后台检查）
checkUpstreamUpdate: async () => {
  const state = get();

  // 防止重复请求
  if (state._upstreamRefreshing) {
    return;
  }

  set({ _upstreamRefreshing: true, upstreamUpdateStatus: { ...state.upstreamUpdateStatus, loading: true } });

  try {
    const result = await checkUpstreamUpdate();
    set({
      upstreamUpdateStatus: {
        hasUpdate: result.has_update,
        lastChecked: new Date().toISOString(),
        loading: false,
        error: null,
      },
      _upstreamRefreshing: false,
    });
  } catch (error) {
    // 静默失败，网络不可用时不影响应用
    set({
      upstreamUpdateStatus: {
        hasUpdate: null,
        lastChecked: null,
        loading: false,
        error: error instanceof Error ? error.message : '检查上游更新失败',
      },
      _upstreamRefreshing: false,
    });
  }
},

// 软刷新所有数据（非阻塞后台刷新，用于页面进入时）
softRefreshAll: () => {
  // 并行调用三个刷新方法，全部为非阻塞后台刷新
  Promise.allSettled([
    get().loadOmoConfig(),
    get().refreshModels(),
    get().refreshVersions(),
  ]);
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
    get().loadOmoConfig(),
    get().refreshModels(),
    get().refreshVersions(),
  ]).finally(() => {
    set({ isPreloading: false });
  });
},

// 更新 omoConfig 中特定 agent 的配置
updateAgentInConfig: (agentName: string, config: AgentConfig) => {
  set((state) => {
    // 如果 omoConfig.data 不存在，不做任何更新
    if (!state.omoConfig.data) {
      return state;
    }
    return {
      omoConfig: {
        ...state.omoConfig,
        data: {
          ...state.omoConfig.data,
          agents: {
            ...state.omoConfig.data.agents,
            [agentName]: config,
          },
        },
      },
    };
  });
},

// 更新 omoConfig 中特定 category 的配置
updateCategoryInConfig: (categoryName: string, config: AgentConfig) => {
  set((state) => {
    // 如果 omoConfig.data 不存在，不做任何更新
    if (!state.omoConfig.data) {
      return state;
    }
    return {
      omoConfig: {
        ...state.omoConfig,
        data: {
          ...state.omoConfig.data,
          categories: {
            ...state.omoConfig.data.categories,
            [categoryName]: config,
          },
        },
      },
    };
  });
},
}));

export type { GroupedModels, PreloadState };
