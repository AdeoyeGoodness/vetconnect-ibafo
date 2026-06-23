import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays, PawPrint, Syringe, History, ArrowRight, Clock,
  Plus, CalendarPlus, MapPin, AlertTriangle,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Card, Button, SkeletonCard, EmptyState, StatusPill } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import type { Appointment, Vaccination } from '@/types';
import { PageShell, ErrorState, SpeciesIcon } from './_shared';

interface OwnerAnalytics {
  upcoming_appointments: number;
  past_appointments: number;
  animals_count: number;
  vaccination_reminders: number;
  recent_appointments?: Appointment[];
  upcoming?: Appointment[];
  reminders?: Vaccination[];
}

const card = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

function StatCard({
  i, icon, label, value, accent, to,
}: { i: number; icon: React.ReactNode; label: string; value: React.ReactNode; accent: string; to: string }) {
  return (
    <motion.div custom={i} variants={card} initial="hidden" animate="show">
      <Link to={to}>
        <Card className="flex items-center gap-4 transition-shadow hover:shadow-lift">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
            <div className="mt-0.5 text-2xl font-bold leading-none text-ink">{value}</div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function OwnerDashboard() {
  const user = useAuthStore((s) => s.user);

  const analyticsQ = useQuery({
    queryKey: ['analytics', 'owner'],
    queryFn: () => unwrap<OwnerAnalytics>(api.get('/analytics/owner')),
  });

  // Upcoming appointments — prefer analytics payload, fall back to a direct query.
  const apptsQ = useQuery({
    queryKey: ['appointments', { scope: 'owner-upcoming' }],
    queryFn: () => unwrap<Appointment[]>(api.get('/appointments', { params: { status: 'CONFIRMED', page: 1 } })),
    enabled: analyticsQ.isSuccess && !analyticsQ.data?.upcoming?.length,
  });

  const remindersQ = useQuery({
    queryKey: ['vaccinations', { scope: 'owner-reminders' }],
    queryFn: () => unwrap<Vaccination[]>(api.get('/vaccinations')),
    enabled: analyticsQ.isSuccess && !analyticsQ.data?.reminders?.length,
  });

  const a = analyticsQ.data;
  const firstName = (user?.full_name || 'there').split(' ')[0];

  const upcoming = (a?.upcoming ?? apptsQ.data ?? [])
    .filter((ap) => ap.status === 'CONFIRMED' || ap.status === 'PENDING')
    .sort((x, y) => `${x.scheduled_date}${x.start_time}`.localeCompare(`${y.scheduled_date}${y.start_time}`))
    .slice(0, 5);

  const reminders = (a?.reminders ?? remindersQ.data ?? [])
    .filter((v) => v.status === 'DUE' || v.status === 'OVERDUE' || v.status === 'UPCOMING')
    .sort((x, y) => (x.due_date || '').localeCompare(y.due_date || ''))
    .slice(0, 6);

  if (analyticsQ.isLoading) {
    return (
      <PageShell title={`Welcome back, ${firstName}`} subtitle={format(new Date(), 'EEEE, d MMMM yyyy')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </PageShell>
    );
  }
  if (analyticsQ.isError) {
    return (
      <PageShell title={`Welcome back, ${firstName}`}>
        <ErrorState message="Could not load your dashboard." onRetry={() => analyticsQ.refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Welcome back, ${firstName}`}
      subtitle={`${format(new Date(), 'EEEE, d MMMM yyyy')} · Keep your animals healthy and on schedule.`}
      actions={
        <>
          <Link to="/app/book">
            <Button icon={<CalendarPlus className="h-4 w-4" />}>Book appointment</Button>
          </Link>
          <Link to="/app/animals">
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />}>Add animal</Button>
          </Link>
        </>
      }
    >
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          i={0}
          to="/app/appointments"
          icon={<CalendarDays className="h-6 w-6 text-brand-700" />}
          accent="bg-brand-50"
          label="Upcoming appointments"
          value={a?.upcoming_appointments ?? upcoming.length}
        />
        <StatCard
          i={1}
          to="/app/animals"
          icon={<PawPrint className="h-6 w-6 text-sand-600" />}
          accent="bg-sand-50"
          label="Animals registered"
          value={a?.animals_count ?? '—'}
        />
        <StatCard
          i={2}
          to="/app/vaccinations"
          icon={<Syringe className="h-6 w-6 text-rose-600" />}
          accent="bg-rose-50"
          label="Vaccination reminders"
          value={a?.vaccination_reminders ?? reminders.length}
        />
        <StatCard
          i={3}
          to="/app/appointments"
          icon={<History className="h-6 w-6 text-brand-700" />}
          accent="bg-brand-50"
          label="Past visits"
          value={a?.past_appointments ?? '—'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Upcoming appointments</h2>
            <Link
              to="/app/appointments"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {apptsQ.isLoading ? (
            <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="No upcoming appointments"
              description="Book a visit with a clinic near you to keep your animals healthy."
              action={
                <Link to="/app/book">
                  <Button icon={<CalendarPlus className="h-4 w-4" />}>Book appointment</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((ap) => (
                <Card key={ap.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <SpeciesIcon species={ap.animal?.species} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {ap.animal?.name ?? 'Animal'}{' '}
                        <span className="font-normal text-ink-muted">· {ap.service}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {ap.scheduled_date ? format(parseISO(ap.scheduled_date), 'd MMM') : '—'}
                          {ap.start_time && ` · ${ap.start_time.slice(0, 5)}`}
                        </span>
                        {ap.clinic?.name && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {ap.clinic.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={ap.status} />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Vaccination reminders */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Vaccination reminders</h2>
            <Link
              to="/app/vaccinations"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {remindersQ.isLoading ? (
            <SkeletonCard />
          ) : reminders.length === 0 ? (
            <EmptyState
              icon={<Syringe className="h-6 w-6" />}
              title="Nothing due"
              description="No vaccinations are due right now. Nice work!"
            />
          ) : (
            <div className="space-y-3">
              {reminders.map((v) => {
                const urgent = v.status === 'DUE' || v.status === 'OVERDUE';
                return (
                  <Card key={v.id} className={`space-y-2 p-4 ${urgent ? 'border-rose-200' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {urgent ? (
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                        ) : (
                          <Syringe className="h-4 w-4 text-brand-600" />
                        )}
                        {v.vaccine_name}
                      </span>
                      <StatusPill status={v.status} />
                    </div>
                    <p className="text-xs text-ink-muted">
                      Due {v.due_date ? format(parseISO(v.due_date), 'd MMM yyyy') : '—'}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
