//! 配置缓存服务模块
//!
//! 提供配置快照的保存、加载、对比和合并功能
//! 缓存文件位置: ~/.cache/oh-my-opencode/config-snapshot.json

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

// ============================================================================
// 数据结构定义
// ============================================================================

/// 配置快照缓存结构
/// 存储在 ~/.cache/oh-my-opencode/config-snapshot.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSnapshot {
    /// 缓存时间戳（Unix 毫秒）
    pub cached_at: u64,
    /// 配置内容（保留所有字段）
    pub config: Value,
}

/// 配置变更记录
/// 用于描述两个配置之间的差异
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigChange {
    /// 变更路径，例如 "agents.sisyphus.model"
    pub path: String,
    /// 变更类型: "added" | "removed" | "modified"
    pub change_type: String,
    /// 旧值（added 时为 None）
    pub old_value: Option<Value>,
    /// 新值（removed 时为 None）
    pub new_value: Option<Value>,
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 获取缓存目录路径（使用系统标准缓存目录）
/// macOS: ~/Library/Caches/oh-my-opencode/
/// Linux: ~/.cache/oh-my-opencode/
fn get_cache_dir() -> Result<PathBuf, String> {
    dirs::cache_dir()
        .ok_or_else(|| "无法获取系统缓存目录".to_string())
        .map(|p| p.join("oh-my-opencode"))
}

/// 获取配置快照文件路径
/// 返回 ~/.cache/oh-my-opencode/config-snapshot.json
fn get_snapshot_path() -> Result<PathBuf, String> {
    get_cache_dir().map(|p| p.join("config-snapshot.json"))
}

/// 获取当前 Unix 时间戳（毫秒级）
fn now_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ============================================================================
// 核心功能函数
// ============================================================================

/// 保存配置快照到缓存文件
///
/// 将当前 OMO 配置保存到 ~/.cache/oh-my-opencode/config-snapshot.json
/// 只保留最近一次快照，不保留历史版本
///
/// 参数：
/// - config: 要保存的配置内容
///
/// 返回：
/// - Ok(()) 保存成功
/// - Err(String) 保存失败，包含错误信息
pub fn save_config_snapshot(config: &Value) -> Result<(), String> {
    let cache_dir = get_cache_dir()?;
    let snapshot_path = get_snapshot_path()?;

    // 确保缓存目录存在
    fs::create_dir_all(&cache_dir).map_err(|e| format!("创建缓存目录失败: {}", e))?;

    // 创建快照结构
    let snapshot = ConfigSnapshot {
        cached_at: now_timestamp_ms(),
        config: config.clone(),
    };

    // 序列化为 JSON（带格式化，便于调试）
    let json_string = serde_json::to_string_pretty(&snapshot)
        .map_err(|e| format!("序列化配置快照失败: {}", e))?;

    // 写入文件
    fs::write(&snapshot_path, json_string).map_err(|e| format!("写入配置快照失败: {}", e))?;

    Ok(())
}

/// 加载配置快照
///
/// 从 ~/.cache/oh-my-opencode/config-snapshot.json 读取缓存的配置
///
/// 返回：
/// - Some(ConfigSnapshot) 成功读取快照
/// - None 文件不存在或已损坏（不 panic）
pub fn load_config_snapshot() -> Option<ConfigSnapshot> {
    let snapshot_path = get_snapshot_path().ok()?;

    // 检查文件是否存在
    if !snapshot_path.exists() {
        return None;
    }

    // 读取文件内容
    let content = fs::read_to_string(&snapshot_path).ok()?;

    // 解析 JSON（文件损坏时返回 None 而非 panic）
    let snapshot: ConfigSnapshot = serde_json::from_str(&content).ok()?;

    Some(snapshot)
}

/// 深度对比两个配置
///
/// 递归比较两个 JSON 配置对象，返回所有差异的列表
///
/// 参数：
/// - old_config: 旧配置
/// - new_config: 新配置
///
/// 返回：
/// - Vec<ConfigChange>: 差异列表，包含路径、变更类型、新旧值
pub fn compare_configs(old_config: &Value, new_config: &Value) -> Vec<ConfigChange> {
    let mut changes = Vec::new();
    compare_values(old_config, new_config, "", &mut changes);
    changes
}

/// 递归比较两个 JSON 值
///
/// 参数：
/// - old_val: 旧值
/// - new_val: 新值
/// - path: 当前路径（例如 "agents.sisyphus"）
/// - changes: 差异收集器
fn compare_values(old_val: &Value, new_val: &Value, path: &str, changes: &mut Vec<ConfigChange>) {
    // 如果两个值相等，无需记录
    if old_val == new_val {
        return;
    }

    // 处理对象类型的深度比较
    if let (Some(old_obj), Some(new_obj)) = (old_val.as_object(), new_val.as_object()) {
        // 收集所有键
        let mut all_keys: std::collections::HashSet<&String> = old_obj.keys().collect();
        for key in new_obj.keys() {
            all_keys.insert(key);
        }

        // 遍历所有键进行比较
        for key in all_keys {
            let new_path = if path.is_empty() {
                key.clone()
            } else {
                format!("{}.{}", path, key)
            };

            let old_child = old_obj.get(key);
            let new_child = new_obj.get(key);

            match (old_child, new_child) {
                // 键存在于两者中，递归比较
                (Some(old), Some(new)) => {
                    compare_values(old, new, &new_path, changes);
                }
                // 键只存在于旧配置中 - removed
                (Some(old), None) => {
                    changes.push(ConfigChange {
                        path: new_path,
                        change_type: "removed".to_string(),
                        old_value: Some(old.clone()),
                        new_value: None,
                    });
                }
                // 键只存在于新配置中 - added
                (None, Some(new)) => {
                    changes.push(ConfigChange {
                        path: new_path,
                        change_type: "added".to_string(),
                        old_value: None,
                        new_value: Some(new.clone()),
                    });
                }
                // 两者都不存在（不可能发生，但满足 match 完整性）
                (None, None) => {}
            }
        }
        return;
    }

    // 处理数组类型的比较（按索引比较）
    if let (Some(old_arr), Some(new_arr)) = (old_val.as_array(), new_val.as_array()) {
        // 简单比较：如果数组长度不同，整体视为修改
        if old_arr.len() != new_arr.len() {
            changes.push(ConfigChange {
                path: path.to_string(),
                change_type: "modified".to_string(),
                old_value: Some(old_val.clone()),
                new_value: Some(new_val.clone()),
            });
            return;
        }

        // 逐元素比较
        for (i, (old_item, new_item)) in old_arr.iter().zip(new_arr.iter()).enumerate() {
            let new_path = format!("{}[{}]", path, i);
            compare_values(old_item, new_item, &new_path, changes);
        }
        return;
    }

    // 其他类型（字符串、数字、布尔等）- 直接记录为修改
    changes.push(ConfigChange {
        path: path.to_string(),
        change_type: "modified".to_string(),
        old_value: Some(old_val.clone()),
        new_value: Some(new_val.clone()),
    });
}

/// 合并配置
///
/// 将两个配置合并，策略：
/// - 以 new_config 为基础
/// - 保留 old_config 中存在但 new_config 中不存在的字段（外部新增字段）
/// - new_config 中的值覆盖 old_config 中的值
///
/// 参数：
/// - old_config: 旧配置（可能包含外部新增的字段）
/// - new_config: 新配置（优先级更高）
///
/// 返回：
/// - Value: 合并后的配置
pub fn merge_configs(old_config: &Value, new_config: &Value) -> Value {
    // 如果两者都是对象，递归合并
    if let (Some(old_obj), Some(new_obj)) = (old_config.as_object(), new_config.as_object()) {
        let mut merged = old_obj.clone();

        // 遍历新配置的所有键
        for (key, new_val) in new_obj {
            if let Some(old_val) = merged.get(key) {
                // 键存在于两者中，递归合并
                merged.insert(key.clone(), merge_configs(old_val, new_val));
            } else {
                // 键只存在于新配置中，直接插入
                merged.insert(key.clone(), new_val.clone());
            }
        }

        return Value::Object(merged);
    }

    // 其他情况，新配置优先
    new_config.clone()
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

    /// 测试时间戳生成
    #[test]
    fn test_timestamp_generation() {
        let ts = now_timestamp_ms();
        // 验证时间戳是毫秒级（应该大于 1_000_000_000_000）
        assert!(ts > 1_000_000_000_000);
    }

    /// 测试缓存目录路径
    #[test]
    fn test_cache_dir_path() {
        let path = get_cache_dir().expect("should get cache dir");
        assert!(path.to_string_lossy().contains("oh-my-opencode"));
    }

    /// 测试快照路径
    #[test]
    fn test_snapshot_path() {
        let path = get_snapshot_path().expect("should get snapshot path");
        assert!(path.to_string_lossy().contains("config-snapshot.json"));
    }

    /// 测试保存和加载配置快照
    #[test]
    fn test_save_and_load_snapshot() {
        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("omo-cache-test");
        fs::create_dir_all(&temp_dir).unwrap();

        // 创建测试配置
        let test_config = json!({
            "agents": {
                "sisyphus": {
                    "model": "test-model"
                }
            },
            "categories": {
                "quick": {
                    "model": "test-model"
                }
            },
            "custom_field": "should_be_preserved"
        });

        // 手动创建快照并保存到临时目录
        let snapshot = ConfigSnapshot {
            cached_at: now_timestamp_ms(),
            config: test_config.clone(),
        };

        let snapshot_path = temp_dir.join("config-snapshot.json");
        let json_string = serde_json::to_string_pretty(&snapshot).unwrap();
        fs::write(&snapshot_path, json_string).unwrap();

        // 读取并验证
        let content = fs::read_to_string(&snapshot_path).unwrap();
        let loaded: ConfigSnapshot = serde_json::from_str(&content).unwrap();

        assert_eq!(loaded.config, test_config);
        assert!(loaded.cached_at > 0);

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    /// 测试加载损坏的快照文件
    #[test]
    fn test_load_corrupted_snapshot() {
        let temp_dir = std::env::temp_dir().join("omo-cache-corrupt-test");
        fs::create_dir_all(&temp_dir).unwrap();

        let snapshot_path = temp_dir.join("config-snapshot.json");
        // 写入无效 JSON
        fs::write(&snapshot_path, "not valid json {{{").unwrap();

        // 尝试解析（模拟 load_config_snapshot 的行为）
        let content = fs::read_to_string(&snapshot_path).ok();
        let result: Option<ConfigSnapshot> = content.and_then(|c| serde_json::from_str(&c).ok());

        // 应该返回 None 而非 panic
        assert!(result.is_none());

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    /// 测试配置对比 - 检测添加的字段
    #[test]
    fn test_compare_configs_added() {
        let old_config = json!({
            "agents": {
                "sisyphus": {}
            }
        });

        let new_config = json!({
            "agents": {
                "sisyphus": {},
                "metis": {}
            }
        });

        let changes = compare_configs(&old_config, &new_config);

        // 应该检测到新增的 metis
        assert!(changes
            .iter()
            .any(|c| c.path == "agents.metis" && c.change_type == "added"));
    }

    /// 测试配置对比 - 检测删除的字段
    #[test]
    fn test_compare_configs_removed() {
        let old_config = json!({
            "agents": {
                "sisyphus": {},
                "metis": {}
            }
        });

        let new_config = json!({
            "agents": {
                "sisyphus": {}
            }
        });

        let changes = compare_configs(&old_config, &new_config);

        // 应该检测到删除的 metis
        assert!(changes
            .iter()
            .any(|c| c.path == "agents.metis" && c.change_type == "removed"));
    }

    /// 测试配置对比 - 检测修改的字段
    #[test]
    fn test_compare_configs_modified() {
        let old_config = json!({
            "agents": {
                "sisyphus": {
                    "model": "old-model"
                }
            }
        });

        let new_config = json!({
            "agents": {
                "sisyphus": {
                    "model": "new-model"
                }
            }
        });

        let changes = compare_configs(&old_config, &new_config);

        // 应该检测到 model 字段的修改
        let model_change = changes.iter().find(|c| c.path == "agents.sisyphus.model");
        assert!(model_change.is_some());
        let model_change = model_change.unwrap();
        assert_eq!(model_change.change_type, "modified");
        assert_eq!(model_change.old_value, Some(json!("old-model")));
        assert_eq!(model_change.new_value, Some(json!("new-model")));
    }

    /// 测试配置合并 - 保留外部新增字段
    #[test]
    fn test_merge_configs_preserve_external() {
        let old_config = json!({
            "agents": {
                "sisyphus": {
                    "model": "old-model",
                    "custom_field": "should_keep"
                }
            },
            "external_field": "from_user"
        });

        let new_config = json!({
            "agents": {
                "sisyphus": {
                    "model": "new-model"
                }
            }
        });

        let merged = merge_configs(&old_config, &new_config);

        // 验证：新配置的值应该覆盖
        assert_eq!(merged["agents"]["sisyphus"]["model"], "new-model");

        // 验证：外部字段应该保留
        assert_eq!(merged["external_field"], "from_user");

        // 验证：旧配置中的嵌套字段应该保留
        assert_eq!(merged["agents"]["sisyphus"]["custom_field"], "should_keep");
    }

    /// 测试配置合并 - 完全不同的对象
    #[test]
    fn test_merge_configs_different_objects() {
        let old_config = json!({
            "a": 1,
            "b": 2
        });

        let new_config = json!({
            "b": 3,
            "c": 4
        });

        let merged = merge_configs(&old_config, &new_config);

        // a 来自旧配置（保留）
        assert_eq!(merged["a"], 1);
        // b 被新配置覆盖
        assert_eq!(merged["b"], 3);
        // c 来自新配置
        assert_eq!(merged["c"], 4);
    }

    /// 测试配置合并 - 非对象类型
    #[test]
    fn test_merge_configs_non_objects() {
        // 两个数组
        let old_arr = json!([1, 2, 3]);
        let new_arr = json!([4, 5]);
        let merged = merge_configs(&old_arr, &new_arr);
        assert_eq!(merged, new_arr);

        // 对象和原始值
        let old_obj = json!({"a": 1});
        let new_val = json!("string");
        let merged = merge_configs(&old_obj, &new_val);
        assert_eq!(merged, new_val);
    }

    /// 测试 ConfigSnapshot 序列化和反序列化
    #[test]
    fn test_snapshot_serialization() {
        let snapshot = ConfigSnapshot {
            cached_at: 1234567890123,
            config: json!({
                "test": "value",
                "nested": {
                    "key": 42
                }
            }),
        };

        // 序列化
        let json_str = serde_json::to_string(&snapshot).unwrap();

        // 反序列化
        let restored: ConfigSnapshot = serde_json::from_str(&json_str).unwrap();

        assert_eq!(restored.cached_at, snapshot.cached_at);
        assert_eq!(restored.config, snapshot.config);
    }

    /// 测试 ConfigChange 序列化和反序列化
    #[test]
    fn test_change_serialization() {
        let change = ConfigChange {
            path: "agents.sisyphus.model".to_string(),
            change_type: "modified".to_string(),
            old_value: Some(json!("old")),
            new_value: Some(json!("new")),
        };

        // 序列化
        let json_str = serde_json::to_string(&change).unwrap();

        // 验证 JSON 结构
        assert!(json_str.contains("agents.sisyphus.model"));
        assert!(json_str.contains("modified"));

        // 反序列化
        let restored: ConfigChange = serde_json::from_str(&json_str).unwrap();

        assert_eq!(restored.path, change.path);
        assert_eq!(restored.change_type, change.change_type);
    }
}
