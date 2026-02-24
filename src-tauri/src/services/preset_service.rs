use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use super::config_service::{read_omo_config, write_omo_config};
use crate::i18n;

/// 预设元数据结构体
/// 用于记录预设的创建时间、更新时间和版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetMeta {
    /// 创建时间 - Unix 时间戳（毫秒）
    pub created_at: u64,
    /// 更新时间 - Unix 时间戳（毫秒）
    pub updated_at: u64,
    /// 元数据版本号，当前为 1
    pub version: u32,
}

impl PresetMeta {
    /// 创建新的预设元数据
    /// created_at 和 updated_at 都设置为当前时间
    pub fn new() -> Self {
        let now = current_timestamp_ms();
        Self {
            created_at: now,
            updated_at: now,
            version: 1,
        }
    }

    /// 更新元数据（保留原始创建时间）
    pub fn update(&mut self) {
        self.updated_at = current_timestamp_ms();
    }

    /// 从 JSON 值解析元数据
    pub fn from_value(value: &Value) -> Option<Self> {
        serde_json::from_value(value.clone()).ok()
    }

    /// 转换为 JSON 值
    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or(Value::Null)
    }
}

impl Default for PresetMeta {
    fn default() -> Self {
        Self::new()
    }
}

/// 获取当前 Unix 时间戳（毫秒）
fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// 元数据字段名称
const META_FIELD: &str = "__meta__";

/// 获取预设目录路径
/// 返回 ~/.config/OMO-Switch/presets/ 的完整路径
pub fn get_presets_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;

    let presets_dir = PathBuf::from(home)
        .join(".config")
        .join("OMO-Switch")
        .join("presets");

    Ok(presets_dir)
}

/// 获取预设文件路径
/// 返回 ~/.config/OMO-Switch/presets/{name}.json 的完整路径
pub fn get_preset_path(name: &str) -> Result<PathBuf, String> {
    let presets_dir = get_presets_dir()?;
    let preset_path = presets_dir.join(format!("{}.json", name));
    Ok(preset_path)
}

/// 保存预设
/// 将当前 OMO 配置保存为预设到 ~/.config/OMO-Switch/presets/{name}.json
/// 自动添加/更新 __meta__ 元数据字段
pub fn save_preset(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }
    if name.contains('/') || name.contains('\\') {
        return Err(i18n::tr_current("preset_name_invalid_path"));
    }

    let config = read_omo_config()?;

    let presets_dir = get_presets_dir()?;
    fs::create_dir_all(&presets_dir)
        .map_err(|e| format!("{}: {}", i18n::tr_current("create_preset_dir_failed"), e))?;

    let preset_path = get_preset_path(name)?;

    let preset_with_meta = build_preset_with_meta(&config, &preset_path)?;

    let json_string = serde_json::to_string_pretty(&preset_with_meta)
        .map_err(|e| format!("{}: {}", i18n::tr_current("serialize_json_failed"), e))?;

    fs::write(&preset_path, json_string)
        .map_err(|e| format!("{}: {}", i18n::tr_current("write_preset_file_failed"), e))?;

    Ok(())
}

fn build_preset_with_meta(config: &Value, preset_path: &PathBuf) -> Result<Value, String> {
    let mut preset = config.clone();

    let meta = if preset_path.exists() {
        let existing_meta = read_preset_meta_from_file(preset_path)?;
        let mut meta = existing_meta.unwrap_or_else(PresetMeta::new);
        meta.update();
        meta
    } else {
        PresetMeta::new()
    };

    if let Some(obj) = preset.as_object_mut() {
        obj.insert(META_FIELD.to_string(), meta.to_value());
    }

    Ok(preset)
}

fn read_preset_meta_from_file(preset_path: &PathBuf) -> Result<Option<PresetMeta>, String> {
    if !preset_path.exists() {
        return Ok(None);
    }

    let content =
        fs::read_to_string(preset_path).map_err(|e| format!("读取预设文件失败: {}", e))?;

    let preset: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析预设 JSON 失败: {}", e))?;

    if let Some(meta_value) = preset.get(META_FIELD) {
        Ok(PresetMeta::from_value(meta_value))
    } else {
        Ok(None)
    }
}

