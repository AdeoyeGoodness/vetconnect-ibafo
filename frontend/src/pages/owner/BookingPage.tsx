import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search, MapPin, Check, PawPrint, Stethoscope, CalendarDays, Clock, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Select, Spinner, EmptyState, Badge } from '@/components/ui';
import type { Animal, Clinic } from '@/types';
import { PageShell, ErrorState, SpeciesIcon, pretty } from './_shared';

interface Slot { start_time: string; end_time: string; available: boolean }

const todayStr = () => new Date().toISOString().slice(0, 10);

function StepHeader({ n, title, done, icon }: { n: number; title: string; done?: boolean; icon: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
        done ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-600 text-white'
      }`}>
        {done ? <Check className="h-5 w-5" /> : n}
      </div>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">{icon}{title}</h2>
    </div>
  );
}

export default function BookingPage() {
  const { clinicSlug } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [animalId, setAnimalId] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState('');

  // Preselect clinic from the URL slug.
  const preQ = useQuery({
    queryKey: ['clinic', clinicSlug],
    queryFn: () => unwrap<Clinic>(api.get(`/clinics/${clinicSlug}`)),
    enabled: !!clinicSlug,
  });
  useEffect(() => {
    if (preQ.data) setClinic(preQ.data);
  }, [preQ.data]);

  const clinicsQ = useQuery({
    queryKey: ['clinics', 'booking', search],
    queryFn: () => unwrap<Clinic[]>(api.get('/clinics', { params: { search: search || undefined, page: 1 } })),
    enabled: !clinic,
  });

  const animalsQ = useQuery({
    queryKey: ['animals'],
    queryFn: () => unwrap<Animal[]>(api.get('/animals')),
  });

  const slotsQ = useQuery({
    queryKey: ['slots', clinic?.id, date],
    queryFn: () => unwrap<Slot[]>(api.get(`/availability/${clinic!.id}/slots`, { params: { date } })),
    enabled: !!clinic && !!date && !!service,
  });
  const slots = (slotsQ.data ?? []).filter((s) => s.available);

  const bookM = useMutation({
    mutationFn: () =>
      unwrap(api.post('/appointments', {
        clinic_id: clinic!.id,
        animal_id: animalId,
        service,
        scheduled_date: date,
        start_time: slot,
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked!');
      navigate('/app/appointments');
    },
    onError: (e: Error) => {
      if (/no longer available|already booked|409/i.test(e.message)) {
        toast.error('That slot was just taken — please choose another.');
        setSlot('');
        slotsQ.refetch();
      } else {
        toast.error(e.message || 'Could not book appointment');
      }
    },
  });

  const services = clinic?.services_offered ?? [];
  const canSubmit = !!clinic && !!animalId && !!service && !!date && !!slot;
  const animals = animalsQ.data ?? [];

  function resetClinic() {
    setClinic(null);
    setService('');
    setSlot('');
  }

  return (
    <PageShell title="Book an appointment" subtitle="Find a clinic, pick your animal and choose a time.">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Step 1 — clinic */}
          <Card>
            <StepHeader n={1} title="Choose a clinic" done={!!clinic} icon={<Building2 className="h-5 w-5 text-brand-600" />} />
            {clinic ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{clinic.name}</p>
                  <p className="truncate text-sm text-ink-muted">
                    <MapPin className="mr-1 inline h-3.5 w-3.5" />{clinic.town || clinic.address}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={resetClinic}>Change</Button>
              </div>
            ) : preQ.isLoading ? (
              <div className="py-6 text-center"><Spinner className="mx-auto" /></div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    placeholder="Search clinics by name or town…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {clinicsQ.isLoading ? (
                    <div className="py-4 text-center"><Spinner className="mx-auto" /></div>
                  ) : clinicsQ.isError ? (
                    <ErrorState message="Could not load clinics." onRetry={() => clinicsQ.refetch()} />
                  ) : (clinicsQ.data ?? []).length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-muted">No clinics found.</p>
                  ) : (
                    (clinicsQ.data ?? []).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setClinic(c); setService(''); setSlot(''); }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border p-3 text-left transition hover:border-brand-300 hover:bg-brand-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{c.name}</p>
                          <p className="truncate text-xs text-ink-muted">
                            <MapPin className="mr-1 inline h-3 w-3" />{c.town || c.address}
                          </p>
                        </div>
                        {c.emergency_available && <Badge className="bg-rose-50 text-rose-700">Emergency</Badge>}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </Card>

          {/* Step 2 — animal */}
          <Card>
            <StepHeader n={2} title="Choose your animal" done={!!animalId} icon={<PawPrint className="h-5 w-5 text-brand-600" />} />
            {animalsQ.isLoading ? (
              <div className="py-4 text-center"><Spinner className="mx-auto" /></div>
            ) : animals.length === 0 ? (
              <EmptyState
                icon={<PawPrint className="h-6 w-6" />}
                title="No animals yet"
                description="Add an animal before booking an appointment."
                action={<Button onClick={() => navigate('/app/animals')}>Add animal</Button>}
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {animals.map((a) => {
                  const selected = a.id === animalId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAnimalId(a.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        selected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-border hover:border-brand-300'
                      }`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <SpeciesIcon species={a.species} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{a.name}</p>
                        <p className="truncate text-xs text-ink-muted">{pretty(a.species)}{a.breed ? ` · ${a.breed}` : ''}</p>
                      </div>
                      {selected && <Check className="ml-auto h-5 w-5 text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Step 3 — service */}
          <Card>
            <StepHeader n={3} title="Choose a service" done={!!service} icon={<Stethoscope className="h-5 w-5 text-brand-600" />} />
            {!clinic ? (
              <p className="text-sm text-ink-muted">Pick a clinic first to see its services.</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-ink-muted">This clinic has not listed any services.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setService(s); setSlot(''); }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      service === s ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Step 4 & 5 — date + slot */}
          <Card>
            <StepHeader n={4} title="Pick a date & time" done={!!slot} icon={<CalendarDays className="h-5 w-5 text-brand-600" />} />
            {!clinic || !service ? (
              <p className="text-sm text-ink-muted">Choose a clinic and service to see available times.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="bk-date" className="label">Date</label>
                  <input
                    id="bk-date" type="date" min={todayStr()} value={date}
                    onChange={(e) => { setDate(e.target.value); setSlot(''); }}
                    className="input"
                  />
                </div>

                {slotsQ.isLoading ? (
                  <div className="py-4 text-center"><Spinner className="mx-auto" /></div>
                ) : slotsQ.isError ? (
                  <ErrorState message="Could not load times." onRetry={() => slotsQ.refetch()} />
                ) : slots.length === 0 ? (
                  <p className="py-2 text-sm text-ink-muted">
                    <Clock className="mr-1 inline h-4 w-4" />No available times for this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => (
                      <button
                        key={s.start_time}
                        onClick={() => setSlot(s.start_time)}
                        className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                          slot === s.start_time
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-border text-ink hover:border-brand-300 hover:bg-brand-50'
                        }`}
                      >
                        {s.start_time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Summary / submit */}
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="lg:sticky lg:top-6">
              <h3 className="mb-3 text-base font-semibold text-ink">Summary</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Clinic" value={clinic?.name} />
                <Row label="Animal" value={animals.find((a) => a.id === animalId)?.name} />
                <Row label="Service" value={service} />
                <Row label="Date" value={date ? format(new Date(date), 'EEE, d MMM yyyy') : undefined} />
                <Row label="Time" value={slot ? slot.slice(0, 5) : undefined} />
              </dl>
              <Button
                block
                className="mt-5"
                loading={bookM.isPending}
                disabled={!canSubmit}
                onClick={() => bookM.mutate()}
              >
                Confirm booking
              </Button>
              {!canSubmit && (
                <p className="mt-2 text-center text-xs text-ink-muted">Complete all steps to confirm.</p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`text-right font-medium ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || '—'}</dd>
    </div>
  );
}
