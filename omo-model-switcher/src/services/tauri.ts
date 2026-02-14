import { invoke } from '@tauri-apps/api/core';

export interface AgentConfig {
  model: string;
  variant?: 'max' | 'high' | 'medium' | 'low' | 'none';
}

export interface OmoConfig {
  $schema?: string;
  agents: Record<string, AgentConfig>;
  categories: Record<string, AgentConfig>;
}

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

export interface ModelPricing {
  prompt?: number;
  completion?: number;
  currency?: string;
}

export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  pricing?: ModelPricing;
}

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

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config');
}

export async function updateConfig(config: ConfigUpdate): Promise<AppConfig> {
  return invoke<AppConfig>('update_config', { config });
}

export async function resetConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('reset_config');
}

export async function listLocalModels(): Promise<OllamaModel[]> {
  return invoke<OllamaModel[]>('list_local_models');
}

export async function getModelDetails(modelName: string): Promise<ModelDetails> {
  return invoke<ModelDetails>('get_model_details', { modelName });
}

export async function deleteModel(modelName: string): Promise<void> {
  return invoke<void>('delete_model', { modelName });
}

/**
 * 拉取远程模型
 */
export async function pullModel(modelName: string): Promise<void> {
  return invoke<void>('pull_model', { modelName });
}

export async function getAvailableModels(): Promise<Record<string, string[]>> {
  return invoke<Record<string, string[]>>('get_available_models');
}

export async function getConnectedProviders(): Promise<string[]> {
  return invoke<string[]>('get_connected_providers');
}

export async function fetchModelsDev(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>('fetch_models_dev');
}

export async function getOmoConfig(): Promise<OmoConfig> {
  return invoke<OmoConfig>('read_omo_config');
}

export async function updateAgentModel(
  agentName: string,
  model: string,
  variant?: 'max' | 'high' | 'medium' | 'low' | 'none'
): Promise<OmoConfig> {
  return invoke<OmoConfig>('update_agent_model', { agentName, model, variant });
}

export async function updateAgentsBatch(
  updates: AgentUpdateRequest[]
): Promise<OmoConfig> {
  return invoke<OmoConfig>('update_agents_batch', { updates });
}

export interface PresetInfo {
  name: string;
  agentCount: number;
  categoryCount: number;
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

export async function getPresetInfo(name: string): Promise<[number, number, string]> {
  return invoke<[number, number, string]>('get_preset_info', { name });
}

export interface BackupInfo {
  filename: string;
  path: string;
  created_at: string;
  size: number;
}

export async function exportOmoConfig(path: string): Promise<void> {
  return invoke<void>('export_omo_config', { path });
}

export async function importOmoConfig(path: string): Promise<void> {
  return invoke<void>('import_omo_config', { path });
}

export async function validateImport(path: string): Promise<OmoConfig> {
  return invoke<OmoConfig>('validate_import', { path });
}

export async function getImportExportHistory(): Promise<BackupInfo[]> {
  return invoke<BackupInfo[]>('get_import_export_history');
}

// ==================== 版本检查接口 ====================

export interface VersionInfo {
  name: string;
  current_version: string | null;
  latest_version: string | null;
  has_update: boolean;
  update_command: string;
  update_hint: string;
  installed: boolean;
}

export async function checkVersions(): Promise<VersionInfo[]> {
  return invoke<VersionInfo[]>('check_versions');
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
  getOmoConfig,
  updateAgentModel,
  updateAgentsBatch,
  savePreset,
  loadPreset,
  listPresets,
  deletePreset,
  getPresetInfo,
  exportOmoConfig,
  importOmoConfig,
  validateImport,
  getImportExportHistory,
};

export default tauriService;
