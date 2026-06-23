import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { Siren, Phone, MapPin, CheckCircle2, Building2, AlertTriangle } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Select, Textarea, StatusPill, SkeletonCard, EmptyState, Spinner } from '@/components/ui';
import type { EmergencyRequest, EmergencyStatus, Clinic } from '@/types';
import { PageShell, ErrorState, Modal, FilterTabs, pretty } from './_shared';

type EmTab = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'ALL';

const TABS: { value: EmTab; label: string; highlight?: boolean }[] = [
  { value: 'OPEN', label: 'Open', highlight: true },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
];

const URGENT = new Set(['CRITICAL', 'HIGH']);

function safeTime(s?: string | null) {
  if (!s) return '';
  try {
    return format(parseISO(s), 'd MMM, HH:mm');
  } catch {
    return '';
  }
}

export default function AdminEmergencyPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') as EmTab) || 'OPEN';
  const qc = useQueryClient();
  const [assignFor, setAssignFor] = useState<EmergencyRequest | null>(null);
  const [resolveFor, setResolveFor] = useState<EmergencyRequest | null>(null);
  const [assignClinic, setAssignClinic] = useState('');
  const [resolveNote, setResolveNote] = useState('');

  const setTab = (t: EmTab) => setParams(t === 'OPEN' ? {} : { status: t });

  const emQ = useQuery({
    queryKey: ['admin', 'emergency', { tab }],
    queryFn: () => {
      const p: Record<string, unknown> = {};
      if (tab !== 'ALL') p.status = tab;
      return unwrap<EmergencyRequest[]>(api.get('/emergency', { params: p }));
    },
    refetchInterval: 30_000,
  });

  const clinicsQ = useQuery({
    queryKey: ['admin', 'clinics', 'approved-min'],
    queryFn: () => unwrap<Clinic[]>(api.get('/clinics', { params: { status: 'APPROVED', limit: 100 } })),
    staleTime: 60_000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/emergency/${id}`, patch),
    onSuccess: () => {
      toast.success('Emergency updated');
      setAssignFor(null);
      setResolveFor(null);
      setAssignClinic('');
      setResolveNote('');
      qc.invalidateQueries({ queryKey: ['admin', 'emergency'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'admin'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const emergencies = emQ.data ?? [];
  const clinics = clinicsQ.data ?? [];

  const openAssign = (em: EmergencyRequest) => {
    setAssignClinic(em.assigned_clinic_id ?? '');
    setAssignFor(em);
  };
  const openResolve = (em: EmergencyRequest) => {
    setResolveNote(em.resolved_note ?? '');
    setResolveFor(em);
  };

  return (
    <PageShell
      title="Emergency requests"
      subtitle="Monitor, assign and resolve emergency requests in real time"
      actions={emQ.isFetching ? <Spinner className="h-5 w-5" /> : undefined}
    >
      <div className="mb-5">
        <FilterTabs value={tab} options={TABS} onChange={setTab} />
      </div>

      {emQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
      ) : emQ.isError ? (
        <ErrorState message="Could not load emergency requests." onRetry={() => emQ.refetch()} />
      ) : emergencies.length === 0 ? (
        <EmptyState
          icon={<Siren className="h-6 w-6" />}
          title={tab === 'OPEN' ? 'No open emergencies' : 'No requests found'}
          description="When an emergency request comes in, it will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {emergencies.map((em) => {
            const urgent = URGENT.has(em.urgency);
            const busy = updateMut.isPending && updateMut.variables?.id === em.id;
            return (
              <Card
                key={em.id}
                className={`space-y-3 ${urgent && em.status === 'OPEN' ? 'border-rose-300 ring-1 ring-rose-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      {urgent && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                      {pretty(em.animal_type)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{safeTime(em.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={em.urgency} />
                    <StatusPill status={em.status} />
                  </div>
                </div>

                <p className="whitespace-pre-line text-sm text-ink-soft">{em.symptoms}</p>

                <div className="space-y-1 text-sm">
                  {em.location_text && (
                    <p className="flex items-center gap-1.5 text-ink-soft">
                      <MapPin className="h-4 w-4 shrink-0 text-ink-muted" /> {em.location_text}
                    </p>
                  )}
                  <a href={`tel:${em.phone}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:text-brand-800">
                    <Phone className="h-4 w-4" /> {em.phone}
                  </a>
                </div>

                {em.resolved_note && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Note: {em.resolved_note}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {em.status !== 'RESOLVED' && (
                    <Button size="sm" variant="secondary" icon={<Building2 className="h-4 w-4" />} loading={busy}
                      onClick={() => openAssign(em)}>
                      {em.status === 'ASSIGNED' ? 'Reassign' : 'Assign clinic'}
                    </Button>
                  )}
                  {em.status !== 'RESOLVED' && (
                    <Button size="sm" icon={<CheckCircle2 className="h-4 w-4" />} loading={busy}
                      onClick={() => openResolve(em)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign clinic modal */}
      <Modal
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        title="Assign clinic"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignFor(null)} disabled={updateMut.isPending}>Cancel</Button>
            <Button
              loading={updateMut.isPending}
              disabled={!assignClinic}
              onClick={() =>
                assignFor &&
                updateMut.mutate({ id: assignFor.id, patch: { status: 'ASSIGNED', assigned_clinic_id: assignClinic } })
              }
            >
              Assign
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Assign this emergency to a clinic that can respond.</p>
        <Select label="Clinic" value={assignClinic} onChange={(e) => setAssignClinic(e.target.value)}>
          <option value="">Select a clinic…</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.town ? ` — ${c.town}` : ''}</option>
          ))}
        </Select>
        {clinicsQ.isLoading && <p className="text-xs text-ink-muted">Loading clinics…</p>}
      </Modal>

      {/* Resolve modal */}
      <Modal
        open={!!resolveFor}
        onClose={() => setResolveFor(null)}
        title="Resolve emergency"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveFor(null)} disabled={updateMut.isPending}>Cancel</Button>
            <Button
              loading={updateMut.isPending}
              onClick={() =>
                resolveFor &&
                updateMut.mutate({ id: resolveFor.id, patch: { status: 'RESOLVED', resolved_note: resolveNote.trim() || null } })
              }
            >
              Mark resolved
            </Button>
          </>
        }
      >
        <Textarea
          label="Resolution note (optional)"
          placeholder="What was done to resolve this request?"
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
        />
      </Modal>
    </PageShell>
  );
}
