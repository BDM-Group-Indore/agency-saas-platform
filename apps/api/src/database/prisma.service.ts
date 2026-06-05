import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@saas/database';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private extended: any;

  constructor() {
    super();

    // Extend the client with RLS context setting
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query, model, operation }) {
            const { tenantId, bypassRls } = TenantContext.get();
            const tenantVal = tenantId ?? '';
            const bypassVal = bypassRls ? 'true' : 'false';

            const client = this as any;

            if (typeof client.$transaction === 'function') {
              // Standard client: wrap in transaction to ensure variables are set on the connection
              const [, , result] = await client.$transaction([
                client.$executeRaw`SELECT set_config('app.current_tenant', ${tenantVal}, true)`,
                client.$executeRaw`SELECT set_config('app.bypass_rls', ${bypassVal}, true)`,
                query(args),
              ]);
              return result;
            } else {
              // Transaction client: connection is already pinned, run sequentially
              await client.$executeRaw`SELECT set_config('app.current_tenant', ${tenantVal}, true)`;
              await client.$executeRaw`SELECT set_config('app.bypass_rls', ${bypassVal}, true)`;
              return await query(args);
            }
          },
        },
      },
    });

    this.extended = extended;

    // Return a Proxy that forwards model calls and Prisma methods to the extended client,
    // while keeping lifecycle methods and custom properties on this PrismaService instance.
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'applyRlsPolicies' ||
          prop === '$connect' ||
          prop === '$disconnect' ||
          prop === 'logger' ||
          prop === 'extended'
        ) {
          return Reflect.get(target, prop, receiver);
        }
        const value = Reflect.get(target.extended, prop);
        if (typeof value === 'function') {
          return value.bind(target.extended);
        }
        return value;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.applyRlsPolicies();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async applyRlsPolicies() {
    const tables = [
      { name: 'User', column: 'tenantId' },
      { name: 'Company', column: 'tenantId' },
      { name: 'Contact', column: 'tenantId' },
      { name: 'Pipeline', column: 'tenantId' },
      { name: 'Deal', column: 'tenantId' },
      { name: 'Activity', column: 'tenantId' },
      { name: 'Note', column: 'tenantId' },
      { name: 'Lead', column: 'tenantId' },
      { name: 'WhatsAppConversation', column: 'tenantId' },
      { name: 'WhatsAppTemplate', column: 'tenantId' },
      { name: 'WhatsAppBroadcast', column: 'tenantId' },
      { name: 'Invoice', column: 'tenantId' },
      { name: 'PaymentTransaction', column: 'tenantId' },
      { name: 'TenantSubscription', column: 'tenantId' },
      { name: 'PromptTemplate', column: 'tenantId' },
      { name: 'AdAccount', column: 'tenantId' },
      { name: 'AdCampaign', column: 'tenantId' },
      { name: 'AdSyncLog', column: 'tenantId' },
      { name: 'Tenant', column: 'id' }
    ];

    for (const table of tables) {
      try {
        // Enforce RLS and FORCE RLS (applies to owner/superuser postgres)
        await this.$executeRawUnsafe(`ALTER TABLE "${table.name}" ENABLE ROW LEVEL SECURITY;`);
        await this.$executeRawUnsafe(`ALTER TABLE "${table.name}" FORCE ROW LEVEL SECURITY;`);

        // Drop existing policy to handle updates cleanly
        await this.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table.name}";`);

        // Create policy
        await this.$executeRawUnsafe(`
          CREATE POLICY tenant_isolation ON "${table.name}"
          USING (
            current_setting('app.bypass_rls', true) = 'true' OR
            current_setting('app.current_tenant', true) = '' OR
            "${table.column}" = current_setting('app.current_tenant', true)
          );
        `);
        this.logger.log(`Successfully enabled RLS and applied tenant_isolation policy on "${table.name}"`);
      } catch (err) {
        this.logger.error(`Failed to apply RLS policy on table "${table.name}":`, err);
      }
    }
  }
}
