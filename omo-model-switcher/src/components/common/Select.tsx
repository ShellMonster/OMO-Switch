import React, { useState, useRef, useEffect } from 'react';
import { cn } from './cn';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  className?: string;
}

/**
 * 通用下拉选择组件
 * 
 * 功能特性：
 * - 自定义下拉面板
 * - 键盘导航支持（上下箭头、Enter、Escape）
 * - 点击外部自动关闭
 * - 禁用状态
 * - 错误提示
 * 
 * 设计思路：
 * 不依赖原生 select，使用 div 模拟以获得更好的样式控制和交互体验
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  label,
  error,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取当前选中的选项
  const selectedOption = options.find((opt) => opt.value === value);

  // 处理选项点击
  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            handleSelect(option);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= options.length ? 0 : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? options.length - 1 : next;
        });
        break;
    }
  };

  // 打开时重置高亮
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, options, value]);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {/* 触发按钮 */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 text-left',
            'bg-white border rounded-xl transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-50',
            error
              ? 'border-rose-300 focus:border-rose-500'
              : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500'
          )}
        >
          <span
            className={cn(
              'block truncate',
              !selectedOption && 'text-slate-400'
            )}
          >
            {selectedOption?.label || placeholder}
          </span>
          <svg
            className={cn(
              'w-5 h-5 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉面板 */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 w-full mt-1 py-1',
              'bg-white border border-slate-200 rounded-xl shadow-xl',
              'animate-in fade-in zoom-in-95 duration-100'
            )}
          >
            <ul className="max-h-60 overflow-auto">
              {options.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'px-4 py-2.5 cursor-pointer transition-colors',
                    'flex items-center justify-between',
                    option.disabled && 'opacity-50 cursor-not-allowed',
                    highlightedIndex === index && !option.disabled && 'bg-indigo-50 text-indigo-700',
                    value === option.value && 'font-medium text-indigo-700'
                  )}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
