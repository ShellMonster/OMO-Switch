// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod i18n;
mod services;
mod tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        // 拦截窗口关闭：隐藏窗口而不是退出，托盘可继续操作
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
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
            commands::upstream_sync_commands::check_upstream_update,
            commands::upstream_sync_commands::get_builtin_presets,
            commands::upstream_sync_commands::apply_builtin_preset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
