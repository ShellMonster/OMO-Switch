use crate::i18n;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

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
#[derive(Debug, Serialize, Deserialize)]
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

/// 获取缓存目录路径（与 oh-my-opencode CLI 保持一致）
/// 统一使用 ~/.cache/oh-my-opencode/
fn get_cache_dir() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(|home| PathBuf::from(home).join(".cache").join("oh-my-opencode"))
        .map_err(|_| "无法获取 HOME 环境变量".to_string())
}

/// 获取 OpenCode 配置文件路径
/// 路径: ~/.config/opencode/opencode.json
fn get_opencode_config_path() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(|home| {
            PathBuf::from(home)
                .join(".config")
                .join("opencode")
                .join("opencode.json")
        })
        .map_err(|_| "无法获取 HOME 环境变量".to_string())
}

/// 获取 OpenCode auth 文件路径
/// 路径: ~/.local/share/opencode/auth.json
fn get_auth_file_path() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(|home| {
            PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("opencode")
                .join("auth.json")
        })
        .map_err(|_| "无法获取 HOME 环境变量".to_string())
}

/// 从 auth.json 提取 provider ID 列表（兼容 api/oauth 等结构）
fn get_auth_provider_ids() -> Vec<String> {
    let Ok(auth_path) = get_auth_file_path() else {
        return Vec::new();
    };
    if !auth_path.exists() {
        return Vec::new();
    }

    let Ok(content) = fs::read_to_string(&auth_path) else {
        return Vec::new();
    };
    if content.trim().is_empty() {
        return Vec::new();
    }

    let Ok(value) = serde_json::from_str::<serde_json::Value>(&content) else {
        return Vec::new();
    };
    let Some(obj) = value.as_object() else {
        return Vec::new();
    };

    obj.keys().cloned().collect()
}

/// 获取自定义模型配置
///
/// 从 opencode.json 读取 provider.{name}.models 字段
///
/// # 返回值
/// 返回 HashMap，key 是 provider ID，value 是该 provider 下的模型 ID 列表
///
/// # 示例
/// ```
/// let models = get_custom_models();
/// // 返回: { "anthropic": ["claude-3-opus", "claude-3-sonnet"], ... }
/// ```
pub fn get_custom_models() -> HashMap<String, Vec<String>> {
    let mut result = HashMap::new();

    // 获取配置文件路径
    let Ok(config_path) = get_opencode_config_path() else {
        return result;
    };

    // 文件不存在时返回空结果
    if !config_path.exists() {
        return result;
    }

    // 读取文件内容
    let Ok(content) = fs::read_to_string(&config_path) else {
        return result;
    };

    // 解析 JSON（使用 serde_json::Value 保持灵活性）
    let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) else {
        return result;
    };

    // 遍历 provider 对象，提取每个 provider 的 models 字段
    if let Some(provider) = config.get("provider") {
        if let Some(provider_obj) = provider.as_object() {
            for (provider_id, provider_config) in provider_obj {
                // 获取该 provider 的 models 字段
                if let Some(models) = provider_config.get("models") {
                    if let Some(models_obj) = models.as_object() {
                        // models 是一个对象，key 是模型 ID
                        let model_ids: Vec<String> = models_obj.keys().cloned().collect();
                        if !model_ids.is_empty() {
                            result.insert(provider_id.clone(), model_ids);
                        }
                    }
                }
            }
        }
    }

    result
}

/// 获取可用模型列表，按提供商分组（缓存快照）
///
/// 来源：
/// 1. ~/.cache/oh-my-opencode/provider-models.json - CLI 缓存的模型
/// 2. ~/.config/opencode/opencode.json 的 provider.{name}.models - 自定义模型
///
/// 返回格式: { "provider_name": ["model1", "model2", ...] }
const OPENCODE_MODELS_TIMEOUT_SECS: u64 = 3;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailableModelsWithStatus {
    pub models: HashMap<String, Vec<String>>,
    /// verified | cache_fallback
    pub source: String,
    pub fallback_reason: Option<String>,
    pub validated_at: String,
}

fn parse_opencode_models_output(output: &str) -> HashMap<String, Vec<String>> {
    let mut result: HashMap<String, Vec<String>> = HashMap::new();

    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let Some((provider_id, model_id)) = trimmed.split_once('/') else {
            continue;
        };
        if provider_id.is_empty() || model_id.is_empty() {
            continue;
        }

        let entry = result.entry(provider_id.to_string()).or_default();
        let model = model_id.to_string();
        if !entry.contains(&model) {
            entry.push(model);
        }
    }

    result
}

