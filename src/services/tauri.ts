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

export async function getVerifiedAvailableModels(): Promise<Record<string, string[]>> {
  return invoke<Record<string, string[]>>('get_verified_available_models');
}

export interface AvailableModelsWithStatus {
  models: Record<string, string[]>;
  source: 'verified' | 'cache_fallback' | string;
  fallback_reason: string | null;
  validated_at: string;
}

export async function getAvailableModelsWithStatus(): Promise<AvailableModelsWithStatus> {
  return invoke<AvailableModelsWithStatus>('get_available_models_with_status');
}

export async function getConnectedProviders(): Promise<string[]> {
  return invoke<string[]>('get_connected_providers');
}

/**
 * 添加自定义模型到指定提供商
 * @param providerId 提供商ID
 * @param modelId 模型ID
 */
export async function addCustomModel(providerId: string, modelId: string): Promise<void> {
  return invoke<void>('add_custom_model', { providerId, modelId });
}

/**
 * 从指定提供商移除自定义模型
 * @param providerId 提供商ID
 * @param modelId 模型ID
 */
export async function removeCustomModel(providerId: string, modelId: string): Promise<void> {
  return invoke<void>('remove_custom_model', { providerId, modelId });
}

/**
 * 获取所有自定义模型
 * 返回格式：Record<providerId, modelId[]>
 */
export async function getCustomModels(): Promise<Record<string, string[]>> {
  return invoke<Record<string, string[]>>('get_custom_models');
}

export async function fetchModelsDev(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>('fetch_models_dev');
}

export async function getOmoConfig(): Promise<OmoConfig> {
  return invoke<OmoConfig>('read_omo_config');
}

export async function getOmoCacheDir(): Promise<string> {
  return invoke<string>('get_omo_cache_dir');
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

// ==================== 内置预设相关接口 ====================

/**
 * 内置预设信息
 */
export interface BuiltinPresetInfo {
  id: string;          // 预设 ID（如 "official-default", "economy", "high-performance"）
  name: string;        // 显示名称
  description: string; // 描述
  icon?: string;       // 图标名称（可选）
}

/**
 * 内置预设详细数据
 */
export interface BuiltinPresetData {
  id: string;
  name: string;
  description: string;
  agents: Record<string, AgentConfig>;     // Agent 配置
  categories: Record<string, AgentConfig>; // Category 配置
}

export async function savePreset(name: string): Promise<void> {
  return invoke<void>('save_preset', { name });
}

export async function loadPreset(name: string): Promise<void> {
  return invoke<void>('load_preset', { name });
}

export async function getPresetConfig(name: string): Promise<OmoConfig> {
  return invoke<OmoConfig>('get_preset_config', { name });
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

/**
 * 获取预设元数据（创建时间、更新时间、版本）
 */
export interface PresetMeta {
  created_at: number;
  updated_at: number;
  version: number;
}

export async function getPresetMeta(name: string): Promise<PresetMeta> {
  return invoke<PresetMeta>('get_preset_meta', { name });
}

export async function updatePreset(name: string): Promise<void> {
  return invoke<void>('update_preset', { name });
}

export async function applyUpdatesToPreset(
  name: string,
  updates: AgentUpdateRequest[]
): Promise<void> {
  return invoke<void>('apply_updates_to_preset', { name, updates });
}

/**
 * 获取内置预设列表
 * 返回三套内置预设：官方默认、经济模式、高性能模式
 */
export async function getBuiltinPresets(): Promise<BuiltinPresetInfo[]> {
  return invoke<BuiltinPresetInfo[]>('get_builtin_presets');
}

/**
 * 应用指定内置预设到配置文件
 * @param presetId 预设ID (official-default/economy/high-performance)
 */
export async function applyBuiltinPreset(presetId: string): Promise<void> {
  return invoke<void>('apply_builtin_preset', { presetId });
}

// ==================== 上游配置同步接口 ====================

/**
 * Category 默认配置
 * 对应上游配置中的 DEFAULT_CATEGORIES
 */
export interface CategoryDefault {
  model: string;
  variant?: string;
}

/**
 * Fallback 条目
 * 对应上游配置中的 FallbackEntry
 */
export interface FallbackEntry {
  providers: string[];
  model: string;
  variant?: string;
}

/**
 * 上游同步结果
 */
export interface UpstreamSyncResult {
  has_update: boolean;
  categories: Record<string, CategoryDefault>;
  agent_requirements: Record<string, FallbackEntry[]>;
  content_hash: string;
}

/**
 * 检查上游配置是否有更新
 * 从 GitHub Raw 获取最新配置并对比哈希
 */
export async function checkUpstreamUpdate(): Promise<UpstreamSyncResult> {
  return invoke<UpstreamSyncResult>('check_upstream_update');
}

export interface BackupInfo {
  filename: string;
  path: string;
  created_at: string;
  created_at_ts: number;
  size: number;
  operation: string;
}

export async function exportOmoConfig(path: string, recordHistory = false): Promise<void> {
  return invoke<void>('export_omo_config', { path, recordHistory });
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

export async function restoreBackup(path: string): Promise<void> {
  return invoke<void>('restore_backup', { path });
}

export async function deleteBackup(path: string): Promise<void> {
  return invoke<void>('delete_backup', { path });
}

export async function exportBackup(path: string, targetPath: string): Promise<void> {
  return invoke<void>('export_backup', { path, targetPath });
}

export async function clearBackupHistory(): Promise<number> {
  return invoke<number>('clear_backup_history');
}

export async function getBackupHistoryLimit(): Promise<number> {
  return invoke<number>('get_backup_history_limit');
}

export async function setBackupHistoryLimit(limit: number): Promise<number> {
  return invoke<number>('set_backup_history_limit', { limit });
}

// ==================== 配置快照相关接口 ====================

/**
 * 保存当前配置到缓存快照
 * 用于在外部修改检测时创建基线
 * 注意：后端会自己读取配置文件，无需前端传递
 */
export async function saveConfigSnapshot(): Promise<void> {
  return invoke<void>('save_config_snapshot');
}

/**
 * 获取配置文件的修改时间
 * 返回 Unix 时间戳（毫秒）
 */
export async function getConfigModificationTime(): Promise<number | null> {
  return invoke<number | null>('get_config_modification_time');
}

/**
 * 合并缓存快照与当前配置并保存
 * 用于"从缓存恢复"功能
 */
export async function mergeAndSave(): Promise<void> {
  return invoke<void>('merge_and_save');
}

export interface AcceptExternalChangesResult {
  config: OmoConfig;
  active_preset: string | null;
  preset_synced: boolean;
  preset_sync_error: string | null;
}

/**
 * 接受外部配置变更并同步快照/当前预设
 */
export async function acceptExternalChanges(): Promise<AcceptExternalChangesResult> {
  return invoke<AcceptExternalChangesResult>('accept_external_changes');
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
  updatePreset,
  exportOmoConfig,
  importOmoConfig,
  validateImport,
  getImportExportHistory,
  restoreBackup,
  deleteBackup,
  exportBackup,
  clearBackupHistory,
  getBackupHistoryLimit,
  setBackupHistoryLimit,

  // 配置快照
  saveConfigSnapshot,
  mergeAndSave,
  acceptExternalChanges,

  // 内置预设
  getBuiltinPresets,
  applyBuiltinPreset,

  // 自定义模型管理
  addCustomModel,
  removeCustomModel,
  getCustomModels,
};

export default tauriService;
