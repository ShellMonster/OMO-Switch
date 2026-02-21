use crate::services::version_service::{self, VersionInfo};

/// 检查所有版本信息（异步）
/// 
/// 使用 spawn_blocking 将阻塞操作放到独立线程执行，
/// 避免阻塞 Tauri 主线程。
#[tauri::command]
pub async fn check_versions() -> Result<Vec<VersionInfo>, String> {
    tokio::task::spawn_blocking(|| {
        version_service::check_all_versions()
    })
    .await
    .map_err(|e| format!("版本检测失败: {}", e))
}
