import { invoke } from '@tauri-apps/api/core';

/**
 * Tauri 服务层
 * 
 * 封装所有 Tauri invoke 调用，提供类型安全的 API 接口
 * 对应后端的命令模块：
 * - config_commands
 * - model_commands
 * - omo_config_commands
 */

// ==================== Agent 配置相关接口 ====================

/**
 * Agent 配置项
 */
export interface AgentConfig {
  model: string;
  variant?: 'max' | 'high' | 'medium' | 'low' | 'none';
}

/**
 * Oh My OpenCode 完整配置结构
 */
export interface OmoConfig {
  $schema?: string;
  agents: Record<string, AgentConfig>;
  categories: Record<string, AgentConfig>;
}

/**
 * Agent 更新请求
 */
export interface AgentUpdateRequest {
  agentName: string;
  model: string;
  variant?: 'max' | 'high' | 'medium' | 'low' | 'none';
}

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

// ==================== OMO 配置命令 ====================

/**
 * 获取 Oh My OpenCode 配置
 */
export async function getOmoConfig(): Promise<OmoConfig> {
  return invoke<OmoConfig>('get_omo_config');
}

/**
 * 更新指定 Agent 的模型配置
 */
export async function updateAgentModel(
  agentName: string,
  model: string,
  variant?: 'max' | 'high' | 'medium' | 'low' | 'none'
): Promise<OmoConfig> {
  return invoke<OmoConfig>('update_agent_model', { agentName, model, variant });
}

/**
 * 批量更新多个 Agent 的模型配置
 */
export async function updateAgentsBatch(
  updates: AgentUpdateRequest[]
): Promise<OmoConfig> {
  return invoke<OmoConfig>('update_agents_batch', { updates });
}

// ==================== 预设管理命令 ====================

export interface PresetInfo {
  name: string;
  agentCount: number;
  createdAt: string;
}

export async function savePreset(name: string): Promise<void> {
  return invoke<void>('save_preset', { name });
}

export async function loadPreset(name: string): Promise<void> {
  return invoke<void>('load_preset', { name });
}

export async function listPresets(): Promise<string[]> {
  return invoke<string[]>('list_presets');
}

export async function deletePreset(name: string): Promise<void> {
  return invoke<void>('delete_preset', { name });
}

export async function getPresetInfo(name: string): Promise<[number, string]> {
  return invoke<[number, string]>('get_preset_info', { name });
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

  // OMO 配置
  getOmoConfig,
  updateAgentModel,
  updateAgentsBatch,

  // 预设管理
  savePreset,
  loadPreset,
  listPresets,
  deletePreset,
  getPresetInfo,
};

export default tauriService;
