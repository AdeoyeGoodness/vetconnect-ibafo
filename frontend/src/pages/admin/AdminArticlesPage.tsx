import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FileText, Plus, Pencil, Trash2, Eye, FolderPlus } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Button, Card, Input, Textarea, Select, StatusPill, SkeletonCard, EmptyState } from '@/components/ui';
import type { Article, Category, AnimalSpecies, PageMeta } from '@/types';
import { PageShell, ErrorState, Modal, ConfirmDialog, Pagination, ResponsiveTable } from './_shared';

const SPECIES: AnimalSpecies[] = ['DOG', 'CAT', 'POULTRY', 'GOAT', 'SHEEP', 'CATTLE', 'RABBIT', 'OTHER'];

interface ArticleForm {
  category_id: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string;
  tags: string;
  is_published: boolean;
}

interface CategoryForm {
  name: string;
  species: string;
  description: string;
}

export default function AdminArticlesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Article | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Article | null>(null);

  const articlesQ = useQuery({
    queryKey: ['admin', 'articles', { page }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await api.get('/articles', { params: { page, limit: 20 } });
      return { data: res.data.data as Article[], meta: res.data.meta as PageMeta | undefined };
    },
  });

  const categoriesQ = useQuery({
    queryKey: ['articles', 'categories'],
    queryFn: () => unwrap<Category[]>(api.get('/articles/categories')),
    staleTime: 60_000,
  });

  const articleForm = useForm<ArticleForm>({
    defaultValues: { category_id: '', title: '', excerpt: '', body: '', cover_url: '', tags: '', is_published: false },
  });
  const catForm = useForm<CategoryForm>({ defaultValues: { name: '', species: '', description: '' } });

  const openCreate = () => {
    setEditing(null);
    articleForm.reset({ category_id: '', title: '', excerpt: '', body: '', cover_url: '', tags: '', is_published: false });
    setFormOpen(true);
  };

  const openEdit = (a: Article) => {
    setEditing(a);
    articleForm.reset({
      category_id: a.category_id ?? '',
      title: a.title,
      excerpt: a.excerpt ?? '',
      body: a.body ?? '',
      cover_url: a.cover_url ?? '',
      tags: (a.tags ?? []).join(', '),
      is_published: a.is_published,
    });
    setFormOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (v: ArticleForm) => {
      const payload = {
        category_id: v.category_id || null,
        title: v.title.trim(),
        excerpt: v.excerpt.trim() || null,
        body: v.body,
        cover_url: v.cover_url.trim() || null,
        tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_published: v.is_published,
      };
      return editing ? api.put(`/articles/${editing.id}`, payload) : api.post('/articles', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Article updated' : 'Article created');
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublishMut = useMutation({
    mutationFn: (a: Article) => api.put(`/articles/${a.id}`, { is_published: !a.is_published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/articles/${id}`),
    onSuccess: () => {
      toast.success('Article deleted');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catMut = useMutation({
    mutationFn: (v: CategoryForm) =>
      api.post('/articles/categories', {
        name: v.name.trim(),
        species: v.species || null,
        description: v.description.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Category added');
      setCatOpen(false);
      catForm.reset({ name: '', species: '', description: '' });
      qc.invalidateQueries({ queryKey: ['articles', 'categories'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const articles = articlesQ.data?.data ?? [];
  const meta = articlesQ.data?.meta;
  const categories = categoriesQ.data ?? [];
  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <PageShell
      title="Info portal"
      subtitle="Manage educational articles and categories"
      actions={
        <>
          <Button variant="secondary" icon={<FolderPlus className="h-4 w-4" />} onClick={() => setCatOpen(true)}>
            Add category
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>New article</Button>
        </>
      }
    >
      {articlesQ.isLoading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : articlesQ.isError ? (
        <ErrorState message="Could not load articles." onRetry={() => articlesQ.refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No articles yet"
          description="Create your first educational article for pet owners."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>New article</Button>}
        />
      ) : (
        <>
          <ResponsiveTable
            table={
              <>
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Views</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {articles.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-ink">{a.title}</td>
                      <td className="px-4 py-3 text-ink-soft">{a.category?.name ?? catName(a.category_id)}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.views ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePublishMut.mutate(a)}
                          disabled={togglePublishMut.isPending && togglePublishMut.variables?.id === a.id}
                          title="Toggle published"
                          className="disabled:opacity-50"
                        >
                          <StatusPill status={a.is_published ? 'PUBLISHED' : 'HIDDEN'} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(a)}>Edit</Button>
                          <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(a)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            }
            cards={articles.map((a) => (
              <Card key={a.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <button onClick={() => togglePublishMut.mutate(a)}>
                    <StatusPill status={a.is_published ? 'PUBLISHED' : 'HIDDEN'} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span>{a.category?.name ?? catName(a.category_id)}</span>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.views ?? 0} views</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(a)}>Edit</Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(a)}>Delete</Button>
                </div>
              </Card>
            ))}
          />
          {meta && <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} onChange={setPage} />}
        </>
      )}

      {/* Create / edit article modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit article' : 'New article'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveMut.isPending}>Cancel</Button>
            <Button loading={saveMut.isPending} onClick={articleForm.handleSubmit((v) => saveMut.mutate(v))}>
              {editing ? 'Save changes' : 'Create article'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={articleForm.handleSubmit((v) => saveMut.mutate(v))}>
          <Input
            label="Title"
            error={articleForm.formState.errors.title?.message}
            {...articleForm.register('title', { required: 'Title is required' })}
          />
          <Select label="Category" {...articleForm.register('category_id')}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input label="Excerpt" hint="Short summary shown in listings" {...articleForm.register('excerpt')} />
          <Textarea
            label="Body"
            className="min-h-[160px]"
            error={articleForm.formState.errors.body?.message}
            {...articleForm.register('body', { required: 'Body is required' })}
          />
          <Input label="Cover image URL" placeholder="https://…" {...articleForm.register('cover_url')} />
          <Input label="Tags" hint="Comma-separated, e.g. nutrition, puppies" {...articleForm.register('tags')} />
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <input type="checkbox" className="h-4 w-4 rounded border-line text-brand-600" {...articleForm.register('is_published')} />
            Published
          </label>
        </form>
      </Modal>

      {/* Add category modal */}
      <Modal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title="Add category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCatOpen(false)} disabled={catMut.isPending}>Cancel</Button>
            <Button loading={catMut.isPending} onClick={catForm.handleSubmit((v) => catMut.mutate(v))}>Add category</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={catForm.handleSubmit((v) => catMut.mutate(v))}>
          <Input
            label="Name"
            error={catForm.formState.errors.name?.message}
            {...catForm.register('name', { required: 'Name is required' })}
          />
          <Select label="Species (optional)" {...catForm.register('species')}>
            <option value="">All species</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Textarea label="Description (optional)" {...catForm.register('description')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
        title="Delete article"
        confirmLabel="Delete article"
        message={<>Permanently delete <strong>{toDelete?.title}</strong>? This cannot be undone.</>}
      />
    </PageShell>
  );
}
