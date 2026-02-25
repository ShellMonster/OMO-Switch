// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod i18n;
mod services;
mod tray;

use tauri::Manager;

fn show_main_window<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::model_commands::get_available_models,
            commands::model_commands::get_verified_available_models,
            commands::model_commands::get_available_models_with_status,
            commands::model_commands::get_connected_providers,
            commands::model_commands::fetch_models_dev,
            commands::config_commands::get_config_path,
            commands::config_commands::get_omo_cache_dir,
            commands::config_commands::read_omo_config,
            commands::config_commands::write_omo_config,
            commands::config_commands::validate_config,
            commands::config_commands::update_agent_model,
            commands::config_commands::update_agents_batch,
            commands::preset_commands::save_preset,
            commands::preset_commands::load_preset,
            commands::preset_commands::get_preset_config,
            commands::preset_commands::list_presets,
            commands::preset_commands::delete_preset,
            commands::preset_commands::get_preset_info,
            commands::preset_commands::update_preset,
            commands::preset_commands::get_preset_meta,
            commands::preset_commands::sync_preset_from_config,
            commands::preset_commands::apply_updates_to_preset,
            commands::preset_commands::set_active_preset,
            commands::provider_commands::get_provider_status,
            commands::provider_commands::set_provider_api_key,
            commands::provider_commands::delete_provider_auth,
            commands::provider_commands::add_custom_provider,
            commands::provider_commands::add_custom_model,
            commands::provider_commands::remove_custom_model,
            commands::provider_commands::get_custom_models,
            commands::provider_commands::test_provider_connection,
            commands::provider_commands::get_provider_icon,
            commands::import_export_commands::export_omo_config,
            commands::import_export_commands::import_omo_config,
            commands::import_export_commands::validate_import,
            commands::import_export_commands::get_import_export_history,
            commands::import_export_commands::restore_backup,
            commands::import_export_commands::delete_backup,
            commands::import_export_commands::export_backup,
            commands::import_export_commands::clear_backup_history,
            commands::import_export_commands::get_backup_history_limit,
            commands::import_export_commands::set_backup_history_limit,
            commands::i18n_commands::get_locale,
            commands::i18n_commands::set_locale,
            commands::version_commands::check_versions,
            commands::config_cache_commands::save_config_snapshot,
            commands::config_cache_commands::ensure_snapshot_exists,
            commands::config_cache_commands::load_config_snapshot,
            commands::config_cache_commands::compare_with_snapshot,
            commands::config_cache_commands::merge_and_save,
            commands::config_cache_commands::get_config_modification_time,
            commands::config_cache_commands::accept_external_changes,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        match event {
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                if label == "main" {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                }
            }
            tauri::RunEvent::Reopen { .. } => {
                show_main_window(app_handle);
            }
            _ => {}
        }
    });
}
