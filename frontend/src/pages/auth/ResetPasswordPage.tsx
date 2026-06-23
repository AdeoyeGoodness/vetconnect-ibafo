import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import AuthShell from './AuthShell';

interface FormValues { password: string; confirm: string }

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      setDone(true);
      toast.success('Password updated — you can now sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (e) {
      toast.error((e as Error).message || 'Could not reset your password.');
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        footer={<Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Request a new link</Link>}
      >
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          This password reset link is missing or invalid. Please request a new one.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={done ? undefined : 'Choose a strong password for your account.'}
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}
    >
      {done ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold">Password updated</h2>
          <p className="mt-2 text-sm text-ink-muted">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Input
              label="New password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Use at least 8 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-[34px] text-ink-muted hover:text-ink-soft"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Input
            label="Confirm new password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.confirm?.message}
            {...register('confirm', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('password') || 'Passwords do not match',
            })}
          />

          <Button type="submit" loading={isSubmitting} icon={!isSubmitting && <KeyRound className="h-5 w-5" />} block>
            Reset password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
