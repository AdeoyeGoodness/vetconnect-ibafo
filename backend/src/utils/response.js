/** Uniform success envelope used by every controller. */
export const ok = (res, data, meta) =>
  res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = (res, data) =>
  res.status(201).json({ success: true, data });

export const noContent = (res) => res.status(204).send();

/** Build pagination meta from query + total count. */
export const paginate = (query, total) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    offset: (page - 1) * limit,
  };
};
