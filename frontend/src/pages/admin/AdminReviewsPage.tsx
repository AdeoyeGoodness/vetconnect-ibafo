import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { MessageSquare, Check, EyeOff, Flag, Trash2, Building2 } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Stars, StatusPill, SkeletonCard, EmptyState, Spinner } from '@/components/ui';
import type { Review, ReviewStatus } from '@/types';
import { PageShell, ErrorState, ConfirmDialog, FilterTabs } from './_shared';

const TABS: { value: ReviewStatus; label: string; highlight?: boolean }[] = [
  { value: 'PENDING', label: 'Pending', highlight: true },
  { value: 'FLAGGED', label: 'Flagged', highlight: true },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'HIDDEN', label: 'Hidden' },
];

interface ReviewWithClinic extends Review {
  clinic_name?: string | null;
  clinic?: { name?: string | null } | null;
}

function clinicName(r: ReviewWithClinic) {
  return r.clinic_name ?? r.clinic?.name ?? 'Clinic';
}

export default function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') as ReviewStatus) || 'PENDING';
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<ReviewWithClinic | null>(null);

  const setTab = (t: ReviewStatus) => setParams(t === 'PENDING' ? {} : { status: t });

  const reviewsQ = useQuery({
    queryKey: ['admin', 'reviews', { tab }],
    queryFn: () => unwrap<ReviewWithClinic[]>(api.get('/reviews', { params: { status: tab } })),
  });

  const moderateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      api.patch(`/reviews/${id}/moderate`, { status }),
    onSuccess: (_d, v) => {
      toast.success(`Review ${v.status.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/reviews/${id}`),
    onSuccess: () => {
      toast.success('Review deleted');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = reviewsQ.data ?? [];

  return (
    <PageShell
      title="Review moderation"
      subtitle="Approve, hide, flag or remove clinic reviews"
      actions={reviewsQ.isFetching ? <Spinner className="h-5 w-5" /> : undefined}
    >
      <div className="mb-5">
        <FilterTabs value={tab} options={TABS} onChange={setTab} />
      </div>

      {reviewsQ.isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : reviewsQ.isError ? (
        <ErrorState message="Could not load reviews." onRetry={() => reviewsQ.refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title={`No ${tab.toLowerCase()} reviews`}
          description="Nothing to moderate in this queue right now."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const busy = moderateMut.isPending && moderateMut.variables?.id === r.id;
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
                      <Building2 className="h-4 w-4 text-brand-600" /> {clinicName(r)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      by {r.author_name || 'Anonymous'}
                      {r.created_at ? ` · ${(() => { try { return format(parseISO(r.created_at), 'd MMM yyyy'); } catch { return ''; } })()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating ?? 0} size={15} showValue />
                    <StatusPill status={r.status} />
                  </div>
                </div>

                {r.body && <p className="whitespace-pre-line text-sm text-ink-soft">{r.body}</p>}

                {r.images && r.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={src}
                          alt={`Review image ${i + 1}`}
                          className="h-20 w-20 rounded-xl border border-line object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {r.status !== 'PUBLISHED' && (
                    <Button size="sm" variant="secondary" icon={<Check className="h-4 w-4" />} loading={busy}
                      onClick={() => moderateMut.mutate({ id: r.id, status: 'PUBLISHED' })}>
                      Publish
                    </Button>
                  )}
                  {r.status !== 'HIDDEN' && (
                    <Button size="sm" variant="ghost" icon={<EyeOff className="h-4 w-4" />} loading={busy}
                      onClick={() => moderateMut.mutate({ id: r.id, status: 'HIDDEN' })}>
                      Hide
                    </Button>
                  )}
                  {r.status !== 'FLAGGED' && (
                    <Button size="sm" variant="ghost" icon={<Flag className="h-4 w-4" />} loading={busy}
                      onClick={() => moderateMut.mutate({ id: r.id, status: 'FLAGGED' })}>
                      Flag
                    </Button>
                  )}
                  <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} className="ml-auto"
                    onClick={() => setToDelete(r)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
        title="Delete review"
        confirmLabel="Delete review"
        message="Permanently delete this review? This action cannot be undone."
      />
    </PageShell>
  );
}
