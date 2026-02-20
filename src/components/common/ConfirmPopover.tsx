import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';

interface ConfirmPopoverProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  className?: string;
}

export function ConfirmPopover({
  isOpen,
  onConfirm,
  onCancel,
  message,
  className,
}: ConfirmPopoverProps) {
  const { t } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onCancel();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className={cn(
        'absolute z-50 w-32 bg-white rounded-lg shadow-lg border border-slate-200',
        'p-2 text-center',
        className
      )}
    >
      <p className="text-xs text-slate-600 mb-2">{message}</p>
      <div className="flex gap-1.5 justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="flex-1 px-2 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          {t('customModel.cancel')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          className="flex-1 px-2 py-1 text-xs rounded bg-rose-500 text-white hover:bg-rose-600 transition-colors"
        >
          {t('customModel.confirm')}
        </button>
      </div>
    </div>
  );
}

export default ConfirmPopover;
