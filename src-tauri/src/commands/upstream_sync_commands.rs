//! 上游同步命令模块
//!
//! 提供：
//! - check_upstream_update: 从上游获取最新配置并对比哈希
//! - get_builtin_presets: 获取内置预设列表
//! - apply_builtin_preset: 应用指定内置预设到配置文件

use crate::services::config_service;
use crate::services::upstream_sync_service::{
    compute_content_hash, fetch_upstream_file, parse_agent_model_requirements,
    parse_default_categories, UpstreamSyncResult,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

// ============================================================================
// 常量定义
// ============================================================================

/// 上游配置文件 URL（oh-my-opencode 的配置文件）
const UPSTREAM_CONFIG_URL: &str =
    "https://raw.githubusercontent.com/oh-my-opencode/oh-my-opencode/main/packages/config/src/config.ts";

/// 内置预设存储目录（相对于用户缓存目录）
const BUILTIN_PRESETS_DIR: &str = "oh-my-opencode/builtin-presets";

/// 内置预设文件名
const PRESET_OFFICIAL_DEFAULT: &str = "official-default.json";
const PRESET_ECONOMY: &str = "economy.json";
const PRESET_HIGH_PERFORMANCE: &str = "high-performance.json";

// ============================================================================
// 数据结构
// ============================================================================

/// 内置预设信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuiltinPresetInfo {
    /// 预设 ID（文件名，不含扩展名）
    pub id: String,
    /// 预设显示名称
    pub name: String,
    /// 预设描述
    pub description: String,
    /// 预设图标（可选）
    pub icon: Option<String>,
}

/// 内置预设数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuiltinPresetData {
    /// 预设元信息
    pub id: String,
    pub name: String,
    pub description: String,
    /// Agent 配置（agent_name -> { model, variant }）
    pub agents: HashMap<String, ModelConfig>,
    /// Category 配置（category_name -> { model, variant }）
    pub categories: HashMap<String, ModelConfig>,
}

/// 模型配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant: Option<String>,
}

// ============================================================================
// 命令实现
// ============================================================================

/// 从上游获取最新配置并对比哈希
///
/// 返回 UpstreamSyncResult，包含：
/// - has_update: 是否有更新
/// - categories: 解析后的 category 默认配置
/// - agent_requirements: 解析后的 agent 模型需求
/// - content_hash: 内容哈希
#[tauri::command]
pub fn check_upstream_update() -> Result<UpstreamSyncResult, String> {
    // 1. 从上游获取配置文件
    let ts_content = fetch_upstream_file(UPSTREAM_CONFIG_URL)?;

    // 2. 计算内容哈希
    let content_hash = compute_content_hash(&ts_content);

    // 3. 解析 DEFAULT_CATEGORIES
    let categories = parse_default_categories(&ts_content)?;

    // 4. 解析 AGENT_MODEL_REQUIREMENTS
    let agent_requirements = parse_agent_model_requirements(&ts_content)?;

    // 5. 读取上次保存的哈希进行比较
    let last_hash = load_last_content_hash();
    let has_update = last_hash.as_ref() != Some(&content_hash);

    // 6. 如果有更新，保存新哈希
    if has_update {
        save_last_content_hash(&content_hash)?;
    }

    Ok(UpstreamSyncResult {
        has_update,
        categories,
        agent_requirements,
        content_hash,
    })
}

