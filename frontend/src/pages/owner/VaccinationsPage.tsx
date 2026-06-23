import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Plus, Syringe, Pencil, Trash2, CheckCircle2, AlertTriangle, PawPrint } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Textarea, SkeletonCard, EmptyState, StatusPill } from '@/components/ui';
import type { Animal, Vaccination } from '@/types';
import { PageShell, Modal, ConfirmDialog, ErrorState, SpeciesIcon, pretty } from './_shared';

interface VaxForm {
  vaccine_name: string;
  due_date: string;
  reminder_date: string;
  notes: string;
}

const EMPTY: VaxForm = { vaccine_name: '', due_date: '', reminder_date: '', notes: '' };
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function VaccinationsPage() {
  const qc = useQueryClient();
  const [animalId, setAnimalId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vaccination | null>(null);
  const [toDelete, setToDelete] = useState<Vaccination | null>(null);

  const animalsQ = useQuery({
    queryKey: ['animals'],
    queryFn: () => unwrap<Animal[]>(api.get('/animals')),
  });

  // Auto-select the first animal once loaded.
  useEffect(() => {
    if (!animalId && animalsQ.data?.length) setAnimalId(animalsQ.data[0].id);
  }, [animalsQ.data, animalId]);

  const animals = animalsQ.data ?? [];
  const selected = animals.find((a) => a.id === animalId);

  const allRemindersQ = useQuery({
    queryKey: ['vaccinations', 'all'],
    queryFn: () => unwrap<Vaccination[]>(api.get('/vaccinations')),
  });

  const vaxQ = useQuery({
    queryKey: ['vaccinations', { animal_id: animalId }],
    queryFn: () => unwrap<Vaccination[]>(api.get('/vaccinations', { params: { animal_id: animalId } })),
    enabled: !!animalId,
  });

  const suggestQ = useQuery({
    queryKey: ['vax-suggestions', selected?.species],
    queryFn: () => unwrap<string[]>(api.get('/vaccinations/suggestions', { params: { species: selected!.species } })),
    enabled: formOpen && !!selected,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<VaxForm>({ defaultValues: EMPTY });

  function openCreate() {
    setEditing(null);
    reset({ ...EMPTY, due_date: todayStr() });
    setFormOpen(true);
  }
  function openEdit(v: Vaccination) {
    setEditing(v);
    reset({
      vaccine_name: v.vaccine_name ?? '',
      due_date: v.due_date ? v.due_date.slice(0, 10) : '',
      reminder_date: v.reminder_date ? v.reminder_date.slice(0, 10) : '',
      notes: v.notes ?? '',
    });
    setFormOpen(true);
  }

  const saveM = useMutation({
    mutationFn: (vals: VaxForm) => {
      const payload = {
        animal_id: animalId,
        vaccine_name: vals.vaccine_name.trim(),
        due_date: vals.due_date,
        reminder_date: vals.reminder_date || null,
        notes: vals.notes.trim() || null,
      };
      return editing
        ? unwrap<Vaccination>(api.put(`/vaccinations/${editing.id}`, payload))
        : unwrap<Vaccination>(api.post('/vaccinations', payload));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccinations'] });
      toast.success(editing ? 'Vaccination updated' : 'Vaccination added');
      setFormOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save'),
  });

  const completeM = useMutation({
    mutationFn: (v: Vaccination) =>
      unwrap<Vaccination>(api.put(`/vaccinations/${v.id}`, {
        status: 'COMPLETED',
        administered_date: todayStr(),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccinations'] });
      toast.success('Marked as completed');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update'),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.delete(`/vaccinations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vaccinations'] });
      toast.success('Vaccination removed');
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove'),
  });

  const reminders = (allRemindersQ.data ?? [])
    .filter((v) => v.status === 'DUE' || v.status === 'OVERDUE')
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const vax = (vaxQ.data ?? []).slice().sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''));

  return (
    <PageShell
      title="Vaccinations"
      subtitle="Track your animals' vaccines and never miss a booster."
      actions={
        <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!animalId}>
          Add vaccination
        </Button>
      }
    >
      {/* Reminders across all animals */}
      {!allRemindersQ.isLoading && reminders.length > 0 && (
        <Card className="mb-6 border-rose-200 bg-rose-50/40">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-semibold text-ink">Upcoming reminders</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reminders.map((v) => {
              const animal = animals.find((a) => a.id === v.animal_id);
              return (
                <div key={v.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{v.vaccine_name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {animal?.name ?? 'Animal'} · due {v.due_date ? format(parseISO(v.due_date), 'd MMM') : '—'}
                    </p>
                  </div>
                  <StatusPill status={v.status} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Animal picker */}
      {animalsQ.isLoading ? (
        <SkeletonCard />
      ) : animalsQ.isError ? (
        <ErrorState message="Could not load your animals." onRetry={() => animalsQ.refetch()} />
      ) : animals.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-6 w-6" />}
          title="No animals yet"
          description="Add an animal to start tracking vaccinations."
          action={<Button onClick={() => (window.location.href = '/app/animals')}>Add animal</Button>}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {animals.map((a) => {
              const active = a.id === animalId;
              return (
                <button
                  key={a.id}
                  onClick={() => setAnimalId(a.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active ? 'bg-brand-600 text-white shadow-sm' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  <SpeciesIcon species={a.species} className="h-4 w-4" />
                  {a.name}
                </button>
              );
            })}
          </div>

          {vaxQ.isLoading ? (
            <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
          ) : vaxQ.isError ? (
            <ErrorState message="Could not load vaccinations." onRetry={() => vaxQ.refetch()} />
          ) : vax.length === 0 ? (
            <EmptyState
              icon={<Syringe className="h-6 w-6" />}
              title="No vaccinations recorded"
              description={`Add a vaccination record for ${selected?.name ?? 'this animal'}.`}
              action={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add vaccination</Button>}
            />
          ) : (
            <div className="space-y-3">
              {vax.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.28 }}
                >
                  <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Syringe className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{v.vaccine_name}</p>
                        <p className="text-xs text-ink-muted">
                          Due {v.due_date ? format(parseISO(v.due_date), 'd MMM yyyy') : '—'}
                          {v.administered_date && ` · given ${format(parseISO(v.administered_date), 'd MMM yyyy')}`}
                        </p>
                        {v.notes && <p className="mt-0.5 truncate text-xs text-ink-muted">{v.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <StatusPill status={v.status} />
                      {v.status !== 'COMPLETED' && (
                        <Button
                          variant="secondary" size="sm"
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          loading={completeM.isPending && completeM.variables?.id === v.id}
                          onClick={() => completeM.mutate(v)}
                        >
                          Mark done
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(v)} />
                      <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(v)} />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit vaccination' : `Add vaccination${selected ? ` · ${selected.name}` : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveM.isPending}>Cancel</Button>
            <Button form="vax-form" type="submit" loading={saveM.isPending}>{editing ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        <form id="vax-form" className="space-y-4" onSubmit={handleSubmit((v) => saveM.mutate(v))}>
          <Input
            label="Vaccine name" id="vaccine_name"
            placeholder="e.g. Rabies"
            list="vax-suggestions"
            error={errors.vaccine_name?.message}
            {...register('vaccine_name', { required: 'Vaccine name is required' })}
          />
          <datalist id="vax-suggestions">
            {(suggestQ.data ?? []).map((s) => <option key={s} value={s} />)}
          </datalist>

          {(suggestQ.data ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestQ.data!.map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setValue('vaccine_name', s, { shouldValidate: true })}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Due date" id="due_date" type="date"
              error={errors.due_date?.message}
              {...register('due_date', { required: 'Due date is required' })}
            />
            <Input label="Reminder date" id="reminder_date" type="date" {...register('reminder_date')} />
          </div>
          <Textarea label="Notes" id="notes" placeholder="Optional notes" {...register('notes')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        loading={deleteM.isPending}
        title="Remove vaccination"
        confirmLabel="Remove"
        message={<>Remove the <strong>{toDelete?.vaccine_name}</strong> record? This cannot be undone.</>}
      />
    </PageShell>
  );
}
