import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, BookOpen, Tag, Calendar } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import type { Article } from '@/types';
import { Button, PageLoader, EmptyState, Badge } from '@/components/ui';

const FALLBACK =
  'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1400&q=70';

// The single-article endpoint returns the article plus related items.
type ArticleDetail = Article & { related?: Article[] };

export default function ArticlePage() {
  const { slug = '' } = useParams();

  const articleQ = useQuery({
    queryKey: ['article', slug],
    enabled: !!slug,
    queryFn: () => unwrap<ArticleDetail>(api.get(`/articles/${slug}`)),
  });

  if (articleQ.isLoading) return <PageLoader />;

  const article = articleQ.data;
  if (articleQ.isError || !article) {
    return (
      <div className="container-app py-20">
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="Article not found"
          description="This article may have been moved or unpublished."
          action={<Link to="/info"><Button>Back to portal</Button></Link>}
        />
      </div>
    );
  }

  const paragraphs = article.body.split(/\n{2,}|\n/).filter((p) => p.trim());
  const related = article.related ?? [];

  return (
    <div className="bg-surface-sunken pb-16">
      {/* Cover */}
      <div className="relative h-56 w-full overflow-hidden bg-brand-900 sm:h-80">
        <img src={article.cover_url || FALLBACK} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
        <div className="container-app absolute inset-x-0 top-4">
          <Link
            to="/info"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-ink-soft shadow-card backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Information portal
          </Link>
        </div>
      </div>

      <div className="container-app">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card mx-auto -mt-12 max-w-3xl p-6 sm:-mt-16 sm:p-10"
        >
          {article.category?.name && (
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{article.category.name}</span>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{article.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {new Date(article.created_at).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> {article.views} views
            </span>
          </div>

          {article.excerpt && (
            <p className="mt-6 border-l-4 border-brand-300 pl-4 text-lg italic leading-relaxed text-ink-soft">
              {article.excerpt}
            </p>
          )}

          <div className="prose-content mt-6 space-y-5 text-base leading-relaxed text-ink-soft">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {article.tags?.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-6">
              <Tag className="h-4 w-4 text-ink-muted" />
              {article.tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
          )}
        </motion.article>

        {/* Related */}
        {related.length > 0 && (
          <section className="mx-auto mt-12 max-w-5xl">
            <h2 className="mb-6 font-display text-2xl font-bold">Related articles</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a, i) => (
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
                    <div className="h-36 overflow-hidden bg-brand-50">
                      <img
                        src={a.cover_url || FALLBACK}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-base font-semibold leading-snug line-clamp-2">{a.title}</h3>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">
                        Read <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
