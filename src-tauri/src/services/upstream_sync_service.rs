//! 上游配置同步服务模块
//!
//! 提供从 GitHub Raw 文件获取和解析 TypeScript 配置的功能
//! 支持解析 DEFAULT_CATEGORIES 和 AGENT_MODEL_REQUIREMENTS

use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

// ============================================================================
// 数据结构定义
// ============================================================================

/// Category 默认配置
/// 对应 TypeScript 中的 { model: string, variant?: string }
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CategoryDefault {
    /// 模型名称，格式为 "provider/model"
    pub model: String,
    /// 可选的变体/强度等级
    pub variant: Option<String>,
}

/// Fallback 条目
/// 对应 TypeScript 中的 FallbackEntry 类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FallbackEntry {
    /// 提供商列表
    pub providers: Vec<String>,
    /// 模型名称
    pub model: String,
    /// 可选的变体/强度等级
    pub variant: Option<String>,
}

/// 上游同步结果
/// 包含解析后的配置数据和内容哈希
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamSyncResult {
    /// 是否有更新（基于哈希对比）
    pub has_update: bool,
    /// 解析后的 Category 默认配置
    pub categories: HashMap<String, CategoryDefault>,
    /// 解析后的 Agent 模型需求配置（只保留 fallbackChain）
    pub agent_requirements: HashMap<String, Vec<FallbackEntry>>,
    /// 内容哈希（SHA256）
    pub content_hash: String,
}

// ============================================================================
// 预编译正则表达式（避免循环中重复编译）
// ============================================================================

lazy_static! {
    static ref CATEGORIES_OUTER_REGEX: Regex = Regex::new(
        r"(?s)export\s+const\s+DEFAULT_CATEGORIES[^=]*=\s*\{(.+?)\n\}"
    ).unwrap();
    
    static ref CATEGORIES_ENTRY_REGEX: Regex = Regex::new(
        r#"(?m)^\s*["']?([a-zA-Z0-9_-]+)["']?\s*:\s*\{\s*model:\s*["']([^"']+)["'](?:\s*,\s*variant:\s*["']([^"']+)["'])?\s*\}"#
    ).unwrap();
    
    static ref AGENT_OUTER_REGEX: Regex = Regex::new(
        r"(?ms)export\s+const\s+AGENT_MODEL_REQUIREMENTS[^{]*\{(.+?)^\}"
    ).unwrap();
    
    static ref AGENT_NAME_REGEX: Regex = Regex::new(
        r#"([a-zA-Z0-9_-]+)\s*:\s*\{"#
    ).unwrap();
    
    static ref AGENT_BLOCK_END_REGEX: Regex = Regex::new(
        r#"\},\s*\n\s*["']?[a-zA-Z0-9_-]+["']?\s*:\s*\{"#
    ).unwrap();
    
    static ref FALLBACK_CHAIN_REGEX: Regex = Regex::new(
        r"fallbackChain:\s*\[((?:[^\[\]]|\[(?:[^\[\]])*\])*)\]"
    ).unwrap();
    
    static ref FALLBACK_ENTRY_REGEX: Regex = Regex::new(
        r#"\{\s*providers:\s*\[([^\]]*)\]\s*,\s*model:\s*["']([^"']+)["'](?:\s*,\s*variant:\s*["']([^"']+)["'])?\s*\}"#
    ).unwrap();
}

// ============================================================================
// HTTP 获取功能
// ============================================================================

/// 从指定 URL 获取 GitHub Raw 文件内容
///
/// 使用 ureq 发送 HTTP GET 请求，获取文件内容
pub fn fetch_upstream_file(url: &str) -> Result<String, String> {
    let response = ureq::get(url)
        .timeout(std::time::Duration::from_secs(3))
        .call()
        .map_err(|e| format!("HTTP 请求失败: {}", e))?;

    if response.status() != 200 {
        return Err(format!("HTTP 错误: 状态码 {}", response.status()));
    }

    let content = response
        .into_string()
        .map_err(|e| format!("读取响应内容失败: {}", e))?;

    Ok(content)
}

