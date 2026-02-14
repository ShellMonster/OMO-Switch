import { create } from 'zustand';
import { toast } from '../components/common/Toast';
import i18n from '../i18n';

/**
 * 更新器状态类型
 * - idle: 空闲状态
 * - checking: 正在检查更新
 * - available: 有可用更新
 * - downloading: 正在下载
 * - downloaded: 下载完成
 * - installing: 正在安装
 * - installed: 安装完成
 * - error: 发生错误
 */
type UpdaterStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'installed' | 'error';

/**
 * 下载进度信息
 */
type Progress = {
  downloaded: number;  // 已下载字节数
  total: number;       // 总字节数
};

/**
 * 更新信息类型（兼容 @tauri-apps/plugin-updater 的 Update 类型）
 */
type UpdateLike = {
  version: string;      // 新版本号
  date?: string | null; // 发布日期
  body?: string | null; // 更新说明
  download: (onEvent?: (event: any) => void) => Promise<void>;  // 下载更新
  install: () => Promise<void>;  // 安装更新
  downloadAndInstall: (onEvent?: (event: any) => void) => Promise<void>;  // 下载并安装
};

/**
 * 更新器 Store 状态接口
 */
interface UpdaterState {
  // 状态
  isOpen: boolean;           // 更新弹窗是否打开
  status: UpdaterStatus;     // 当前状态
  update: UpdateLike | null; // 更新信息
  progress: Progress | null; // 下载进度
  error: string | null;      // 错误信息

  // 方法
  open: () => void;          // 打开更新弹窗
  close: () => void;         // 关闭更新弹窗
  reset: () => void;         // 重置状态
  checkForUpdates: (options?: { silent?: boolean; openIfAvailable?: boolean }) => Promise<void>;  // 检查更新
  downloadUpdate: () => Promise<void>;  // 下载更新
  installUpdate: () => Promise<void>;   // 安装更新
}

/**
 * 检测是否在 Tauri 环境中运行
 */
const isTauri = () => typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

// 防止重复调用的 Promise 缓存
let inFlightCheck: Promise<void> | null = null;
let inFlightDownload: Promise<void> | null = null;
let inFlightInstall: Promise<void> | null = null;

// 检查序列号，用于处理并发检查
let checkSequence = 0;

/**
 * 更新器状态管理 Store
 * 
 * 功能：
 * - 检查应用更新
 * - 下载更新包（带进度显示）
 * - 安装更新并重启应用
 * 
 * 使用方式：
 * ```tsx
 * const { status, update, checkForUpdates, downloadUpdate, installUpdate } = useUpdaterStore();
 * ```
 */
