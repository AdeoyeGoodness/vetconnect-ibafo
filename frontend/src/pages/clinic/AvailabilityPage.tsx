import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Clock, Building2, Save, CalendarOff, Plus, Trash2, Info, Ban,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Select, SkeletonCard, EmptyState } from '@/components/ui';
import { PageShell, Modal, ErrorState, useMyClinic, DAYS } from './_shared';

interface AvailabilityRow {
  id?: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  break_start?: string | null;
  break_end?: string | null;
  slot_minutes: number;
}

interface BlockedDate {
  id: string;
  specific_date: string;
  reason?: string | null;
}

interface AvailabilityResponse {
  hours?: AvailabilityRow[];
  blocks?: BlockedDate[];
}

interface DayState {
  enabled: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
  slot_minutes: string;
}

const SLOT_CHOICES = [15, 20, 30, 45, 60];

function defaultDay(): DayState {
  return { enabled: false, open_time: '09:00', close_time: '17:00', break_start: '', break_end: '', slot_minutes: '30' };
}

function fmtBlockDate(d: string) {
  const dt = parseISO(d);
  return isValid(dt) ? format(dt, 'EEE, d MMM yyyy') : d;
}

export default function AvailabilityPage() {
  const qc = useQueryClient();
  const { data: clinic, isLoading: clinicLoading } = useMyClinic();
  const clinicId = clinic?.id;

  const [week, setWeek] = useState<DayState[]>(() => Array.from({ length: 7 }, defaultDay));
  const [confirmBlock, setConfirmBlock] = useState<BlockedDate | null>(null);

  const availQ = useQuery({
    queryKey: ['availability', clinicId],
    queryFn: () =>
      unwrap<AvailabilityResponse | AvailabilityRow[]>(
        api.get('/availability', { params: { clinic_id: clinicId } })
      ),
    enabled: !!clinicId,
  });

  // Hydrate the editor from server data.
  const hours = useMemo<AvailabilityRow[]>(() => {
    const d = availQ.data;
    if (!d) return [];
    return Array.isArray(d) ? d : d.hours ?? [];
  }, [availQ.data]);

  const blocks = useMemo<BlockedDate[]>(() => {
    const d = availQ.data;
    if (!d || Array.isArray(d)) return [];
    return d.blocks ?? [];
  }, [availQ.data]);

  useEffect(() => {
    if (!availQ.data) return;
    const next = Array.from({ length: 7 }, defaultDay);
    hours.forEach((h) => {
      const i = h.day_of_week;
      if (i < 0 || i > 6) return;
      next[i] = {
        enabled: true,
        open_time: (h.open_time ?? '09:00').slice(0, 5),
        close_time: (h.close_time ?? '17:00').slice(0, 5),
        break_start: h.break_start ? h.break_start.slice(0, 5) : '',
        break_end: h.break_end ? h.break_end.slice(0, 5) : '',
        slot_minutes: String(h.slot_minutes ?? 30),
      };
    });
    setWeek(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availQ.data]);

  function patchDay(i: number, patch: Partial<DayState>) {
    setWeek((w) => w.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  const saveM = useMutation({
    mutationFn: () => {
      const payload = week
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.enabled)
        .map(({ d, i }) => ({
          day_of_week: i,
          open_time: d.open_time,
          close_time: d.close_time,
          break_start: d.break_start || null,
          break_end: d.break_end || null,
          slot_minutes: Number(d.slot_minutes) || 30,
        }));
      return api.put(`/availability/${clinicId}`, payload);
    },
    onSuccess: () => {
      toast.success('Weekly schedule saved');
      qc.invalidateQueries({ queryKey: ['availability', clinicId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save schedule'),
  });

  // ── Blocked dates form ──
  const blockForm = useForm<{ specific_date: string; reason: string }>({
    defaultValues: { specific_date: '', reason: '' },
  });

  const addBlockM = useMutation({
    mutationFn: (v: { specific_date: string; reason: string }) =>
      api.post(`/availability/${clinicId}/block`, {
        specific_date: v.specific_date,
        reason: v.reason.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Date blocked');
      blockForm.reset({ specific_date: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['availability', clinicId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not block date'),
  });

  const removeBlockM = useMutation({
    mutationFn: (id: string) => api.delete(`/availability/block/${id}`),
    onSuccess: () => {
      toast.success('Block removed');
      setConfirmBlock(null);
      qc.invalidateQueries({ queryKey: ['availability', clinicId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove block'),
  });

  if (clinicLoading) {
    return (
      <PageShell title="Availability">
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </PageShell>
    );
  }

  if (!clinic) {
    return (
      <PageShell title="Availability">
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Register your clinic first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Set up your clinic before configuring your weekly availability.
            </p>
          </div>
          <Link to="/clinic/profile"><Button icon={<Building2 className="h-4 w-4" />}>Register your clinic</Button></Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Availability"
      subtitle="Set the hours pet owners can book, and block off holidays."
      actions={<Button icon={<Save className="h-4 w-4" />} loading={saveM.isPending} onClick={() => saveM.mutate()}>Save schedule</Button>}
    >
      {availQ.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : availQ.isError ? (
        <ErrorState message="Could not load availability." onRetry={() => availQ.refetch()} />
      ) : (
        <div className="space-y-8">
          {/* Weekly schedule */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
              <Clock className="h-5 w-5 text-brand-600" /> Weekly schedule
            </h2>
            <div className="space-y-3">
              {DAYS.map((dayName, i) => {
                const d = week[i];
                return (
                  <Card key={dayName} className={`p-4 transition ${d.enabled ? '' : 'opacity-70'}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* Day + toggle */}
                      <label className="flex w-40 shrink-0 cursor-pointer items-center gap-3 font-medium text-ink">
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-line text-brand-600 focus:ring-brand-500"
                          checked={d.enabled}
                          onChange={(e) => patchDay(i, { enabled: e.target.checked })}
                        />
                        {dayName}
                      </label>

                      {d.enabled ? (
                        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <Input label="Open" type="time" value={d.open_time} onChange={(e) => patchDay(i, { open_time: e.target.value })} />
                          <Input label="Close" type="time" value={d.close_time} onChange={(e) => patchDay(i, { close_time: e.target.value })} />
                          <Input label="Break start" type="time" value={d.break_start} onChange={(e) => patchDay(i, { break_start: e.target.value })} />
                          <Input label="Break end" type="time" value={d.break_end} onChange={(e) => patchDay(i, { break_end: e.target.value })} />
                          <Select label="Slot (min)" value={d.slot_minutes} onChange={(e) => patchDay(i, { slot_minutes: e.target.value })}>
                            {SLOT_CHOICES.map((s) => <option key={s} value={s}>{s} min</option>)}
                          </Select>
                        </div>
                      ) : (
                        <p className="flex-1 text-sm text-ink-muted">Closed — owners can't book on this day.</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Blocked dates */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarOff className="h-5 w-5 text-brand-600" /> Blocked dates &amp; holidays
            </h2>
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2 text-sm text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-600" />
              Blocking a date prevents all bookings on that day, even within your weekly hours — perfect for public holidays or closures.
            </p>

            <Card className="mb-4">
              <form
                className="grid gap-3 sm:grid-cols-[auto,1fr,auto] sm:items-end"
                onSubmit={blockForm.handleSubmit((v) => addBlockM.mutate(v))}
              >
                <Input
                  label="Date" type="date"
                  error={blockForm.formState.errors.specific_date?.message}
                  {...blockForm.register('specific_date', { required: 'Pick a date' })}
                />
                <Input label="Reason (optional)" placeholder="e.g. Public holiday" {...blockForm.register('reason')} />
                <Button type="submit" icon={<Plus className="h-4 w-4" />} loading={addBlockM.isPending}>Block date</Button>
              </form>
            </Card>

            {blocks.length === 0 ? (
              <EmptyState
                icon={<Ban className="h-6 w-6" />}
                title="No blocked dates"
                description="Add a date above to close your clinic for a holiday or special day."
              />
            ) : (
              <div className="space-y-2">
                {[...blocks]
                  .sort((a, b) => (a.specific_date || '').localeCompare(b.specific_date || ''))
                  .map((b) => (
                    <Card key={b.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                          <CalendarOff className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-ink">{fmtBlockDate(b.specific_date)}</p>
                          {b.reason && <p className="text-xs text-ink-muted">{b.reason}</p>}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setConfirmBlock(b)}
                      >
                        Remove
                      </Button>
                    </Card>
                  ))}
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        open={!!confirmBlock}
        onClose={() => setConfirmBlock(null)}
        title="Remove blocked date"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmBlock(null)} disabled={removeBlockM.isPending}>Cancel</Button>
            <Button variant="danger" loading={removeBlockM.isPending} onClick={() => confirmBlock && removeBlockM.mutate(confirmBlock.id)}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Unblock <strong>{confirmBlock && fmtBlockDate(confirmBlock.specific_date)}</strong>? Owners will be able to book on this day again.
        </p>
      </Modal>
    </PageShell>
  );
}
