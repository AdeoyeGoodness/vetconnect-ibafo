import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { Building2, MessageSquareReply, Send, MessageCircle } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Textarea, Stars, StatusPill, SkeletonCard, EmptyState } from '@/components/ui';
import type { Review } from '@/types';
import { PageShell, ErrorState, useMyClinic } from './_shared';

function fmt(d?: string) {
  if (!d) return '';
  const dt = parseISO(d);
  return isValid(dt) ? format(dt, 'd MMM yyyy') : d;
}

function ReplyForm({ review, clinicId }: { review: Review; clinicId: string }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ body: string }>({
    defaultValues: { body: '' },
  });

  const replyM = useMutation({
    mutationFn: (v: { body: string }) => api.post(`/reviews/${review.id}/response`, { body: v.body.trim() }),
    onSuccess: () => {
      toast.success('Reply posted');
      reset({ body: '' });
      qc.invalidateQueries({ queryKey: ['reviews', clinicId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not post reply'),
  });

  if (review.response) {
    return (
      <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <MessageSquareReply className="h-3.5 w-3.5" /> Your response
          <span className="font-normal text-ink-muted">· {fmt(review.response.created_at)}</span>
        </p>
        <p className="whitespace-pre-line text-sm text-ink-soft">{review.response.body}</p>
      </div>
    );
  }

  return (
    <form className="mt-3 space-y-2" onSubmit={handleSubmit((v) => replyM.mutate(v))}>
      <Textarea
        placeholder="Write a public reply to this review…"
        className="min-h-[72px]"
        error={errors.body?.message}
        {...register('body', { required: 'Write a reply first', minLength: { value: 2, message: 'Reply is too short' } })}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" icon={<Send className="h-4 w-4" />} loading={replyM.isPending}>
          Post reply
        </Button>
      </div>
    </form>
  );
}

export default function ClinicReviewsPage() {
  const { data: clinic, isLoading: clinicLoading } = useMyClinic();
  const clinicId = clinic?.id;
  const [lightbox, setLightbox] = useState<string | null>(null);

  const reviewsQ = useQuery({
    queryKey: ['reviews', clinicId],
    queryFn: () => unwrap<Review[]>(api.get('/reviews', { params: { clinic_id: clinicId } })),
    enabled: !!clinicId,
  });

  const reviews = reviewsQ.data ?? [];
  const sorted = useMemo(
    () => [...reviews].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
    [reviews]
  );

  const avg = useMemo(() => {
    if (!reviews.length) return clinic?.rating_avg ?? 0;
    return reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  }, [reviews, clinic]);

  if (clinicLoading) {
    return (
      <PageShell title="Reviews">
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </PageShell>
    );
  }

  if (!clinic) {
    return (
      <PageShell title="Reviews">
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Register your clinic first</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Once your clinic is live, pet owners can leave reviews you can respond to here.
            </p>
          </div>
          <Link to="/clinic/profile"><Button icon={<Building2 className="h-4 w-4" />}>Register your clinic</Button></Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Reviews" subtitle="See what pet owners are saying and respond publicly.">
      {/* Rating header */}
      <Card className="mb-6 flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-start sm:gap-6 sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-4xl font-bold leading-none text-ink">{Number(avg || 0).toFixed(1)}</span>
          <Stars value={avg} size={18} />
        </div>
        <div className="h-px w-16 bg-line sm:h-12 sm:w-px" />
        <p className="text-sm text-ink-muted">
          Based on <strong className="text-ink">{reviews.length || clinic.rating_count || 0}</strong>{' '}
          {(reviews.length || clinic.rating_count || 0) === 1 ? 'review' : 'reviews'}
        </p>
      </Card>

      {reviewsQ.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : reviewsQ.isError ? (
        <ErrorState message="Could not load reviews." onRetry={() => reviewsQ.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title="No reviews yet"
          description="When owners review your clinic, they'll appear here for you to respond to."
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{r.author_name || 'Anonymous'}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Stars value={r.rating} size={14} />
                    <span className="text-xs text-ink-muted">{fmt(r.created_at)}</span>
                  </div>
                </div>
                {r.status !== 'PUBLISHED' && <StatusPill status={r.status} />}
              </div>

              {r.body && <p className="whitespace-pre-line text-sm text-ink-soft">{r.body}</p>}

              {r.images?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(src)}
                      className="overflow-hidden rounded-xl border border-line transition hover:opacity-90"
                    >
                      <img src={src} alt={`Review photo ${i + 1}`} className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <ReplyForm review={r} clinicId={clinicId!} />
            </Card>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <img src={lightbox} alt="Review photo" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </PageShell>
  );
}
