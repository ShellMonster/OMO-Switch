import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 样式合并工具函数
 * 
 * 功能：
 * 1. 使用 clsx 合并多个 className 条件
 * 2. 使用 tailwind-merge 解决 Tailwind 类名冲突
 * 
 * 使用场景：
 * - 组件需要接收外部 className 时
 * - 需要条件性地应用多个类名时
 * 
 * 示例：
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
