import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Mail, Clock, Siren, CalendarPlus, Stethoscope, PawPrint,
  ArrowLeft, BadgeCheck, MessageSquare,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import type { Clinic, Veterinarian, Review } from '@/types';
import { useAuthStore } from '@/store/authStore';
import {
  Button, Stars, Badge, PageLoader, EmptyState, StatusPill,
} from '@/components/ui';
import MapView from '@/components/MapView';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1400&q=70';

// Clinic profile may embed vets + recent reviews from the single-clinic endpoint.
type ClinicDetail = Clinic & {
  veterinarians?: Veterinarian[];
  reviews?: Review[];
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export default function ClinicProfilePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const clinicQ = useQuery({
    queryKey: ['clinic', slug],
    queryFn: () => unwrap<ClinicDetail>(api.get(`/clinics/${slug}`)),
    enabled: !!slug,
  });

  const clinic = clinicQ.data;

  const reviewsQ = useQuery({
    queryKey: ['reviews', clinic?.id],
    enabled: !!clinic?.id,
    queryFn: () =>
      unwrap<Review[]>(api.get('/reviews', { params: { clinic_id: clinic!.id } })),
  });

  if (clinicQ.isLoading) return <PageLoader />;

  if (clinicQ.isError || !clinic) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<Stethoscope className="h-7 w-7" />}
          title="Clinic not found"
          description="This clinic may have moved or is no longer listed."
          action={<Link to="/directory"><Button>Back to directory</Button></Link>}
        />
      </div>
    );
  }

  const reviews = reviewsQ.data ?? clinic.reviews ?? [];
  const vets = clinic.veterinarians ?? [];

  const handleBook = () => {
    if (isAuthenticated && user?.role === 'OWNER') {
      navigate(`/app/book/${clinic.slug ?? clinic.id}`);
    } else {
      navigate('/login', { state: { from: `/clinics/${slug}` } });
    }
  };

  return (
    <div className="bg-surface-sunken pb-16">
      {/* Cover */}
      <div className="relative h-52 w-full overflow-hidden bg-brand-900 sm:h-72">
        <img
          src={clinic.cover_url || FALLBACK_COVER}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="container-app absolute inset-x-0 top-4">
          <Link
            to="/directory"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-ink-soft shadow-card backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Directory
          </Link>
        </div>
      </div>

      <div className="container-app">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card -mt-12 flex flex-col gap-4 p-6 sm:-mt-16 sm:flex-row sm:items-start sm:gap-5"
        >
          <img
            src={clinic.logo_url || FALLBACK_COVER}
            alt=""
            className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white object-cover shadow-card sm:h-24 sm:w-24"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{clinic.name}</h1>
              {clinic.emergency_available && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
                  <Siren className="h-3.5 w-3.5" /> 24/7 Emergency
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Stars value={clinic.rating_avg} showValue />
              <span className="text-sm text-ink-muted">{clinic.rating_count} review{clinic.rating_count === 1 ? '' : 's'}</span>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>{clinic.town ? `${clinic.town} · ` : ''}{clinic.address}</span>
            </p>
          </div>
          <div className="sm:self-center">
            <Button size="lg" icon={<CalendarPlus className="h-5 w-5" />} onClick={handleBook} block>
              Book appointment
            </Button>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-8 lg:col-span-2">
            {clinic.description && (
              <section className="card p-6">
                <h2 className="font-display text-lg font-semibold">About this clinic</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{clinic.description}</p>
              </section>
            )}

            {/* Services & animals */}
            <section className="card p-6">
              <h2 className="font-display text-lg font-semibold">Services &amp; animals</h2>
              {clinic.services_offered?.length > 0 && (
                <>
                  <p className="mt-4 text-sm font-medium text-ink-soft">Services offered</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {clinic.services_offered.map((s) => <Badge key={s}>{s}</Badge>)}
                  </div>
                </>
              )}
              {clinic.animal_types?.length > 0 && (
                <>
                  <p className="mt-5 text-sm font-medium text-ink-soft">Animals treated</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {clinic.animal_types.map((a) => (
                      <span key={a} className="chip">
                        <PawPrint className="h-4 w-4 text-brand-600" /> {titleCase(a)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Veterinarians */}
            {vets.length > 0 && (
              <section className="card p-6">
                <h2 className="font-display text-lg font-semibold">Our veterinarians</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {vets.map((v) => (
                    <div key={v.id} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4">
                      <img
                        src={v.photo_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=60'}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 font-semibold text-ink">
                          {v.full_name}
                          {v.status === 'VERIFIED' && <BadgeCheck className="h-4 w-4 text-brand-600" />}
                        </p>
                        {v.specialization && <p className="text-sm text-brand-700">{v.specialization}</p>}
                        {v.bio && <p className="mt-1 text-sm text-ink-muted line-clamp-2">{v.bio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Reviews</h2>
                <Stars value={clinic.rating_avg} showValue />
              </div>

              {reviewsQ.isLoading ? (
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 w-full" />
                  ))}
                </div>
              ) : !reviews.length ? (
                <div className="mt-4">
                  <EmptyState
                    icon={<MessageSquare className="h-7 w-7" />}
                    title="No reviews yet"
                    description="Be the first to share your experience after a visit."
                  />
                </div>
              ) : (
                <ul className="mt-5 space-y-5">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-black/[0.06] pb-5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-ink">{r.author_name || 'Anonymous'}</p>
                          <Stars value={r.rating} size={14} />
                        </div>
                        <time className="text-xs text-ink-muted">
                          {new Date(r.created_at).toLocaleDateString()}
                        </time>
                      </div>
                      {r.body && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.body}</p>}
                      {r.response && (
                        <div className="mt-3 rounded-xl bg-brand-50 p-3">
                          <p className="text-xs font-semibold text-brand-800">Response from the clinic</p>
                          <p className="mt-1 text-sm text-ink-soft">{r.response.body}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Contact */}
            <section className="card p-6">
              <h2 className="font-display text-lg font-semibold">Contact</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span className="text-ink-soft">{clinic.address}{clinic.town ? `, ${clinic.town}` : ''}</span>
                </li>
                {clinic.phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-brand-600" />
                    <a href={`tel:${clinic.phone}`} className="font-medium text-brand-700 hover:underline">{clinic.phone}</a>
                  </li>
                )}
                {clinic.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-brand-600" />
                    <a href={`mailto:${clinic.email}`} className="break-all font-medium text-brand-700 hover:underline">{clinic.email}</a>
                  </li>
                )}
              </ul>
            </section>

            {/* Operating hours */}
            {clinic.operating_hours && (
              <section className="card p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Clock className="h-5 w-5 text-brand-600" /> Opening hours
                </h2>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    {DAYS.map((d) => {
                      const h = clinic.operating_hours?.[d];
                      return (
                        <tr key={d} className="border-b border-black/[0.04] last:border-0">
                          <td className="py-2 font-medium text-ink-soft">{titleCase(d)}</td>
                          <td className="py-2 text-right text-ink-muted">
                            {h ? `${h.open} – ${h.close}` : 'Closed'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {/* Map */}
            {typeof clinic.latitude === 'number' && typeof clinic.longitude === 'number' && (
              <section className="card overflow-hidden p-0">
                <div className="p-6 pb-3">
                  <h2 className="font-display text-lg font-semibold">Location</h2>
                </div>
                <MapView
                  lat={clinic.latitude}
                  lng={clinic.longitude}
                  label={clinic.name}
                  className="h-60 w-full"
                />
              </section>
            )}

            <div className="card flex flex-col gap-3 p-6">
              <p className="text-sm text-ink-muted">Ready to visit?</p>
              <Button icon={<CalendarPlus className="h-5 w-5" />} onClick={handleBook} block>
                Book appointment
              </Button>
              {clinic.status && clinic.status !== 'APPROVED' && (
                <div className="flex items-center justify-center"><StatusPill status={clinic.status} /></div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
