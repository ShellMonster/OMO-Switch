use crate::services::import_export_service::{
    clear_backup_history as clear_backup_history_service,
    delete_backup_entry,
    export_backup_entry,
    export_config_with_history,
    get_max_backup_records,
    get_backup_history,
    import_config,
    restore_from_backup,
    set_max_backup_records,
    validate_import_file,
    BackupInfo,
};
use serde_json::Value;

#[tauri::command]
pub fn export_omo_config(path: String, record_history: Option<bool>) -> Result<(), String> {
    export_config_with_history(&path, record_history.unwrap_or(false))
}

#[tauri::command]
pub fn import_omo_config(path: String) -> Result<(), String> {
    import_config(&path)
}

#[tauri::command]
pub fn validate_import(path: String) -> Result<Value, String> {
    validate_import_file(&path)
}

#[tauri::command]
pub fn get_import_export_history() -> Result<Vec<BackupInfo>, String> {
    get_backup_history()
}

#[tauri::command]
pub fn restore_backup(path: String) -> Result<(), String> {
    restore_from_backup(&path)
}

#[tauri::command]
pub fn delete_backup(path: String) -> Result<(), String> {
    delete_backup_entry(&path)
}

#[tauri::command]
pub fn export_backup(path: String, target_path: String) -> Result<(), String> {
    export_backup_entry(&path, &target_path)
}

#[tauri::command]
pub fn clear_backup_history() -> Result<usize, String> {
    clear_backup_history_service()
}

#[tauri::command]
pub fn get_backup_history_limit() -> Result<usize, String> {
    Ok(get_max_backup_records())
}

#[tauri::command]
pub fn set_backup_history_limit(limit: usize) -> Result<usize, String> {
    set_max_backup_records(limit)
}
