use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::services::provider_store;
use crate::services::provider_store::AuthEntry;

const BASE_URL_COMPATIBLE_PROVIDERS: &[&str] = &[
    "openai",
    "deepseek",
    "groq",
    "openrouter",
    "xai",
    "moonshotai",
    "moonshotai-cn",
    "kimi-for-coding",
    "zhipuai",
    "zhipuai-coding-plan",
    "minimax",
    "minimax-cn",
    "minimax-coding-plan",
    "minimax-cn-coding-plan",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub npm: Option<String>,
    pub website_url: Option<String>,
    pub is_configured: bool,
    pub is_builtin: bool,
    pub supports_base_url: bool,
    pub supports_connection_test: bool,
    pub can_delete_auth: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfigSnapshot {
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub provider_type: Option<String>,
    pub default_provider_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub message: String,
}

pub fn provider_default_npm(provider_id: &str) -> &'static str {
    match provider_id {
        "openai" => "@ai-sdk/openai",
        "github-copilot" => "@ai-sdk/github-copilot",
        "zhipuai"
        | "zhipuai-coding-plan"
        | "moonshotai"
        | "moonshotai-cn"
        | "kimi-for-coding"
        | "minimax"
        | "minimax-cn"
        | "minimax-coding-plan"
        | "minimax-cn-coding-plan" => "@ai-sdk/openai-compatible",
        "deepseek" => "@ai-sdk/anthropic",
        "xai" => "@ai-sdk/openai",
        "groq" => "@ai-sdk/groq",
        "openrouter" => "@openrouter/ai-sdk-provider",
        _ => "@ai-sdk/openai",
    }
}

pub fn provider_supports_base_url(provider_id: &str) -> bool {
    provider_id != "opencode"
}

pub fn provider_supports_connection_test(provider_id: &str) -> bool {
    BASE_URL_COMPATIBLE_PROVIDERS.contains(&provider_id)
}

pub fn is_valid_base_url(url: &str) -> bool {
    let trimmed = url.trim();
    !trimmed.is_empty()
        && (trimmed.starts_with("https://") || trimmed.starts_with("http://"))
        && trimmed.contains("://")
}

