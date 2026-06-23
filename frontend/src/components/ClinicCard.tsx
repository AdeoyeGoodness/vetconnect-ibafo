import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Siren, Navigation } from 'lucide-react';
import type { Clinic } from '@/types';
import { Stars, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=60';

interface Props {
  clinic: Clinic;
  index?: number;
  className?: string;
}

/** Reusable clinic summary card used across Home, Directory and search results. */
export default function ClinicCard({ clinic, index = 0, className }: Props) {
  const services = clinic.services_offered?.slice(0, 3) ?? [];
  const extra = (clinic.services_offered?.length ?? 0) - services.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className={cn('group h-full', className)}
    >
      <Link
        to={`/clinics/${clinic.slug ?? clinic.id}`}
        className="card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift focus-visible:shadow-lift"
      >
        <div className="relative h-36 w-full overflow-hidden bg-brand-50">
          <img
            src={clinic.cover_url || FALLBACK_COVER}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {clinic.emergency_available && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white shadow-card">
              <Siren className="h-3.5 w-3.5" /> 24/7 Emergency
            </span>
          )}
          {typeof clinic.distance_km === 'number' && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-card">
              <Navigation className="h-3.5 w-3.5" /> {clinic.distance_km.toFixed(1)} km
            </span>
          )}
          {clinic.logo_url && (
            <img
              src={clinic.logo_url}
              alt=""
              className="absolute -bottom-5 left-4 h-12 w-12 rounded-xl border-2 border-white object-cover shadow-card"
            />
          )}
        </div>

        <div className={cn('flex flex-1 flex-col p-4', clinic.logo_url && 'pt-7')}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base font-semibold leading-tight text-ink line-clamp-2">
              {clinic.name}
            </h3>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <Stars value={clinic.rating_avg} size={14} showValue />
            <span className="text-xs text-ink-muted">({clinic.rating_count})</span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="line-clamp-1">
              {clinic.town ? `${clinic.town} · ` : ''}
              {clinic.address}
            </span>
          </p>
          {clinic.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              {clinic.phone}
            </p>
          )}

          {services.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {services.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
              {extra > 0 && (
                <span className="badge bg-stone-100 text-stone-600">+{extra} more</span>
              )}
            </div>
          )}

          <span className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700 transition group-hover:gap-2">
            View clinic <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