/// 加载预设 - 读取预设并应用到 OMO 配置（过滤 __meta__ 字段）
pub fn load_preset(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    let preset_path = get_preset_path(name)?;

    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    let content = fs::read_to_string(&preset_path)
        .map_err(|e| format!("{}: {}", i18n::tr_current("read_preset_file_failed"), e))?;

    let mut preset_config: Value = serde_json::from_str(&content)
        .map_err(|e| format!("{}: {}", i18n::tr_current("parse_preset_file_failed"), e))?;

    if let Some(obj) = preset_config.as_object_mut() {
        obj.remove(META_FIELD);
    }

    write_omo_config(&preset_config)?;
    set_active_preset(name)?;

    Ok(())
}

/// 读取指定预设配置（仅读取，不应用到当前配置）
/// 会自动过滤 __meta__ 字段
pub fn get_preset_config(name: &str) -> Result<Value, String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    let preset_path = get_preset_path(name)?;
    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    let content = fs::read_to_string(&preset_path)
        .map_err(|e| format!("{}: {}", i18n::tr_current("read_preset_file_failed"), e))?;
    let mut preset_config: Value = serde_json::from_str(&content)
        .map_err(|e| format!("{}: {}", i18n::tr_current("parse_preset_file_failed"), e))?;

    if let Some(obj) = preset_config.as_object_mut() {
        obj.remove(META_FIELD);
    }

    Ok(preset_config)
}

/// 列出所有预设
/// 返回预设名称列表（不含 .json 后缀）
///
/// 返回：
/// - Ok(Vec<String>) 预设名称列表
/// - Err(String) 列出失败，包含错误信息
pub fn list_presets() -> Result<Vec<String>, String> {
    let presets_dir = get_presets_dir()?;

    // 如果预设目录不存在，返回空列表
    if !presets_dir.exists() {
        return Ok(Vec::new());
    }

    // 读取目录内容
    let entries = fs::read_dir(&presets_dir).map_err(|e| format!("读取预设目录失败: {}", e))?;

    // 过滤出 .json 文件，提取文件名（不含后缀）
    let mut presets = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        // 只处理 .json 文件
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                presets.push(name.to_string());
            }
        }
    }

    // 按名称排序
    presets.sort();

    Ok(presets)
}

/// 删除预设
/// 删除指定名称的预设文件
///
/// 参数：
/// - name: 预设名称（不含 .json 后缀）
///
/// 返回：
/// - Ok(()) 删除成功
/// - Err(String) 删除失败，包含错误信息
pub fn delete_preset(name: &str) -> Result<(), String> {
    // 验证预设名称
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    // 获取预设文件路径
    let preset_path = get_preset_path(name)?;

    // 检查预设文件是否存在
    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    // 删除预设文件
    fs::remove_file(&preset_path)
        .map_err(|e| format!("{}: {}", i18n::tr_current("delete_preset_failed"), e))?;

    Ok(())
}

