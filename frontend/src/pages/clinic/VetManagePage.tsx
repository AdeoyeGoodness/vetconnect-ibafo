import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Stethoscope, Building2, BadgeCheck, Info,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Textarea, StatusPill, SkeletonCard, EmptyState } from '@/components/ui';
import type { Veterinarian } from '@/types';
import { PageShell, Modal, ErrorState, useMyClinic } from './_shared';

interface VetForm {
  full_name: string;
  license_number: string;
  specialization: string;
  bio: string;
  photo_url: string;
}

const EMPTY: VetForm = { full_name: '', license_number: '', specialization: '', bio: '', photo_url: '' };

const card = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

export default function VetManagePage() {
  const qc = useQueryClient();
  const { data: clinic, isLoading: clinicLoading } = useMyClinic();
  const clinicId = clinic?.id;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Veterinarian | null>(null);
  const [toDelete, setToDelete] = useState<Veterinarian | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VetForm>({ defaultValues: EMPTY });

  const vetsQ = useQuery({
    queryKey: ['veterinarians', clinicId],
    queryFn: () => unwrap<Veterinarian[]>(api.get('/veterinarians', { params: { clinic_id: clinicId } })),
    enabled: !!clinicId,
  });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(v: Veterinarian) {
    setEditing(v);
    reset({
      full_name: v.full_name ?? '',
      license_number: v.license_number ?? '',
      specialization: v.specialization ?? '',
      bio: v.bio ?? '',
      photo_url: v.photo_url ?? '',
    });
    setFormOpen(true);
  }

  const saveM = useMutation({
    mutationFn: (v: VetForm) => {
      const payload = {
        clinic_id: clinicId,
        full_name: v.full_name.trim(),
        license_number: v.license_number.trim() || null,
        specialization: v.specialization.trim() || null,
        bio: v.bio.trim() || null,
        photo_url: v.photo_url.trim() || null,
      };
      return editing
        ? unwrap<Veterinarian>(api.put(`/veterinarians/${editing.id}`, payload))
        : unwrap<Veterinarian>(api.post('/veterinarians', payload));
    },
    onSuccess: () => {
      toast.success(editing ? 'Veterinarian updated' : 'Veterinarian added');
      qc.invalidateQueries({ queryKey: ['veterinarians', clinicId] });
      setFormOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save veterinarian'),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.delete(`/veterinarians/${id}`),
    onSuccess: () => {
      toast.success('Veterinarian removed');
      qc.invalidateQueries({ queryKey: ['veterinarians', clinicId] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not remove veterinarian'),
  });

  if (clinicLoading) {
    return (
      <PageShell title="Veterinarians">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </PageShell>
    );
  }

  if (!clinic) {
    return (
      <PageShell title="Veterinarians">
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Register your clinic first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Add your clinic profile before listing the vets who work there.
            </p>
          </div>
          <Link to="/clinic/profile"><Button icon={<Building2 className="h-4 w-4" />}>Register your clinic</Button></Link>
        </Card>
      </PageShell>
    );
  }

  const vets = vetsQ.data ?? [];

  return (
    <PageShell
      title="Veterinarians"
      subtitle="Manage the vets on your team. Verification is handled by the VetConnect admin."
      actions={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add veterinarian</Button>}
    >
      <p className="mb-5 flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2 text-sm text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-600" />
        New veterinarians start as <strong>Pending</strong>. The system admin verifies their license before they're marked verified.
      </p>

      {vetsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : vetsQ.isError ? (
        <ErrorState message="Could not load veterinarians." onRetry={() => vetsQ.refetch()} />
      ) : vets.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No veterinarians yet"
          description="Add the vets who work at your clinic so owners know who they'll see."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add veterinarian</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vets.map((v, i) => (
            <motion.div key={v.id} custom={i} variants={card} initial="hidden" animate="show">
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-start gap-3">
                  {v.photo_url ? (
                    <img src={v.photo_url} alt={v.full_name} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-lg font-semibold text-ink">
                      {v.full_name}
                      {v.status === 'VERIFIED' && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />}
                    </p>
                    {v.specialization && <p className="truncate text-sm text-ink-muted">{v.specialization}</p>}
                    <div className="mt-1"><StatusPill status={v.status} /></div>
                  </div>
                </div>

                {v.license_number && (
                  <p className="text-xs text-ink-muted">License: <span className="font-medium text-ink-soft">{v.license_number}</span></p>
                )}
                {v.bio && <p className="line-clamp-3 text-sm text-ink-soft">{v.bio}</p>}

                <div className="mt-auto flex gap-2 pt-1">
                  <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(v)}>Edit</Button>
                  <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(v)}>Delete</Button>
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
        title={editing ? `Edit ${editing.full_name}` : 'Add a veterinarian'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveM.isPending}>Cancel</Button>
            <Button form="vet-form" type="submit" loading={saveM.isPending}>
              {editing ? 'Save changes' : 'Add veterinarian'}
            </Button>
          </>
        }
      >
        <form id="vet-form" className="space-y-4" onSubmit={handleSubmit((v) => saveM.mutate(v))}>
          <Input
            label="Full name" id="full_name" placeholder="e.g. Dr. Ada Okafor"
            error={errors.full_name?.message}
            {...register('full_name', { required: 'Full name is required' })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="License number" id="license_number" placeholder="e.g. VCN/2021/0456" {...register('license_number')} />
            <Input label="Specialization" id="specialization" placeholder="e.g. Surgery" {...register('specialization')} />
          </div>
          <Input label="Photo URL" id="photo_url" type="url" placeholder="https://…" {...register('photo_url')} />
          <Textarea label="Bio" id="bio" placeholder="A short professional bio." {...register('bio')} />
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remove veterinarian"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleteM.isPending}>Cancel</Button>
            <Button variant="danger" loading={deleteM.isPending} onClick={() => toDelete && deleteM.mutate(toDelete.id)}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Remove <strong>{toDelete?.full_name}</strong> from your clinic? This can't be undone.
        </p>
      </Modal>
    </PageShell>
  );
}
