use crate::services::import_export_service::{
    export_config, get_backup_history, import_config, validate_import_file, BackupInfo,
};
use serde_json::Value;

#[tauri::command]
pub fn export_omo_config(path: String) -> Result<(), String> {
    export_config(&path)
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
