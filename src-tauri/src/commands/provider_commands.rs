use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

// ============================================================================
// 供应商域名映射（用于获取图标）
// ============================================================================

/// 供应商 ID 到域名的映射表
/// 用于从 Clearbit Logo API 获取供应商图标
const PROVIDER_DOMAINS: &[(&str, &str)] = &[
    // 国际主流供应商
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
    // 云服务商
    ("azure", "azure.microsoft.com"),
    ("amazon-bedrock", "aws.amazon.com"),
    // 开发工具
    ("github-copilot", "github.com"),
    ("vercel", "vercel.com"),
    ("gitlab", "gitlab.com"),
    // 国内供应商
    ("aicodewith", "aicodewith.com"),
    ("kimi-for-coding", "moonshot.cn"),
    ("zhipuai", "bigmodel.cn"),
    ("zhipuai-coding-plan", "bigmodel.cn"),
    ("moonshotai", "moonshot.cn"),
    ("moonshotai-cn", "moonshot.cn"),
    ("opencode", "opencode.ai"),
];

/// 供应商信息结构
/// 包含供应商的基本信息及其配置状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    /// 供应商唯一标识符（如 "anthropic", "openai"）
    pub id: String,
    /// 供应商显示名称
    pub name: String,
    /// 对应的 npm 包名（可选）
    pub npm: Option<String>,
    /// 供应商官网或文档链接（可选）
    pub website_url: Option<String>,
    /// 是否已配置 API Key
    pub is_configured: bool,
    /// 是否为内置供应商
    pub is_builtin: bool,
}

/// 连接测试结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    /// 测试是否成功
    pub success: bool,
    /// 结果消息
    pub message: String,
}

/// 认证信息结构（用于 auth.json）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct AuthEntry {
    #[serde(rename = "type")]
    auth_type: String,
    key: String,
}

/// 已连接供应商缓存结构（用于 connected-providers.json）
#[derive(Debug, Deserialize)]
struct ConnectedProvidersCache {
    connected: Vec<String>,
    #[allow(dead_code)]
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

/// 供应商模型缓存结构（用于 provider-models.json）
/// 文件格式: { "models": { "provider_id": ["model1", "model2"] } }
#[derive(Debug, Deserialize)]
struct ProviderModelsCache {
    models: HashMap<String, Vec<String>>,
}

// ============================================================================
// 路径获取函数
// ============================================================================

/// 获取 models.json 缓存文件路径
/// 路径: ~/.cache/opencode/models.json
pub fn get_models_cache_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;

    let path = PathBuf::from(home)
        .join(".cache")
        .join("opencode")
        .join("models.json");

    Ok(path)
}

/// 获取 auth.json 认证文件路径
/// 路径: ~/.local/share/opencode/auth.json
pub fn get_auth_file_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;

    let path = PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("opencode")
        .join("auth.json");

    Ok(path)
}

/// 获取 OpenCode 配置文件路径
/// 路径: ~/.config/opencode/opencode.json
#[allow(dead_code)]
fn get_opencode_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;

    let config_path = PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("opencode.json");

    Ok(config_path)
}

/// 获取 OMO 缓存目录路径
/// 路径: ~/.cache/oh-my-opencode/
fn get_omo_cache_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home).join(".cache").join("oh-my-opencode"))
}

/// 获取 provider-models.json 路径
/// 路径: ~/.cache/oh-my-opencode/provider-models.json
fn get_provider_models_path() -> Result<PathBuf, String> {
    Ok(get_omo_cache_dir()?.join("provider-models.json"))
}

/// 获取 connected-providers.json 路径
/// 路径: ~/.cache/oh-my-opencode/connected-providers.json
fn get_connected_providers_path() -> Result<PathBuf, String> {
    Ok(get_omo_cache_dir()?.join("connected-providers.json"))
}

