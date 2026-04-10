use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

use crate::services::config_service::write_string_atomically;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthEntry {
    #[serde(rename = "type")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Deserialize)]
struct ConnectedProvidersCache {
    connected: Vec<String>,
    #[allow(dead_code)]
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct ProviderModelsCache {
    models: HashMap<String, Vec<ProviderModelEntry>>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum ProviderModelEntry {
    Id(String),
    Object {
        id: String,
        #[allow(dead_code)]
        #[serde(rename = "providerID")]
        provider_id: Option<String>,
        #[allow(dead_code)]
        name: Option<String>,
    },
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProviderPresetEntry {
    pub id: String,
    pub name: String,
    pub npm: Option<String>,
    pub website_url: Option<String>,
}

pub fn get_auth_file_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("opencode")
        .join("auth.json"))
}

pub fn get_opencode_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("opencode.json"))
}

fn get_omo_cache_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home).join(".cache").join("oh-my-opencode"))
}

pub fn get_provider_models_path() -> Result<PathBuf, String> {
    Ok(get_omo_cache_dir()?.join("provider-models.json"))
}

pub fn get_connected_providers_path() -> Result<PathBuf, String> {
    Ok(get_omo_cache_dir()?.join("connected-providers.json"))
}

pub fn get_provider_icon_cache_path(provider_id: &str) -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home)
        .join(".cache")
        .join("oh-my-opencode")
        .join("provider-icons")
        .join(format!("{}.png", provider_id)))
}

pub fn read_auth_file() -> Result<HashMap<String, AuthEntry>, String> {
    let auth_path = get_auth_file_path()?;
    if !auth_path.exists() {
        return Ok(HashMap::new());
    }

    let content =
        fs::read_to_string(&auth_path).map_err(|e| format!("读取 auth.json 失败: {}", e))?;
    if content.trim().is_empty() {
        return Ok(HashMap::new());
    }

    serde_json::from_str(&content).map_err(|e| format!("解析 auth.json 失败: {}", e))
}

pub fn write_auth_file(auth: &HashMap<String, AuthEntry>) -> Result<(), String> {
    let auth_path = get_auth_file_path()?;
    if let Some(parent) = auth_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建认证文件目录失败: {}", e))?;
    }

    let json_string =
        serde_json::to_string_pretty(auth).map_err(|e| format!("序列化 auth.json 失败: {}", e))?;
    write_string_atomically(&auth_path, &json_string, "写入 auth.json 失败")
}

pub fn read_opencode_config() -> Result<Value, String> {
    let config_path = get_opencode_config_path()?;
    if !config_path.exists() {
        return Ok(json!({}));
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取配置文件失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))
}

pub fn write_opencode_config(config: &Value) -> Result<(), String> {
    let config_path = get_opencode_config_path()?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    if config_path.exists() {
        let backup_path = config_path.with_extension("json.bak");
        if let Err(e) = fs::copy(&config_path, &backup_path) {
            eprintln!("警告：备份配置文件失败: {}", e);
        }
    }

    if config.get("provider").is_none() {
        return Err("配置缺少 provider 字段，拒绝写入以防止数据丢失".to_string());
    }

    let json_string =
        serde_json::to_string_pretty(config).map_err(|e| format!("序列化 JSON 失败: {}", e))?;
    write_string_atomically(&config_path, &json_string, "写入配置文件失败")
}

pub fn write_opencode_config_raw(config: &Value) -> Result<(), String> {
    let config_path = get_opencode_config_path()?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    let json_string =
        serde_json::to_string_pretty(config).map_err(|e| format!("序列化 JSON 失败: {}", e))?;
    write_string_atomically(&config_path, &json_string, "恢复配置文件失败")
}

pub fn restore_auth_state(
    auth_existed: bool,
    original_auth: &HashMap<String, AuthEntry>,
) -> Result<(), String> {
    let auth_path = get_auth_file_path()?;
    if !auth_existed && original_auth.is_empty() {
        if auth_path.exists() {
            fs::remove_file(&auth_path).map_err(|e| format!("回滚 auth.json 失败: {}", e))?;
        }
        return Ok(());
    }

    write_auth_file(original_auth).map_err(|e| format!("回滚 auth.json 失败: {}", e))
}

pub fn restore_opencode_config_state(
    config_existed: bool,
    original_config: &Value,
) -> Result<(), String> {
    let config_path = get_opencode_config_path()?;
    if !config_existed {
        if config_path.exists() {
            fs::remove_file(&config_path).map_err(|e| format!("回滚 opencode.json 失败: {}", e))?;
        }
        return Ok(());
    }

    write_opencode_config_raw(original_config)
        .map_err(|e| format!("回滚 opencode.json 失败: {}", e))
}

pub fn load_builtin_provider_presets() -> HashMap<String, ProviderPresetEntry> {
    let content = include_str!("../../presets/providers.json");
    let Ok(entries) = serde_json::from_str::<Vec<ProviderPresetEntry>>(content) else {
        return HashMap::new();
    };

    entries
        .into_iter()
        .map(|entry| (entry.id.clone(), entry))
        .collect()
}

