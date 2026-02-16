/**
 * 配置变更检测 Hook
 * 
 * 功能说明：
 * - 检测 OMO 配置与缓存快照之间的差异
 * - 提供 500ms 防抖，避免频繁检测
 * - 检测前自动确保快照存在（通过 ensure_snapshot_exists）
 * 
 * 使用示例：
 * ```tsx
 * const { hasChanges, changes, loading, checkChanges, ignoreChanges } = useConfigChangeDetection();
 * await checkChanges();
 * await ignoreChanges();
 * ```
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface ConfigChange {
  path: string;
  change_type: 'added' | 'removed' | 'modified';
  old_value: unknown;
  new_value: unknown;
}

export interface UseConfigChangeDetectionReturn {
  hasChanges: boolean;
  changes: ConfigChange[];
  loading: boolean;
  error: string | null;
  checkChanges: () => Promise<void>;
  ignoreChanges: () => Promise<void>;
}

const DEBOUNCE_DELAY = 500;

export function useConfigChangeDetection(): UseConfigChangeDetectionReturn {
  const [changes, setChanges] = useState<ConfigChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performCheck = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await invoke<void>('ensure_snapshot_exists');
      const result = await invoke<ConfigChange[]>('compare_with_snapshot');
      setChanges(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.error('[ConfigChangeDetection] 检测变更失败:', errorMessage);
      }
      setError(errorMessage);
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkChanges = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        await performCheck();
        resolve();
      }, DEBOUNCE_DELAY);
    });
  }, [performCheck]);

  const ignoreChanges = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await invoke<void>('save_config_snapshot');
      setChanges([]);
      if (import.meta.env.DEV) {
        console.log('[ConfigChangeDetection] 已更新缓存快照');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.error('[ConfigChangeDetection] 更新缓存失败:', errorMessage);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    hasChanges: changes.length > 0,
    changes,
    loading,
    error,
    checkChanges,
    ignoreChanges,
  };
}

export default useConfigChangeDetection;