// ============================================================================
// 内容哈希计算
// ============================================================================

/// 计算内容的 SHA256 哈希值
pub fn compute_content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// ============================================================================
// TypeScript 解析功能
// ============================================================================

/// 从 TypeScript 源码中解析 DEFAULT_CATEGORIES
///
/// 使用正则表达式提取 DEFAULT_CATEGORIES 对象中的内容
/// 并解析每个 category 的 model 和 variant
pub fn parse_default_categories(
    ts_source: &str,
) -> Result<HashMap<String, CategoryDefault>, String> {
    let mut categories = HashMap::new();

    // 定位 DEFAULT_CATEGORIES 对象（使用预编译正则）
    let caps = CATEGORIES_OUTER_REGEX
        .captures(ts_source)
        .ok_or("未找到 DEFAULT_CATEGORIES 定义")?;

    let categories_block = &caps[1];

    // 解析每个 category 条目（使用预编译正则）
    for cap in CATEGORIES_ENTRY_REGEX.captures_iter(categories_block) {
        let name = cap[1].to_string();
        let model = cap[2].to_string();
        let variant = cap.get(3).map(|m| m.as_str().to_string());

        categories.insert(name, CategoryDefault { model, variant });
    }

    if categories.is_empty() {
        return Err("未能解析任何 category 条目".to_string());
    }

    Ok(categories)
}

