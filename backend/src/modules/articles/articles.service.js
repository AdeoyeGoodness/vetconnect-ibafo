import slugify from 'slugify';
import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a unique slug from a title (append -2, -3, … on collision). */
async function uniqueSlug(title) {
  const base = slugify(title, { lower: true, strict: true }) || 'article';
  let candidate = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await query('SELECT 1 FROM articles WHERE slug = $1', [candidate]);
    if (!rows.length) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function listArticles({ search, category, species, tag }, { limit, offset }) {
  const where = ['a.is_published = TRUE'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`a.title ILIKE $${params.length}`);
  }
  if (category) {
    if (UUID_RE.test(category)) {
      params.push(category);
      where.push(`a.category_id = $${params.length}`);
    } else {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }
  }
  if (species) {
    params.push(species);
    where.push(`c.species = $${params.length}`);
  }
  if (tag) {
    params.push(tag);
    where.push(`$${params.length} = ANY(a.tags)`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const totalRes = await query(
    `SELECT COUNT(*)::int AS total
       FROM articles a LEFT JOIN categories c ON c.id = a.category_id
      ${whereSql}`,
    params
  );
  const total = totalRes.rows[0].total;

  const dataParams = [...params, limit, offset];
  const { rows } = await query(
    `SELECT a.id, a.title, a.slug, a.excerpt, a.cover_url, a.tags, a.views,
            a.is_published, a.category_id, a.author_id, a.created_at, a.updated_at,
            c.name AS category_name, c.slug AS category_slug,
            u.full_name AS author_name
       FROM articles a
       LEFT JOIN categories c ON c.id = a.category_id
       LEFT JOIN users u ON u.id = a.author_id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total };
}

export async function getArticleBySlug(slug) {
  const { rows } = await query(
    `UPDATE articles SET views = views + 1
      WHERE slug = $1 AND is_published = TRUE
      RETURNING *`,
    [slug]
  );
  const article = rows[0];
  if (!article) throw ApiError.notFound('Article not found');

  let category = null;
  if (article.category_id) {
    const catRes = await query('SELECT id, name, slug, species FROM categories WHERE id = $1', [
      article.category_id,
    ]);
    category = catRes.rows[0] || null;
  }

  const relatedRes = await query(
    `SELECT id, title, slug, excerpt, cover_url, created_at
       FROM articles
      WHERE is_published = TRUE AND id <> $1
        AND category_id IS NOT DISTINCT FROM $2
      ORDER BY created_at DESC
      LIMIT 3`,
    [article.id, article.category_id]
  );

  return { ...article, category, related: relatedRes.rows };
}

export async function createArticle(authorId, data) {
  const slug = await uniqueSlug(data.title);
  const { rows } = await query(
    `INSERT INTO articles (category_id, author_id, title, slug, excerpt, body, cover_url, tags, is_published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, TRUE))
     RETURNING *`,
    [
      data.category_id || null,
      authorId,
      data.title,
      slug,
      data.excerpt || null,
      data.body,
      data.cover_url || null,
      data.tags || [],
      data.is_published ?? null,
    ]
  );
  return rows[0];
}

export async function updateArticle(id, data) {
  const fields = [];
  const params = [];

  for (const key of ['title', 'category_id', 'excerpt', 'body', 'cover_url', 'tags', 'is_published']) {
    if (key in data) {
      params.push(data[key]);
      fields.push(`${key} = $${params.length}`);
    }
  }
  if (!fields.length) throw ApiError.badRequest('No fields to update');

  params.push(id);
  const { rows } = await query(
    `UPDATE articles SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) throw ApiError.notFound('Article not found');
  return rows[0];
}

export async function deleteArticle(id) {
  const { rows } = await query('DELETE FROM articles WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) throw ApiError.notFound('Article not found');
}

export async function listCategories() {
  const { rows } = await query(
    `SELECT id, name, slug, species, description, created_at FROM categories ORDER BY name ASC`
  );
  return rows;
}

export async function createCategory({ name, species, description }) {
  const base = slugify(name, { lower: true, strict: true }) || 'category';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await query('SELECT 1 FROM categories WHERE slug = $1', [slug]);
    if (!exists.rows.length) break;
    n += 1;
    slug = `${base}-${n}`;
  }

  try {
    const { rows } = await query(
      `INSERT INTO categories (name, slug, species, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, slug, species || null, description || null]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict('A category with this name already exists');
    throw err;
  }
}
