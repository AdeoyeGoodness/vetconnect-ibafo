import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import AuthShell from './AuthShell';

interface FormValues { email: string }

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/auth/forgot-password', values);
      setSent(true);
    } catch (e) {
      // Avoid leaking which emails exist; still confirm to the user.
      toast.error((e as Error).message || 'Could not send the reset link.');
      setSent(true);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}
      footer={<Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold">Check your inbox</h2>
          <p className="mt-2 text-sm text-ink-muted">
            If an account exists for <span className="font-medium text-ink-soft">{getValues('email')}</span>, you'll
            receive a password reset link shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          <Button type="submit" loading={isSubmitting} icon={!isSubmitting && <Send className="h-5 w-5" />} block>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
