use crate::services::preset_service;
use crate::services::preset_service::PresetUpdateRequest;
use crate::services::preset_service::PresetMeta;
use serde_json::Value;

#[tauri::command]
pub fn save_preset(name: String) -> Result<(), String> {
    preset_service::save_preset(&name)
}

#[tauri::command]
pub fn load_preset(name: String) -> Result<(), String> {
    preset_service::load_preset(&name)
}

#[tauri::command]
pub fn get_preset_config(name: String) -> Result<Value, String> {
    preset_service::get_preset_config(&name)
}

#[tauri::command]
pub fn list_presets() -> Result<Vec<String>, String> {
    preset_service::list_presets()
}

#[tauri::command]
pub fn delete_preset(name: String) -> Result<(), String> {
    preset_service::delete_preset(&name)
}

#[tauri::command]
pub fn get_preset_info(name: String) -> Result<(usize, usize, String), String> {
    preset_service::get_preset_info(&name)
}

#[tauri::command]
pub fn update_preset(name: String) -> Result<(), String> {
    preset_service::update_preset(&name)
}

#[tauri::command]
pub fn apply_updates_to_preset(
    name: String,
    updates: Vec<PresetUpdateRequest>,
) -> Result<(), String> {
    preset_service::apply_updates_to_preset(&name, &updates)
}

/// 获取预设元数据（供 UI 显示更新时间）
#[tauri::command]
pub fn get_preset_meta(name: String) -> Result<PresetMeta, String> {
    preset_service::get_preset_meta(&name)
}

/// 用当前配置同步到预设（用于"忽略"操作）
#[tauri::command]
pub fn sync_preset_from_config(name: String) -> Result<(), String> {
    preset_service::sync_preset_from_config(&name)
}

/// 设置当前激活预设名称（仅更新 active_preset 标记，不加载配置）
#[tauri::command]
pub fn set_active_preset(name: String) -> Result<(), String> {
    preset_service::set_active_preset(&name)
}