fn build_opencode_path_env() -> Option<String> {
    let home = env::var("HOME").ok()?;
    let opencode_bin = PathBuf::from(home).join(".opencode").join("bin");
    let opencode_bin_str = opencode_bin.to_string_lossy().to_string();
    let current_path = env::var("PATH").unwrap_or_default();
    if current_path
        .split(':')
        .any(|p| p == opencode_bin.as_os_str().to_string_lossy())
    {
        Some(current_path)
    } else if current_path.is_empty() {
        Some(opencode_bin_str)
    } else {
        Some(format!("{}:{}", opencode_bin_str, current_path))
    }
}

fn build_opencode_candidates() -> Vec<String> {
    let mut candidates: Vec<String> = Vec::new();

    if let Ok(path) = env::var("OPENCODE_BIN") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            candidates.push(trimmed.to_string());
        }
    }

    if let Ok(home) = env::var("HOME") {
        let home_candidate = PathBuf::from(home)
            .join(".opencode")
            .join("bin")
            .join("opencode");
        if home_candidate.exists() {
            candidates.push(home_candidate.to_string_lossy().to_string());
        }
    }

    // 最后回退 PATH 查找
    candidates.push("opencode".to_string());

    candidates
}

fn run_opencode_models_with_command(binary: &str) -> Result<HashMap<String, Vec<String>>, String> {
    let mut cmd = if Path::new(binary).is_absolute() || binary.contains('/') {
        Command::new(binary)
    } else {
        Command::new(binary)
    };

    cmd.args(["models"]).stdout(Stdio::piped()).stderr(Stdio::null());

    if let Some(path_env) = build_opencode_path_env() {
        cmd.env("PATH", path_env);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("启动 `{}` 失败: {}", binary, e))?;

    let timeout = Duration::from_secs(OPENCODE_MODELS_TIMEOUT_SECS);
    let start = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    return Err(format!("`opencode models` 退出码异常: {:?}", status.code()));
                }
                let output = child
                    .wait_with_output()
                    .map_err(|e| format!("读取 `{}` 输出失败: {}", binary, e))?;
                let parsed = parse_opencode_models_output(&String::from_utf8_lossy(&output.stdout));
                if parsed.is_empty() {
                    return Err(format!("`{}` 输出为空或无法解析", binary));
                }
                return Ok(parsed);
            }
            Ok(None) => {
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!(
                        "`{}` 执行超时（{}s）",
                        binary, OPENCODE_MODELS_TIMEOUT_SECS
                    ));
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => {
                return Err(format!("轮询 `{}` 状态失败: {}", binary, e));
            }
        }
    }
}

fn get_available_models_from_opencode_cmd() -> Result<HashMap<String, Vec<String>>, String> {
    // 单元测试中使用临时 HOME 文件验证缓存逻辑，避免依赖外部命令结果
    if cfg!(test) {
        return Err("tests_skip_opencode_models_command".to_string());
    }

    let mut errors = Vec::new();
    for binary in build_opencode_candidates() {
        match run_opencode_models_with_command(&binary) {
            Ok(result) => return Ok(result),
            Err(err) => errors.push(err),
        }
    }

    Err(format!(
        "执行 `opencode models` 失败（已尝试候选路径）：{}",
        errors.join(" | ")
    ))
}

fn merge_custom_models(result: &mut HashMap<String, Vec<String>>) {
    let custom_models = get_custom_models();
    for (provider_id, models) in custom_models {
        let entry = result.entry(provider_id).or_default();
        for model_id in models {
            if !entry.contains(&model_id) {
                entry.push(model_id);
            }
        }
    }
}

fn read_verified_models_override() -> HashMap<String, Vec<String>> {
    let Ok(cache_dir) = get_cache_dir() else {
        return HashMap::new();
    };
    let cache_file = cache_dir.join("verified-provider-models.json");
    if !cache_file.exists() {
        return HashMap::new();
    }

    let Ok(content) = fs::read_to_string(&cache_file) else {
        return HashMap::new();
    };
    let Ok(cache) = serde_json::from_str::<ProviderModelsCache>(&content) else {
        return HashMap::new();
    };
    cache.models
}

fn get_cached_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    let cache_file = get_cache_dir()?.join("provider-models.json");

    // 1. 从缓存文件读取模型列表
    let mut result = if cache_file.exists() {
        let content = fs::read_to_string(&cache_file)
            .map_err(|e| format!("{}: {}", i18n::tr_current("read_model_cache_failed"), e))?;

        let cache: ProviderModelsCache = serde_json::from_str(&content)
            .map_err(|e| format!("{}: {}", i18n::tr_current("parse_model_cache_failed"), e))?;

        cache.models
    } else {
        HashMap::new()
    };

    // 2. 应用校验缓存覆盖（仅覆盖模型列表，不变更 provider 总表来源）
    for (provider_id, models) in read_verified_models_override() {
        result.insert(provider_id, models);
    }

    // 3. 从 opencode.json 读取自定义模型并合并
    merge_custom_models(&mut result);

    Ok(result)
}

