import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@saas/shared-types';
import { TenantContext } from '../context/tenant-context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const switchTenantId = request.headers['x-switch-tenant'];

    if (switchTenantId && request.user) {
      const user = request.user;

      // SUPER_ADMIN can switch to any tenant context
      if (user.role === UserRole.SUPER_ADMIN) {
        request.user.tenantId = switchTenantId;
      } 
      // AGENCY_OWNER can switch context to any child tenant they own (reseller/franchise)
      else if (user.role === UserRole.AGENCY_OWNER) {
        if (switchTenantId !== user.originalTenantId && switchTenantId !== user.tenantId) {
          const targetTenant = await this.prisma.tenant.findUnique({
            where: { id: switchTenantId },
            select: { parentId: true },
          });

          if (!targetTenant || targetTenant.parentId !== user.tenantId) {
            throw new ForbiddenException('You do not have access to this tenant context');
          }

          // Store original tenant ID so we can switch back or verify permissions
          if (!request.user.originalTenantId) {
            request.user.originalTenantId = user.tenantId;
          }
          request.user.tenantId = switchTenantId;
        }
      }
    }

    const isSuperAdmin = request.user?.role === UserRole.SUPER_ADMIN;
    const activeTenantId = request.user?.tenantId ?? null;

    return new Observable(subscriber => {
      TenantContext.run({ tenantId: activeTenantId, bypassRls: isSuperAdmin }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
