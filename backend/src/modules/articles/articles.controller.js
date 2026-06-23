import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, noContent, paginate } from '../../utils/response.js';
import * as service from './articles.service.js';

export const list = asyncHandler(async (req, res) => {
  const meta = paginate(req.query, 0);
  const { rows, total } = await service.listArticles(req.query, meta);
  ok(res, rows, paginate(req.query, total));
});

export const getBySlug = asyncHandler(async (req, res) => {
  const article = await service.getArticleBySlug(req.params.slug);
  ok(res, article);
});

export const create = asyncHandler(async (req, res) => {
  const article = await service.createArticle(req.user.id, req.body);
  created(res, article);
});

export const update = asyncHandler(async (req, res) => {
  const article = await service.updateArticle(req.params.id, req.body);
  ok(res, article);
});

export const remove = asyncHandler(async (req, res) => {
  await service.deleteArticle(req.params.id);
  noContent(res);
});

export const listCategories = asyncHandler(async (_req, res) => {
  const rows = await service.listCategories();
  ok(res, rows);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await service.createCategory(req.body);
  created(res, category);
});
