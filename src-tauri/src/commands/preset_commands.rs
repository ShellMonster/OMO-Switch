use crate::services::preset_service;

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
    preset_service::update_preset(&name)
}
