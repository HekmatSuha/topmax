import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.action ? 3000 : 1800);
    return () => clearTimeout(timer);
  }, [toast.id, toast.action, onRemove]);

  const bg =
    toast.type === 'error'
      ? 'bg-red-600'
      : toast.type === 'info'
      ? 'bg-blue-600'
      : 'bg-slate-900';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white max-w-xs sm:max-w-sm ${bg} animate-in slide-in-from-right-4 fade-in duration-300`}
    >
      {toast.type === 'success' && (
        <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {toast.type === 'error' && (
        <div className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      {toast.type === 'info' && (
        <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" />
          </svg>
        </div>
      )}
      <span className="text-sm font-bold flex-1 leading-snug">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onRemove(toast.id);
          }}
          className="text-xs font-black underline underline-offset-2 shrink-0 opacity-90 hover:opacity-100 whitespace-nowrap"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-50 hover:opacity-100 ml-1 transition-opacity"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-14 right-4 z-[200] flex flex-col gap-2 md:top-24 md:right-6">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default Toast;