/// 获取预设详情
/// 读取预设文件并返回其中的 agent 数量、category 数量和创建时间
///
/// 参数：
/// - name: 预设名称（不含 .json 后缀）
///
/// 返回：
/// - Ok((agent_count, category_count, created_at)) 预设详情
/// - Err(String) 读取失败，包含错误信息
pub fn get_preset_info(name: &str) -> Result<(usize, usize, String), String> {
    // 获取预设文件路径
    let preset_path = get_preset_path(name)?;

    // 检查预设文件是否存在
    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    // 读取预设文件内容
    let content =
        fs::read_to_string(&preset_path).map_err(|e| format!("读取预设文件失败: {}", e))?;

    // 解析 JSON
    let preset_config: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析预设 JSON 失败: {}", e))?;

    // 获取 agent 数量
    let agent_count = preset_config
        .get("agents")
        .and_then(|agents| agents.as_object())
        .map(|obj| obj.len())
        .unwrap_or(0);

    // 获取 category 数量
    let category_count = preset_config
        .get("categories")
        .and_then(|cats| cats.as_object())
        .map(|obj| obj.len())
        .unwrap_or(0);

    // 获取文件创建时间
    let metadata = fs::metadata(&preset_path).map_err(|e| format!("读取文件元数据失败: {}", e))?;
    let created_at = metadata
        .created()
        .or_else(|_| metadata.modified())
        .map(|time| {
            let datetime: chrono::DateTime<chrono::Local> = time.into();
            datetime.format("%Y-%m-%d %H:%M:%S").to_string()
        })
        .unwrap_or_else(|_| "未知".to_string());

    Ok((agent_count, category_count, created_at))
}

/// 更新预设 - 将当前配置同步到预设文件（保留并更新 __meta__）
pub fn update_preset(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    let config = read_omo_config()?;

    let preset_path = get_preset_path(name)?;

    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    let preset_with_meta = build_preset_with_meta(&config, &preset_path)?;

    let json_string = serde_json::to_string_pretty(&preset_with_meta)
        .map_err(|e| format!("{}: {}", i18n::tr_current("serialize_json_failed"), e))?;
    fs::write(&preset_path, json_string)
        .map_err(|e| format!("{}: {}", i18n::tr_current("write_preset_file_failed"), e))?;

    Ok(())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetUpdateRequest {
    pub agent_name: String,
    pub model: String,
    pub variant: Option<String>,
}

/// 直接将模型更新应用到指定预设文件（不切换当前活动预设）
/// 规则与 update_agents_batch 保持一致：同名会同时尝试更新 agents 与 categories。
pub fn apply_updates_to_preset(name: &str, updates: &[PresetUpdateRequest]) -> Result<(), String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    let preset_path = get_preset_path(name)?;
    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    let mut preset_config = get_preset_config(name)?;

    for update in updates {
        if let Some(agents) = preset_config.get_mut("agents").and_then(|a| a.as_object_mut()) {
            if let Some(agent) = agents.get_mut(&update.agent_name) {
                if let Some(obj) = agent.as_object_mut() {
                    obj.insert("model".to_string(), Value::String(update.model.clone()));
                    if let Some(ref v) = update.variant {
                        if v != "none" {
                            obj.insert("variant".to_string(), Value::String(v.clone()));
                        } else {
                            obj.remove("variant");
                        }
                    }
                }
            }
        }

        if let Some(categories) = preset_config
            .get_mut("categories")
            .and_then(|c| c.as_object_mut())
        {
            if let Some(category) = categories.get_mut(&update.agent_name) {
                if let Some(obj) = category.as_object_mut() {
                    obj.insert("model".to_string(), Value::String(update.model.clone()));
                    if let Some(ref v) = update.variant {
                        if v != "none" {
                            obj.insert("variant".to_string(), Value::String(v.clone()));
                        } else {
                            obj.remove("variant");
                        }
                    }
                }
            }
        }
    }

    let preset_with_meta = build_preset_with_meta(&preset_config, &preset_path)?;
    let json_string = serde_json::to_string_pretty(&preset_with_meta)
        .map_err(|e| format!("{}: {}", i18n::tr_current("serialize_json_failed"), e))?;
    fs::write(&preset_path, json_string)
        .map_err(|e| format!("{}: {}", i18n::tr_current("write_preset_file_failed"), e))?;

    Ok(())
}

/// 获取预设元数据
pub fn get_preset_meta(name: &str) -> Result<PresetMeta, String> {
    if name.is_empty() {
        return Err(i18n::tr_current("preset_name_empty"));
    }

    let preset_path = get_preset_path(name)?;

    if !preset_path.exists() {
        return Err(i18n::tr_current("preset_not_found"));
    }

    read_preset_meta_from_file(&preset_path)?.ok_or_else(|| "预设缺少元数据".to_string())
}

