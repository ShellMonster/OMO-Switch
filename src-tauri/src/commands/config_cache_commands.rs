//! 配置缓存命令模块

use crate::services::config_cache_service;
use crate::services::config_cache_service::{ConfigChange, ConfigSnapshot};
use crate::services::config_service;
use crate::services::preset_service;
use serde::Serialize;
use serde_json::Value;
use std::fs;

#[tauri::command]
pub fn save_config_snapshot() -> Result<(), String> {
    let config = config_service::read_omo_config()?;
    config_cache_service::save_config_snapshot(&config)
}

/// 确保快照存在：如果快照不存在则从当前配置创建，已存在则跳过
#[tauri::command]
pub async fn ensure_snapshot_exists() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        // 检查快照是否已存在
        if config_cache_service::load_config_snapshot().is_some() {
            // 快照已存在，无需创建
            return Ok(false);
        }

        // 快照不存在，从当前配置创建
        let config = config_service::read_omo_config()?;
        config_cache_service::save_config_snapshot(&config)?;
        Ok(true) // 返回 true 表示创建了新快照
    })
    .await
    .map_err(|e| format!("确保快照存在失败: {}", e))?
}

#[tauri::command]
pub fn load_config_snapshot() -> Result<Option<ConfigSnapshot>, String> {
    Ok(config_cache_service::load_config_snapshot())
}

#[tauri::command]
pub async fn compare_with_snapshot() -> Result<Vec<ConfigChange>, String> {
    tokio::task::spawn_blocking(|| {
        let current_config = config_service::read_omo_config()?;
        let snapshot = config_cache_service::load_config_snapshot();

        match snapshot {
            Some(snap) => Ok(config_cache_service::compare_configs(
                &snap.config,
                &current_config,
            )),
            None => {
                // 快照不存在时，自动创建初始快照并返回空变更列表
                config_cache_service::save_config_snapshot(&current_config)?;
                Ok(Vec::new())
            }
        }
    })
    .await
    .map_err(|e| format!("比较配置失败: {}", e))?
}

#[tauri::command]
pub fn merge_and_save() -> Result<Value, String> {
    let current_config = config_service::read_omo_config()?;
    let snapshot = config_cache_service::load_config_snapshot();

    let merged_config = match snapshot {
        Some(snap) => config_cache_service::merge_configs(&snap.config, &current_config),
        None => current_config,
    };

    config_service::validate_config(&merged_config)?;
    config_service::write_omo_config(&merged_config)?;

    Ok(merged_config)
}

#[tauri::command]
pub fn get_config_modification_time() -> Result<Option<u64>, String> {
    let config_path = config_service::get_config_path()?;

    if !config_path.exists() {
        return Ok(None);
    }

    let metadata =
        fs::metadata(&config_path).map_err(|e| format!("获取配置文件元数据失败: {}", e))?;

    let modified = metadata
        .modified()
        .map_err(|e| format!("获取修改时间失败: {}", e))?;

    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("时间转换失败: {}", e))?;

    Ok(Some(duration.as_millis() as u64))
}

#[derive(Debug, Serialize)]
pub struct AcceptExternalChangesResult {
    pub config: Value,
    pub active_preset: Option<String>,
    pub preset_synced: bool,
    pub preset_sync_error: Option<String>,
}

/// 接受外部配置变更（原子流程）
///
/// 流程：
/// 1. 读取磁盘当前配置（外部变更后的最新值）
/// 2. 更新配置快照（避免重复弹出“外部修改”提示）
/// 3. 若当前激活的是用户预设，则同步该预设到最新配置
/// 4. 返回最终配置给前端用于即时刷新 UI
#[tauri::command]
pub async fn accept_external_changes() -> Result<AcceptExternalChangesResult, String> {
    tokio::task::spawn_blocking(|| {
        let config = config_service::read_omo_config()?;
        config_service::validate_config(&config)?;
        config_cache_service::save_config_snapshot(&config)?;

        let mut active_preset = preset_service::get_active_preset();
        let mut preset_synced = false;
        let mut preset_sync_error: Option<String> = None;

        if let Some(name) = active_preset.as_ref() {
            // 兼容旧版本遗留的内置预设标识，统一回退到 default
            if name.starts_with("__builtin__") {
                if let Err(err) = preset_service::set_active_preset("default") {
                    preset_sync_error = Some(err);
                } else {
                    active_preset = Some("default".to_string());
                }
            }
        }

        if let Some(name) = active_preset.as_ref() {
            if let Err(err) = preset_service::update_preset(name) {
                preset_sync_error = Some(err);
            } else {
                preset_synced = true;
            }
        }

        Ok(AcceptExternalChangesResult {
            config,
            active_preset,
            preset_synced,
            preset_sync_error,
        })
    })
    .await
    .map_err(|e| format!("接受外部变更失败: {}", e))?
}
