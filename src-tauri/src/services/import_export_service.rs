use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

use crate::i18n;
use crate::services::config_service::{read_omo_config, validate_config, write_omo_config};

const DEFAULT_MAX_BACKUP_RECORDS: usize = 10;
const MAX_BACKUP_RECORDS_UPPER: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ImportExportSettings {
    max_backup_records: usize,
}

fn normalize_max_backup_records(value: usize) -> usize {
    value.clamp(1, MAX_BACKUP_RECORDS_UPPER)
}

fn get_settings_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;
    Ok(PathBuf::from(home)
        .join(".config")
        .join("OMO-Switch")
        .join("import-export-settings.json"))
}

fn load_settings() -> ImportExportSettings {
    let path = match get_settings_path() {
        Ok(p) => p,
        Err(_) => {
            return ImportExportSettings {
                max_backup_records: DEFAULT_MAX_BACKUP_RECORDS,
            };
        }
    };

    if !path.exists() {
        return ImportExportSettings {
            max_backup_records: DEFAULT_MAX_BACKUP_RECORDS,
        };
    }

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => {
            return ImportExportSettings {
                max_backup_records: DEFAULT_MAX_BACKUP_RECORDS,
            };
        }
    };

    let parsed: ImportExportSettings = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => {
            return ImportExportSettings {
                max_backup_records: DEFAULT_MAX_BACKUP_RECORDS,
            };
        }
    };

    ImportExportSettings {
        max_backup_records: normalize_max_backup_records(parsed.max_backup_records),
    }
}

fn save_settings(settings: &ImportExportSettings) -> Result<(), String> {
    let path = get_settings_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建设置目录失败: {}", e))?;
    }
    let normalized = ImportExportSettings {
        max_backup_records: normalize_max_backup_records(settings.max_backup_records),
    };
    let content =
        serde_json::to_string_pretty(&normalized).map_err(|e| format!("序列化设置失败: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("写入设置失败: {}", e))?;
    Ok(())
}

fn get_managed_backup_entries_with_ts() -> Result<Vec<(PathBuf, u64)>, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;
    let backup_dir = PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("backups");

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;
    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or_default();
        let is_managed = filename.starts_with("oh-my-opencode_") || filename.starts_with("export_");
        if !is_managed || path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let metadata = fs::metadata(&path).map_err(|e| format!("获取文件元数据失败: {}", e))?;
        let ts = metadata
            .created()
            .or_else(|_| metadata.modified())
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        result.push((path, ts));
    }
    result.sort_by(|a, b| b.1.cmp(&a.1));
    Ok(result)
}

fn prune_backup_history_to_limit(limit: usize) -> Result<usize, String> {
    let normalized_limit = normalize_max_backup_records(limit);
    let entries = get_managed_backup_entries_with_ts()?;
    if entries.len() <= normalized_limit {
        return Ok(0);
    }

    let mut deleted = 0usize;
    for (path, _) in entries.into_iter().skip(normalized_limit) {
        fs::remove_file(&path).map_err(|e| format!("删除超限备份失败: {}", e))?;
        deleted += 1;
    }
    Ok(deleted)
}

pub fn get_max_backup_records() -> usize {
    load_settings().max_backup_records
}

pub fn set_max_backup_records(limit: usize) -> Result<usize, String> {
    let normalized = normalize_max_backup_records(limit);
    save_settings(&ImportExportSettings {
        max_backup_records: normalized,
    })?;
    let _ = prune_backup_history_to_limit(normalized)?;
    Ok(normalized)
}

