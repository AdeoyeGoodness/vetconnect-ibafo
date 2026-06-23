import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CalendarDays, Building2, Check, X, CalendarClock, CheckCheck, UserX, Filter,
  PawPrint, Clock, User as UserIcon,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import {
  Button, Card, Input, Textarea, Select, StatusPill, SkeletonCard, EmptyState,
} from '@/components/ui';
import type { Appointment, AppointmentStatus } from '@/types';
import { PageShell, Modal, ErrorState, useMyClinic } from './_shared';

type ApptAction = 'confirm' | 'reject' | 'complete' | 'no_show' | 'reschedule';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = parseISO(d);
  return isValid(dt) ? format(dt, 'EEE, d MMM yyyy') : d;
}

interface RescheduleForm {
  scheduled_date: string;
  start_time: string;
}

export default function ClinicAppointmentsPage() {
  const qc = useQueryClient();
  const { data: clinic, isLoading: clinicLoading } = useMyClinic();

  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [rejectFor, setRejectFor] = useState<Appointment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rescheduleFor, setRescheduleFor] = useState<Appointment | null>(null);

  const rsForm = useForm<RescheduleForm>({ defaultValues: { scheduled_date: '', start_time: '' } });

  const apptsQ = useQuery({
    queryKey: ['appointments', { status, date }],
    queryFn: () =>
      unwrap<Appointment[]>(
        api.get('/appointments', {
          params: { status: status || undefined, date: date || undefined },
        })
      ),
    enabled: !!clinic,
  });

  const actMut = useMutation({
    mutationFn: ({
      id, action, reject_reason, scheduled_date, start_time,
    }: {
      id: string; action: ApptAction; reject_reason?: string; scheduled_date?: string; start_time?: string;
    }) => api.patch(`/appointments/${id}`, { action, reject_reason, scheduled_date, start_time }),
    onSuccess: (_d, v) => {
      const msg: Record<ApptAction, string> = {
        confirm: 'Appointment confirmed',
        reject: 'Appointment rejected',
        complete: 'Marked completed',
        no_show: 'Marked as no-show',
        reschedule: 'Appointment rescheduled',
      };
      toast.success(msg[v.action]);
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'clinic'] });
      setRejectFor(null);
      setRejectReason('');
      setRescheduleFor(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Action failed'),
  });

  const appts = apptsQ.data ?? [];
  const sorted = useMemo(
    () =>
      [...appts].sort((a, b) => {
        const d = (b.scheduled_date || '').localeCompare(a.scheduled_date || '');
        return d !== 0 ? d : (a.start_time || '').localeCompare(b.start_time || '');
      }),
    [appts]
  );

  const isBusy = (id: string) => actMut.isPending && actMut.variables?.id === id;

  function openReschedule(ap: Appointment) {
    setRescheduleFor(ap);
    rsForm.reset({
      scheduled_date: ap.scheduled_date ? ap.scheduled_date.slice(0, 10) : '',
      start_time: ap.start_time ? ap.start_time.slice(0, 5) : '',
    });
  }

  function rowActions(ap: Appointment) {
    const st = ap.status as AppointmentStatus;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {st === 'PENDING' && (
          <>
            <Button
              size="sm" variant="secondary" icon={<Check className="h-4 w-4" />}
              loading={isBusy(ap.id)}
              onClick={() => actMut.mutate({ id: ap.id, action: 'confirm' })}
            >
              Confirm
            </Button>
            <Button
              size="sm" variant="ghost" icon={<X className="h-4 w-4" />}
              onClick={() => { setRejectFor(ap); setRejectReason(''); }}
            >
              Reject
            </Button>
          </>
        )}
        {(st === 'PENDING' || st === 'CONFIRMED') && (
          <Button
            size="sm" variant="secondary" icon={<CalendarClock className="h-4 w-4" />}
            onClick={() => openReschedule(ap)}
          >
            Reschedule
          </Button>
        )}
        {st === 'CONFIRMED' && (
          <>
            <Button
              size="sm" icon={<CheckCheck className="h-4 w-4" />}
              loading={isBusy(ap.id)}
              onClick={() => actMut.mutate({ id: ap.id, action: 'complete' })}
            >
              Completed
            </Button>
            <Button
              size="sm" variant="ghost" icon={<UserX className="h-4 w-4" />}
              loading={isBusy(ap.id)}
              onClick={() => actMut.mutate({ id: ap.id, action: 'no_show' })}
            >
              No-show
            </Button>
          </>
        )}
      </div>
    );
  }

  if (clinicLoading) {
    return (
      <PageShell title="Appointments">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </PageShell>
    );
  }

  if (!clinic) {
    return (
      <PageShell title="Appointments">
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Register your clinic first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              You need a clinic profile before you can receive appointment bookings.
            </p>
          </div>
          <Link to="/clinic/profile"><Button icon={<Building2 className="h-4 w-4" />}>Register your clinic</Button></Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Appointments" subtitle="Review, confirm and manage bookings at your clinic.">
      {/* Filters */}
      <Card className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-soft sm:pb-2.5">
          <Filter className="h-4 w-4 text-brand-600" /> Filters
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {(status || date) && (
          <Button variant="ghost" className="sm:mb-0.5" onClick={() => { setStatus(''); setDate(''); }}>
            Clear
          </Button>
        )}
      </Card>

      {apptsQ.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : apptsQ.isError ? (
        <ErrorState message="Could not load appointments." onRetry={() => apptsQ.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="No appointments found"
          description={status || date ? 'Try adjusting your filters.' : 'Bookings made by pet owners will show up here.'}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date &amp; time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((ap) => (
                  <tr key={ap.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                          <PawPrint className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{ap.animal?.name ?? 'Patient'}</p>
                          <p className="truncate text-xs text-ink-muted">{ap.animal?.species ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{ap.service}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{fmtDate(ap.scheduled_date)}</p>
                      <p className="text-xs text-ink-muted">{ap.start_time?.slice(0, 5) ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={ap.status} /></td>
                    <td className="px-4 py-3"><div className="flex justify-end">{rowActions(ap)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {sorted.map((ap) => (
              <Card key={ap.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <PawPrint className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {ap.animal?.name ?? 'Patient'} <span className="font-normal text-ink-muted">· {ap.service}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(ap.scheduled_date)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ap.start_time?.slice(0, 5) ?? '—'}</span>
                        {ap.animal?.species && <span className="inline-flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{ap.animal.species}</span>}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={ap.status} />
                </div>
                {rowActions(ap)}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Reject modal */}
      <Modal
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title="Reject appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectFor(null)} disabled={actMut.isPending}>Cancel</Button>
            <Button
              variant="danger"
              loading={actMut.isPending}
              onClick={() => rejectFor && actMut.mutate({ id: rejectFor.id, action: 'reject', reject_reason: rejectReason.trim() })}
            >
              Reject appointment
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Let the owner know why this booking can't go ahead. They'll be notified.
        </p>
        <Textarea
          label="Reason"
          placeholder="e.g. Fully booked at that time — please pick another slot."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* Reschedule modal */}
      <Modal
        open={!!rescheduleFor}
        onClose={() => setRescheduleFor(null)}
        title="Reschedule appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRescheduleFor(null)} disabled={actMut.isPending}>Cancel</Button>
            <Button form="reschedule-form" type="submit" loading={actMut.isPending}>Save new time</Button>
          </>
        }
      >
        <form
          id="reschedule-form"
          className="space-y-4"
          onSubmit={rsForm.handleSubmit((v) =>
            rescheduleFor &&
            actMut.mutate({
              id: rescheduleFor.id,
              action: 'reschedule',
              scheduled_date: v.scheduled_date,
              start_time: v.start_time,
            })
          )}
        >
          <p className="text-sm text-ink-muted">Pick a new date and start time for this booking.</p>
          <Input
            label="New date" type="date"
            error={rsForm.formState.errors.scheduled_date?.message}
            {...rsForm.register('scheduled_date', { required: 'Date is required' })}
          />
          <Input
            label="New start time" type="time"
            error={rsForm.formState.errors.start_time?.message}
            {...rsForm.register('start_time', { required: 'Start time is required' })}
          />
        </form>
      </Modal>
    </PageShell>
  );
}
