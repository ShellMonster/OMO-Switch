import { invoke } from '@tauri-apps/api/core';

/**
 * Tauri 服务层
 * 
 * 封装所有 Tauri invoke 调用，提供类型安全的 API 接口
 * 对应后端的命令模块：
 * - config_commands
 * - model_commands
 */

// ==================== 配置相关接口 ====================

export interface AppConfig {
  ollama_host: string;
  ollama_port: number;
  default_model: string;
  default_timeout: number;
  temperature: number;
  top_p: number;
  max_tokens: number;
}

export interface ConfigUpdate {
  ollama_host?: string;
  ollama_port?: number;
  default_model?: string;
  default_timeout?: number;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

// ==================== 模型相关接口 ====================

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface ModelDetails {
  name: string;
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

// ==================== 配置命令 ====================

/**
 * 获取应用配置
 */
export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}

/**
 * 更新应用配置
 */
export async function updateConfig(config: ConfigUpdate): Promise<AppConfig> {
  return invoke<AppConfig>('update_config', { config });
}

/**
 * 重置配置为默认值
 */
export async function resetConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('reset_config');
}

// ==================== 模型命令 ====================

/**
 * 获取本地模型列表
 */
export async function listLocalModels(): Promise<OllamaModel[]> {
  return invoke<OllamaModel[]>('list_local_models');
}

/**
 * 获取模型详情
 */
export async function getModelDetails(modelName: string): Promise<ModelDetails> {
  return invoke<ModelDetails>('get_model_details', { modelName });
}

/**
 * 删除本地模型
 */
export async function deleteModel(modelName: string): Promise<void> {
  return invoke<void>('delete_model', { modelName });
}

/**
 * 拉取远程模型
 */
export async function pullModel(modelName: string): Promise<void> {
  return invoke<void>('pull_model', { modelName });
}

// ==================== 默认导出 ====================

const tauriService = {
  // 配置
  getConfig,
  updateConfig,
  resetConfig,
  
  // 模型
  listLocalModels,
  getModelDetails,
  deleteModel,
  pullModel,
};

export default tauriService;