/// 导出当前 OMO 配置到指定路径
///
/// # 参数
/// - `path`: 导出文件的完整路径（包含文件名）
///
/// # 返回
/// - `Ok(())`: 导出成功
/// - `Err(String)`: 导出失败，包含错误信息
pub fn export_config(path: &str) -> Result<(), String> {
    // 读取当前配置
    let config = read_omo_config()?;

    // 验证配置有效性
    validate_config(&config)?;

    // 确保目标路径的父目录存在
    let target_path = PathBuf::from(path);
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("{}: {}", i18n::tr_current("create_target_dir_failed"), e))?;
    }

    // 格式化 JSON（带缩进）
    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("{}: {}", i18n::tr_current("serialize_json_failed"), e))?;

    // 写入文件
    fs::write(&target_path, json_string)
        .map_err(|e| format!("{}: {}", i18n::tr_current("write_export_file_failed"), e))?;

    Ok(())
}

/// 导出配置并可选记录导出快照到备份目录
pub fn export_config_with_history(path: &str, record_history: bool) -> Result<(), String> {
    export_config(path)?;
    if record_history {
        backup_current_config_with_prefix("export")?;
    }
    Ok(())
}

/// 从文件导入配置（先验证，再备份，再应用）
///
/// # 参数
/// - `path`: 导入文件的完整路径
///
/// # 返回
/// - `Ok(())`: 导入成功
/// - `Err(String)`: 导入失败，包含错误信息
pub fn import_config(path: &str) -> Result<(), String> {
    let import_path = Path::new(path);

    // 检查文件是否存在
    if !import_path.exists() {
        return Err(i18n::tr_current("import_file_not_found"));
    }

    // 读取导入文件内容
    let content = fs::read_to_string(import_path)
        .map_err(|e| format!("{}: {}", i18n::tr_current("read_import_file_failed"), e))?;

    // 解析 JSON
    let imported_config: Value = serde_json::from_str(&content)
        .map_err(|e| format!("{}: {}", i18n::tr_current("parse_import_file_failed"), e))?;

    // 验证导入配置的有效性
    validate_config(&imported_config)?;

    // 备份当前配置（使用时间戳）
    backup_current_config()?;

    // 应用新配置
    write_omo_config(&imported_config)?;

    Ok(())
}

/// 验证导入文件的有效性（不应用）
///
/// # 参数
/// - `path`: 导入文件的完整路径
///
/// # 返回
/// - `Ok(Value)`: 验证成功，返回解析后的配置对象
/// - `Err(String)`: 验证失败，包含错误信息
pub fn validate_import_file(path: &str) -> Result<Value, String> {
    let import_path = Path::new(path);

    // 检查文件是否存在
    if !import_path.exists() {
        return Err(i18n::tr_current("import_file_not_found"));
    }

    // 读取文件内容
    let content = fs::read_to_string(import_path)
        .map_err(|e| format!("{}: {}", i18n::tr_current("read_import_file_failed"), e))?;

    // 解析 JSON
    let config: Value = serde_json::from_str(&content)
        .map_err(|e| format!("{}: {}", i18n::tr_current("json_format_error"), e))?;

    // 验证配置结构
    validate_config(&config)?;

    Ok(config)
}

/// 备份当前配置（使用时间戳）
///
/// # 返回
/// - `Ok(PathBuf)`: 备份成功，返回备份文件路径
/// - `Err(String)`: 备份失败，包含错误信息
fn backup_current_config() -> Result<PathBuf, String> {
    backup_current_config_with_prefix("oh-my-opencode")
}

fn backup_current_config_with_prefix(prefix: &str) -> Result<PathBuf, String> {
    let config = read_omo_config()?;

    // 获取配置文件所在目录
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;

    let config_dir = PathBuf::from(home).join(".config").join("opencode");

    // 创建备份目录
    let backup_dir = config_dir.join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("{}: {}", i18n::tr_current("backup_config_failed"), e))?;

    // 生成带毫秒时间戳的备份文件名，并保证同毫秒下不覆盖
    let now = Local::now();
    let timestamp = now.format("%Y%m%d_%H%M%S_%3f");
    let mut backup_path = backup_dir.join(format!("{}_{}.json", prefix, timestamp));
    let mut idx = 1usize;
    while backup_path.exists() {
        backup_path = backup_dir.join(format!("{}_{}_{}.json", prefix, timestamp, idx));
        idx += 1;
    }

    // 写入备份文件
    let json_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("{}: {}", i18n::tr_current("serialize_json_failed"), e))?;

    fs::write(&backup_path, json_string)
        .map_err(|e| format!("{}: {}", i18n::tr_current("backup_config_failed"), e))?;

    let limit = get_max_backup_records();
    let _ = prune_backup_history_to_limit(limit)?;

    Ok(backup_path)
}

