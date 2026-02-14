import React, { useState, useCallback } from 'react';
import { cn } from './cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  clearable?: boolean;
}

/**
 * 搜索输入框组件
 * 
 * 功能特性：
 * - 集成搜索图标
 * - 一键清空功能
 * - 防抖支持（通过外部控制）
 * - 加载状态指示
 * 
 * 设计亮点：
 * - 圆角设计，现代感强
 * - 聚焦时视觉反馈明显
 * - 清空按钮在输入时自动显示
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  autoFocus = false,
  clearable = true,
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // 处理清空
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  // 处理聚焦
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  // 处理失焦
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <div
      className={cn(
        'relative flex items-center',
        className
      )}
    >
      {/* 搜索图标 */}
      <div className="absolute left-3 pointer-events-none">
        <svg
          className={cn(
            'w-5 h-5 transition-colors duration-200',
            isFocused ? 'text-indigo-500' : 'text-slate-400'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full pl-10 pr-10 py-2.5',
          'bg-white border rounded-xl',
          'text-sm text-slate-900 placeholder:text-slate-400',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-50',
          isFocused
            ? 'border-indigo-500 shadow-sm shadow-indigo-100'
            : 'border-slate-200 hover:border-slate-300'
        )}
      />

      {/* 清空按钮 */}
      {clearable && value && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-3 p-1 rounded-lg',
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
          )}
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * 带防抖功能的搜索输入框
 * 
 * 自动延迟触发 onSearch，减少频繁搜索
 */
interface DebouncedSearchInputProps extends Omit<SearchInputProps, 'onChange'> {
  onSearch: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedSearchInput({
  onSearch,
  debounceMs = 300,
  ...props
}: DebouncedSearchInputProps) {
  const [inputValue, setInputValue] = useState(props.value);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    setInputValue(props.value);
  }, [props.value]);

  const handleChange = useCallback(
    (value: string) => {
      setInputValue(value);

      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器
      timeoutRef.current = setTimeout(() => {
        onSearch(value);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  // 组件卸载时清除定时器
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <SearchInput {...props} value={inputValue} onChange={handleChange} />;
}