/// 获取供应商图标缓存路径
/// 路径: ~/.cache/oh-my-opencode/provider-icons/{provider_id}.png
fn get_provider_icon_cache_path(provider_id: &str) -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
    Ok(PathBuf::from(home)
        .join(".cache")
        .join("oh-my-opencode")
        .join("provider-icons")
        .join(format!("{}.png", provider_id)))
}

// ============================================================================
// 文件读写函数
// ============================================================================

/// 读取 models.json 缓存文件
/// 返回所有供应商的模型信息
pub fn read_models_cache() -> Result<Value, String> {
    let models_path = get_models_cache_path()?;

    // 如果文件不存在，返回空对象
    if !models_path.exists() {
        return Ok(json!({}));
    }

    let content =
        fs::read_to_string(&models_path).map_err(|e| format!("读取 models.json 失败: {}", e))?;

    let models: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析 models.json 失败: {}", e))?;

    Ok(models)
}

/// 读取 auth.json 认证文件
/// 返回已配置的供应商认证信息
pub(crate) fn read_auth_file() -> Result<HashMap<String, AuthEntry>, String> {
    let auth_path = get_auth_file_path()?;

    // 如果文件不存在，返回空的 HashMap
    if !auth_path.exists() {
        return Ok(HashMap::new());
    }

    let content =
        fs::read_to_string(&auth_path).map_err(|e| format!("读取 auth.json 失败: {}", e))?;

    // 如果文件为空，返回空的 HashMap
    if content.trim().is_empty() {
        return Ok(HashMap::new());
    }

    let auth: HashMap<String, AuthEntry> =
        serde_json::from_str(&content).map_err(|e| format!("解析 auth.json 失败: {}", e))?;

    Ok(auth)
}

/// 写入 auth.json 认证文件
pub(crate) fn write_auth_file(auth: &HashMap<String, AuthEntry>) -> Result<(), String> {
    let auth_path = get_auth_file_path()?;

    // 确保父目录存在
    if let Some(parent) = auth_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建认证文件目录失败: {}", e))?;
    }

    // 格式化 JSON 并写入
    let json_string =
        serde_json::to_string_pretty(auth).map_err(|e| format!("序列化 auth.json 失败: {}", e))?;

    fs::write(&auth_path, json_string).map_err(|e| format!("写入 auth.json 失败: {}", e))?;

    Ok(())
}

/// 读取 OpenCode 配置文件
#[allow(dead_code)]
fn read_opencode_config() -> Result<Value, String> {
    let config_path = get_opencode_config_path()?;

    // 如果文件不存在，返回空对象
    if !config_path.exists() {
        return Ok(json!({}));
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))?;

    Ok(config)
}

/// 写入 OpenCode 配置文件
#[allow(dead_code)]
fn write_opencode_config(config: &Value) -> Result<(), String> {
    let config_path = get_opencode_config_path()?;

    // 确保父目录存在
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }

    // 格式化 JSON
    let json_string =
        serde_json::to_string_pretty(config).map_err(|e| format!("序列化 JSON 失败: {}", e))?;

    fs::write(&config_path, json_string).map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(())
}

/// 读取 connected-providers.json 获取已连接的供应商
fn read_connected_providers() -> Result<HashSet<String>, String> {
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

/// 读取 provider-models.json 获取所有供应商及其模型
fn read_provider_models() -> Result<HashMap<String, Vec<String>>, String> {
    let path = get_provider_models_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("读取 provider-models.json 失败: {}", e))?;
    let cache: ProviderModelsCache = serde_json::from_str(&content)
        .map_err(|e| format!("解析 provider-models.json 失败: {}", e))?;
    Ok(cache.models)
}

// ============================================================================
// 核心业务函数
// ============================================================================