/// 获取内置预设列表
///
/// 返回三套内置预设：
/// - 官方默认：使用上游首选模型
/// - 经济模式：使用最便宜的模型
/// - 高性能模式：使用最强模型 + max/high variant
#[tauri::command]
pub fn get_builtin_presets() -> Result<Vec<BuiltinPresetInfo>, String> {
    Ok(vec![
        BuiltinPresetInfo {
            id: "official-default".to_string(),
            name: "官方默认".to_string(),
            description: "使用上游 oh-my-opencode 的首选模型配置".to_string(),
            icon: Some("star".to_string()),
        },
        BuiltinPresetInfo {
            id: "economy".to_string(),
            name: "经济模式".to_string(),
            description: "使用最便宜的模型，适合节省 API 费用".to_string(),
            icon: Some("coins".to_string()),
        },
        BuiltinPresetInfo {
            id: "high-performance".to_string(),
            name: "高性能模式".to_string(),
            description: "使用最强模型 + max/high 变体，追求最佳效果".to_string(),
            icon: Some("zap".to_string()),
        },
    ])
}

/// 应用指定内置预设到配置文件
///
/// 将预设中的 agent 和 category 配置应用到 oh-my-opencode.json
#[tauri::command]
pub fn apply_builtin_preset(preset_id: String) -> Result<(), String> {
    // 1. 获取内置预设目录
    let presets_dir = get_builtin_presets_dir()?;

    // 2. 确保预设目录存在
    ensure_builtin_presets_exist(&presets_dir)?;

    // 3. 根据预设 ID 确定文件名
    let preset_file = match preset_id.as_str() {
        "official-default" => PRESET_OFFICIAL_DEFAULT,
        "economy" => PRESET_ECONOMY,
        "high-performance" => PRESET_HIGH_PERFORMANCE,
        _ => return Err(format!("未知的内置预设: {}", preset_id)),
    };

    // 4. 读取预设文件
    let preset_path = presets_dir.join(preset_file);
    if !preset_path.exists() {
        return Err(format!("预设文件不存在: {:?}", preset_path));
    }

    let preset_content =
        fs::read_to_string(&preset_path).map_err(|e| format!("读取预设文件失败: {}", e))?;

    let preset: BuiltinPresetData =
        serde_json::from_str(&preset_content).map_err(|e| format!("解析预设文件失败: {}", e))?;

    // 5. 读取当前配置
    let mut config = config_service::read_omo_config()?;

    // 6. 应用预设到 agents
    if let Some(agents) = config.get_mut("agents").and_then(|a| a.as_object_mut()) {
        for (agent_name, model_config) in preset.agents {
            if let Some(agent) = agents.get_mut(&agent_name).and_then(|a| a.as_object_mut()) {
                agent.insert(
                    "model".to_string(),
                    serde_json::Value::String(model_config.model.clone()),
                );
                if let Some(variant) = model_config.variant {
                    agent.insert("variant".to_string(), serde_json::Value::String(variant));
                } else {
                    agent.remove("variant");
                }
            }
        }
    }

    // 7. 应用预设到 categories
    if let Some(categories) = config.get_mut("categories").and_then(|c| c.as_object_mut()) {
        for (cat_name, model_config) in preset.categories {
            if let Some(category) = categories
                .get_mut(&cat_name)
                .and_then(|c| c.as_object_mut())
            {
                category.insert(
                    "model".to_string(),
                    serde_json::Value::String(model_config.model.clone()),
                );
                if let Some(variant) = model_config.variant {
                    category.insert("variant".to_string(), serde_json::Value::String(variant));
                } else {
                    category.remove("variant");
                }
            }
        }
    }

    // 8. 验证并写入配置
    config_service::validate_config(&config)?;
    config_service::write_omo_config(&config)?;

    // 9. 记录当前激活的内置预设（用于托盘菜单显示）
    crate::services::preset_service::set_active_preset(&format!("__builtin__{}", preset_id))?;

    Ok(())
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 获取内置预设存储目录
fn get_builtin_presets_dir() -> Result<PathBuf, String> {
    // 优先使用 XDG_CACHE_HOME，否则使用 ~/.cache
    let cache_dir = if let Ok(xdg_cache) = std::env::var("XDG_CACHE_HOME") {
        PathBuf::from(xdg_cache)
    } else {
        let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;
        PathBuf::from(home).join(".cache")
    };

    Ok(cache_dir.join(BUILTIN_PRESETS_DIR))
}

/// 获取上次保存的哈希文件路径
fn get_hash_file_path() -> Result<PathBuf, String> {
    let cache_dir = get_builtin_presets_dir()?;
    Ok(cache_dir.join(".last-hash"))
}

/// 读取上次保存的内容哈希
fn load_last_content_hash() -> Option<String> {
    let path = get_hash_file_path().ok()?;
    if path.exists() {
        fs::read_to_string(path).ok()
    } else {
        None
    }
}

/// 保存当前内容哈希
fn save_last_content_hash(hash: &str) -> Result<(), String> {
    let path = get_hash_file_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建哈希文件目录失败: {}", e))?;
    }
    fs::write(&path, hash).map_err(|e| format!("保存哈希文件失败: {}", e))?;
    Ok(())
}

