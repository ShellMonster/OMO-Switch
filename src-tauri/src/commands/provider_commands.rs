use serde_json::{json, Value};
use std::collections::HashMap;

use crate::services::{provider_service, provider_store};

const PROVIDER_DOMAINS: &[(&str, &str)] = &[
    ("anthropic", "anthropic.com"),
    ("openai", "openai.com"),
    ("google", "google.com"),
    ("groq", "groq.com"),
    ("openrouter", "openrouter.ai"),
    ("mistral", "mistral.ai"),
    ("cohere", "cohere.com"),
    ("deepseek", "deepseek.com"),
    ("xai", "x.ai"),
    ("cerebras", "cerebras.ai"),
    ("perplexity", "perplexity.ai"),
    ("togetherai", "together.xyz"),
    ("deepinfra", "deepinfra.com"),
    ("azure", "azure.microsoft.com"),
    ("amazon-bedrock", "aws.amazon.com"),
    ("github-copilot", "github.com"),
    ("vercel", "vercel.com"),
    ("gitlab", "gitlab.com"),
    ("aicodewith", "aicodewith.com"),
    ("kimi-for-coding", "moonshot.cn"),
    ("zhipuai", "bigmodel.cn"),
    ("zhipuai-coding-plan", "bigmodel.cn"),
    ("moonshotai", "moonshot.cn"),
    ("moonshotai-cn", "moonshot.cn"),
    ("opencode", "opencode.ai"),
];

pub type ProviderInfo = provider_service::ProviderInfo;
pub type ProviderConfigSnapshot = provider_service::ProviderConfigSnapshot;
pub type ConnectionTestResult = provider_service::ConnectionTestResult;
pub(crate) type AuthEntry = provider_store::AuthEntry;

fn get_provider_icon_cache_path(provider_id: &str) -> Result<std::path::PathBuf, String> {
    provider_store::get_provider_icon_cache_path(provider_id)
}

#[tauri::command]
pub fn get_provider_status() -> Result<Vec<ProviderInfo>, String> {
    provider_service::get_provider_status()
}

#[tauri::command]
pub fn get_provider_config(provider_id: String) -> Result<ProviderConfigSnapshot, String> {
    provider_service::get_provider_config(provider_id)
}

#[tauri::command]
pub fn test_provider_connection(
    npm: String,
    base_url: Option<String>,
    api_key: String,
) -> Result<ConnectionTestResult, String> {
    provider_service::test_provider_connection(npm, base_url, api_key)
}

#[tauri::command]
pub fn set_provider_api_key(
    provider_id: String,
    api_key: String,
    base_url: Option<String>,
    provider_type: Option<String>,
) -> Result<(), String> {
    provider_service::set_provider_api_key(provider_id, api_key, base_url, provider_type)
}

#[tauri::command]
pub fn delete_provider_auth(provider_id: String) -> Result<(), String> {
    provider_service::delete_provider_auth(provider_id)
}

#[tauri::command]
pub fn add_custom_provider(
    name: String,
    api_key: String,
    base_url: String,
) -> Result<ProviderInfo, String> {
    provider_service::add_custom_provider(name, api_key, base_url)
}

#[tauri::command]
pub fn add_custom_model(provider_id: String, model_id: String) -> Result<(), String> {
    let mut config = provider_store::read_opencode_config()?;

    if config.get("provider").is_none() {
        config["provider"] = json!({});
    }

    if config["provider"].get(&provider_id).is_none() {
        config["provider"][&provider_id] = json!({});
    }

    if config["provider"][&provider_id].get("models").is_none() {
        config["provider"][&provider_id]["models"] = json!({});
    }

    if config["provider"][&provider_id]["models"]
        .get(&model_id)
        .is_none()
    {
        config["provider"][&provider_id]["models"][&model_id] = json!({});
    }

    provider_store::write_opencode_config(&config)?;
    Ok(())
}