export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  isOpen: false,
  status: 'idle',
  update: null,
  progress: null,
  error: null,

  // 打开更新弹窗
  open: () => set({ isOpen: true }),

  // 关闭更新弹窗
  close: () => set({ isOpen: false }),

  // 重置所有状态
  reset: () => set({ status: 'idle', update: null, progress: null, error: null, isOpen: false }),

  /**
   * 检查更新
   * @param options.silent - 静默模式，不显示 Toast 提示
   * @param options.openIfAvailable - 有更新时自动打开弹窗
   */
  checkForUpdates: async (options) => {
    // 非 Tauri 环境不执行
    if (!isTauri()) return;
    // 正在检查中，跳过
    if (get().status === 'checking') return;
    // 有正在进行的检查，返回同一个 Promise
    if (inFlightCheck) return inFlightCheck;

    const silent = Boolean(options?.silent);
    const openIfAvailable = options?.openIfAvailable !== false;

    // 生成当前检查序列号
    const currentCheckId = ++checkSequence;
    
    inFlightCheck = (async () => {
      set({ status: 'checking', error: null, progress: null });
      
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMac = /Macintosh|Mac OS X/i.test(ua);

        // 兼容 macOS Universal 包：先按系统/架构检查，失败时尝试常见的 universal target 名称
        const targets: Array<string | undefined> = isMac
          ? [undefined, 'macos-universal', 'darwin-universal', 'universal-apple-darwin']
          : [undefined];

        const CHECK_TIMEOUT_MS = 12000;  // 检查超时时间：12秒
        let update: UpdateLike | null = null;
        let lastErr: unknown = null;

        // 带超时的检查函数
        const runCheckWithTimeout = async (target: string | undefined) => {
          let timer: ReturnType<typeof setTimeout> | null = null;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('update check timeout'));
            }, CHECK_TIMEOUT_MS);
          });
          try {
            return await Promise.race([check(target ? { target } : undefined), timeoutPromise]) as UpdateLike | null;
          } finally {
            if (timer) clearTimeout(timer);
          }
        };

        // 依次尝试不同的 target
        for (const target of targets) {
          try {
            update = await runCheckWithTimeout(target);
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
          }
        }

        if (lastErr) throw lastErr;
        // 如果序列号不匹配，说明有新的检查请求，放弃当前结果
        if (currentCheckId !== checkSequence) return;

        if (!update) {
          // 没有可用更新
          set({ status: 'idle', update: null, progress: null });
          if (!silent) toast.success(i18n.t('settings.update.latest'));
          return;
        }

        // 有可用更新
        set({ status: 'available', update, progress: null });
        if (openIfAvailable) set({ isOpen: true });
        
      } catch (err) {
        console.error('[updater] check failed:', err);
        // 序列号不匹配时放弃处理
        if (currentCheckId !== checkSequence) return;
        
        const rawMessage = err instanceof Error ? err.message : i18n.t('updater.toast.checkFailed');
        
        // 根据错误信息生成用户友好的提示
        const message = (() => {
          const text = String(rawMessage || '').trim();
          const lower = text.toLowerCase();
          
          // latest.json 不存在
          if ((lower.includes('404') || lower.includes('not found')) && lower.includes('latest.json')) {
            return i18n.t('updater.toast.checkFailedManifest');
          }
          // 公钥配置问题
          if (lower.includes('pubkey') || lower.includes('public key')) {
            return i18n.t('updater.toast.checkFailedPubkey');
          }
          // 网络连接问题
          if (
            lower.includes('failed to connect') ||
            lower.includes('timed out') ||
            lower.includes('timeout') ||
            lower.includes('connection refused')
          ) {
            return i18n.t('updater.toast.checkFailedNetwork');
          }
          return text || i18n.t('updater.toast.checkFailed');
        })();

        set({ status: 'error', error: rawMessage });
        if (!silent) {
          toast.error(message || i18n.t('updater.toast.checkFailed'));
        }
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  },

  /**
   * 下载更新
   * 带进度回调，实时更新下载进度
   */
  downloadUpdate: async () => {
    // 非 Tauri 环境不执行
    if (!isTauri()) return;
    
    const update = get().update;
    if (!update) return;
    // 已经在下载、下载完成或安装中，跳过
    if (get().status === 'downloading' || get().status === 'downloaded' || get().status === 'installing') return;
    // 有正在进行的下载，返回同一个 Promise
    if (inFlightDownload) return inFlightDownload;

    inFlightDownload = (async () => {
      set({ status: 'downloading', progress: { downloaded: 0, total: 0 }, error: null });
      
      try {
        let downloaded = 0;
        let total = 0;

        await update.download((event: any) => {
          try {
            switch (event?.event) {
              case 'Started': {
                // 下载开始，获取文件总大小
                total = Number(event?.data?.contentLength || 0);
                downloaded = 0;
                set({ status: 'downloading', progress: { downloaded, total } });
                break;
              }
              case 'Progress': {
                // 下载进行中，累加已下载字节数
                const chunk = Number(event?.data?.chunkLength || 0);
                downloaded += chunk;
                set({ status: 'downloading', progress: { downloaded, total } });
                break;
              }
              case 'Finished': {
                // 下载完成，确保进度显示完整
                if (total > 0) {
                  downloaded = total;
                }
                set({ status: 'downloading', progress: { downloaded, total } });
                break;
              }
              default:
                break;
            }
          } catch {
            // 忽略进度回调中的错误
          }
        });

        set({ status: 'downloaded', progress: { downloaded, total } });
        toast.success(i18n.t('updater.toast.downloaded'));
        
      } catch (err) {
        console.error('[updater] download failed:', err);
        const message = err instanceof Error ? err.message : i18n.t('updater.toast.downloadFailed');
        set({ status: 'error', error: message });
        toast.error(message || i18n.t('updater.toast.downloadFailed'));
      } finally {
        inFlightDownload = null;
      }
    })();

    return inFlightDownload;
  },

  /**
   * 安装更新
   * 安装完成后自动重启应用
   */
  installUpdate: async () => {
    // 非 Tauri 环境不执行
    if (!isTauri()) return;
    
    const update = get().update;
    if (!update) return;
    // 必须在下载完成后才能安装
    if (get().status !== 'downloaded') return;
    // 有正在进行的安装，返回同一个 Promise
    if (inFlightInstall) return inFlightInstall;

    inFlightInstall = (async () => {
      set({ status: 'installing', error: null });
      
      try {
        await update.install();
        set({ status: 'installed' });
        toast.success(i18n.t('updater.toast.installed'));

        // 尝试自动重启应用
        try {
          const { relaunch } = await import('@tauri-apps/plugin-process');
          await relaunch();
        } catch (err) {
          console.warn('[updater] relaunch failed:', err);
          toast.info(i18n.t('updater.toast.installManual'));
        }
        
      } catch (err) {
        console.error('[updater] install failed:', err);
        const message = err instanceof Error ? err.message : i18n.t('updater.toast.installFailed');
        set({ status: 'error', error: message });
        toast.error(message || i18n.t('updater.toast.installFailed'));
      } finally {
        inFlightInstall = null;
      }
    })();

    return inFlightInstall;
  },
}));
