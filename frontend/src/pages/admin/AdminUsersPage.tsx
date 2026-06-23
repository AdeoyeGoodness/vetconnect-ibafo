import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Users, Search, Check, Ban, Trash2, Mail } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Select, StatusPill, SkeletonCard, EmptyState, Spinner } from '@/components/ui';
import type { User, UserRole, PageMeta } from '@/types';
import { PageShell, ErrorState, Pagination, ConfirmDialog, ResponsiveTable, pretty } from './_shared';

const ROLE_TONE: Record<UserRole, string> = {
  OWNER: 'bg-brand-50 text-brand-700',
  CLINIC_ADMIN: 'bg-sand-100 text-sand-700',
  SUPER_ADMIN: 'bg-rose-100 text-rose-700',
};

function safeDate(s?: string | null) {
  if (!s) return '—';
  try {
    return format(parseISO(s), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<'' | UserRole>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const usersQ = useQuery({
    queryKey: ['admin', 'users', { role, search, page }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const p: Record<string, unknown> = { page, limit: 20 };
      if (role) p.role = role;
      if (search) p.search = search;
      const res = await api.get('/users', { params: p });
      return { data: res.data.data as User[], meta: res.data.meta as PageMeta | undefined };
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/users/${id}/status`, { is_active }),
    onSuccess: (_d, v) => {
      toast.success(v.is_active ? 'User enabled' : 'User disabled');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const users = usersQ.data?.data ?? [];
  const meta = usersQ.data?.meta;

  return (
    <PageShell
      title="Users"
      subtitle="Manage all platform accounts"
      actions={usersQ.isFetching ? <Spinner className="h-5 w-5" /> : undefined}
    >
      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <form onSubmit={onSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Select
          className="sm:w-48"
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value as '' | UserRole);
          }}
        >
          <option value="">All roles</option>
          <option value="OWNER">Owners</option>
          <option value="CLINIC_ADMIN">Clinic admins</option>
          <option value="SUPER_ADMIN">Super admins</option>
        </Select>
      </div>

      {usersQ.isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : usersQ.isError ? (
        <ErrorState message="Could not load users." onRetry={() => usersQ.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No users found" description="Try adjusting your filters." />
      ) : (
        <>
          <ResponsiveTable
            table={
              <>
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => {
                    const busy = statusMut.isPending && statusMut.variables?.id === u.id;
                    return (
                      <tr key={u.id}>
                        <td className="px-4 py-3 font-medium text-ink">{u.full_name}</td>
                        <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${ROLE_TONE[u.role]}`}>{pretty(u.role)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={u.is_active ? 'APPROVED' : 'SUSPENDED'} />
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{safeDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {u.is_active ? (
                              <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} loading={busy}
                                onClick={() => statusMut.mutate({ id: u.id, is_active: false })}>
                                Disable
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" icon={<Check className="h-4 w-4" />} loading={busy}
                                onClick={() => statusMut.mutate({ id: u.id, is_active: true })}>
                                Enable
                              </Button>
                            )}
                            <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />}
                              onClick={() => setToDelete(u)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            }
            cards={users.map((u) => {
              const busy = statusMut.isPending && statusMut.variables?.id === u.id;
              return (
                <Card key={u.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{u.full_name}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> {u.email}
                      </p>
                    </div>
                    <StatusPill status={u.is_active ? 'APPROVED' : 'SUSPENDED'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className={`badge ${ROLE_TONE[u.role]}`}>{pretty(u.role)}</span>
                    <span>Joined {safeDate(u.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    {u.is_active ? (
                      <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} loading={busy}
                        onClick={() => statusMut.mutate({ id: u.id, is_active: false })}>
                        Disable
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" icon={<Check className="h-4 w-4" />} loading={busy}
                        onClick={() => statusMut.mutate({ id: u.id, is_active: true })}>
                        Enable
                      </Button>
                    )}
                    <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setToDelete(u)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          />

          {meta && (
            <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
        title="Delete user"
        confirmLabel="Delete user"
        message={
          <>
            Permanently delete <strong>{toDelete?.full_name}</strong> ({toDelete?.email})? This cannot be undone.
          </>
        }
      />
    </PageShell>
  );
}
