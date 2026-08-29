/**
 * @fileoverview Toast Component rendering floating notification alerts.
 */

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Floating Toast alerts stack.
 *
 * @param {object} props
 * @param {Array<{ id: string, message: string, type: string }>} props.toasts
 * @param {Function} props.onClose
 * @returns {JSX.Element|null}
 */
export const Toast = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
          bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
          bgClass: 'bg-red-50 border-red-200 text-red-900',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
          bgClass: 'bg-amber-50 border-amber-200 text-amber-900',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-primary-600 flex-shrink-0" />,
          bgClass: 'bg-primary-50 border-primary-200 text-primary-900',
        };
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = getToastConfig(toast.type);

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4 ${config.bgClass}`}
            role="alert"
          >
            <div className="mt-0.5">{config.icon}</div>
            <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
            <button
              onClick={() => onClose(toast.id)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