/// 确保内置预设文件存在，不存在则生成
fn ensure_builtin_presets_exist(presets_dir: &PathBuf) -> Result<(), String> {
    // 创建预设目录
    fs::create_dir_all(presets_dir).map_err(|e| format!("创建预设目录失败: {}", e))?;

    // 检查并生成官方默认预设
    let official_path = presets_dir.join(PRESET_OFFICIAL_DEFAULT);
    if !official_path.exists() {
        let preset = generate_official_default_preset()?;
        let content =
            serde_json::to_string_pretty(&preset).map_err(|e| format!("序列化预设失败: {}", e))?;
        fs::write(&official_path, content).map_err(|e| format!("写入预设文件失败: {}", e))?;
    }

    // 检查并生成经济模式预设
    let economy_path = presets_dir.join(PRESET_ECONOMY);
    if !economy_path.exists() {
        let preset = generate_economy_preset();
        let content =
            serde_json::to_string_pretty(&preset).map_err(|e| format!("序列化预设失败: {}", e))?;
        fs::write(&economy_path, content).map_err(|e| format!("写入预设文件失败: {}", e))?;
    }

    // 检查并生成高性能模式预设
    let high_perf_path = presets_dir.join(PRESET_HIGH_PERFORMANCE);
    if !high_perf_path.exists() {
        let preset = generate_high_performance_preset();
        let content =
            serde_json::to_string_pretty(&preset).map_err(|e| format!("序列化预设失败: {}", e))?;
        fs::write(&high_perf_path, content).map_err(|e| format!("写入预设文件失败: {}", e))?;
    }

    Ok(())
}

/// 生成官方默认预设
///
/// 从上游获取配置，使用 fallback chain 中的第一个模型
fn generate_official_default_preset() -> Result<BuiltinPresetData, String> {
    // 获取上游配置
    let ts_content = fetch_upstream_file(UPSTREAM_CONFIG_URL)?;
    let categories = parse_default_categories(&ts_content)?;
    let agent_requirements = parse_agent_model_requirements(&ts_content)?;

    // 转换 categories
    let category_configs: HashMap<String, ModelConfig> = categories
        .into_iter()
        .map(|(name, cat)| {
            (
                name,
                ModelConfig {
                    model: cat.model,
                    variant: cat.variant,
                },
            )
        })
        .collect();

    // 转换 agents（使用 fallback chain 中的第一个）
    let agent_configs: HashMap<String, ModelConfig> = agent_requirements
        .into_iter()
        .filter_map(|(name, fallback_chain)| {
            fallback_chain.first().map(|entry| {
                (
                    name,
                    ModelConfig {
                        model: entry.model.clone(),
                        variant: entry.variant.clone(),
                    },
                )
            })
        })
        .collect();

    Ok(BuiltinPresetData {
        id: "official-default".to_string(),
        name: "官方默认".to_string(),
        description: "使用上游 oh-my-opencode 的首选模型配置".to_string(),
        agents: agent_configs,
        categories: category_configs,
    })
}