pub fn read_config_provider_ids() -> Result<HashSet<String>, String> {
    let config = read_opencode_config()?;
    let mut result = HashSet::new();
    if let Some(provider_obj) = config.get("provider").and_then(|value| value.as_object()) {
        for provider_id in provider_obj.keys() {
            result.insert(provider_id.clone());
        }
    }
    Ok(result)
}

pub fn read_connected_providers() -> Result<HashSet<String>, String> {
    let path = get_connected_providers_path()?;
    if !path.exists() {
        return Ok(HashSet::new());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取 connected-providers.json 失败: {}", e))?;
    let cache: ConnectedProvidersCache = serde_json::from_str(&content)
        .map_err(|e| format!("解析 connected-providers.json 失败: {}", e))?;
    Ok(cache.connected.into_iter().collect())
}

pub fn read_provider_models() -> Result<HashMap<String, Vec<String>>, String> {
    let path = get_provider_models_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("读取 provider-models.json 失败: {}", e))?;
    let cache: ProviderModelsCache = serde_json::from_str(&content)
        .map_err(|e| format!("解析 provider-models.json 失败: {}", e))?;
    Ok(cache
        .models
        .into_iter()
        .map(|(provider_id, entries)| {
            let models = entries
                .into_iter()
                .filter_map(|entry| match entry {
                    ProviderModelEntry::Id(id) => {
                        let trimmed = id.trim().to_string();
                        (!trimmed.is_empty()).then_some(trimmed)
                    }
                    ProviderModelEntry::Object { id, .. } => {
                        let trimmed = id.trim().to_string();
                        (!trimmed.is_empty()).then_some(trimmed)
                    }
                })
                .collect::<Vec<_>>();
            (provider_id, models)
        })
        .collect())
}

pub fn get_auth_provider_ids() -> Vec<String> {
    read_auth_file()
        .map(|auth| auth.keys().cloned().collect())
        .unwrap_or_default()
}

pub fn get_opencode_config_provider_ids() -> Vec<String> {
    read_opencode_config()
        .ok()
        .and_then(|value| {
            value
                .get("provider")
                .and_then(|v| v.as_object())
                .map(|obj| obj.keys().cloned().collect())
        })
        .unwrap_or_default()
}

pub fn get_custom_models() -> HashMap<String, Vec<String>> {
    let mut result = HashMap::new();
    let Ok(config) = read_opencode_config() else {
        return result;
    };

    if let Some(provider_obj) = config
        .get("provider")
        .and_then(|provider| provider.as_object())
    {
        for (provider_id, provider_config) in provider_obj {
            if let Some(models_obj) = provider_config
                .get("models")
                .and_then(|models| models.as_object())
            {
                let model_ids: Vec<String> = models_obj.keys().cloned().collect();
                if !model_ids.is_empty() {
                    result.insert(provider_id.clone(), model_ids);
                }
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    #[serial]
    fn test_read_provider_models_supports_string_and_object_entries() {
        let temp_dir = std::env::temp_dir().join("omo-provider-store-models-test");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let cache_dir = temp_dir.join(".cache").join("oh-my-opencode");
        std::fs::create_dir_all(&cache_dir).unwrap();
        std::fs::write(
            cache_dir.join("provider-models.json"),
            r#"{
              "models": {
                "openai": ["gpt-5", {"id": "gpt-4.1", "providerID": "openai"}],
                "anthropic": [{"id": "claude-sonnet-4-5"}]
              }
            }"#,
        )
        .unwrap();

        let models = read_provider_models().unwrap();

        assert_eq!(
            models.get("openai").cloned(),
            Some(vec!["gpt-5".to_string(), "gpt-4.1".to_string()])
        );
        assert_eq!(
            models.get("anthropic").cloned(),
            Some(vec!["claude-sonnet-4-5".to_string()])
        );

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_get_auth_provider_ids_returns_empty_on_invalid_json() {
        let temp_dir = std::env::temp_dir().join("omo-provider-store-auth-ids-test");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let auth_dir = temp_dir.join(".local").join("share").join("opencode");
        std::fs::create_dir_all(&auth_dir).unwrap();
        std::fs::write(auth_dir.join("auth.json"), "{invalid json").unwrap();

        let provider_ids = get_auth_provider_ids();
        assert!(provider_ids.is_empty());

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_get_custom_models_reads_provider_model_keys() {
        let temp_dir = std::env::temp_dir().join("omo-provider-store-custom-models-test");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).unwrap();

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let config_dir = temp_dir.join(".config").join("opencode");
        std::fs::create_dir_all(&config_dir).unwrap();
        std::fs::write(
            config_dir.join("opencode.json"),
            r#"{
              "provider": {
                "openai": { "models": { "gpt-5": {}, "gpt-4.1": {} } },
                "anthropic": { "models": { "claude-3-7-sonnet": {} } }
              }
            }"#,
        )
        .unwrap();

        let custom_models = get_custom_models();

        assert_eq!(custom_models.get("openai").map(|m| m.len()), Some(2));
        assert_eq!(
            custom_models.get("anthropic").cloned(),
            Some(vec!["claude-3-7-sonnet".to_string()])
        );

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
