import { SortOrder } from '../dto/pagination-query.dto';

export function buildOrderBy(
  sortBy: string | undefined,
  sortOrder: SortOrder,
  allowedFields: readonly string[],
  fallbackField = 'createdAt'
) {
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : fallbackField;
  return { [field]: sortOrder };
}