fn get_provider_base_url(provider_id: &str, config: &Value) -> Option<String> {
    config
        .get("provider")
        .and_then(|providers| providers.get(provider_id))
        .and_then(|provider| provider.get("options"))
        .and_then(|options| options.get("baseURL").or_else(|| options.get("baseUrl")))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn get_provider_npm(provider_id: &str, config: &Value) -> Option<String> {
    config
        .get("provider")
        .and_then(|providers| providers.get(provider_id))
        .and_then(|provider| provider.get("npm"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

pub fn get_provider_status() -> Result<Vec<ProviderInfo>, String> {
    let provider_models = provider_store::read_provider_models()?;
    let connected = provider_store::read_connected_providers()?;
    let auth_data = match provider_store::read_auth_file() {
        Ok(data) => data,
        Err(err) => {
            eprintln!("警告：读取 auth.json 失败，降级为空认证数据: {}", err);
            HashMap::new()
        }
    };
    let config_provider_ids = match provider_store::read_config_provider_ids() {
        Ok(ids) => ids,
        Err(err) => {
            eprintln!(
                "警告：读取 opencode provider 失败，降级为空配置数据: {}",
                err
            );
            Default::default()
        }
    };
    let builtin_presets = provider_store::load_builtin_provider_presets();

    let mut provider_ids: std::collections::HashSet<String> =
        builtin_presets.keys().cloned().collect();
    provider_ids.extend(provider_models.keys().cloned());
    provider_ids.extend(connected.iter().cloned());
    provider_ids.extend(auth_data.keys().cloned());
    provider_ids.extend(config_provider_ids);

    let mut providers = Vec::new();
    for provider_id in provider_ids {
        let preset = builtin_presets.get(&provider_id);
        let has_auth = auth_data.contains_key(&provider_id);
        let is_configured = connected.contains(&provider_id) || has_auth;
        providers.push(ProviderInfo {
            id: provider_id.clone(),
            name: preset
                .map(|entry| entry.name.clone())
                .unwrap_or_else(|| provider_id.clone()),
            npm: preset.and_then(|entry| entry.npm.clone()),
            website_url: preset.and_then(|entry| entry.website_url.clone()),
            is_configured,
            is_builtin: preset.is_some(),
            supports_base_url: provider_supports_base_url(&provider_id),
            supports_connection_test: provider_supports_connection_test(&provider_id),
            can_delete_auth: has_auth,
        });
    }

    providers.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(providers)
}

pub fn get_provider_config(provider_id: String) -> Result<ProviderConfigSnapshot, String> {
    let auth_data = match provider_store::read_auth_file() {
        Ok(data) => data,
        Err(err) => {
            eprintln!("警告：读取 auth.json 失败，降级为空认证数据: {}", err);
            HashMap::new()
        }
    };
    let config = provider_store::read_opencode_config()?;

    let api_key = auth_data
        .get(&provider_id)
        .and_then(|entry| entry.key.clone())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    Ok(ProviderConfigSnapshot {
        api_key,
        base_url: get_provider_base_url(&provider_id, &config),
        provider_type: get_provider_npm(&provider_id, &config),
        default_provider_type: provider_default_npm(&provider_id).to_string(),
    })
}

pub fn test_provider_connection(
    npm: String,
    base_url: Option<String>,
    api_key: String,
) -> Result<ConnectionTestResult, String> {
    if api_key.trim().is_empty() {
        return Ok(ConnectionTestResult {
            success: false,
            message: "API Key 不能为空".to_string(),
        });
    }

    if let Some(url) = base_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if !is_valid_base_url(url) {
            return Ok(ConnectionTestResult {
                success: false,
                message: "Base URL 必须以 http:// 或 https:// 开头".to_string(),
            });
        }
    }

    if !npm.trim().is_empty() && !npm.trim().starts_with('@') {
        return Ok(ConnectionTestResult {
            success: false,
            message: "Provider npm 标识格式无效".to_string(),
        });
    }

    Ok(ConnectionTestResult {
        success: true,
        message: "配置校验通过".to_string(),
    })
}

pub fn set_provider_api_key(
    provider_id: String,
    api_key: String,
    base_url: Option<String>,
    provider_type: Option<String>,
) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("API Key 不能为空".to_string());
    }

    let provider_id_for_config = provider_id.clone();
    let auth_existed = provider_store::get_auth_file_path()?.exists();
    let original_auth = provider_store::read_auth_file()?;
    let mut auth_data = original_auth.clone();

    auth_data.insert(
        provider_id,
        AuthEntry {
            auth_type: Some("api".to_string()),
            key: Some(api_key),
            extra: HashMap::new(),
        },
    );

    provider_store::write_auth_file(&auth_data)?;

    if provider_supports_base_url(&provider_id_for_config) {
        let original_config = provider_store::read_opencode_config()?;
        let mut config = original_config.clone();
        if config.get("provider").is_none() {
            config["provider"] = json!({});
        }
        if config["provider"].get(&provider_id_for_config).is_none() {
            config["provider"][&provider_id_for_config] = json!({
                "npm": provider_default_npm(&provider_id_for_config)
            });
        }

        let selected_provider_type = provider_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| provider_default_npm(&provider_id_for_config));
        config["provider"][&provider_id_for_config]["npm"] = json!(selected_provider_type);

        let trimmed = base_url
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());
        if let Some(url) = trimmed {
            if !is_valid_base_url(url) {
                provider_store::restore_auth_state(auth_existed, &original_auth)?;
                return Err("Base URL 必须以 http:// 或 https:// 开头".to_string());
            }
            if config["provider"][&provider_id_for_config]
                .get("options")
                .is_none()
            {
                config["provider"][&provider_id_for_config]["options"] = json!({});
            }
            config["provider"][&provider_id_for_config]["options"]["baseURL"] = json!(url);
        } else if let Some(options) =
            config["provider"][&provider_id_for_config]["options"].as_object_mut()
        {
            options.remove("baseURL");
            if options.is_empty() {
                config["provider"][&provider_id_for_config]
                    .as_object_mut()
                    .and_then(|provider| provider.remove("options"));
            }
        }

        if let Err(err) = provider_store::write_opencode_config(&config) {
            provider_store::restore_auth_state(auth_existed, &original_auth)?;
            return Err(err);
        }
    }

    Ok(())
}

