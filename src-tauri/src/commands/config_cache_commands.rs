//! 配置缓存命令模块

use crate::services::config_cache_service;
use crate::services::config_cache_service::{ConfigChange, ConfigSnapshot};
use crate::services::config_service;
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