/// 生成经济模式预设
///
/// 使用最便宜的模型：
/// - haiku 系列模型（如 claude-haiku-4-5）
/// - nano 系列模型（如 gemma-3-1b-it）
/// - 免费版本模型
fn generate_economy_preset() -> BuiltinPresetData {
    // 定义经济模式的 agent 配置
    // 使用 haiku/nano 等低成本模型
    let agents: HashMap<String, ModelConfig> = vec![
        ("sisyphus", "anthropic/claude-haiku-4-5", None),
        ("hephaestus", "anthropic/claude-haiku-4-5", None),
        ("oracle", "anthropic/claude-haiku-4-5", None),
        ("metis", "anthropic/claude-haiku-4-5", None),
        ("momus", "anthropic/claude-haiku-4-5", None),
        ("librarian", "anthropic/claude-haiku-4-5", None),
        ("explore", "anthropic/claude-haiku-4-5", None),
    ]
    .into_iter()
    .map(|(name, model, variant)| {
        (
            name.to_string(),
            ModelConfig {
                model: model.to_string(),
                variant: variant.map(|v: &str| v.to_string()),
            },
        )
    })
    .collect();

    // 定义经济模式的 category 配置
    let categories: HashMap<String, ModelConfig> = vec![
        ("quick", "anthropic/claude-haiku-4-5", None),
        ("visual-engineering", "anthropic/claude-haiku-4-5", None),
        ("ultrabrain", "anthropic/claude-haiku-4-5", None),
        ("unspecified-high", "anthropic/claude-haiku-4-5", None),
        ("artistry", "anthropic/claude-haiku-4-5", None),
        ("writing", "anthropic/claude-haiku-4-5", None),
    ]
    .into_iter()
    .map(|(name, model, variant)| {
        (
            name.to_string(),
            ModelConfig {
                model: model.to_string(),
                variant: variant.map(|v: &str| v.to_string()),
            },
        )
    })
    .collect();

    BuiltinPresetData {
        id: "economy".to_string(),
        name: "经济模式".to_string(),
        description: "使用最便宜的模型，适合节省 API 费用".to_string(),
        agents,
        categories,
    }
}

