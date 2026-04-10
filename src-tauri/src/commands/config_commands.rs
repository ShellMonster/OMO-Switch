use chrono::{DateTime, Local};
use serde::Serialize;
use crate::services::config_service;
use serde_json::Value;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigMetadata {
    pub path: String,
    pub last_modified: String,
    pub size: u64,
}

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    config_service::get_config_path().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_config_metadata() -> Result<ConfigMetadata, String> {
    let config_path = config_service::get_config_path()?;
    let metadata = std::fs::metadata(&config_path)
        .map_err(|e| format!("获取配置文件元数据失败: {}", e))?;
    let modified = metadata
        .modified()
        .map_err(|e| format!("获取修改时间失败: {}", e))?;

    Ok(ConfigMetadata {
        path: config_path.to_string_lossy().to_string(),
        last_modified: DateTime::<Local>::from(modified).to_rfc3339(),
        size: metadata.len(),
    })
}

#[tauri::command]
pub async fn read_omo_config() -> Result<Value, String> {
    tokio::task::spawn_blocking(|| {
        config_service::read_omo_config()
    })
    .await
    .map_err(|e| format!("读取配置失败: {}", e))?
}

#[tauri::command]
pub fn write_omo_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)?;
    config_service::write_omo_config(&config)
}

#[tauri::command]
pub fn validate_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)
}

/// 获取 OMO 缓存目录路径
/// 返回 ~/.cache/oh-my-opencode/
#[tauri::command]
pub fn get_omo_cache_dir() -> Result<String, String> {
    // 获取系统缓存目录
    let cache_dir = dirs::cache_dir().ok_or_else(|| "无法获取系统缓存目录".to_string())?;

    // 拼接 oh-my-opencode 子目录
    let omo_cache = cache_dir.join("oh-my-opencode");
    // 返回绝对路径，供 reveal/open 等 API 直接使用
    Ok(omo_cache.to_string_lossy().to_string())
}

#[tauri::command]
pub fn update_agent_model(
    agent_name: String,
    model: String,
    variant: Option<String>,
) -> Result<Value, String> {
    let mut config = config_service::read_omo_config()?;

    // 尝试在 agents 中更新
    if let Some(agents) = config.get_mut("agents").and_then(|a| a.as_object_mut()) {
        if let Some(agent) = agents.get_mut(&agent_name) {
            if let Some(obj) = agent.as_object_mut() {
                obj.insert("model".to_string(), Value::String(model.clone()));
                if let Some(v) = &variant {
                    if v != "none" {
                        obj.insert("variant".to_string(), Value::String(v.clone()));
                    } else {
                        obj.remove("variant");
                    }
                }
            }
        }
    }

    // 也尝试在 categories 中更新
    if let Some(categories) = config.get_mut("categories").and_then(|c| c.as_object_mut()) {
        if let Some(category) = categories.get_mut(&agent_name) {
            if let Some(obj) = category.as_object_mut() {
                obj.insert("model".to_string(), Value::String(model.clone()));
                if let Some(v) = &variant {
                    if v != "none" {
                        obj.insert("variant".to_string(), Value::String(v.clone()));
                    } else {
                        obj.remove("variant");
                    }
                }
            }
        }
    }

    config_service::write_omo_config(&config)?;
    Ok(config)
}

/// 批量更新请求结构
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentUpdateRequest {
    pub agent_name: String,
    pub model: String,
    pub variant: Option<String>,
}

/// 批量更新多个 agent/category 的模型配置
/// 一次性写入配置文件，避免多次 IO 操作
#[tauri::command]
pub fn update_agents_batch(
    updates: Vec<AgentUpdateRequest>,
) -> Result<Value, String> {
    let mut config = config_service::read_omo_config()?;

    for update in updates {
        // 更新 agents
        if let Some(agents) = config.get_mut("agents").and_then(|a| a.as_object_mut()) {
            if let Some(agent) = agents.get_mut(&update.agent_name) {
                if let Some(obj) = agent.as_object_mut() {
                    obj.insert("model".to_string(), Value::String(update.model.clone()));
                    if let Some(ref v) = update.variant {
                        if v != "none" {
                            obj.insert("variant".to_string(), Value::String(v.clone()));
                        } else {
                            obj.remove("variant");
                        }
                    }
                }
            }
        }

        // 更新 categories
        if let Some(categories) = config.get_mut("categories").and_then(|c| c.as_object_mut()) {
            if let Some(category) = categories.get_mut(&update.agent_name) {
                if let Some(obj) = category.as_object_mut() {
                    obj.insert("model".to_string(), Value::String(update.model.clone()));
                    if let Some(ref v) = update.variant {
                        if v != "none" {
                            obj.insert("variant".to_string(), Value::String(v.clone()));
                        } else {
                            obj.remove("variant");
                        }
                    }
                }
            }
        }
    }

    // 只写入一次配置文件
    config_service::write_omo_config(&config)?;
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_get_config_metadata_reads_existing_file() {
        let temp_dir = std::env::temp_dir().join("omo-config-metadata-test");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let config_dir = temp_dir.join(".config").join("opencode");
        std::fs::create_dir_all(&config_dir).unwrap();
        let config_path = config_dir.join("oh-my-openagent.json");
        std::fs::write(
            &config_path,
            r#"{"agents":{"sisyphus":{"model":"gpt-5"}},"categories":{}}"#,
        )
        .unwrap();

        let metadata = get_config_metadata().unwrap();

        assert_eq!(metadata.path, config_path.to_string_lossy().to_string());
        assert!(metadata.size > 0);
        assert!(!metadata.last_modified.is_empty());

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