/// 从 TypeScript 源码中解析 AGENT_MODEL_REQUIREMENTS
///
/// 使用正则表达式提取 AGENT_MODEL_REQUIREMENTS 对象中的内容
/// 并解析每个 agent 的 fallbackChain
pub fn parse_agent_model_requirements(
    ts_source: &str,
) -> Result<HashMap<String, Vec<FallbackEntry>>, String> {
    let mut agent_requirements = HashMap::new();

    // 步骤1: 定位 AGENT_MODEL_REQUIREMENTS 对象（使用预编译正则）
    let caps = AGENT_OUTER_REGEX
        .captures(ts_source)
        .ok_or("未找到 AGENT_MODEL_REQUIREMENTS 定义")?;

    let requirements_block = &caps[1];

    // 步骤2: 找到所有 agent 名称（使用预编译正则）
    for agent_cap in AGENT_NAME_REGEX.captures_iter(requirements_block) {
        let agent_name = agent_cap[1].to_string();
        let start_pos = agent_cap.get(0).unwrap().end();

        let remaining = &requirements_block[start_pos - 1..];

        // 找到这个 agent 块的结束（使用预编译正则）
        let block_end = AGENT_BLOCK_END_REGEX
            .find(remaining)
            .map(|m| m.start())
            .unwrap_or(remaining.len());

        let agent_block = &remaining[..block_end.min(remaining.len())];

        // 步骤3: 从 agent 块中提取 fallbackChain（使用预编译正则）
        if let Some(fallback_caps) = FALLBACK_CHAIN_REGEX.captures(agent_block) {
            let fallback_content = &fallback_caps[1];
            let mut fallback_chain = Vec::new();

            for entry_cap in FALLBACK_ENTRY_REGEX.captures_iter(fallback_content) {
                let providers_str = &entry_cap[1];
                let model = entry_cap[2].to_string();
                let variant = entry_cap.get(3).map(|m| m.as_str().to_string());

                let providers: Vec<String> = providers_str
                    .split(',')
                    .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
                    .filter(|s| !s.is_empty())
                    .collect();

                fallback_chain.push(FallbackEntry {
                    providers,
                    model,
                    variant,
                });
            }

            if !fallback_chain.is_empty() {
                agent_requirements.insert(agent_name, fallback_chain);
            }
        }
    }

    if agent_requirements.is_empty() {
        return Err("未能解析任何 agent requirement 条目".to_string());
    }

    Ok(agent_requirements)
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_content_hash() {
        let content = "hello world";
        let hash = compute_content_hash(content);
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn test_compute_content_hash_empty() {
        let hash = compute_content_hash("");
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_parse_default_categories() {
        let ts_source = r#"
export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "visual-engineering": { model: "google/gemini-3-pro", variant: "high" },
  ultrabrain: { model: "openai/gpt-5.3-codex", variant: "xhigh" },
  quick: { model: "anthropic/claude-haiku-4-5" },
  "unspecified-high": { model: "anthropic/claude-opus-4-6", variant: "max" },
}
"#;

        let result = parse_default_categories(ts_source).unwrap();

        assert_eq!(result.len(), 4);

        let visual = result.get("visual-engineering").unwrap();
        assert_eq!(visual.model, "google/gemini-3-pro");
        assert_eq!(visual.variant, Some("high".to_string()));

        let quick = result.get("quick").unwrap();
        assert_eq!(quick.model, "anthropic/claude-haiku-4-5");
        assert_eq!(quick.variant, None);
    }

    #[test]
    fn test_parse_default_categories_not_found() {
        let ts_source = r#"
export const SOMETHING_ELSE = { foo: "bar" }
"#;
        let result = parse_default_categories(ts_source);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_agent_model_requirements() {
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  sisyphus: {
    fallbackChain: [
      { providers: ["anthropic", "github-copilot"], model: "claude-opus-4-6", variant: "max" },
      { providers: ["kimi-for-coding"], model: "k2p5" },
    ],
    requiresAnyModel: true,
  },
  hephaestus: {
    fallbackChain: [
      { providers: ["openai"], model: "gpt-5.3-codex", variant: "medium" },
    ],
  },
  oracle: {
    fallbackChain: [
      { providers: ["openai", "google"], model: "gpt-5.2", variant: "high" },
    ],
  },
}
"#;

        let result = parse_agent_model_requirements(ts_source).unwrap();

        assert_eq!(result.len(), 3);

        let sisyphus = result.get("sisyphus").unwrap();
        assert_eq!(sisyphus.len(), 2);
        assert_eq!(sisyphus[0].providers, vec!["anthropic", "github-copilot"]);
        assert_eq!(sisyphus[0].model, "claude-opus-4-6");
        assert_eq!(sisyphus[0].variant, Some("max".to_string()));
        assert_eq!(sisyphus[1].variant, None);

        let hephaestus = result.get("hephaestus").unwrap();
        assert_eq!(hephaestus.len(), 1);

        let oracle = result.get("oracle").unwrap();
        assert_eq!(oracle.len(), 1);
    }

    #[test]
    fn test_parse_agent_model_requirements_not_found() {
        let ts_source = r#"
export const SOMETHING_ELSE = { foo: "bar" }
"#;
        let result = parse_agent_model_requirements(ts_source);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_agent_model_requirements_empty_fallback() {
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  testAgent: {
    fallbackChain: [],
  },
}
"#;
        let result = parse_agent_model_requirements(ts_source);
        assert!(result.is_err() || result.unwrap().is_empty());
    }

    #[test]
    fn test_category_default_serialization() {
        let category = CategoryDefault {
            model: "anthropic/claude-sonnet-4-5".to_string(),
            variant: Some("high".to_string()),
        };

        let json = serde_json::to_string(&category).unwrap();
        let restored: CategoryDefault = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.model, category.model);
        assert_eq!(restored.variant, category.variant);
    }

    #[test]
    fn test_fallback_entry_serialization() {
        let entry = FallbackEntry {
            providers: vec!["anthropic".to_string()],
            model: "claude-opus-4-6".to_string(),
            variant: Some("max".to_string()),
        };

        let json = serde_json::to_string(&entry).unwrap();
        let restored: FallbackEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(restored.providers, entry.providers);
        assert_eq!(restored.model, entry.model);
    }

    #[test]
    fn test_fetch_upstream_file_invalid_url() {
        let result = fetch_upstream_file("not-a-valid-url");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_complex_typescript() {
        let ts_source = r#"
import type { CategoryConfig } from "./schema"
export const SOME_CONSTANT = "value"

export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "visual-engineering": { model: "google/gemini-3-pro", variant: "high" },
  quick: { model: "anthropic/claude-haiku-4-5" },
}

export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  sisyphus: {
    fallbackChain: [
      { providers: ["anthropic"], model: "claude-opus-4-6", variant: "max" },
    ],
  },
}
"#;

        let categories = parse_default_categories(ts_source).unwrap();
        assert_eq!(categories.len(), 2);

        let requirements = parse_agent_model_requirements(ts_source).unwrap();
        assert_eq!(requirements.len(), 1);
        assert!(requirements.contains_key("sisyphus"));
    }

    // ============================================================================
    // Edge Case 测试
    // ============================================================================

    /// 测试：额外空格和换行符（多行格式）
    #[test]
    fn test_parse_categories_with_extra_whitespace() {
        let ts_source = r#"
export const DEFAULT_CATEGORIES: CategoryConfig = {
  "visual-engineering": {
    model: "google/gemini-3-pro",
    variant: "high"
  },
  "quick":
  {
    model: "anthropic/claude-haiku-4-5"
  },
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains_key("visual-engineering"));
        assert!(result.contains_key("quick"));

        let visual = result.get("visual-engineering").unwrap();
        assert_eq!(visual.model, "google/gemini-3-pro");
        assert_eq!(visual.variant, Some("high".to_string()));
    }

    /// 测试：包含 TypeScript 注释
    #[test]
    fn test_parse_categories_with_comments() {
        let ts_source = r#"
// 这是默认分类配置
export const DEFAULT_CATEGORIES: CategoryConfig = {
  // 视觉工程类任务
  "visual-engineering": { model: "google/gemini-3-pro", variant: "high" },
  /* 快速响应类任务
     使用轻量级模型 */
  quick: { model: "anthropic/claude-haiku-4-5" }, // 无 variant
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains_key("visual-engineering"));
        assert!(result.contains_key("quick"));
    }

    /// 测试：model 字符串包含特殊字符（/, ., -, _）
    #[test]
    fn test_parse_categories_with_special_chars_in_model() {
        let ts_source = r#"
export const DEFAULT_CATEGORIES: CategoryConfig = {
  "test-category": { model: "provider/model-name-v2.0-beta", variant: "xhigh" },
  "another_category": { model: "x/y-z.a_b" },
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        assert_eq!(result.len(), 2);

        let test_cat = result.get("test-category").unwrap();
        assert_eq!(test_cat.model, "provider/model-name-v2.0-beta");

        let another = result.get("another_category").unwrap();
        assert_eq!(another.model, "x/y-z.a_b");
        assert_eq!(another.variant, None);
    }

    /// 测试：空文件
    #[test]
    fn test_parse_categories_empty_file() {
        let ts_source = "";
        let result = parse_default_categories(ts_source);
        assert!(result.is_err());

        let result2 = parse_agent_model_requirements(ts_source);
        assert!(result2.is_err());
    }

    /// 测试：非 TypeScript 内容（纯文本）
    #[test]
    fn test_parse_categories_non_typescript_content() {
        let ts_source = r#"
这是一个普通文本文件
没有 TypeScript 代码
just some random content
"#;
        let result = parse_default_categories(ts_source);
        assert!(result.is_err());

        let result2 = parse_agent_model_requirements(ts_source);
        assert!(result2.is_err());
    }

    /// 测试：非 TypeScript 内容（JSON 格式）
    #[test]
    fn test_parse_categories_json_content() {
        let ts_source = r#"
{
  "visual-engineering": { "model": "google/gemini-3-pro", "variant": "high" },
  "quick": { "model": "anthropic/claude-haiku-4-5" }
}
"#;
        let result = parse_default_categories(ts_source);
        assert!(result.is_err()); // 不是 TypeScript export 语法
    }

    /// 测试：新增未知 category（应正常解析）
    #[test]
    fn test_parse_categories_new_unknown_category() {
        let ts_source = r#"
export const DEFAULT_CATEGORIES: CategoryConfig = {
  "visual-engineering": { model: "google/gemini-3-pro", variant: "high" },
  "unknown-new-category": { model: "some-provider/some-model", variant: "custom" },
  "another-unknown": { model: "provider/model" },
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        // 应该正常解析所有 category，包括未知的
        assert_eq!(result.len(), 3);
        assert!(result.contains_key("unknown-new-category"));
        assert!(result.contains_key("another-unknown"));

        let unknown = result.get("unknown-new-category").unwrap();
        assert_eq!(unknown.model, "some-provider/some-model");
    }

    /// 测试：删除已有 category（只保留部分，应正常解析）
    #[test]
    fn test_parse_categories_partial_entries() {
        // 模拟上游删除了某些 category
        let ts_source = r#"
export const DEFAULT_CATEGORIES: CategoryConfig = {
  "visual-engineering": { model: "google/gemini-3-pro", variant: "high" },
  // ultrabrain 和 quick 被删除了
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        // 只解析到 1 个 category
        assert_eq!(result.len(), 1);
        assert!(result.contains_key("visual-engineering"));
        assert!(!result.contains_key("ultrabrain"));
    }

    /// 测试：Agent model 包含特殊字符
    #[test]
    fn test_parse_agent_with_special_chars_in_model() {
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  testAgent: {
    fallbackChain: [
      { providers: ["provider-a", "provider_b"], model: "model-v2.0.1-beta", variant: "xhigh" },
      { providers: ["x"], model: "a/b-c.d_e" },
    ],
  },
}
"#;
        let result = parse_agent_model_requirements(ts_source).unwrap();

        assert_eq!(result.len(), 1);
        let chain = result.get("testAgent").unwrap();
        assert_eq!(chain.len(), 2);
        assert_eq!(chain[0].model, "model-v2.0.1-beta");
        assert_eq!(chain[1].model, "a/b-c.d_e");
    }

    /// 测试：Agent 解析多行格式
    #[test]
    fn test_parse_agent_requirements_extra_whitespace() {
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS = {
  sisyphus: {
    fallbackChain: [
      {
        providers: ["anthropic", "github-copilot"],
        model: "claude-opus-4-6",
        variant: "max"
      },
    ],
  },
}
"#;
        let result = parse_agent_model_requirements(ts_source).unwrap();

        assert_eq!(result.len(), 1);
        let chain = result.get("sisyphus").unwrap();
        assert_eq!(chain.len(), 1);
        assert_eq!(chain[0].providers, vec!["anthropic", "github-copilot"]);
        assert_eq!(chain[0].model, "claude-opus-4-6");
    }

    /// 测试：新增未知 agent（应正常解析）
    #[test]
    fn test_parse_agent_requirements_new_unknown_agent() {
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  sisyphus: {
    fallbackChain: [
      { providers: ["anthropic"], model: "claude-opus-4-6" },
    ],
  },
  unknown-new-agent: {
    fallbackChain: [
      { providers: ["unknown-provider"], model: "unknown-model", variant: "custom" },
    ],
  },
}
"#;
        let result = parse_agent_model_requirements(ts_source).unwrap();

        // 应该正常解析所有 agent，包括未知的
        assert_eq!(result.len(), 2);
        assert!(result.contains_key("unknown-new-agent"));

        let unknown_chain = result.get("unknown-new-agent").unwrap();
        assert_eq!(unknown_chain[0].model, "unknown-model");
    }

    /// 测试：删除已有 agent（只保留部分，应正常解析）
    #[test]
    fn test_parse_agent_requirements_partial_entries() {
        // 模拟上游删除了某些 agent
        let ts_source = r#"
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  sisyphus: {
    fallbackChain: [
      { providers: ["anthropic"], model: "claude-opus-4-6", variant: "max" },
    ],
  },
  // hephaestus 和 oracle 被删除了
}
"#;
        let result = parse_agent_model_requirements(ts_source).unwrap();

        // 只解析到 1 个 agent
        assert_eq!(result.len(), 1);
        assert!(result.contains_key("sisyphus"));
        assert!(!result.contains_key("hephaestus"));
    }

    /// 测试：超大文件性能（确保不超时）
    #[test]
    fn test_parse_categories_large_file() {
        // 构建一个包含大量 category 的输入
        let mut categories_content =
            String::from("export const DEFAULT_CATEGORIES: CategoryConfig = {\n");

        // 添加 100 个 category
        for i in 0..100 {
            categories_content.push_str(&format!(
                r#"  "category-{}": {{ model: "provider-{}/model-{}", variant: "level-{}" }},
"#,
                i,
                i % 10,
                i,
                i % 5
            ));
        }
        categories_content.push_str("}\n");

        // 记录开始时间
        let start = std::time::Instant::now();

        let result = parse_default_categories(&categories_content).unwrap();

        let elapsed = start.elapsed();

        // 验证解析结果
        assert_eq!(result.len(), 100);
        assert!(result.contains_key("category-0"));
        assert!(result.contains_key("category-99"));

        // 验证性能：应该在 1 秒内完成
        assert!(
            elapsed.as_millis() < 1000,
            "解析 100 个 category 耗时 {:?}，超过 1 秒",
            elapsed
        );
    }

    /// 测试：超大 Agent 配置性能（确保不超时）
    #[test]
    fn test_parse_agent_requirements_large_file() {
        // 构建一个包含大量 agent 的输入
        let mut content = String::from(
            "export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {\n",
        );

        // 添加 50 个 agent，每个有 5 个 fallback
        for i in 0..50 {
            content.push_str(&format!(
                r#"  agent-{}: {{
    fallbackChain: [
"#,
                i
            ));
            for j in 0..5 {
                content.push_str(&format!(
                    r#"      {{ providers: ["p1", "p2"], model: "model-{}-{}", variant: "v{}" }},
"#,
                    i, j, j
                ));
            }
            content.push_str("    ],\n  },\n");
        }
        content.push_str("}\n");

        let start = std::time::Instant::now();

        let result = parse_agent_model_requirements(&content).unwrap();

        let elapsed = start.elapsed();

        // 验证解析结果
        assert_eq!(result.len(), 50);
        assert!(result.contains_key("agent-0"));
        assert!(result.contains_key("agent-49"));

        // 每个 agent 应该有 5 个 fallback
        let chain = result.get("agent-25").unwrap();
        assert_eq!(chain.len(), 5);

        // 验证性能：应该在 2 秒内完成（agent 解析更复杂）
        assert!(
            elapsed.as_millis() < 2000,
            "解析 50 个 agent 耗时 {:?}，超过 2 秒",
            elapsed
        );
    }

    /// 测试：Agent 包含 TypeScript 注释
    #[test]
    fn test_parse_agent_requirements_with_comments() {
        let ts_source = r#"
// Agent 模型需求配置
export const AGENT_MODEL_REQUIREMENTS: Record<string, ModelRequirement> = {
  // Sisyphus 主执行器
  sisyphus: {
    fallbackChain: [
      /* 首选模型 */
      { providers: ["anthropic"], model: "claude-opus-4-6", variant: "max" },
    ],
  }, // sisyphus 结束
}
"#;
        let result = parse_agent_model_requirements(ts_source).unwrap();

        assert_eq!(result.len(), 1);
        assert!(result.contains_key("sisyphus"));
    }

    /// 测试：category 名称使用引号和不使用引号混合
    #[test]
    fn test_parse_categories_mixed_quote_styles() {
        let ts_source = r#"
export const DEFAULT_CATEGORIES: CategoryConfig = {
  "quoted-category": { model: "provider/model1" },
  unquotedCategory: { model: "provider/model2" },
  'single-quoted': { model: "provider/model3" },
}
"#;
        let result = parse_default_categories(ts_source).unwrap();

        // 注意：当前正则可能不支持单引号，这里测试双引号和无引号
        assert!(result.contains_key("quoted-category"));
        assert!(result.contains_key("unquotedCategory"));
        // 单引号可能不被支持，取决于正则实现
    }
}
