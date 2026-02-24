use crate::services::model_service::{self, AvailableModelsWithStatus, ModelInfo};
use std::collections::HashMap;

#[tauri::command]
pub async fn get_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    tokio::task::spawn_blocking(|| {
        model_service::get_available_models()
    })
    .await
    .map_err(|e| format!("获取模型列表失败: {}", e))?
}

#[tauri::command]
pub async fn get_verified_available_models() -> Result<HashMap<String, Vec<String>>, String> {
    tokio::task::spawn_blocking(|| model_service::get_verified_available_models())
        .await
        .map_err(|e| format!("获取校验模型列表失败: {}", e))?
}

#[tauri::command]
pub async fn get_available_models_with_status() -> Result<AvailableModelsWithStatus, String> {
    tokio::task::spawn_blocking(|| model_service::get_available_models_with_status())
        .await
        .map_err(|e| format!("获取模型状态失败: {}", e))?
}

#[tauri::command]
pub async fn get_connected_providers() -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(|| {
        model_service::get_connected_providers()
    })
    .await
    .map_err(|e| format!("获取已连接供应商失败: {}", e))?
}

#[tauri::command]
pub fn fetch_models_dev() -> Result<Vec<ModelInfo>, String> {
    model_service::fetch_models_dev()
}
