// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod services;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::model_commands::get_available_models,
            commands::model_commands::get_connected_providers,
            commands::model_commands::fetch_models_dev,
            commands::config_commands::get_config_path,
            commands::config_commands::read_omo_config,
            commands::config_commands::write_omo_config,
            commands::config_commands::validate_config,
            commands::preset_commands::save_preset,
            commands::preset_commands::load_preset,
            commands::preset_commands::list_presets,
            commands::preset_commands::delete_preset,
            commands::preset_commands::get_preset_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
