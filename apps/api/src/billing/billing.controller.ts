import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Invoice, SubscriptionPlan, TenantSubscription } from '@saas/database';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Post('invoices')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.createInvoice(dto, tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List all invoices for the tenant' })
  findAllInvoices(@TenantId() tenantId: string): Promise<Invoice[]> {
    return this.billingService.findAllInvoices(tenantId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  findOneInvoice(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.findOneInvoice(id, tenantId);
  }

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Update invoice status (send / mark paid / void)' })
  updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.updateInvoice(id, dto, tenantId);
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Delete a draft or sent invoice' })
  deleteInvoice(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.deleteInvoice(id, tenantId);
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List all available subscription plans' })
  getPlans(): Promise<SubscriptionPlan[]> {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get the current tenant subscription' })
  getSubscription(
    @TenantId() tenantId: string,
  ): Promise<TenantSubscription | null> {
    return this.billingService.getTenantSubscription(tenantId);
  }

  @Post('subscription')
  @ApiOperation({ summary: 'Subscribe or change subscription plan' })
  subscribePlan(
    @Body('planId') planId: string,
    @TenantId() tenantId: string,
  ): Promise<TenantSubscription> {
    return this.billingService.subscribeOrUpgrade(planId, tenantId);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────


  @Get('summary')
  @ApiOperation({ summary: 'Billing summary stats for the dashboard' })
  getSummary(@TenantId() tenantId: string) {
    return this.billingService.getBillingSummary(tenantId);
  }
}
