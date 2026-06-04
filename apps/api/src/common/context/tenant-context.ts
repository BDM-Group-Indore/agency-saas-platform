import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string | null;
  bypassRls: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export class TenantContext {
  static get(): TenantStore {
    return tenantStorage.getStore() ?? { tenantId: null, bypassRls: false };
  }

  static run<T>(store: TenantStore, fn: () => T): T {
    return tenantStorage.run(store, fn);
  }
}
