import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.tenantId) {
      throw new ForbiddenException('User is not associated with a tenant');
    }
    return user.tenantId;
  },
);