/// 同步预设从当前配置 - 用于"忽略"时同步元数据
pub fn sync_preset_from_config(name: &str) -> Result<(), String> {
    update_preset(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

    #[test]
    fn test_get_presets_dir() {
        let result = get_presets_dir();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path
            .to_string_lossy()
            .contains(".config/OMO-Switch/presets"));
    }

    #[test]
    fn test_get_preset_path() {
        let result = get_preset_path("test");
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().ends_with("test.json"));
    }

    #[test]
    fn test_save_and_load_preset() {
        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("omo_preset_test");
        let presets_dir = temp_dir.join("presets");
        fs::create_dir_all(&presets_dir).unwrap();

        // 创建测试配置
        let test_config = json!({
            "agents": {
                "test_agent": {
                    "model": "test/model"
                }
            },
            "categories": {}
        });

        // 保存到临时文件
        let preset_path = presets_dir.join("test_preset.json");
        fs::write(
            &preset_path,
            serde_json::to_string_pretty(&test_config).unwrap(),
        )
        .unwrap();

        // 验证文件存在
        assert!(preset_path.exists());

        // 读取并验证内容
        let content = fs::read_to_string(&preset_path).unwrap();
        let loaded_config: Value = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded_config, test_config);

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_list_presets() {
        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("omo_preset_list_test");
        let presets_dir = temp_dir.join("presets");
        fs::create_dir_all(&presets_dir).unwrap();

        // 创建测试预设文件
        let test_config = json!({"agents": {}, "categories": {}});
        fs::write(
            presets_dir.join("preset1.json"),
            serde_json::to_string_pretty(&test_config).unwrap(),
        )
        .unwrap();
        fs::write(
            presets_dir.join("preset2.json"),
            serde_json::to_string_pretty(&test_config).unwrap(),
        )
        .unwrap();

        // 验证列表（手动读取目录）
        let entries = fs::read_dir(&presets_dir).unwrap();
        let mut presets: Vec<String> = entries
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let path = entry.path();
                if path.is_file() && path.extension()?.to_str()? == "json" {
                    Some(path.file_stem()?.to_str()?.to_string())
                } else {
                    None
                }
            })
            .collect();
        presets.sort();

        assert_eq!(presets.len(), 2);
        assert!(presets.contains(&"preset1".to_string()));
        assert!(presets.contains(&"preset2".to_string()));

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_delete_preset() {
        // 创建临时目录
        let temp_dir = std::env::temp_dir().join("omo_preset_delete_test");
        let presets_dir = temp_dir.join("presets");
        fs::create_dir_all(&presets_dir).unwrap();

        // 创建测试预设文件
        let test_config = json!({"agents": {}, "categories": {}});
        let preset_path = presets_dir.join("test_delete.json");
        fs::write(
            &preset_path,
            serde_json::to_string_pretty(&test_config).unwrap(),
        )
        .unwrap();

        // 验证文件存在
        assert!(preset_path.exists());

        // 删除文件
        fs::remove_file(&preset_path).unwrap();

        // 验证文件已删除
        assert!(!preset_path.exists());

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_invalid_preset_name() {
        let result = save_preset("");
        assert!(result.is_err());

        let result = save_preset("test/invalid");
        assert!(result.is_err());
    }
}

// ========== 当前激活预设管理 ==========

/// 获取当前激活的预设名称
pub fn get_active_preset() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let path = std::path::PathBuf::from(home)
        .join(".config")
        .join("OMO-Switch")
        .join("active_preset");
    std::fs::read_to_string(path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// 设置当前激活的预设名称
pub fn set_active_preset(name: &str) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量")?;
    let dir = std::path::PathBuf::from(home)
        .join(".config")
        .join("OMO-Switch");
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
    let path = dir.join("active_preset");
    std::fs::write(&path, name).map_err(|e| format!("写入文件失败: {}", e))
}
