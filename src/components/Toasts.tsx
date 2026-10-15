import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { Toast } from '../types';

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const STYLES: Record<Toast['kind'], { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: 'text-emerald-500' },
  error: { icon: TriangleAlert, ring: 'text-red-500' },
  info: { icon: Info, ring: 'text-indigo-500' },
};

export default function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const { icon: Icon, ring } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ring}`} aria-hidden />
            <p className="min-w-0 flex-1">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
