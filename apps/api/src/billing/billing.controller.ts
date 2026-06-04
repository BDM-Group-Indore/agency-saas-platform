import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Invoice, SubscriptionPlan, TenantSubscription, PaymentTransaction } from '@saas/database';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Post('invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.createInvoice(dto, tenantId);
  }

  @Get('invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all invoices for the tenant' })
  findAllInvoices(@TenantId() tenantId: string): Promise<Invoice[]> {
    return this.billingService.findAllInvoices(tenantId);
  }

  @Get('invoices/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  findOneInvoice(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.findOneInvoice(id, tenantId);
  }

  @Patch('invoices/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update invoice status (send / mark paid / void)' })
  updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.updateInvoice(id, dto, tenantId);
  }

  @Delete('invoices/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a draft or sent invoice' })
  deleteInvoice(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<Invoice> {
    return this.billingService.deleteInvoice(id, tenantId);
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  @Get('plans')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all available subscription plans' })
  getPlans(): Promise<SubscriptionPlan[]> {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current tenant subscription' })
  getSubscription(
    @TenantId() tenantId: string,
  ): Promise<TenantSubscription | null> {
    return this.billingService.getTenantSubscription(tenantId);
  }

  @Post('subscription')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe or change subscription plan' })
  subscribePlan(
    @Body('planId') planId: string,
    @TenantId() tenantId: string,
  ): Promise<TenantSubscription> {
    return this.billingService.subscribeOrUpgrade(planId, tenantId);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Billing summary stats for the dashboard' })
  getSummary(@TenantId() tenantId: string) {
    return this.billingService.getBillingSummary(tenantId);
  }

  // ─── Payments & Ledger ────────────────────────────────────────────────────

  @Post('invoices/:id/payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a payment transaction for an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  createPayment(
    @Param('id') invoiceId: string,
    @Body() dto: CreatePaymentDto,
    @TenantId() tenantId: string,
  ): Promise<PaymentTransaction> {
    return this.billingService.createPayment(invoiceId, dto, tenantId);
  }

  @Get('invoices/:id/payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment history for a specific invoice' })
  getInvoicePayments(
    @Param('id') invoiceId: string,
    @TenantId() tenantId: string,
  ): Promise<PaymentTransaction[]> {
    return this.billingService.getInvoicePayments(invoiceId, tenantId);
  }

  @Get('payments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all payment ledger transactions for the tenant' })
  getAllPayments(@TenantId() tenantId: string): Promise<PaymentTransaction[]> {
    return this.billingService.getAllPayments(tenantId);
  }

  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public webhook endpoint for asynchronous payment captures (Stripe/Razorpay)' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  processWebhook(@Req() req: any): Promise<PaymentTransaction> {
    return this.billingService.processWebhook(req);
  }

  @Post('payments/simulate-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Secure simulated webhook ingestion for developers/admins' })
  @ApiResponse({ status: 200, description: 'Simulated webhook processed' })
  simulateWebhook(@Body() dto: PaymentWebhookDto): Promise<PaymentTransaction> {
    return this.billingService.simulateWebhook(dto);
  }
}