fn ensure_backup_path(path: &str) -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;
    let backup_dir = PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("backups");
    let target = PathBuf::from(path);

    if !target.exists() {
        return Err("备份文件不存在".to_string());
    }

    let canonical_dir =
        fs::canonicalize(&backup_dir).map_err(|e| format!("解析备份目录失败: {}", e))?;
    let canonical_target =
        fs::canonicalize(&target).map_err(|e| format!("解析备份文件路径失败: {}", e))?;

    if !canonical_target.starts_with(&canonical_dir) {
        return Err("非法备份路径".to_string());
    }
    if canonical_target.extension().and_then(|s| s.to_str()) != Some("json") {
        return Err("仅支持 JSON 备份文件".to_string());
    }
    let filename = canonical_target
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "无效备份文件名".to_string())?;
    if !(filename.starts_with("oh-my-opencode_") || filename.starts_with("export_")) {
        return Err("仅允许操作 OMO 生成的备份文件".to_string());
    }

    Ok(canonical_target)
}

/// 从备份文件恢复配置（会先自动备份当前配置）
pub fn restore_from_backup(path: &str) -> Result<(), String> {
    let backup_path = ensure_backup_path(path)?;
    let content =
        fs::read_to_string(&backup_path).map_err(|e| format!("读取备份文件失败: {}", e))?;
    let config: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析备份文件失败: {}", e))?;
    validate_config(&config)?;

    backup_current_config()?;
    write_omo_config(&config)?;
    Ok(())
}

/// 删除单条备份记录
pub fn delete_backup_entry(path: &str) -> Result<(), String> {
    let backup_path = ensure_backup_path(path)?;
    fs::remove_file(&backup_path).map_err(|e| format!("删除备份失败: {}", e))?;
    Ok(())
}

/// 导出指定备份记录到目标路径
pub fn export_backup_entry(path: &str, target_path: &str) -> Result<(), String> {
    let backup_path = ensure_backup_path(path)?;
    let target = PathBuf::from(target_path);

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
    }

    let content =
        fs::read_to_string(&backup_path).map_err(|e| format!("读取备份文件失败: {}", e))?;
    fs::write(&target, content).map_err(|e| format!("写入导出文件失败: {}", e))?;
    Ok(())
}

/// 清空备份历史
pub fn clear_backup_history() -> Result<usize, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;
    let backup_dir = PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("backups");

    if !backup_dir.exists() {
        return Ok(0);
    }

    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;
    let mut deleted = 0usize;
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or_default();
        let is_managed = filename.starts_with("oh-my-opencode_") || filename.starts_with("export_");
        if is_managed && path.extension().and_then(|s| s.to_str()) == Some("json") {
            fs::remove_file(&path).map_err(|e| format!("删除备份文件失败: {}", e))?;
            deleted += 1;
        }
    }
    Ok(deleted)
}

