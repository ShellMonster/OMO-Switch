import React, { useState, useRef, useEffect } from 'react';
import { cn } from './cn';

interface SearchableSelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

/**
 * 可搜索的下拉选择组件
 * 
 * 功能特性：
 * - 搜索输入框过滤选项
 * - 键盘导航支持（上下箭头、Enter、Escape）
 * - 点击外部自动关闭
 * - 支持徽章标签（如"Current"）
 * - 禁用状态
 * - 错误提示
 * 
 * 设计思路：
 * 基于 Select 组件扩展，添加搜索功能和徽章支持
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  label,
  error,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 获取当前选中的选项
  const selectedOption = options.find((opt) => opt.value === value);

  // 过滤选项
  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // 处理选项点击
  const handleSelect = (option: SearchableSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
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

  // 打开时聚焦搜索输入框
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const option = filteredOptions[highlightedIndex];
          if (!option.disabled) {
            handleSelect(option);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
        break;
    }
  };

  // 打开时重置高亮
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, filteredOptions, value]);

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
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 text-left',
            'bg-white border rounded-xl transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
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
            {/* 搜索输入框 */}
            <div className="px-3 py-2 border-b border-slate-100">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full px-3 py-2 text-sm',
                  'bg-slate-50 border border-slate-200 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                  'placeholder-slate-400'
                )}
              />
            </div>

            {/* 选项列表 */}
            <ul className="max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-8 text-center text-slate-500 text-sm">
                  No options found
                </li>
              ) : (
                filteredOptions.map((option, index) => (
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {value === option.value && (
                      <svg
                        className="w-5 h-5 text-indigo-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-rose-500">{error}</p>}
    </div>
  );
}
