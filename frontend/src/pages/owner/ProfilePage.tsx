import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Select, Badge, SkeletonCard } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import { PageShell, ErrorState, TOWNS, pretty } from './_shared';

interface ProfileForm {
  full_name: string;
  phone: string;
  location: string;
  avatar_url: string;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Animal Owner',
  CLINIC_ADMIN: 'Clinic Admin',
  SUPER_ADMIN: 'Administrator',
};

export default function ProfilePage() {
  const qc = useQueryClient();
  const storeUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const meQ = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => unwrap<User>(api.get('/auth/me')),
    initialData: storeUser ?? undefined,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<ProfileForm>({
    defaultValues: { full_name: '', phone: '', location: '', avatar_url: '' },
  });

  const me = meQ.data;
  useEffect(() => {
    if (me) {
      reset({
        full_name: me.full_name ?? '',
        phone: me.phone ?? '',
        location: me.location ?? '',
        avatar_url: me.avatar_url ?? '',
      });
    }
  }, [me, reset]);

  const saveM = useMutation({
    mutationFn: (v: ProfileForm) =>
      unwrap<User>(api.put('/users/me', {
        full_name: v.full_name.trim(),
        phone: v.phone.trim() || null,
        location: v.location || null,
        avatar_url: v.avatar_url.trim() || null,
      })),
    onSuccess: (user) => {
      updateUser(user);
      qc.setQueryData(['auth', 'me'], user);
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated');
      reset({
        full_name: user.full_name ?? '',
        phone: user.phone ?? '',
        location: user.location ?? '',
        avatar_url: user.avatar_url ?? '',
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update profile'),
  });

  const avatarUrl = watch('avatar_url');
  const fullName = watch('full_name');

  if (meQ.isLoading && !me) {
    return (
      <PageShell title="My profile">
        <div className="max-w-2xl"><SkeletonCard /></div>
      </PageShell>
    );
  }
  if (meQ.isError && !me) {
    return (
      <PageShell title="My profile">
        <ErrorState message="Could not load your profile." onRetry={() => meQ.refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell title="My profile" subtitle="Update your contact details and how clinics reach you.">
      <div className="grid max-w-4xl gap-5 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="flex flex-col items-center gap-3 text-center lg:col-span-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-50 text-2xl font-bold text-brand-700">
              {(fullName || me?.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-ink">{fullName || me?.full_name}</p>
            <p className="inline-flex items-center gap-1 text-sm text-ink-muted">
              <Mail className="h-3.5 w-3.5" />{me?.email}
            </p>
          </div>
          <Badge className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {ROLE_LABEL[me?.role ?? ''] ?? pretty(me?.role)}
          </Badge>
        </Card>

        {/* Edit form */}
        <Card className="lg:col-span-2">
          <form className="space-y-4" onSubmit={handleSubmit((v) => saveM.mutate(v))}>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input id="email" value={me?.email ?? ''} readOnly disabled className="input pl-9 opacity-70" />
              </div>
              <p className="mt-1 text-xs text-ink-muted">Email can't be changed.</p>
            </div>

            <Input
              label="Full name" id="full_name"
              placeholder="Your name"
              error={errors.full_name?.message}
              {...register('full_name', { required: 'Name is required' })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" id="phone" type="tel" placeholder="e.g. 0801 234 5678" {...register('phone')} />
              <Select label="Town / location" id="location" {...register('location')}>
                <option value="">Select a town…</option>
                {TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>

            <Input label="Avatar URL" id="avatar_url" type="url" placeholder="https://…" {...register('avatar_url')} />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary" type="button"
                disabled={!isDirty || saveM.isPending}
                onClick={() => me && reset({
                  full_name: me.full_name ?? '',
                  phone: me.phone ?? '',
                  location: me.location ?? '',
                  avatar_url: me.avatar_url ?? '',
                })}
              >
                Reset
              </Button>
              <Button type="submit" loading={saveM.isPending} disabled={!isDirty}>Save changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}
