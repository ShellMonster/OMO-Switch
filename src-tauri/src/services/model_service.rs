use crate::i18n;
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

/// 获取缓存目录路径（使用系统标准缓存目录）
/// macOS: ~/Library/Caches/oh-my-opencode/
/// Linux: ~/.cache/oh-my-opencode/
fn get_cache_dir() -> Result<PathBuf, String> {
    dirs::cache_dir()
        .ok_or_else(|| "无法获取系统缓存目录".to_string())
        .map(|p| p.join("oh-my-opencode"))
}

/// 获取可用模型列表，按提供商分组
///
/// 从 ~/.cache/oh-my-opencode/provider-models.json 读取本地缓存
/// 返回格式: { "provider_name": ["model1", "model2", ...] }
pub fn get_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    let cache_file = get_cache_dir()?.join("provider-models.json");

    // 文件不存在时返回空结果
    if !cache_file.exists() {
        return Ok(HashMap::new());
    }

    // 读取文件内容
    let content = fs::read_to_string(&cache_file)
        .map_err(|e| format!("{}: {}", i18n::tr_current("read_model_cache_failed"), e))?;

    // 解析 JSON
    let cache: ProviderModelsCache = serde_json::from_str(&content)
        .map_err(|e| format!("{}: {}", i18n::tr_current("parse_model_cache_failed"), e))?;

    Ok(cache.models)
}

/// 获取已连接的提供商列表
///
/// 从 ~/.cache/oh-my-opencode/connected-providers.json 读取
/// 返回提供商名称列表，例如: ["aicodewith", "kimi-for-coding", ...]
pub fn get_connected_providers() -> Result<Vec<String>, String> {
    let cache_file = get_cache_dir()?.join("connected-providers.json");

    // 文件不存在时返回空结果
    if !cache_file.exists() {
        return Ok(Vec::new());
    }

    // 读取文件内容
    let content = fs::read_to_string(&cache_file)
        .map_err(|e| format!("无法读取已连接提供商文件 {:?}: {}", cache_file, e))?;

    // 解析 JSON
    let cache: ConnectedProvidersCache =
        serde_json::from_str(&content).map_err(|e| format!("解析已连接提供商文件失败: {}", e))?;

    Ok(cache.connected)
}

/// models.dev 缓存文件路径
fn get_models_dev_cache_path() -> Option<PathBuf> {
    get_cache_dir()
        .ok()
        .map(|p| p.join("models-dev-cache.json"))
}

/// models.dev 缓存结构
#[derive(Debug, Serialize, Deserialize)]
struct ModelsDevCache {
    /// 缓存时间戳（Unix 秒）
    cached_at: u64,
    /// 缓存的模型数据
    models: Vec<ModelInfo>,
}

/// 获取当前 Unix 时间戳（秒）
fn now_unix_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// 缓存有效期：30 分钟
const CACHE_TTL_SECS: u64 = 30 * 60;

/// 读取本地 models.dev 缓存（仅在有效期内）
fn read_models_dev_cache() -> Option<Vec<ModelInfo>> {
    let cache_path = get_models_dev_cache_path()?;
    let content = fs::read_to_string(&cache_path).ok()?;
    let cache: ModelsDevCache = serde_json::from_str(&content).ok()?;
    let age = now_unix_secs().saturating_sub(cache.cached_at);
    if age < CACHE_TTL_SECS {
        Some(cache.models)
    } else {
        None
    }
}

/// 写入 models.dev 缓存到本地
fn write_models_dev_cache(models: &[ModelInfo]) {
    let Some(cache_path) = get_models_dev_cache_path() else {
        return;
    };
    let cache = ModelsDevCache {
        cached_at: now_unix_secs(),
        models: models.to_vec(),
    };
    if let Ok(json) = serde_json::to_string(&cache) {
        if let Some(parent) = cache_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(&cache_path, json);
    }
}

/// 读取过期缓存作为兜底（忽略 TTL）
fn read_expired_cache() -> Vec<ModelInfo> {
    let Some(cache_path) = get_models_dev_cache_path() else {
        return Vec::new();
    };
    if let Ok(content) = fs::read_to_string(&cache_path) {
        if let Ok(cache) = serde_json::from_str::<ModelsDevCache>(&content) {
            return cache.models;
        }
    }
    Vec::new()
}

/// 从 models.dev API 获取模型详细信息（带本地缓存）
///
/// 策略：
/// 1. 先读本地缓存（30分钟有效期）
/// 2. 缓存命中 → 直接返回，零延迟
/// 3. 缓存未命中 → 请求 API（5秒超时），成功后写入缓存
/// 4. API 失败 → 尝试读取过期缓存作为兜底
/// 5. 都没有 → 返回空列表
pub fn fetch_models_dev() -> Result<Vec<ModelInfo>, String> {
    // 1. 尝试读取有效缓存
    if let Some(cached) = read_models_dev_cache() {
        return Ok(cached);
    }

    // 2. 缓存未命中，请求 API
    let response = ureq::get("https://models.dev/api.json")
        .timeout(Duration::from_secs(2))
        .call();

    match response {
        Ok(resp) => {
            match resp.into_json::<ModelsDevResponse>() {
                Ok(models_dev) => {
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

                    // 写入缓存
                    write_models_dev_cache(&models);
                    Ok(models)
                }
                Err(e) => {
                    eprintln!("解析 models.dev API 响应失败（{}），尝试过期缓存", e);
                    Ok(read_expired_cache())
                }
            }
        }
        Err(e) => {
            eprintln!("models.dev API 不可用（{}），尝试过期缓存", e);
            Ok(read_expired_cache())
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_available_models() {
        // 测试读取本地缓存的模型列表
        // 修复后：文件不存在时返回 Ok(空 HashMap) 而不是 Err
        let result = get_available_models();

        // 应该始终返回 Ok（即使文件不存在）
        assert!(result.is_ok(), "应该返回 Ok，即使文件不存在");

        let models = result.unwrap();
        if models.is_empty() {
            println!("缓存文件不存在或为空，返回空 HashMap（优雅降级）");
        } else {
            println!("找到的提供商: {:?}", models.keys().collect::<Vec<_>>());
        }
    }

    #[test]
    fn test_get_connected_providers() {
        // 测试读取已连接的提供商列表
        // 修复后：文件不存在时返回 Ok(空 Vec) 而不是 Err
        let result = get_connected_providers();

        // 应该始终返回 Ok（即使文件不存在）
        assert!(result.is_ok(), "应该返回 Ok，即使文件不存在");

        let providers = result.unwrap();
        if providers.is_empty() {
            println!("缓存文件不存在或为空，返回空 Vec（优雅降级）");
        } else {
            println!("已连接的提供商: {:?}", providers);
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
