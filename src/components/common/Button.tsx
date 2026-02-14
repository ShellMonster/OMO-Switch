import React from 'react';
import { cn } from '../common/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * 通用按钮组件
 * 
 * 设计理念：
 * - 提供多种变体（variant）满足不同场景需求
 * - 统一尺寸规范，确保视觉一致性
 * - 支持加载状态，提升用户体验
 * 
 * 变体说明：
 * - primary: 主操作按钮，使用主题色
 * - secondary: 次要按钮，灰色背景
 * - danger: 危险操作，红色警示
 * - ghost: 透明背景，悬停时显示背景
 * - outline: 边框按钮，空心样式
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    // 定义各种变体的样式
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95',
      danger: 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 active:scale-95',
      outline: 'bg-transparent border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:scale-95',
    };

    // 定义各种尺寸的样式
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-8 py-4 text-base font-semibold',
    };

    return (
      <button
        ref={ref}
        className={cn(
          // 基础样式：内联弹性布局、圆角、过渡动画
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
          // 焦点样式：轮廓环
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
          // 禁用样式
          'disabled:opacity-50 disabled:pointer-events-none',
          // 变体样式
          variants[variant],
          // 尺寸样式
          sizes[size],
          // 加载状态样式
          isLoading && 'cursor-wait',
          // 自定义类名
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
