// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;
mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::model_commands::get_available_models,
            commands::model_commands::get_connected_providers,
            commands::model_commands::fetch_models_dev,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
