use crate::services::model_service::{self, ModelInfo};
use std::collections::HashMap;

#[tauri::command]
pub fn get_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    model_service::get_available_models()
}

#[tauri::command]
pub fn get_connected_providers() -> Result<Vec<String>, String> {
    model_service::get_connected_providers()
}

#[tauri::command]
pub fn fetch_models_dev() -> Result<Vec<ModelInfo>, String> {
    model_service::fetch_models_dev()
}
