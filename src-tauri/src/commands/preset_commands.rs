use crate::services::preset_service;
use crate::services::preset_service::PresetMeta;

#[tauri::command]
pub fn save_preset(name: String) -> Result<(), String> {
    preset_service::save_preset(&name)
}

#[tauri::command]
pub fn load_preset(name: String) -> Result<(), String> {
    preset_service::load_preset(&name)
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
    // 检查是否为内置预设，内置预设不可修改
    if name.starts_with("__builtin__") {
        return Err("内置预设不可修改".to_string());
    }
    preset_service::update_preset(&name)
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