fn write_verified_models_override(models: &HashMap<String, Vec<String>>) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("创建模型缓存目录失败 {:?}: {}", cache_dir, e))?;

    let cache_file = cache_dir.join("verified-provider-models.json");
    let payload = ProviderModelsCache {
        models: models.clone(),
    };
    let content = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("序列化模型缓存失败: {}", e))?;
    fs::write(&cache_file, content)
        .map_err(|e| format!("写入模型缓存文件失败 {:?}: {}", cache_file, e))?;
    Ok(())
}

pub fn get_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    get_cached_available_models()
}

/// 获取通过 `opencode models` 校验后的可用模型列表
/// 用于异步校验阶段，避免缓存中包含不在 opencode 可用集合内的旧模型。
pub fn get_verified_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    let mut result = get_available_models_from_opencode_cmd()?;
    merge_custom_models(&mut result);
    Ok(result)
}

/// 统一返回模型及其来源状态（方案三：后端单一裁决）
pub fn get_available_models_with_status() -> Result<AvailableModelsWithStatus, String> {
    let validated_at = Utc::now().to_rfc3339();

    match get_available_models_from_opencode_cmd() {
        Ok(mut verified_models) => {
            // 校验结果只用于覆盖对应 provider，避免把总表收缩成“仅可用 provider”
            let mut merged_models = get_cached_available_models()?;
            for (provider_id, models) in &verified_models {
                merged_models.insert(provider_id.clone(), models.clone());
            }

            // 先落盘“校验覆盖层”（仅写校验返回子集），再合并自定义模型用于展示
            if let Err(e) = write_verified_models_override(&verified_models) {
                eprintln!("警告：写入 verified-provider-models.json 失败: {}", e);
            }

            merge_custom_models(&mut merged_models);
            merge_custom_models(&mut verified_models);

            Ok(AvailableModelsWithStatus {
                models: merged_models,
                source: "verified".to_string(),
                fallback_reason: None,
                validated_at,
            })
        }
        Err(err) => {
            let mut models = get_cached_available_models()?;
            merge_custom_models(&mut models);
            Ok(AvailableModelsWithStatus {
                models,
                source: "cache_fallback".to_string(),
                fallback_reason: Some(err),
                validated_at,
            })
        }
    }
}

