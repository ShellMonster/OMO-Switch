use crate::services::version_service::{self, VersionInfo};

#[tauri::command]
pub fn check_versions() -> Result<Vec<VersionInfo>, String> {
    Ok(version_service::check_all_versions())
}
