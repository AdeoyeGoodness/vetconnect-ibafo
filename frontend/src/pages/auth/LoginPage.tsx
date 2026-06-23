import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { AuthResponse, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';
import AuthShell from './AuthShell';

const dashboardFor = (role: UserRole) =>
  role === 'SUPER_ADMIN' ? '/admin/dashboard' : role === 'CLINIC_ADMIN' ? '/clinic/dashboard' : '/app/dashboard';

interface FormValues { email: string; password: string }

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await api.post('/auth/login', values);
      const { token, user } = res.data.data as AuthResponse;
      setAuth(token, user);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || dashboardFor(user.role), { replace: true });
    } catch (e) {
      toast.error((e as Error).message || 'Invalid email or password.');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your animals and appointments."
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create one</Link></>}
    >
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

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
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
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} icon={!isSubmitting && <LogIn className="h-5 w-5" />} block>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