/// 获取已连接的提供商列表
///
/// 从 ~/.cache/oh-my-opencode/connected-providers.json 读取
/// 返回提供商名称列表，例如: ["aicodewith", "kimi-for-coding", ...]
pub fn get_connected_providers() -> Result<Vec<String>, String> {
    let cache_file = get_cache_dir()?.join("connected-providers.json");

    // 文件不存在时返回空结果
    let mut providers = if !cache_file.exists() {
        Vec::new()
    } else {
        // 读取文件内容
        let content = fs::read_to_string(&cache_file)
            .map_err(|e| format!("无法读取已连接提供商文件 {:?}: {}", cache_file, e))?;

        // 解析 JSON
        let cache: ConnectedProvidersCache =
            serde_json::from_str(&content).map_err(|e| format!("解析已连接提供商文件失败: {}", e))?;

        cache.connected
    };

    // 与 auth.json 的 provider 做并集，统一“已连接”口径（兼容 OAuth 授权）
    for provider_id in get_auth_provider_ids() {
        if !providers.iter().any(|p| p == &provider_id) {
            providers.push(provider_id);
        }
    }

    Ok(providers)
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
    use serial_test::serial;

    #[test]
    fn test_parse_opencode_models_output() {
        let output = r#"
openai/gpt-5.3-codex
openai/gpt-5.2
anthropic/claude-sonnet-4-6
invalid-line
"#;

        let parsed = parse_opencode_models_output(output);
        assert_eq!(parsed.get("openai").map(|v| v.len()), Some(2));
        assert_eq!(parsed.get("anthropic").map(|v| v.len()), Some(1));
        assert!(!parsed.contains_key("invalid-line"));
    }

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
    #[serial]
    fn test_get_connected_providers_merge_auth() {
        // 验证：connected-providers.json 与 auth.json 做并集（兼容 OAuth 授权 provider）
        let temp_dir = std::env::temp_dir().join("omo_test_connected_merge_auth");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        let original_home = std::env::var("HOME").ok();
        // SAFETY: 测试中修改 HOME 环境变量是安全的
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        let cache_dir = temp_dir.join(".cache").join("oh-my-opencode");
        std::fs::create_dir_all(&cache_dir).expect("创建缓存目录失败");
        std::fs::write(
            cache_dir.join("connected-providers.json"),
            r#"{"connected":["kimi-for-coding"],"updatedAt":"2026-02-24T00:00:00.000Z"}"#,
        )
        .expect("写入 connected-providers.json 失败");

        let auth_dir = temp_dir.join(".local").join("share").join("opencode");
        std::fs::create_dir_all(&auth_dir).expect("创建 auth 目录失败");
        std::fs::write(
            auth_dir.join("auth.json"),
            r#"{
                "openai": {"type":"oauth","refresh":"rt_xxx","access":"at_xxx"},
                "kimi-for-coding": {"type":"api","key":"sk_xxx"}
            }"#,
        )
        .expect("写入 auth.json 失败");

        let result = get_connected_providers();

        // SAFETY: 测试中恢复 HOME 环境变量是安全的
        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        assert!(result.is_ok(), "获取 connected providers 应成功");
        let providers = result.unwrap();
        assert!(providers.contains(&"kimi-for-coding".to_string()));
        assert!(providers.contains(&"openai".to_string()));

        let _ = std::fs::remove_dir_all(&temp_dir);
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

    /// 测试合并自定义模型到缓存模型列表
    ///
    /// 验证：
    /// 1. 自定义模型被正确合并到现有缓存
    /// 2. 不影响原有的缓存模型
    /// 3. 自定义模型不会重复
    #[test]
    #[serial]
    fn test_get_available_models_with_custom() {
        use std::io::Write;

        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("omo_test_merge_models");
        let _ = std::fs::remove_dir_all(&temp_dir);
        std::fs::create_dir_all(&temp_dir).expect("创建临时目录失败");

        // 保存原始 HOME
        let original_home = std::env::var("HOME").ok();
        // SAFETY: 测试中修改 HOME 环境变量是安全的
        unsafe {
            std::env::set_var("HOME", &temp_dir);
        }

        // 1. 创建缓存文件 provider-models.json（模拟 CLI 缓存）
        let cache_dir = temp_dir.join(".cache").join("oh-my-opencode");
        std::fs::create_dir_all(&cache_dir).expect("创建缓存目录失败");

        let provider_models_content = r#"{
            "models": {
                "openai": ["gpt-4", "gpt-3.5-turbo"],
                "anthropic": ["claude-3-opus"]
            }
        }"#;
        let cache_file = cache_dir.join("provider-models.json");
        let mut file = std::fs::File::create(&cache_file).expect("创建缓存文件失败");
        file.write_all(provider_models_content.as_bytes())
            .expect("写入缓存文件失败");

        // 2. 创建配置文件 opencode.json（包含自定义模型）
        let config_dir = temp_dir.join(".config").join("opencode");
        std::fs::create_dir_all(&config_dir).expect("创建配置目录失败");

        let opencode_content = r#"{
            "provider": {
                "openai": {
                    "models": {
                        "gpt-4-custom": {}
                    }
                },
                "custom-provider": {
                    "models": {
                        "custom-model-1": {},
                        "custom-model-2": {}
                    }
                }
            }
        }"#;
        let config_file = config_dir.join("opencode.json");
        let mut file = std::fs::File::create(&config_file).expect("创建配置文件失败");
        file.write_all(opencode_content.as_bytes())
            .expect("写入配置文件失败");

        // 3. 调用 get_available_models 获取合并后的模型
        let result = get_available_models();

        // 恢复 HOME
        // SAFETY: 测试中恢复 HOME 环境变量是安全的
        unsafe {
            if let Some(home) = original_home {
                std::env::set_var("HOME", home);
            } else {
                std::env::remove_var("HOME");
            }
        }

        // 验证结果
        assert!(result.is_ok(), "获取模型应该成功: {:?}", result.err());
        let models = result.unwrap();

        // 验证 openai 提供商包含缓存模型 + 自定义模型
        let openai_models = models.get("openai").expect("应该有 openai 提供商");
        assert!(
            openai_models.contains(&"gpt-4".to_string()),
            "应该包含缓存的 gpt-4"
        );
        assert!(
            openai_models.contains(&"gpt-3.5-turbo".to_string()),
            "应该包含缓存的 gpt-3.5-turbo"
        );
        assert!(
            openai_models.contains(&"gpt-4-custom".to_string()),
            "应该包含自定义的 gpt-4-custom"
        );

        // 验证 anthropic 提供商保持不变
        let anthropic_models = models.get("anthropic").expect("应该有 anthropic 提供商");
        assert!(
            anthropic_models.contains(&"claude-3-opus".to_string()),
            "应该包含缓存的 claude-3-opus"
        );

        // 验证自定义提供商被添加
        let custom_models = models
            .get("custom-provider")
            .expect("应该有 custom-provider");
        assert!(
            custom_models.contains(&"custom-model-1".to_string()),
            "应该包含自定义模型 1"
        );
        assert!(
            custom_models.contains(&"custom-model-2".to_string()),
            "应该包含自定义模型 2"
        );

        // 清理
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
