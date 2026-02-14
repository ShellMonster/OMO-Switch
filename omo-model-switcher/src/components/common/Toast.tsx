import { create } from 'zustand';
import { cn } from './cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// 存储定时器 ID，用于清理
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/**
 * Toast 状态管理 Store
 * 
 * 使用 Zustand 管理全局 Toast 消息队列
 * 支持自动消失、手动关闭、批量清除
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  // 添加 Toast，2秒后自动移除
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // 2秒后自动移除
    const timer = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
      toastTimers.delete(id);
    }, 2000);

    toastTimers.set(id, timer);
  },
  
  // 手动移除 Toast
  removeToast: (id) => {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  // 清空所有 Toast
  clearAll: () => {
    toastTimers.forEach((timer) => clearTimeout(timer));
    toastTimers.clear();
    set({ toasts: [] });
  },
}));

// 导出便捷调用方法
export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning'),
};

// 页面卸载时清理所有定时器
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    toastTimers.forEach((timer) => clearTimeout(timer));
    toastTimers.clear();
  });
}

/**
 * Toast 容器组件
 * 
 * 显示在屏幕右上角的消息通知组件
 * 支持成功、错误、信息、警告四种类型
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  // 各类型对应的图标和颜色
  const typeStyles = {
    success: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    error: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      iconBg: 'bg-rose-100 text-rose-600',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    warning: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      iconBg: 'bg-amber-100 text-amber-600',
    },
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const styles = typeStyles[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg',
              'animate-in slide-in-from-right-2 fade-in duration-300',
              styles.bg
            )}
          >
            <div className={cn('p-1.5 rounded-lg', styles.iconBg)}>
              {styles.icon}
            </div>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