#[tauri::command]
pub fn remove_custom_model(provider_id: String, model_id: String) -> Result<(), String> {
    let mut config = provider_store::read_opencode_config()?;

    let provider = config
        .get("provider")
        .ok_or("配置文件中不存在 provider 字段")?;
    let provider_config = provider
        .get(&provider_id)
        .ok_or(format!("供应商 {} 不存在", provider_id))?;
    let models = provider_config
        .get("models")
        .ok_or(format!("供应商 {} 没有配置任何模型", provider_id))?;

    if models.get(&model_id).is_none() {
        return Err(format!(
            "模型 {} 在供应商 {} 中不存在",
            model_id, provider_id
        ));
    }

    config["provider"][&provider_id]["models"]
        .as_object_mut()
        .ok_or("models 字段格式错误")?
        .remove(&model_id);

    provider_store::write_opencode_config(&config)?;
    Ok(())
}

#[tauri::command]
pub fn get_custom_models() -> Result<HashMap<String, Vec<String>>, String> {
    Ok(provider_store::get_custom_models())
}

#[tauri::command]
pub fn get_provider_icon(provider_id: String) -> Result<Option<String>, String> {
    let cache_path = get_provider_icon_cache_path(&provider_id)?;
    if cache_path.exists() {
        return Ok(Some(cache_path.to_string_lossy().to_string()));
    }

    let domain = PROVIDER_DOMAINS
        .iter()
        .find(|(id, _)| *id == provider_id)
        .map(|(_, domain)| *domain);

    let Some(domain) = domain else {
        return Ok(None);
    };

    let url = format!("https://logo.clearbit.com/{}?size=64", domain);
    let response = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .call();

    match response {
        Ok(resp) if resp.status() == 200 => {
            use std::io::Read;
            let mut bytes = Vec::new();
            resp.into_reader()
                .read_to_end(&mut bytes)
                .map_err(|e| format!("读取响应失败: {}", e))?;

            if let Some(parent) = cache_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            std::fs::write(&cache_path, &bytes).map_err(|e| format!("写入缓存失败: {}", e))?;
            Ok(Some(cache_path.to_string_lossy().to_string()))
        }
        _ => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn test_provider_info_serialization() {
        let provider = ProviderInfo {
            id: "test".to_string(),
            name: "Test Provider".to_string(),
            npm: Some("@test/provider".to_string()),
            website_url: Some("https://test.com".to_string()),
            is_configured: true,
            is_builtin: true,
            supports_base_url: true,
            supports_connection_test: true,
            can_delete_auth: true,
        };

        let json = serde_json::to_string(&provider).unwrap();
        assert!(json.contains("test"));
        assert!(json.contains("Test Provider"));
    }

    #[test]
    fn test_connection_test_result_serialization() {
        let result = ConnectionTestResult {
            success: true,
            message: "OK".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("success"));
        assert!(json.contains("OK"));
    }

    #[test]
    fn test_auth_entry_serialization() {
        let mut auth = HashMap::new();
        auth.insert(
            "test".to_string(),
            AuthEntry {
                auth_type: Some("api".to_string()),
                key: Some("sk-test".to_string()),
                extra: HashMap::new(),
            },
        );

        let json = serde_json::to_string(&auth).unwrap();
        assert!(json.contains("test"));
        assert!(json.contains("sk-test"));
    }

    #[test]
    fn test_auth_entry_deserialize_oauth_without_key() {
        let json = r#"{
            "openai": {
                "type": "oauth",
                "refresh": "rt_xxx",
                "access": "at_xxx"
            }
        }"#;

        let auth: HashMap<String, AuthEntry> = serde_json::from_str(json).unwrap();
        let openai = auth.get("openai").expect("openai should exist");

        assert_eq!(openai.auth_type.as_deref(), Some("oauth"));
        assert_eq!(openai.key, None);
        assert!(openai.extra.contains_key("refresh"));
        assert!(openai.extra.contains_key("access"));
    }

    #[test]
    fn test_test_provider_connection_rejects_invalid_base_url() {
        let result = test_provider_connection(
            "@ai-sdk/openai".to_string(),
            Some("ftp://invalid.example.com".to_string()),
            "sk-test".to_string(),
        )
        .unwrap();

        assert!(!result.success);
        assert!(result.message.contains("Base URL"));
    }

    #[test]
    fn test_test_provider_connection_accepts_valid_payload() {
        let result = test_provider_connection(
            "@ai-sdk/openai".to_string(),
            Some("https://api.openai.com/v1".to_string()),
            "sk-test".to_string(),
        )
        .unwrap();

        assert!(result.success);
    }

    #[test]
    #[serial]
    fn test_get_provider_status_graceful_when_auth_invalid() {
        let temp_dir = std::env::temp_dir().join("omo_test_provider_status_auth_invalid");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let cache_dir = temp_dir.join(".cache").join("oh-my-opencode");
        std::fs::create_dir_all(&cache_dir).expect("创建缓存目录失败");
        std::fs::write(
            cache_dir.join("provider-models.json"),
            r#"{"models":{"openai":["gpt-5"]}}"#,
        )
        .expect("写入 provider-models.json 失败");
        std::fs::write(
            cache_dir.join("connected-providers.json"),
            r#"{"connected":[],"updatedAt":"2026-02-24T00:00:00.000Z"}"#,
        )
        .expect("写入 connected-providers.json 失败");

        let auth_dir = temp_dir.join(".local").join("share").join("opencode");
        std::fs::create_dir_all(&auth_dir).expect("创建 auth 目录失败");
        std::fs::write(auth_dir.join("auth.json"), "{invalid json").expect("写入 auth.json 失败");

        let result = get_provider_status();

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        assert!(
            result.is_ok(),
            "auth.json 异常时应降级，不应阻断 provider 状态"
        );
        let providers = result.unwrap();
        let openai = providers
            .iter()
            .find(|provider| provider.id == "openai")
            .expect("openai should remain visible");
        assert!(!openai.is_configured);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_add_custom_model() {
        let temp_dir = std::env::temp_dir().join("omo_test_add_model");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let result = add_custom_model("test-provider".to_string(), "test-model-1".to_string());

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        assert!(result.is_ok(), "添加模型应该成功: {:?}", result.err());

        let config_path = temp_dir
            .join(".config")
            .join("opencode")
            .join("opencode.json");
        assert!(config_path.exists(), "配置文件应该被创建");

        let content = std::fs::read_to_string(&config_path).expect("读取配置文件失败");
        let config: Value = serde_json::from_str(&content).expect("解析配置文件失败");
        assert!(config["provider"]["test-provider"]["models"]["test-model-1"].is_object());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_add_custom_model_duplicate() {
        let temp_dir = std::env::temp_dir().join("omo_test_add_model_dup");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let result1 = add_custom_model("test-provider".to_string(), "test-model-2".to_string());
        assert!(result1.is_ok());
        let result2 = add_custom_model("test-provider".to_string(), "test-model-2".to_string());
        assert!(result2.is_ok());

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        let config_path = temp_dir
            .join(".config")
            .join("opencode")
            .join("opencode.json");
        let content = std::fs::read_to_string(&config_path).expect("读取配置文件失败");
        let config: Value = serde_json::from_str(&content).expect("解析配置文件失败");

        let models = config["provider"]["test-provider"]["models"]
            .as_object()
            .unwrap();
        assert_eq!(models.len(), 1);
        assert!(models.contains_key("test-model-2"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_remove_custom_model() {
        let temp_dir = std::env::temp_dir().join("omo_test_remove_model");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let add_result = add_custom_model("test-provider".to_string(), "test-model-3".to_string());
        assert!(add_result.is_ok());
        let remove_result =
            remove_custom_model("test-provider".to_string(), "test-model-3".to_string());
        assert!(
            remove_result.is_ok(),
            "删除模型应该成功: {:?}",
            remove_result.err()
        );

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        let config_path = temp_dir
            .join(".config")
            .join("opencode")
            .join("opencode.json");
        let content = std::fs::read_to_string(&config_path).expect("读取配置文件失败");
        let config: Value = serde_json::from_str(&content).expect("解析配置文件失败");

        let models = config["provider"]["test-provider"]["models"]
            .as_object()
            .unwrap();
        assert!(!models.contains_key("test-model-3"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    #[serial]
    fn test_remove_custom_model_not_found() {
        let temp_dir = std::env::temp_dir().join("omo_test_remove_not_found");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let _ = add_custom_model("test-provider".to_string(), "existing-model".to_string());
        let result =
            remove_custom_model("test-provider".to_string(), "nonexistent-model".to_string());

        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("不存在") || error_msg.contains("nonexistent"));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
