import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Clock, MapPin, CalendarPlus, X, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Select, SkeletonCard, EmptyState, StatusPill } from '@/components/ui';
import type { Appointment, AppointmentStatus } from '@/types';
import { PageShell, Modal, ConfirmDialog, ErrorState, SpeciesIcon } from './_shared';

interface Slot { start_time: string; end_time: string; available: boolean }

const TABS: { key: string; label: string; statuses: AppointmentStatus[] }[] = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['CONFIRMED'] },
  { key: 'pending', label: 'Pending', statuses: ['PENDING'] },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED', 'NO_SHOW'] },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MyAppointmentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('upcoming');
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const [toReschedule, setToReschedule] = useState<Appointment | null>(null);

  const apptsQ = useQuery({
    queryKey: ['appointments', 'owner-list'],
    queryFn: () => unwrap<Appointment[]>(api.get('/appointments', { params: { page: 1 } })),
  });

  const active = TABS.find((t) => t.key === tab)!;
  const all = apptsQ.data ?? [];

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of TABS) m[t.key] = all.filter((a) => t.statuses.includes(a.status)).length;
    return m;
  }, [all]);

  const visible = useMemo(
    () =>
      all
        .filter((a) => active.statuses.includes(a.status))
        .sort((x, y) => `${y.scheduled_date}${y.start_time}`.localeCompare(`${x.scheduled_date}${x.start_time}`)),
    [all, active]
  );

  const cancelM = useMutation({
    mutationFn: (id: string) => api.patch(`/appointments/${id}`, { action: 'cancel' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled');
      setToCancel(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not cancel'),
  });

  return (
    <PageShell
      title="My appointments"
      subtitle="Track, reschedule or cancel your clinic visits."
      actions={
        <Link to="/app/book">
          <Button icon={<CalendarPlus className="h-4 w-4" />}>Book appointment</Button>
        </Link>
      }
    >
      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const activeTab = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab ? 'bg-brand-600 text-white shadow-sm' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-xs ${activeTab ? 'bg-white/20' : 'bg-white text-brand-700'}`}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {apptsQ.isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : apptsQ.isError ? (
        <ErrorState message="Could not load your appointments." onRetry={() => apptsQ.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title={`No ${active.label.toLowerCase()} appointments`}
          description="When you book a visit it will appear here."
          action={
            <Link to="/app/book">
              <Button icon={<CalendarPlus className="h-4 w-4" />}>Book appointment</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((ap, i) => (
            <motion.div
              key={ap.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28 }}
            >
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                    <SpeciesIcon species={ap.animal?.species} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {ap.service}
                      <span className="ml-1 font-normal text-ink-muted">· {ap.animal?.name ?? 'Animal'}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {ap.scheduled_date ? format(parseISO(ap.scheduled_date), 'EEE, d MMM yyyy') : '—'}
                        {ap.start_time && ` · ${ap.start_time.slice(0, 5)}`}
                      </span>
                      {ap.clinic?.name && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />{ap.clinic.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusPill status={ap.status} />
                  <div className="flex flex-wrap gap-2">
                    {(ap.status === 'CONFIRMED' || ap.status === 'PENDING') && (
                      <>
                        <Button
                          variant="secondary" size="sm"
                          icon={<RefreshCw className="h-4 w-4" />}
                          onClick={() => setToReschedule(ap)}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          icon={<X className="h-4 w-4" />}
                          onClick={() => setToCancel(ap)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {ap.status === 'COMPLETED' && ap.clinic && (
                      <Link to={`/clinics/${ap.clinic.id}`}>
                        <Button variant="secondary" size="sm" icon={<Star className="h-4 w-4" />}>
                          Leave a review
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        onConfirm={() => toCancel && cancelM.mutate(toCancel.id)}
        loading={cancelM.isPending}
        title="Cancel appointment"
        confirmLabel="Cancel appointment"
        message={
          <>Cancel your <strong>{toCancel?.service}</strong> appointment
          {toCancel?.scheduled_date ? ` on ${format(parseISO(toCancel.scheduled_date), 'd MMM yyyy')}` : ''}? This cannot be undone.</>
        }
      />

      {toReschedule && (
        <RescheduleModal appointment={toReschedule} onClose={() => setToReschedule(null)} />
      )}
    </PageShell>
  );
}

function RescheduleModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, watch, handleSubmit, formState: { errors } } = useForm<{ date: string; slot: string }>({
    defaultValues: { date: appointment.scheduled_date?.slice(0, 10) || todayStr(), slot: '' },
  });
  const date = watch('date');

  const slotsQ = useQuery({
    queryKey: ['slots', appointment.clinic_id, date],
    queryFn: () => unwrap<Slot[]>(api.get(`/availability/${appointment.clinic_id}/slots`, { params: { date } })),
    enabled: !!date,
  });

  const slots = (slotsQ.data ?? []).filter((s) => s.available);

  const rescheduleM = useMutation({
    mutationFn: (v: { date: string; slot: string }) =>
      api.patch(`/appointments/${appointment.id}`, {
        action: 'reschedule',
        scheduled_date: v.date,
        start_time: v.slot,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['slots', appointment.clinic_id] });
      toast.success('Appointment rescheduled');
      onClose();
    },
    onError: (e: Error) => {
      if (/no longer available|already booked|409/i.test(e.message)) {
        toast.error('That slot is no longer available — please pick another.');
        slotsQ.refetch();
      } else {
        toast.error(e.message || 'Could not reschedule');
      }
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Reschedule appointment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={rescheduleM.isPending}>Cancel</Button>
          <Button form="reschedule-form" type="submit" loading={rescheduleM.isPending} disabled={slots.length === 0}>
            Confirm
          </Button>
        </>
      }
    >
      <form id="reschedule-form" className="space-y-4" onSubmit={handleSubmit((v) => rescheduleM.mutate(v))}>
        <p className="text-sm text-ink-muted">
          {appointment.service} for {appointment.animal?.name ?? 'your animal'} at {appointment.clinic?.name ?? 'the clinic'}.
        </p>
        <div>
          <label htmlFor="rs-date" className="label">New date</label>
          <input
            id="rs-date" type="date" min={todayStr()} className="input"
            {...register('date', { required: true })}
          />
        </div>

        {slotsQ.isLoading ? (
          <p className="text-sm text-ink-muted">Loading available times…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink-muted">No available times for this date. Try another day.</p>
        ) : (
          <Select label="Available time" id="rs-slot" error={errors.slot && 'Pick a time'} {...register('slot', { required: true })}>
            <option value="">Select a time…</option>
            {slots.map((s) => (
              <option key={s.start_time} value={s.start_time}>
                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Modal>
  );
}
