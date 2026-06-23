import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Loader2, Star, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── Button ───────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; block?: boolean;
  /** Render a nested "button-in-button" trailing circle (Awwwards CTA pattern). */
  arrow?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = 'primary', size = 'md', loading, icon, block, arrow, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('group', `btn-${variant}`, `btn-${size}`, block && 'w-full', arrow && 'pr-1.5', className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {arrow && !loading && (
        <span className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-white/15 transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      )}
    </button>
  )
);
Button.displayName = 'Button';

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-5', className)} {...rest}>{children}</div>;
}

// ── Input / Textarea / Select ──────────────────────────────────────────────
interface FieldProps { label?: string; error?: string; hint?: string; }
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, error, hint, className, id, ...rest }, ref) => (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input ref={ref} id={id} className={cn('input', error && 'border-danger focus:border-danger', className)} {...rest} />
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  ({ label, error, className, id, ...rest }, ref) => (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <textarea ref={ref} id={id} className={cn('input min-h-[96px] py-2.5', error && 'border-danger', className)} {...rest} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(
  ({ label, error, className, id, children, ...rest }, ref) => (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select ref={ref} id={id} className={cn('input', error && 'border-danger', className)} {...rest}>{children}</select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ── Badge / StatusPill ─────────────────────────────────────────────────────
const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', UPCOMING: 'bg-amber-100 text-amber-800', OPEN: 'bg-amber-100 text-amber-800', QUEUED: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-brand-100 text-brand-800', ASSIGNED: 'bg-brand-100 text-brand-800', VERIFIED: 'bg-brand-100 text-brand-800', APPROVED: 'bg-brand-100 text-brand-800', SENT: 'bg-brand-100 text-brand-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800', RESOLVED: 'bg-emerald-100 text-emerald-800', PUBLISHED: 'bg-emerald-100 text-emerald-800', READ: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-stone-200 text-stone-700', REJECTED: 'bg-stone-200 text-stone-700', HIDDEN: 'bg-stone-200 text-stone-700',
  NO_SHOW: 'bg-rose-100 text-rose-800', OVERDUE: 'bg-rose-100 text-rose-800', FAILED: 'bg-rose-100 text-rose-800', FLAGGED: 'bg-rose-100 text-rose-800', DUE: 'bg-rose-100 text-rose-800',
  CRITICAL: 'bg-rose-100 text-rose-800', HIGH: 'bg-orange-100 text-orange-800', MODERATE: 'bg-amber-100 text-amber-800', LOW: 'bg-stone-100 text-stone-700',
};
export function StatusPill({ status }: { status: string }) {
  return <span className={cn('badge', STATUS_TONE[status] || 'bg-stone-100 text-stone-700')}>{status.replace(/_/g, ' ')}</span>;
}
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('badge bg-brand-50 text-brand-700', className)}>{children}</span>;
}

// ── Rating stars ────────────────────────────────────────────────────────────
export function Stars({ value, size = 16, showValue }: { value: number; size?: number; showValue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size}
          className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'} />
      ))}
      {showValue && <span className="ml-1 text-sm font-semibold text-ink-soft">{Number(value).toFixed(1)}</span>}
    </span>
  );
}

// ── Loaders & empty states ──────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} />;
}
export function PageLoader() {
  return <div className="grid min-h-[60vh] place-items-center"><Spinner className="h-8 w-8" /></div>;
}
export function SkeletonCard() {
  return <div className="card p-5 space-y-3"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /></div>;
}
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
