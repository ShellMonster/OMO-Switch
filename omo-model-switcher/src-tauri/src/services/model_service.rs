use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

/// 模型信息结构体 - 从 models.dev API 获取的模型详细信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub pricing: Option<ModelPricing>,
}

/// 模型定价信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelPricing {
    pub prompt: Option<f64>,
    pub completion: Option<f64>,
    pub currency: Option<String>,
}

/// 本地缓存的模型列表结构 - 对应 provider-models.json
#[derive(Debug, Deserialize)]
struct ProviderModelsCache {
    models: HashMap<String, Vec<String>>,
}

/// 已连接的提供商列表结构 - 对应 connected-providers.json
#[derive(Debug, Deserialize)]
struct ConnectedProvidersCache {
    connected: Vec<String>,
    #[allow(dead_code)]
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

/// models.dev API 响应结构（简化版）
#[derive(Debug, Deserialize)]
struct ModelsDevResponse {
    models: Vec<ModelsDevModel>,
}

#[derive(Debug, Deserialize)]
struct ModelsDevModel {
    id: String,
    name: Option<String>,
    description: Option<String>,
    pricing: Option<ModelsDevPricing>,
}

#[derive(Debug, Deserialize)]
struct ModelsDevPricing {
    prompt: Option<f64>,
    completion: Option<f64>,
    currency: Option<String>,
}

/// 获取缓存目录路径 - ~/.cache/oh-my-opencode/
fn get_cache_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".cache").join("oh-my-opencode")
}

/// 获取可用模型列表，按提供商分组
///
/// 从 ~/.cache/oh-my-opencode/provider-models.json 读取本地缓存
/// 返回格式: { "provider_name": ["model1", "model2", ...] }
pub fn get_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    let cache_file = get_cache_dir().join("provider-models.json");

    // 读取文件内容
    let content = fs::read_to_string(&cache_file)
        .map_err(|e| format!("无法读取模型缓存文件 {:?}: {}", cache_file, e))?;

    // 解析 JSON
    let cache: ProviderModelsCache =
        serde_json::from_str(&content).map_err(|e| format!("解析模型缓存文件失败: {}", e))?;

    Ok(cache.models)
}

/// 获取已连接的提供商列表
///
/// 从 ~/.cache/oh-my-opencode/connected-providers.json 读取
/// 返回提供商名称列表，例如: ["aicodewith", "kimi-for-coding", ...]
pub fn get_connected_providers() -> Result<Vec<String>, String> {
    let cache_file = get_cache_dir().join("connected-providers.json");

    // 读取文件内容
    let content = fs::read_to_string(&cache_file)
        .map_err(|e| format!("无法读取已连接提供商文件 {:?}: {}", cache_file, e))?;

    // 解析 JSON
    let cache: ConnectedProvidersCache =
        serde_json::from_str(&content).map_err(|e| format!("解析已连接提供商文件失败: {}", e))?;

    Ok(cache.connected)
}

/// 从 models.dev API 获取模型详细信息（描述、定价等）
///
/// 带超时控制（5秒），如果 API 不可用则优雅降级返回空列表
/// 这样即使外部服务挂了，应用也能正常使用本地缓存的模型列表
pub fn fetch_models_dev() -> Result<Vec<ModelInfo>, String> {
    // 使用 ureq 进行 HTTP 请求，设置 5 秒超时
    let response = ureq::get("https://models.dev/api.json")
        .timeout(Duration::from_secs(5))
        .call();

    match response {
        Ok(resp) => {
            // 解析响应 JSON
            match resp.into_json::<ModelsDevResponse>() {
                Ok(models_dev) => {
                    // 转换为我们的 ModelInfo 结构
                    let models: Vec<ModelInfo> = models_dev
                        .models
                        .into_iter()
                        .map(|m| ModelInfo {
                            id: m.id,
                            name: m.name,
                            description: m.description,
                            pricing: m.pricing.map(|p| ModelPricing {
                                prompt: p.prompt,
                                completion: p.completion,
                                currency: p.currency,
                            }),
                        })
                        .collect();

                    Ok(models)
                }
                Err(e) => {
                    // JSON 解析失败也优雅降级
                    eprintln!("解析 models.dev API 响应失败（{}），降级到本地缓存模式", e);
                    Ok(Vec::new())
                }
            }
        }
        Err(e) => {
            // 优雅降级：API 不可用时返回空列表，不影响应用运行
            eprintln!("models.dev API 不可用（{}），降级到本地缓存模式", e);
            Ok(Vec::new())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_available_models() {
        // 测试读取本地缓存的模型列表
        let result = get_available_models();

        // 如果缓存文件存在，应该能成功读取
        if result.is_ok() {
            let models = result.unwrap();
            assert!(!models.is_empty(), "模型列表不应为空");

            // 检查是否包含常见的提供商
            println!("找到的提供商: {:?}", models.keys().collect::<Vec<_>>());
        } else {
            println!("缓存文件不存在或无法读取: {:?}", result.err());
        }
    }

    #[test]
    fn test_get_connected_providers() {
        // 测试读取已连接的提供商列表
        let result = get_connected_providers();

        if result.is_ok() {
            let providers = result.unwrap();
            println!("已连接的提供商: {:?}", providers);
            assert!(!providers.is_empty(), "已连接提供商列表不应为空");
        } else {
            println!("缓存文件不存在或无法读取: {:?}", result.err());
        }
    }

    #[test]
    fn test_fetch_models_dev_graceful_degradation() {
        // 测试 models.dev API 调用的优雅降级
        // 即使 API 不可用，也应该返回 Ok(空列表) 而不是 Err
        let result = fetch_models_dev();

        assert!(result.is_ok(), "即使 API 不可用也应该返回 Ok");

        if let Ok(models) = result {
            if models.is_empty() {
                println!("models.dev API 不可用，已降级");
            } else {
                println!("成功获取 {} 个模型信息", models.len());
            }
        }
    }
}
