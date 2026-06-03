import { SortOrder } from '../dto/pagination-query.dto';
import { buildOrderBy } from './sort-order';

describe('buildOrderBy', () => {
  it('uses an allowed sort field', () => {
    expect(buildOrderBy('name', SortOrder.ASC, ['name', 'createdAt'])).toEqual({
      name: 'asc',
    });
  });

  it('falls back when the requested sort field is not allowed', () => {
    expect(buildOrderBy('tenant.password', SortOrder.DESC, ['name', 'createdAt'])).toEqual({
      createdAt: 'desc',
    });
  });
});