/// 获取所有供应商及其配置状态
///
/// 逻辑：
/// 1. 从 provider-models.json 读取所有供应商
/// 2. 从 connected-providers.json 获取已连接的供应商
/// 3. 从 auth.json 获取已配置 API Key 的供应商
/// 4. 合并数据：is_configured = 在 connected 中 OR 在 auth.json 中
/// 5. 返回 ProviderInfo 列表
#[tauri::command]
pub fn get_provider_status() -> Result<Vec<ProviderInfo>, String> {
    // 1. 从 provider-models.json 获取所有供应商
    let provider_models = read_provider_models()?;

    // 2. 从 connected-providers.json 获取已连接的供应商
    let connected = read_connected_providers()?;

    // 3. 从 auth.json 获取已配置 API Key 的供应商
    let auth_data = read_auth_file()?;

    // 4. 合并数据
    let mut providers = Vec::new();

    for (provider_id, _models) in provider_models {
        let is_configured =
            connected.contains(&provider_id) || auth_data.contains_key(&provider_id);

        providers.push(ProviderInfo {
            id: provider_id.clone(),
            name: provider_id.clone(),
            npm: None,
            website_url: None,
            is_configured,
            is_builtin: true,
        });
    }

    // 按名称排序
    providers.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(providers)
}

/// 设置供应商的 API Key
///
/// 逻辑：
/// 1. 读取 auth.json
/// 2. 添加/更新 {provider_id: {type: "api", key: api_key}}
/// 3. 写回 auth.json
#[tauri::command]
pub fn set_provider_api_key(provider_id: String, api_key: String) -> Result<(), String> {
    // 读取现有的 auth 数据
    let mut auth_data = read_auth_file()?;

    // 创建新的认证条目
    let auth_entry = AuthEntry {
        auth_type: "api".to_string(),
        key: api_key,
    };

    // 插入或更新供应商的认证信息
    auth_data.insert(provider_id, auth_entry);

    // 写回 auth.json
    write_auth_file(&auth_data)?;

    Ok(())
}

/// 删除供应商的认证信息
///
/// 逻辑：
/// 1. 读取 auth.json
/// 2. 删除指定的 provider_id
/// 3. 写回 auth.json
#[tauri::command]
pub fn delete_provider_auth(provider_id: String) -> Result<(), String> {
    // 读取现有的 auth 数据
    let mut auth_data = read_auth_file()?;

    // 删除指定的供应商认证
    if auth_data.remove(&provider_id).is_none() {
        return Err(format!("供应商 {} 未配置", provider_id));
    }

    // 写回 auth.json
    write_auth_file(&auth_data)?;

    Ok(())
}

/// 添加自定义供应商
///
/// 逻辑：
/// 1. 生成 provider_key（名称转小写，空格替换为横线）
/// 2. 写入 opencode.json 的 provider 字段
/// 3. 写入 auth.json
#[tauri::command]
pub fn add_custom_provider(
    name: String,
    api_key: String,
    base_url: String,
) -> Result<ProviderInfo, String> {
    // 生成 provider key
    let provider_key = name.to_lowercase().replace(" ", "-").replace("_", "-");

    // 1. 写入 opencode.json
    let mut config = read_opencode_config()?;

    // 获取或创建 provider 对象
    if config.get("provider").is_none() {
        config["provider"] = json!({});
    }

    // 添加自定义供应商配置
    config["provider"][&provider_key] = json!({
        "npm": "@ai-sdk/openai-compatible",
        "options": {
            "baseURL": base_url
        }
    });

    write_opencode_config(&config)?;

    // 2. 写入 auth.json
    let mut auth_data = read_auth_file()?;

    auth_data.insert(
        provider_key.clone(),
        AuthEntry {
            auth_type: "api".to_string(),
            key: api_key,
        },
    );

    write_auth_file(&auth_data)?;

    // 返回新创建的供应商信息
    Ok(ProviderInfo {
        id: provider_key,
        name,
        npm: Some("@ai-sdk/openai-compatible".to_string()),
        website_url: Some(base_url),
        is_configured: true,
        is_builtin: false,
    })
}

// ============================================================================
// 连接测试函数
// ============================================================================

