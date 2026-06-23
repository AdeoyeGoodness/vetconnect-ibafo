import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search, BookOpen, ArrowRight, Eye, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import type { Article, Category, PageMeta } from '@/types';
import { Button, SkeletonCard, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';

const FALLBACK =
  'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=800&q=60';

// Species-focused care topics highlighted at the top of the portal.
const SPECIES = ['Dogs', 'Cats', 'Poultry', 'Goats', 'Cattle', 'Emergency Care'];

export default function InfoPortalPage() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [page, setPage] = useState(1);

  const categoriesQ = useQuery({
    queryKey: ['article-categories'],
    queryFn: () => unwrap<Category[]>(api.get('/articles/categories')),
  });

  const articlesQ = useQuery({
    queryKey: ['articles', { search, activeCat, page }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 9 };
      if (search) params.search = search;
      if (activeCat) params.category = activeCat;
      const res = await api.get('/articles', { params });
      return { data: res.data.data as Article[], meta: res.data.meta as PageMeta | undefined };
    },
  });

  const articles = articlesQ.data?.data ?? [];
  const meta = articlesQ.data?.meta;

  const selectCat = (slug: string) => {
    setActiveCat((c) => (c === slug ? '' : slug));
    setPage(1);
  };

  return (
    <div className="bg-surface-sunken pb-16">
      {/* Hero */}
      <section className="border-b border-black/[0.06] bg-gradient-to-br from-brand-800 to-brand-900 text-white">
        <div className="container-app py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-100 ring-1 ring-white/15">
              <BookOpen className="h-4 w-4" /> Information portal
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              Trusted animal care knowledge
            </h1>
            <p className="mt-4 text-lg text-brand-50/90">
              Practical, vet-reviewed guides on caring for your pets, poultry and livestock.
            </p>
            <div className="relative mt-7 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search care guides…"
                className="input pl-11 text-ink"
                aria-label="Search articles"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Species strip */}
      <section className="container-app pt-8">
        <div className="flex flex-wrap gap-2">
          {SPECIES.map((s) => (
            <span key={s} className="chip">{s}</span>
          ))}
        </div>
      </section>

      {/* Category filter */}
      <section className="container-app pt-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectCat('')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition',
              !activeCat ? 'bg-brand-700 text-white' : 'bg-white text-ink-soft ring-1 ring-black/[0.06] hover:bg-brand-50'
            )}
          >
            All topics
          </button>
          {categoriesQ.data?.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCat(c.slug)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeCat === c.slug ? 'bg-brand-700 text-white' : 'bg-white text-ink-soft ring-1 ring-black/[0.06] hover:bg-brand-50'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* Article grid */}
      <section className="container-app pt-8">
        {articlesQ.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : articlesQ.isError ? (
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
            title="Couldn't load articles"
            description="Please try again in a moment."
            action={<Button onClick={() => articlesQ.refetch()}>Retry</Button>}
          />
        ) : !articles.length ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="No articles found"
            description="Try a different search or topic."
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                >
                  <Link
                    to={`/info/${a.slug}`}
                    className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift"
                  >
                    <div className="h-44 overflow-hidden bg-brand-50">
                      <img
                        src={a.cover_url || FALLBACK}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {a.category?.name && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{a.category.name}</span>
                      )}
                      <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug line-clamp-2">{a.title}</h3>
                      {a.excerpt && <p className="mt-2 flex-1 text-sm text-ink-muted line-clamp-3">{a.excerpt}</p>}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">
                          Read more <ArrowRight className="h-4 w-4" />
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                          <Eye className="h-3.5 w-3.5" /> {a.views}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeft className="h-4 w-4" />}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="px-3 text-sm font-medium text-ink-soft">Page {meta.page} of {meta.totalPages}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
