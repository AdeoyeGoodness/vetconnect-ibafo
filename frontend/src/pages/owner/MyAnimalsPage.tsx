import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, PawPrint, Scale, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Textarea, Select, Badge, SkeletonCard, EmptyState } from '@/components/ui';
import type { Animal } from '@/types';
import {
  PageShell, Modal, ConfirmDialog, ErrorState,
  SPECIES, GENDERS, SpeciesIcon, pretty, animalAge,
} from './_shared';

interface AnimalForm {
  name: string;
  species: string;
  breed: string;
  gender: string;
  date_of_birth: string;
  age_years: string;
  weight_kg: string;
  color: string;
  vaccination_status: string;
  medical_notes: string;
  photo_url: string;
}

const EMPTY: AnimalForm = {
  name: '', species: 'DOG', breed: '', gender: 'UNKNOWN', date_of_birth: '',
  age_years: '', weight_kg: '', color: '', vaccination_status: '', medical_notes: '', photo_url: '',
};

const card = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

function toPayload(v: AnimalForm) {
  return {
    name: v.name.trim(),
    species: v.species,
    breed: v.breed.trim() || null,
    gender: v.gender,
    date_of_birth: v.date_of_birth || null,
    age_years: v.age_years === '' ? null : Number(v.age_years),
    weight_kg: v.weight_kg === '' ? null : Number(v.weight_kg),
    color: v.color.trim() || null,
    vaccination_status: v.vaccination_status.trim() || null,
    medical_notes: v.medical_notes.trim() || null,
    photo_url: v.photo_url.trim() || null,
  };
}

export default function MyAnimalsPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Animal | null>(null);
  const [toDelete, setToDelete] = useState<Animal | null>(null);

  const animalsQ = useQuery({
    queryKey: ['animals'],
    queryFn: () => unwrap<Animal[]>(api.get('/animals')),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AnimalForm>({ defaultValues: EMPTY });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(a: Animal) {
    setEditing(a);
    reset({
      name: a.name ?? '',
      species: a.species ?? 'DOG',
      breed: a.breed ?? '',
      gender: a.gender ?? 'UNKNOWN',
      date_of_birth: a.date_of_birth ? a.date_of_birth.slice(0, 10) : '',
      age_years: a.age_years != null ? String(a.age_years) : '',
      weight_kg: a.weight_kg != null ? String(a.weight_kg) : '',
      color: a.color ?? '',
      vaccination_status: a.vaccination_status ?? '',
      medical_notes: a.medical_notes ?? '',
      photo_url: a.photo_url ?? '',
    });
    setFormOpen(true);
  }

  const saveM = useMutation({
    mutationFn: (v: AnimalForm) =>
      editing
        ? unwrap<Animal>(api.put(`/animals/${editing.id}`, toPayload(v)))
        : unwrap<Animal>(api.post('/animals', toPayload(v))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] });
      toast.success(editing ? 'Animal updated' : 'Animal added');
      setFormOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save animal'),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.delete(`/animals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] });
      toast.success('Animal removed');
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove animal'),
  });

  const animals = animalsQ.data ?? [];

  return (
    <PageShell
      title="My animals"
      subtitle="Manage your animals' details, ages and health records."
      actions={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add animal</Button>}
    >
      {animalsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : animalsQ.isError ? (
        <ErrorState message="Could not load your animals." onRetry={() => animalsQ.refetch()} />
      ) : animals.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="h-6 w-6" />}
          title="No animals yet"
          description="Add your first animal to start booking appointments and tracking vaccinations."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add animal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {animals.map((a, i) => (
            <motion.div key={a.id} custom={i} variants={card} initial="hidden" animate="show">
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-start gap-3">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt={a.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                      <SpeciesIcon species={a.species} className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-ink">{a.name}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {pretty(a.species)}{a.breed ? ` · ${a.breed}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">{animalAge(a)} · {pretty(a.gender)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  {a.weight_kg != null && (
                    <span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-3.5" />{a.weight_kg} kg</span>
                  )}
                  {a.color && (
                    <span className="inline-flex items-center gap-1"><Palette className="h-3.5 w-3.5" />{a.color}</span>
                  )}
                </div>

                {a.vaccination_status && <Badge>{a.vaccination_status}</Badge>}

                <div className="mt-auto flex gap-2 pt-1">
                  <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(a)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add an animal'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveM.isPending}>Cancel</Button>
            <Button form="animal-form" type="submit" loading={saveM.isPending}>
              {editing ? 'Save changes' : 'Add animal'}
            </Button>
          </>
        }
      >
        <form id="animal-form" className="space-y-4" onSubmit={handleSubmit((v) => saveM.mutate(v))}>
          <Input
            label="Name" id="name"
            placeholder="e.g. Bella"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Species" id="species" {...register('species')}>
              {SPECIES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
            </Select>
            <Select label="Gender" id="gender" {...register('gender')}>
              {GENDERS.map((g) => <option key={g} value={g}>{pretty(g)}</option>)}
            </Select>
          </div>
          <Input label="Breed" id="breed" placeholder="e.g. German Shepherd" {...register('breed')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Date of birth" id="date_of_birth" type="date" {...register('date_of_birth')} />
            <Input label="Age (years)" id="age_years" type="number" min={0} step={1} placeholder="Optional" {...register('age_years')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Weight (kg)" id="weight_kg" type="number" min={0} step="0.1" placeholder="Optional" {...register('weight_kg')} />
            <Input label="Color" id="color" placeholder="e.g. Brown" {...register('color')} />
          </div>
          <Input label="Vaccination status" id="vaccination_status" placeholder="e.g. Up to date" {...register('vaccination_status')} />
          <Input label="Photo URL" id="photo_url" type="url" placeholder="https://…" {...register('photo_url')} />
          <Textarea label="Medical notes" id="medical_notes" placeholder="Allergies, conditions, etc." {...register('medical_notes')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteM.mutate(toDelete.id)}
        loading={deleteM.isPending}
        title="Remove animal"
        confirmLabel="Remove"
        message={<>Are you sure you want to remove <strong>{toDelete?.name}</strong>? This also removes its records and cannot be undone.</>}
      />
    </PageShell>
  );
}
