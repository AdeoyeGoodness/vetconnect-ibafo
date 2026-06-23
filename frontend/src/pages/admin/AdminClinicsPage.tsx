import { Fragment, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Building2, ChevronDown, Check, X, Ban, Stethoscope, MapPin, User as UserIcon,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, StatusPill, Stars, SkeletonCard, EmptyState, Spinner } from '@/components/ui';
import type { Clinic, Veterinarian, ClinicStatus, VetStatus, PageMeta } from '@/types';
import { PageShell, ErrorState, Pagination, FilterTabs, ResponsiveTable, pretty } from './_shared';

type ClinicTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL';

const TABS: { value: ClinicTab; label: string; highlight?: boolean }[] = [
  { value: 'PENDING', label: 'Pending', highlight: true },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

interface ClinicWithOwner extends Clinic {
  owner_name?: string | null;
  owner?: { full_name?: string | null } | null;
}

function ownerName(c: ClinicWithOwner) {
  return c.owner_name ?? c.owner?.full_name ?? '—';
}

// ── Inline vet list (loaded lazily when a row expands) ──────────────────────
function VetPanel({ clinicId }: { clinicId: string }) {
  const qc = useQueryClient();
  const vetsQ = useQuery({
    queryKey: ['veterinarians', { clinic_id: clinicId }],
    queryFn: () => unwrap<Veterinarian[]>(api.get('/veterinarians', { params: { clinic_id: clinicId } })),
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VetStatus }) =>
      api.patch(`/veterinarians/${id}/verify`, { status }),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'VERIFIED' ? 'Veterinarian verified' : 'Veterinarian rejected');
      qc.invalidateQueries({ queryKey: ['veterinarians', { clinic_id: clinicId }] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (vetsQ.isLoading) {
    return <div className="flex items-center gap-2 px-4 py-4 text-sm text-ink-muted"><Spinner className="h-4 w-4" /> Loading veterinarians…</div>;
  }
  if (vetsQ.isError) {
    return <div className="px-4 py-4"><ErrorState message="Could not load veterinarians." onRetry={() => vetsQ.refetch()} /></div>;
  }
  const vets = vetsQ.data ?? [];
  if (vets.length === 0) {
    return <p className="px-4 py-4 text-sm text-ink-muted">No veterinarians registered for this clinic.</p>;
  }

  return (
    <div className="space-y-2 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <Stethoscope className="mr-1 inline h-3.5 w-3.5" /> Veterinarians ({vets.length})
      </p>
      {vets.map((v) => {
        const busy = verifyMut.isPending && verifyMut.variables?.id === v.id;
        return (
          <div
            key={v.id}
            className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">{v.full_name}</p>
              <p className="text-xs text-ink-muted">
                {v.specialization || 'General practice'}
                {v.license_number ? ` · Lic. ${v.license_number}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={v.status} />
              {v.status !== 'VERIFIED' && (
                <Button
                  size="sm" variant="secondary" icon={<Check className="h-4 w-4" />}
                  loading={busy} onClick={() => verifyMut.mutate({ id: v.id, status: 'VERIFIED' })}
                >
                  Verify
                </Button>
              )}
              {v.status !== 'REJECTED' && (
                <Button
                  size="sm" variant="ghost" icon={<X className="h-4 w-4" />}
                  loading={busy} onClick={() => verifyMut.mutate({ id: v.id, status: 'REJECTED' })}
                >
                  Reject
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Action buttons for a clinic ─────────────────────────────────────────────
function ClinicActions({
  clinic, onAct, busy,
}: { clinic: ClinicWithOwner; onAct: (status: ClinicStatus) => void; busy: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {clinic.status !== 'APPROVED' && (
        <Button size="sm" variant="secondary" icon={<Check className="h-4 w-4" />} loading={busy} onClick={() => onAct('APPROVED')}>
          Approve
        </Button>
      )}
      {clinic.status === 'APPROVED' && (
        <Button size="sm" variant="ghost" icon={<Ban className="h-4 w-4" />} loading={busy} onClick={() => onAct('SUSPENDED')}>
          Suspend
        </Button>
      )}
      {clinic.status !== 'REJECTED' && clinic.status !== 'APPROVED' && (
        <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} loading={busy} onClick={() => onAct('REJECTED')}>
          Reject
        </Button>
      )}
      {clinic.status === 'SUSPENDED' && (
        <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} loading={busy} onClick={() => onAct('REJECTED')}>
          Reject
        </Button>
      )}
    </div>
  );
}

export default function AdminClinicsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') as ClinicTab) || 'PENDING';
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const qc = useQueryClient();

  const setTab = (t: ClinicTab) => {
    setPage(1);
    setExpanded(null);
    setParams(t === 'PENDING' ? {} : { status: t });
  };

  const clinicsQ = useQuery({
    queryKey: ['admin', 'clinics', { tab, page }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const p: Record<string, unknown> = { page, limit: 20 };
      if (tab !== 'ALL') p.status = tab;
      const res = await api.get('/clinics', { params: p });
      return { data: res.data.data as ClinicWithOwner[], meta: res.data.meta as PageMeta | undefined };
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ClinicStatus }) =>
      api.patch(`/clinics/${id}/status`, { status }),
    onSuccess: (_d, v) => {
      toast.success(`Clinic ${pretty(v.status).toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['admin', 'clinics'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clinics = clinicsQ.data?.data ?? [];
  const meta = clinicsQ.data?.meta;

  return (
    <PageShell
      title="Clinic approvals"
      subtitle="Review, approve, suspend and verify clinics and their veterinarians"
      actions={clinicsQ.isFetching ? <Spinner className="h-5 w-5" /> : undefined}
    >
      <div className="mb-5">
        <FilterTabs value={tab} options={TABS} onChange={(t) => setTab(t)} />
      </div>

      {clinicsQ.isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : clinicsQ.isError ? (
        <ErrorState message="Could not load clinics." onRetry={() => clinicsQ.refetch()} />
      ) : clinics.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={tab === 'PENDING' ? 'No pending clinics' : 'No clinics found'}
          description={tab === 'PENDING' ? 'New clinic submissions will appear here for review.' : 'Try a different status filter.'}
        />
      ) : (
        <>
          <ResponsiveTable
            table={
              <>
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Clinic</th>
                    <th className="px-4 py-3 font-semibold">Town</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clinics.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="align-middle">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                            className="inline-flex items-center gap-2 text-left font-medium text-ink hover:text-brand-700"
                          >
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${expanded === c.id ? 'rotate-180' : ''}`}
                            />
                            {c.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{c.town ?? '—'}</td>
                        <td className="px-4 py-3 text-ink-soft">{ownerName(c)}</td>
                        <td className="px-4 py-3"><Stars value={c.rating_avg ?? 0} size={13} showValue /></td>
                        <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ClinicActions
                              clinic={c}
                              busy={statusMut.isPending && statusMut.variables?.id === c.id}
                              onAct={(status) => statusMut.mutate({ id: c.id, status })}
                            />
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence initial={false}>
                        {expanded === c.id && (
                          <tr>
                            <td colSpan={6} className="bg-stone-50/60 p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <VetPanel clinicId={c.id} />
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  ))}
                </tbody>
              </>
            }
            cards={clinics.map((c) => (
              <Card key={c.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                      <MapPin className="h-3.5 w-3.5" /> {c.town ?? '—'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                      <UserIcon className="h-3.5 w-3.5" /> {ownerName(c)}
                    </p>
                  </div>
                  <StatusPill status={c.status} />
                </div>
                <Stars value={c.rating_avg ?? 0} size={13} showValue />
                <ClinicActions
                  clinic={c}
                  busy={statusMut.isPending && statusMut.variables?.id === c.id}
                  onAct={(status) => statusMut.mutate({ id: c.id, status })}
                />
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded === c.id ? 'rotate-180' : ''}`} />
                  {expanded === c.id ? 'Hide' : 'Show'} veterinarians
                </button>
                <AnimatePresence initial={false}>
                  {expanded === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-xl bg-stone-50"
                    >
                      <VetPanel clinicId={c.id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          />

          {meta && (
            <Pagination
              className="mt-6"
              page={meta.page}
              totalPages={meta.totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