/// 生成高性能模式预设
///
/// 使用最强模型 + max/high variant：
/// - opus 系列模型（如 claude-opus-4-6）
/// - codex 系列模型
/// - 使用 max/high 变体
fn generate_high_performance_preset() -> BuiltinPresetData {
    // 定义高性能模式的 agent 配置
    // 使用 opus/codex 等最强大的模型
    let agents: HashMap<String, ModelConfig> = vec![
        ("sisyphus", "anthropic/claude-opus-4-6", Some("max")),
        ("hephaestus", "openai/gpt-5.3-codex", Some("xhigh")),
        ("oracle", "anthropic/claude-opus-4-6", Some("max")),
        ("metis", "anthropic/claude-opus-4-6", Some("max")),
        ("momus", "anthropic/claude-opus-4-6", Some("max")),
        ("librarian", "anthropic/claude-opus-4-6", Some("max")),
        ("explore", "anthropic/claude-sonnet-4-5", Some("high")),
    ]
    .into_iter()
    .map(|(name, model, variant)| {
        (
            name.to_string(),
            ModelConfig {
                model: model.to_string(),
                variant: variant.map(|v: &str| v.to_string()),
            },
        )
    })
    .collect();

    // 定义高性能模式的 category 配置
    let categories: HashMap<String, ModelConfig> = vec![
        ("quick", "anthropic/claude-sonnet-4-5", Some("high")),
        ("visual-engineering", "google/gemini-3-pro", Some("high")),
        ("ultrabrain", "openai/gpt-5.3-codex", Some("xhigh")),
        ("unspecified-high", "anthropic/claude-opus-4-6", Some("max")),
        ("artistry", "anthropic/claude-sonnet-4-5", Some("high")),
        ("writing", "anthropic/claude-sonnet-4-5", Some("high")),
    ]
    .into_iter()
    .map(|(name, model, variant)| {
        (
            name.to_string(),
            ModelConfig {
                model: model.to_string(),
                variant: variant.map(|v: &str| v.to_string()),
            },
        )
    })
    .collect();

    BuiltinPresetData {
        id: "high-performance".to_string(),
        name: "高性能模式".to_string(),
        description: "使用最强模型 + max/high 变体，追求最佳效果".to_string(),
        agents,
        categories,
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_preset_info_serialization() {
        let info = BuiltinPresetInfo {
            id: "test".to_string(),
            name: "测试预设".to_string(),
            description: "这是一个测试预设".to_string(),
            icon: Some("star".to_string()),
        };

        let json = serde_json::to_string(&info).unwrap();
        let restored: BuiltinPresetInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.id, info.id);
        assert_eq!(restored.name, info.name);
    }

    #[test]
    fn test_model_config_serialization() {
        let config = ModelConfig {
            model: "anthropic/claude-opus-4-6".to_string(),
            variant: Some("max".to_string()),
        };

        let json = serde_json::to_string(&config).unwrap();
        let restored: ModelConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.model, config.model);
        assert_eq!(restored.variant, config.variant);
    }

    #[test]
    fn test_model_config_without_variant() {
        let config = ModelConfig {
            model: "anthropic/claude-haiku-4-5".to_string(),
            variant: None,
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(!json.contains("variant"));
    }

    #[test]
    fn test_builtin_preset_data_serialization() {
        let mut agents = HashMap::new();
        agents.insert(
            "sisyphus".to_string(),
            ModelConfig {
                model: "anthropic/claude-opus-4-6".to_string(),
                variant: Some("max".to_string()),
            },
        );

        let mut categories = HashMap::new();
        categories.insert(
            "quick".to_string(),
            ModelConfig {
                model: "anthropic/claude-haiku-4-5".to_string(),
                variant: None,
            },
        );

        let preset = BuiltinPresetData {
            id: "test".to_string(),
            name: "测试预设".to_string(),
            description: "测试描述".to_string(),
            agents,
            categories,
        };

        let json = serde_json::to_string_pretty(&preset).unwrap();
        let restored: BuiltinPresetData = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.id, preset.id);
        assert_eq!(restored.agents.len(), 1);
        assert_eq!(restored.categories.len(), 1);
    }

    #[test]
    fn test_get_builtin_presets() {
        let presets = get_builtin_presets().unwrap();
        assert_eq!(presets.len(), 3);
        assert_eq!(presets[0].id, "official-default");
        assert_eq!(presets[1].id, "economy");
        assert_eq!(presets[2].id, "high-performance");
    }

    #[test]
    fn test_generate_economy_preset() {
        let preset = generate_economy_preset();
        assert_eq!(preset.id, "economy");
        assert!(!preset.agents.is_empty());
        assert!(!preset.categories.is_empty());

        // 验证所有 agent 都使用 haiku 模型
        for (_, config) in preset.agents {
            assert!(config.model.contains("haiku"));
        }
    }

    #[test]
    fn test_generate_high_performance_preset() {
        let preset = generate_high_performance_preset();
        assert_eq!(preset.id, "high-performance");
        assert!(!preset.agents.is_empty());
        assert!(!preset.categories.is_empty());

        // 验证大部分 agent 使用 opus 或 codex 模型
        let opus_count = preset
            .agents
            .values()
            .filter(|c| c.model.contains("opus") || c.model.contains("codex"))
            .count();
        assert!(opus_count >= 5);
    }

    #[test]
    fn test_get_builtin_presets_dir() {
        let dir = get_builtin_presets_dir().unwrap();
        assert!(dir.to_string_lossy().contains("oh-my-opencode"));
        assert!(dir.to_string_lossy().contains("builtin-presets"));
    }
}