/// 获取导入/导出历史记录
///
/// # 返回
/// - `Ok(Vec<BackupInfo>)`: 历史记录列表
/// - `Err(String)`: 获取失败，包含错误信息
pub fn get_backup_history() -> Result<Vec<BackupInfo>, String> {
    let home = std::env::var("HOME").map_err(|_| i18n::tr_current("home_env_var_error"))?;

    let backup_dir = PathBuf::from(home)
        .join(".config")
        .join("opencode")
        .join("backups");

    // 如果备份目录不存在，返回空列表
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    // 读取目录中的所有 .json 文件
    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;

    let mut backups = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        // 只处理 .json 文件
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                let is_managed = filename.starts_with("oh-my-opencode_") || filename.starts_with("export_");
                if !is_managed {
                    continue;
                }

                // 获取文件元数据
                let metadata =
                    fs::metadata(&path).map_err(|e| format!("获取文件元数据失败: {}", e))?;

                let created_at = metadata
                    .created()
                    .or_else(|_| metadata.modified())
                    .map(|time| {
                        let datetime: chrono::DateTime<Local> = time.into();
                        datetime.format("%Y-%m-%d %H:%M:%S").to_string()
                    })
                    .unwrap_or_else(|_| "未知".to_string());

                let op = if filename.starts_with("export_") {
                    "export"
                } else {
                    "import"
                };

                let created_at_ts = metadata
                    .created()
                    .or_else(|_| metadata.modified())
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64)
                    .unwrap_or(0);

                backups.push(BackupInfo {
                    filename: filename.to_string(),
                    path: path.to_string_lossy().to_string(),
                    created_at,
                    created_at_ts,
                    size: metadata.len(),
                    operation: op.to_string(),
                });
            }
        }
    }

    // 按真实时间戳倒序排序（最新的在前）
    backups.sort_by(|a, b| b.created_at_ts.cmp(&a.created_at_ts));

    Ok(backups)
}

