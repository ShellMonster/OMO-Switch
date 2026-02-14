use crate::services::config_service;
use serde_json::Value;

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    config_service::get_config_path().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_omo_config() -> Result<Value, String> {
    config_service::read_omo_config()
}

#[tauri::command]
pub fn write_omo_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)?;
    config_service::write_omo_config(&config)
}

#[tauri::command]
pub fn validate_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)
}