/// 测试供应商连接
///
/// 根据 npm 包类型选择对应的测试 URL，发送 HTTP 请求验证 API Key 是否有效
#[tauri::command]
pub fn test_provider_connection(
    npm: String,
    base_url: Option<String>,
    api_key: String,
) -> Result<ConnectionTestResult, String> {
    let test_url = match npm.as_str() {
        // OpenAI 兼容接口，使用自定义 base_url
        "@ai-sdk/openai-compatible" => {
            let base = base_url.unwrap_or_default();
            format!("{}/models", base.trim_end_matches('/'))
        }
        // OpenAI 官方接口
        "@ai-sdk/openai" => "https://api.openai.com/v1/models".to_string(),
        // Anthropic 接口（跳过连接测试）
        "@ai-sdk/anthropic" => {
            return Ok(ConnectionTestResult {
                success: true,
                message: "Anthropic API Key saved (connection test skipped)".to_string(),
            });
        }
        // Google AI 接口（跳过连接测试）
        "@ai-sdk/google" => {
            return Ok(ConnectionTestResult {
                success: true,
                message: "Google AI API Key saved (connection test skipped)".to_string(),
            });
        }
        // Groq 接口
        "@ai-sdk/groq" => "https://api.groq.com/openai/v1/models".to_string(),
        // OpenRouter 接口
        "@openrouter/ai-sdk-provider" => "https://openrouter.ai/api/v1/models".to_string(),
        // 未知供应商，跳过测试
        _ => {
            return Ok(ConnectionTestResult {
                success: true,
                message: format!("Unknown provider {}, config saved", npm),
            });
        }
    };

    // 发送 HTTP GET 请求测试连接
    let response = ureq::get(&test_url)
        .set("Authorization", &format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(10))
        .call();

    // 处理响应结果
    match response {
        Ok(resp) if resp.status() == 200 => Ok(ConnectionTestResult {
            success: true,
            message: "Connection successful".to_string(),
        }),
        Ok(resp) => Ok(ConnectionTestResult {
            success: false,
            message: format!("HTTP {}", resp.status()),
        }),
        Err(ureq::Error::Status(code, _)) => Ok(ConnectionTestResult {
            success: false,
            message: format!("HTTP {}", code),
        }),
        Err(e) => Ok(ConnectionTestResult {
            success: false,
            message: e.to_string(),
        }),
    }
}

// ============================================================================
// 供应商图标获取
// ============================================================================

/// 获取供应商图标
///
/// 优先从本地缓存读取，若无缓存则从 Clearbit Logo API 下载并缓存
/// 返回图标文件的本地路径，若无法获取则返回 None
#[tauri::command]
pub fn get_provider_icon(provider_id: String) -> Result<Option<String>, String> {
    let cache_path = get_provider_icon_cache_path(&provider_id)?;

    // 1. 检查本地缓存
    if cache_path.exists() {
        return Ok(Some(cache_path.to_string_lossy().to_string()));
    }

    // 2. 查找域名映射
    let domain = PROVIDER_DOMAINS
        .iter()
        .find(|(id, _)| *id == provider_id)
        .map(|(_, domain)| *domain);

    let Some(domain) = domain else {
        return Ok(None);
    };

    // 3. 从 Clearbit API 获取图标
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

            // 4. 确保缓存目录存在
            if let Some(parent) = cache_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }

            // 5. 保存到缓存
            std::fs::write(&cache_path, &bytes).map_err(|e| format!("写入缓存失败: {}", e))?;

            Ok(Some(cache_path.to_string_lossy().to_string()))
        }
        _ => Ok(None),
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_info_serialization() {
        let provider = ProviderInfo {
            id: "test".to_string(),
            name: "Test Provider".to_string(),
            npm: Some("@test/provider".to_string()),
            website_url: Some("https://test.com".to_string()),
            is_configured: true,
            is_builtin: true,
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
                auth_type: "api".to_string(),
                key: "sk-test".to_string(),
            },
        );

        let json = serde_json::to_string(&auth).unwrap();
        assert!(json.contains("test"));
        assert!(json.contains("sk-test"));
    }
}