pub fn delete_provider_auth(provider_id: String) -> Result<(), String> {
    let mut auth_data = provider_store::read_auth_file()?;
    if auth_data.remove(&provider_id).is_none() {
        return Ok(());
    }
    provider_store::write_auth_file(&auth_data)
}

pub fn add_custom_provider(
    name: String,
    api_key: String,
    base_url: String,
) -> Result<ProviderInfo, String> {
    if name.trim().is_empty() {
        return Err("Provider 名称不能为空".to_string());
    }
    if api_key.trim().is_empty() {
        return Err("API Key 不能为空".to_string());
    }
    if !is_valid_base_url(&base_url) {
        return Err("Base URL 必须以 http:// 或 https:// 开头".to_string());
    }

    let provider_key = name.to_lowercase().replace(' ', "-").replace('_', "-");
    let auth_existed = provider_store::get_auth_file_path()?.exists();
    let config_existed = provider_store::get_opencode_config_path()?.exists();

    let original_config = provider_store::read_opencode_config()?;
    let mut config = original_config.clone();
    if config.get("provider").is_none() {
        config["provider"] = json!({});
    }

    config["provider"][&provider_key] = json!({
        "npm": "@ai-sdk/openai-compatible",
        "options": { "baseURL": base_url }
    });

    provider_store::write_opencode_config(&config)?;

    let original_auth = provider_store::read_auth_file()?;
    let mut auth_data = original_auth.clone();
    auth_data.insert(
        provider_key.clone(),
        AuthEntry {
            auth_type: Some("api".to_string()),
            key: Some(api_key),
            extra: HashMap::new(),
        },
    );

    if let Err(err) = provider_store::write_auth_file(&auth_data) {
        provider_store::restore_opencode_config_state(config_existed, &original_config)?;
        provider_store::restore_auth_state(auth_existed, &original_auth)?;
        return Err(err);
    }

    Ok(ProviderInfo {
        id: provider_key,
        name,
        npm: Some("@ai-sdk/openai-compatible".to_string()),
        website_url: Some(base_url),
        is_configured: true,
        is_builtin: false,
        supports_base_url: true,
        supports_connection_test: true,
        can_delete_auth: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn test_test_provider_connection_uses_validation_wording() {
        let result = test_provider_connection(
            "@ai-sdk/openai".to_string(),
            Some("https://api.openai.com/v1".to_string()),
            "sk-test".to_string(),
        )
        .unwrap();

        assert!(result.success);
        assert_eq!(result.message, "配置校验通过");
    }

    #[test]
    #[serial]
    fn test_get_provider_config_reads_legacy_base_url_key() {
        let temp_dir = std::env::temp_dir().join("omo-provider-service-legacy-baseurl-test");
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
                "openai": {
                  "npm": "@ai-sdk/openai",
                  "options": { "baseUrl": "https://legacy.example.com/v1" }
                }
              }
            }"#,
        )
        .unwrap();

        let auth_dir = temp_dir.join(".local").join("share").join("opencode");
        std::fs::create_dir_all(&auth_dir).unwrap();
        std::fs::write(
            auth_dir.join("auth.json"),
            r#"{"openai":{"type":"api","key":"sk-legacy"}}"#,
        )
        .unwrap();

        let snapshot = get_provider_config("openai".to_string()).unwrap();

        assert_eq!(snapshot.api_key.as_deref(), Some("sk-legacy"));
        assert_eq!(
            snapshot.base_url.as_deref(),
            Some("https://legacy.example.com/v1")
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