/// 备份信息结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BackupInfo {
    /// 文件名
    pub filename: String,
    /// 完整路径
    pub path: String,
    /// 创建时间
    pub created_at: String,
    /// 创建时间戳（毫秒）
    pub created_at_ts: u64,
    /// 文件大小（字节）
    pub size: u64,
    /// 记录类型：import/export
    pub operation: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use serial_test::serial;
    use std::collections::HashSet;
    use std::env;
    use std::time::Duration;

    struct HomeGuard(Option<String>);

    impl Drop for HomeGuard {
        fn drop(&mut self) {
            match &self.0 {
                Some(v) => {
                    // SAFETY: 测试结束时恢复 HOME 环境变量
                    unsafe { env::set_var("HOME", v) };
                }
                None => {
                    // SAFETY: 测试结束时清理 HOME 环境变量
                    unsafe { env::remove_var("HOME") };
                }
            }
        }
    }

    fn with_temp_home(name: &str) -> (std::path::PathBuf, HomeGuard) {
        let original_home = env::var("HOME").ok();
        let temp_home = env::temp_dir().join(name);
        let _ = fs::remove_dir_all(&temp_home);
        fs::create_dir_all(&temp_home).unwrap();
        // SAFETY: 测试中将 HOME 指向临时目录，避免污染真实用户数据
        unsafe { env::set_var("HOME", &temp_home) };
        (temp_home, HomeGuard(original_home))
    }

    #[test]
    fn test_export_config() {
        // 创建临时目录
        let temp_dir = env::temp_dir().join("omo_test_export");
        fs::create_dir_all(&temp_dir).unwrap();

        let _export_path = temp_dir.join("exported_config.json");

        // 注意：这个测试需要实际的配置文件存在
        // 在实际环境中，应该先创建测试配置

        // 清理
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_validate_import_file() {
        // 创建临时测试文件
        let temp_dir = env::temp_dir().join("omo_test_validate");
        fs::create_dir_all(&temp_dir).unwrap();

        let test_file = temp_dir.join("test_config.json");

        // 写入有效配置
        let valid_config = json!({
            "agents": {
                "test": {
                    "model": "test-model"
                }
            },
            "categories": {}
        });

        fs::write(
            &test_file,
            serde_json::to_string_pretty(&valid_config).unwrap(),
        )
        .unwrap();

        // 验证应该成功
        let result = validate_import_file(test_file.to_str().unwrap());
        assert!(result.is_ok());

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_validate_invalid_json() {
        // 创建临时测试文件
        let temp_dir = env::temp_dir().join("omo_test_invalid");
        fs::create_dir_all(&temp_dir).unwrap();

        let test_file = temp_dir.join("invalid.json");

        // 写入无效 JSON
        fs::write(&test_file, "{ invalid json }").unwrap();

        // 验证应该失败
        let result = validate_import_file(test_file.to_str().unwrap());
        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(
            err_msg.contains("JSON")
                || err_msg.contains("格式错误")
                || err_msg.contains("format error")
        );

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_validate_missing_fields() {
        // 创建临时测试文件
        let temp_dir = env::temp_dir().join("omo_test_missing");
        fs::create_dir_all(&temp_dir).unwrap();

        let test_file = temp_dir.join("missing_fields.json");

        // 写入缺少必需字段的配置
        let invalid_config = json!({
            "agents": {}
            // 缺少 categories
        });

        fs::write(
            &test_file,
            serde_json::to_string_pretty(&invalid_config).unwrap(),
        )
        .unwrap();

        // 验证应该失败
        let result = validate_import_file(test_file.to_str().unwrap());
        assert!(result.is_err());

        // 清理
        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn test_normalize_max_backup_records_bounds() {
        assert_eq!(normalize_max_backup_records(0), 1);
        assert_eq!(normalize_max_backup_records(1), 1);
        assert_eq!(normalize_max_backup_records(10), 10);
        assert_eq!(normalize_max_backup_records(9999), 500);
    }

    #[test]
    #[serial]
    fn test_set_max_backup_records_prunes_managed_only() {
        let (temp_home, _guard) = with_temp_home("omo_test_backup_prune");
        let backup_dir = temp_home.join(".config").join("opencode").join("backups");
        fs::create_dir_all(&backup_dir).unwrap();

        fs::write(backup_dir.join("oh-my-opencode_1.json"), "{}").unwrap();
        std::thread::sleep(Duration::from_millis(2));
        fs::write(backup_dir.join("oh-my-opencode_2.json"), "{}").unwrap();
        std::thread::sleep(Duration::from_millis(2));
        fs::write(backup_dir.join("export_3.json"), "{}").unwrap();
        fs::write(backup_dir.join("manual-note.json"), "{}").unwrap();

        let saved = set_max_backup_records(2).unwrap();
        assert_eq!(saved, 2);

        let entries: Vec<_> = fs::read_dir(&backup_dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();

        let managed_count = entries
            .iter()
            .filter(|name| name.starts_with("oh-my-opencode_") || name.starts_with("export_"))
            .count();
        assert_eq!(managed_count, 2);
        assert!(entries.iter().any(|name| name == "manual-note.json"));
    }

    #[test]
    #[serial]
    fn test_get_backup_history_filters_and_marks_operation() {
        let (temp_home, _guard) = with_temp_home("omo_test_backup_history_filter");
        let backup_dir = temp_home.join(".config").join("opencode").join("backups");
        fs::create_dir_all(&backup_dir).unwrap();

        fs::write(backup_dir.join("oh-my-opencode_a.json"), "{}").unwrap();
        fs::write(backup_dir.join("export_b.json"), "{}").unwrap();
        fs::write(backup_dir.join("random.json"), "{}").unwrap();

        let history = get_backup_history().unwrap();
        assert_eq!(history.len(), 2);

        let ops: HashSet<_> = history.iter().map(|x| x.operation.as_str()).collect();
        assert!(ops.contains("import"));
        assert!(ops.contains("export"));

        let names: HashSet<_> = history.iter().map(|x| x.filename.as_str()).collect();
        assert!(names.contains("oh-my-opencode_a.json"));
        assert!(names.contains("export_b.json"));
        assert!(!names.contains("random.json"));
    }
}
