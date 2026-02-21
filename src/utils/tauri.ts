/**
 * Tauri 环境相关工具函数
 */

/**
 * 检查是否在 Tauri 环境中运行
 * @returns 如果在 Tauri 桌面应用中运行则返回 true
 */
export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window
  );
}

/**
 * 获取 Tauri 内部对象（类型安全）
 * @returns Tauri 内部对象，如果不在 Tauri 环境中则返回 null
 */
export function getTauriInternals(): unknown {
  if (!isTauriEnvironment()) {
    return null;
  }
  return (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
}
