import { Controller, Get, Post, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@saas/shared-types';
import { EnterpriseService } from './enterprise.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { CreateChildTenantDto } from './dto/create-child-tenant.dto';

@ApiTags('Enterprise & Multi-Tenancy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @ApiOperation({ summary: 'Get current tenant branding configurations' })
  @Get('branding')
  async getBranding(@Request() req) {
    // Return branding of originalTenantId if switched context, otherwise current tenantId
    const targetTenantId = req.user.originalTenantId || req.user.tenantId;
    return this.enterpriseService.getBranding(targetTenantId);
  }

  @ApiOperation({ summary: 'Update tenant white-label branding configurations' })
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @Patch('branding')
  async updateBranding(@Request() req, @Body() dto: UpdateBrandingDto) {
    const targetTenantId = req.user.originalTenantId || req.user.tenantId;
    return this.enterpriseService.updateBranding(targetTenantId, dto);
  }

  @ApiOperation({ summary: 'List all reseller sub-tenants' })
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @Get('tenants')
  async getChildTenants(@Request() req) {
    // Query child tenants using originalTenantId if in context switch
    const parentId = req.user.originalTenantId || req.user.tenantId;
    return this.enterpriseService.getChildTenants(parentId);
  }

  @ApiOperation({ summary: 'Provision a new child tenant (reseller client onboarding)' })
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @Post('tenants')
  async provisionChildTenant(@Request() req, @Body() dto: CreateChildTenantDto) {
    const parentId = req.user.originalTenantId || req.user.tenantId;
    return this.enterpriseService.provisionChildTenant(parentId, dto);
  }

  @ApiOperation({ summary: 'Get aggregated reseller/franchise analytics metrics' })
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @Get('analytics')
  async getEnterpriseAnalytics(@Request() req) {
    const parentId = req.user.originalTenantId || req.user.tenantId;
    return this.enterpriseService.getEnterpriseAnalytics(parentId);
  }
}
