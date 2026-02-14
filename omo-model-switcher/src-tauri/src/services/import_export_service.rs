use chrono::Local;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

use crate::services::config_service::{read_omo_config, validate_config, write_omo_config};

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
        fs::create_dir_all(parent).map_err(|e| format!("创建目标目录失败: {}", e))?;
    }

    // 格式化 JSON（带缩进）
    let json_string =
        serde_json::to_string_pretty(&config).map_err(|e| format!("序列化配置失败: {}", e))?;

    // 写入文件
    fs::write(&target_path, json_string).map_err(|e| format!("写入导出文件失败: {}", e))?;

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
        return Err(format!("导入文件不存在: {}", path));
    }

    // 读取导入文件内容
    let content =
        fs::read_to_string(import_path).map_err(|e| format!("读取导入文件失败: {}", e))?;

    // 解析 JSON
    let imported_config: Value =
        serde_json::from_str(&content).map_err(|e| format!("解析导入文件失败: {}", e))?;

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
        return Err(format!("文件不存在: {}", path));
    }

    // 读取文件内容
    let content = fs::read_to_string(import_path).map_err(|e| format!("读取文件失败: {}", e))?;

    // 解析 JSON
    let config: Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON 格式错误: {}", e))?;

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
    let config = read_omo_config()?;

    // 获取配置文件所在目录
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;

    let config_dir = PathBuf::from(home).join(".config").join("opencode");

    // 创建备份目录
    let backup_dir = config_dir.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| format!("创建备份目录失败: {}", e))?;

    // 生成带时间戳的备份文件名
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("oh-my-opencode_{}.json", timestamp);
    let backup_path = backup_dir.join(backup_filename);

    // 写入备份文件
    let json_string =
        serde_json::to_string_pretty(&config).map_err(|e| format!("序列化配置失败: {}", e))?;

    fs::write(&backup_path, json_string).map_err(|e| format!("写入备份文件失败: {}", e))?;

    Ok(backup_path)
}

/// 获取导入/导出历史记录
///
/// # 返回
/// - `Ok(Vec<BackupInfo>)`: 历史记录列表
/// - `Err(String)`: 获取失败，包含错误信息
pub fn get_backup_history() -> Result<Vec<BackupInfo>, String> {
    let home = std::env::var("HOME").map_err(|_| "无法获取 HOME 环境变量".to_string())?;

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

                backups.push(BackupInfo {
                    filename: filename.to_string(),
                    path: path.to_string_lossy().to_string(),
                    created_at,
                    size: metadata.len(),
                });
            }
        }
    }

    // 按创建时间倒序排序（最新的在前）
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

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
    /// 文件大小（字节）
    pub size: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::env;

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
        assert!(result.unwrap_err().contains("JSON 格式错误"));

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
}
