import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceStatusAction } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Invoice, TenantSubscription, SubscriptionPlan, PaymentTransaction } from '@saas/database';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Invoice Sequence Generator ───────────────────────────────────────────
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { tenantId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    if (!lastInvoice) {
      return 'INV-0001';
    }

    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    const lastNum = match ? parseInt(match[1], 10) : 0;
    return `INV-${String(lastNum + 1).padStart(4, '0')}`;
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────
  async createInvoice(dto: CreateInvoiceDto, tenantId: string): Promise<Invoice> {
    const amount = dto.lineItems.reduce((sum, item) => sum + item.total, 0);

    // GST calculations
    let cgst: number | null = null;
    let sgst: number | null = null;
    let igst: number | null = null;
    let taxAmount: number | null = null;

    if (dto.businessGstin && dto.clientGstin) {
      const bizState = dto.businessGstin.trim().substring(0, 2);
      const clientState = dto.clientGstin.trim().substring(0, 2);
      const taxRate = dto.taxRate !== undefined ? dto.taxRate : 18; // Default 18% GST

      taxAmount = Math.round(((amount * taxRate) / 100) * 100) / 100;

      if (bizState === clientState) {
        cgst = Math.round((taxAmount / 2) * 100) / 100;
        sgst = Math.round((taxAmount / 2) * 100) / 100;
      } else {
        igst = taxAmount;
      }
    }

    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      const invoiceNumber = await this.generateInvoiceNumber(tenantId);
      try {
        return await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            tenantId,
            clientName: dto.clientName,
            clientEmail: dto.clientEmail ?? null,
            amount,
            currency: dto.currency ?? 'USD',
            dueDate: new Date(dto.dueDate),
            lineItems: dto.lineItems as object[],
            notes: dto.notes ?? null,
            status: 'DRAFT',
            businessGstin: dto.businessGstin ?? null,
            clientGstin: dto.clientGstin ?? null,
            cgst,
            sgst,
            igst,
            taxAmount,
          },
        });
      } catch (err: any) {
        // Prisma code for unique constraint violation is P2002
        if (err.code === 'P2002') {
          retries++;
          // Stagger retries with brief random backoff
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
          continue;
        }
        throw err;
      }
    }

    throw new BadRequestException('Failed to generate a unique invoice number after multiple retries.');
  }

  async findAllInvoices(tenantId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, tenantId } });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOneInvoice(id, tenantId);

    const statusMap: Record<UpdateInvoiceStatusAction, string> = {
      [UpdateInvoiceStatusAction.SEND]: 'SENT',
      [UpdateInvoiceStatusAction.MARK_PAID]: 'PAID',
      [UpdateInvoiceStatusAction.VOID]: 'VOID',
    };

    if (dto.action) {
      if (invoice.status === 'VOID') {
        throw new BadRequestException('Cannot update a voided invoice');
      }
    }

    const newStatus = dto.action ? statusMap[dto.action] : invoice.status;
    const paidAt = dto.action === UpdateInvoiceStatusAction.MARK_PAID ? new Date() : invoice.paidAt;

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: newStatus,
        paidAt,
        notes: dto.notes ?? invoice.notes,
      },
    });
  }

  async deleteInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOneInvoice(id, tenantId);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot delete a paid invoice. Void it instead.');
    }
    return this.prisma.invoice.delete({ where: { id } });
  }

  // ─── Subscription Plans ───────────────────────────────────────────────────
  async getPlans(): Promise<SubscriptionPlan[]> {
    const plansCount = await this.prisma.subscriptionPlan.count();
    if (plansCount === 0) {
      await this.prisma.subscriptionPlan.createMany({
        data: [
          {
            name: 'Starter',
            price: 49.0,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            maxUsers: 3,
            features: [
              'Basic CRM & Deals Tracking',
              '1 Sales Pipeline Stage Limit',
              'Up to 500 Leads Captures/mo',
              'Standard Email Support',
            ],
            isActive: true,
          },
          {
            name: 'Agency Pro',
            price: 149.0,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            maxUsers: 15,
            features: [
              'Advanced CRM Custom Pipelines',
              'Multi-Agent Routing Engines',
              'Up to 5,000 Leads Captures/mo',
              'WhatsApp Chatbot Autopilot Integration',
              'Priority Support Ticket Queue',
            ],
            isActive: true,
          },
          {
            name: 'Enterprise Scale',
            price: 399.0,
            currency: 'USD',
            billingCycle: 'MONTHLY',
            maxUsers: 100,
            features: [
              'Full Platform White-labeling',
              'Unlimited Agents and Pipelines',
              'Unlimited Leads & Duplicate Checkers',
              'WhatsApp Campaign Broadcast Blasters',
              'Realtime ROI Funnel Analytics Cohorts',
              '24/7 Phone & Slack Support',
            ],
            isActive: true,
          },
        ] as any,
      });
    }
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    let sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    // JIT seed a starter subscription for new tenants so they always have an active tier
    if (!sub) {
      let starterPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { name: 'Starter' },
      });
      
      if (!starterPlan) {
        await this.getPlans(); // Seeds the plans
        starterPlan = await this.prisma.subscriptionPlan.findFirst({
          where: { name: 'Starter' },
        });
      }

      if (starterPlan) {
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        sub = await this.prisma.tenantSubscription.create({
          data: {
            tenantId,
            planId: starterPlan.id,
            status: 'ACTIVE',
            currentPeriodStart,
            currentPeriodEnd,
          },
          include: { plan: true },
        });
      }
    }

    return sub;
  }

  async subscribeOrUpgrade(planId: string, tenantId: string): Promise<TenantSubscription> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);

    const existing = await this.prisma.tenantSubscription.findUnique({ where: { tenantId } });

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    if (existing) {
      return this.prisma.tenantSubscription.update({
        where: { tenantId },
        data: {
          planId,
          status: 'ACTIVE',
          currentPeriodStart,
          currentPeriodEnd,
          cancelledAt: null,
        },
      });
    } else {
      return this.prisma.tenantSubscription.create({
        data: {
          tenantId,
          planId,
          status: 'ACTIVE',
          currentPeriodStart,
          currentPeriodEnd,
        },
      });
    }
  }

  // ─── Billing Summary Stats ────────────────────────────────────────────────
  async getBillingSummary(tenantId: string): Promise<{
    totalRevenue: number;
    paidInvoices: number;
    pendingAmount: number;
    overdueCount: number;
  }> {
    // Single grouped aggregate query — all work done in PostgreSQL, no rows
    // transferred to Node.js beyond the tiny result set.
    const [statusGroups, overdueCount] = await Promise.all([
      // Group invoices by status and sum amounts + count rows
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { tenantId },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      // Overdue = unpaid invoices whose dueDate has already passed
      this.prisma.invoice.count({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'SENT'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    let totalRevenue = 0;
    let paidInvoices = 0;
    let pendingAmount = 0;

    for (const group of statusGroups) {
      const amount = group._sum.amount ?? 0;
      const count = group._count._all;

      if (group.status === 'PAID') {
        totalRevenue = amount;
        paidInvoices = count;
      } else if (group.status === 'DRAFT' || group.status === 'SENT') {
        pendingAmount += amount;
      }
    }

    return { totalRevenue, paidInvoices, pendingAmount, overdueCount };
  }


  // ─── Payment Ledger Transactions ──────────────────────────────────────────
  async createPayment(invoiceId: string, dto: CreatePaymentDto, tenantId: string): Promise<PaymentTransaction> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const isSuccess = ['STRIPE', 'RAZORPAY', 'CASH', 'BANK_TRANSFER'].includes(dto.paymentMethod.toUpperCase());
    const status = isSuccess ? 'SUCCESS' : 'FAILED';
    const paidAt = isSuccess ? new Date() : null;

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        invoiceId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod.toUpperCase(),
        gatewayTransactionId: dto.gatewayTransactionId ?? null,
        gatewayResponse: (dto.gatewayResponse as any) ?? null,
        status,
        paidAt,
        tenantId,
      },
    });

    if (status === 'SUCCESS') {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    }

    return tx;
  }

  async getInvoicePayments(invoiceId: string, tenantId: string): Promise<PaymentTransaction[]> {
    return this.prisma.paymentTransaction.findMany({
      where: { invoiceId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllPayments(tenantId: string): Promise<PaymentTransaction[]> {
    return this.prisma.paymentTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            clientName: true,
          },
        },
      },
    });
  }

  async processWebhook(req: any): Promise<PaymentTransaction> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available. Make sure rawBody: true is enabled.');
    }

    const bodyString = rawBody.toString('utf-8');
    const stripeSignature = req.headers['stripe-signature'];
    const razorpaySignature = req.headers['x-razorpay-signature'];

    if (stripeSignature) {
      return this.handleStripeWebhook(bodyString, stripeSignature);
    } else if (razorpaySignature) {
      return this.handleRazorpayWebhook(bodyString, razorpaySignature);
    } else {
      throw new BadRequestException('Missing payment signature header');
    }
  }

  private async checkAndMarkEventProcessed(eventId: string): Promise<boolean> {
    try {
      const redisKey = `webhook:processed:${eventId}`;
      const existing = await this.redisService.get(redisKey);
      if (existing) {
        return true;
      }
      await this.redisService.set(redisKey, 'true', 86400); // 24 hours
      return false;
    } catch (err) {
      console.warn(`Redis is unavailable for idempotency check: ${err}`);
      return false;
    }
  }

  private async handleStripeWebhook(rawBody: string, signatureHeader: string): Promise<PaymentTransaction> {
    const stripeSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!stripeSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    const parts = signatureHeader.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Parts = parts.filter(p => p.startsWith('v1='));

    if (!tPart || v1Parts.length === 0) {
      throw new BadRequestException('Invalid Stripe signature format');
    }

    const t = tPart.split('=')[1];
    const timestamp = parseInt(t, 10);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      throw new BadRequestException('Stripe signature timestamp outside replay window');
    }

    const signedPayload = `${t}.${rawBody}`;
    const hmac = crypto.createHmac('sha256', stripeSecret).update(signedPayload).digest('hex');

    const isValid = v1Parts.some(v1Part => {
      const v1 = v1Part.split('=')[1];
      try {
        return crypto.timingSafeEqual(Buffer.from(v1, 'utf-8'), Buffer.from(hmac, 'utf-8'));
      } catch {
        return false;
      }
    });

    if (!isValid) {
      throw new BadRequestException('Stripe signature verification failed');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Failed to parse webhook JSON body');
    }

    const eventId = event.id;
    if (!eventId) {
      throw new BadRequestException('Stripe event id is missing');
    }

    const isDuplicate = await this.checkAndMarkEventProcessed(eventId);
    if (isDuplicate) {
      const existingTx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayTransactionId: eventId }
      });
      if (existingTx) return existingTx;
      throw new BadRequestException('Event already processed');
    }

    let invoiceId: string | null = null;
    let paidAmount: number = 0;
    let gatewayTransactionId = eventId;
    let isSucceeded = false;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      invoiceId = session.metadata?.invoiceId;
      paidAmount = session.amount_total / 100;
      isSucceeded = session.payment_status === 'paid';
      gatewayTransactionId = session.payment_intent || session.id;
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      invoiceId = pi.metadata?.invoiceId;
      paidAmount = pi.amount_received / 100;
      isSucceeded = pi.status === 'succeeded';
      gatewayTransactionId = pi.id;
    } else {
      return {
        id: 'ignored',
        invoiceId: 'none',
        amount: 0,
        paymentMethod: 'STRIPE',
        gatewayTransactionId: eventId,
        gatewayResponse: { info: `Skipped event type ${event.type}` },
        status: 'FAILED',
        paidAt: null,
        tenantId: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    }

    if (!invoiceId) {
      throw new BadRequestException('Invoice ID missing in event metadata');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const invoiceTotal = invoice.amount + (invoice.taxAmount || 0);
    if (isSucceeded && Math.abs(paidAmount - invoiceTotal) > 0.01) {
      throw new BadRequestException(`Amount mismatch: Paid ${paidAmount} but invoice total is ${invoiceTotal}`);
    }

    const status = isSucceeded ? 'SUCCESS' : 'FAILED';
    const paidAt = isSucceeded ? new Date() : null;

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        invoiceId,
        amount: paidAmount,
        paymentMethod: 'STRIPE',
        gatewayTransactionId,
        gatewayResponse: { webhook_event: event.type },
        status,
        paidAt,
        tenantId: invoice.tenantId,
      },
    });

    if (status === 'SUCCESS') {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    }

    return tx;
  }

  private async handleRazorpayWebhook(rawBody: string, signature: string): Promise<PaymentTransaction> {
    const razorpaySecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!razorpaySecret) {
      throw new BadRequestException('Razorpay webhook secret is not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(rawBody)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(Buffer.from(signature, 'utf-8'), Buffer.from(expectedSignature, 'utf-8'));
    } catch {
      isValid = false;
    }

    if (!isValid) {
      throw new BadRequestException('Razorpay signature verification failed');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Failed to parse webhook JSON body');
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      throw new BadRequestException('Razorpay payment details missing in payload');
    }

    const paymentId = payment.id;
    if (!paymentId) {
      throw new BadRequestException('Razorpay payment id is missing');
    }

    const isDuplicate = await this.checkAndMarkEventProcessed(paymentId);
    if (isDuplicate) {
      const existingTx = await this.prisma.paymentTransaction.findFirst({
        where: { gatewayTransactionId: paymentId }
      });
      if (existingTx) return existingTx;
      throw new BadRequestException('Event already processed');
    }

    const invoiceId = payment.notes?.invoiceId;
    if (!invoiceId) {
      throw new BadRequestException('Invoice ID missing in payment notes');
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const isSucceeded = event.event === 'payment.captured';
    const status = isSucceeded ? 'SUCCESS' : 'FAILED';
    const paidAt = isSucceeded ? new Date() : null;

    const invoiceTotal = invoice.amount + (invoice.taxAmount || 0);
    const paidAmount = payment.amount / 100;
    if (isSucceeded && Math.abs(paidAmount - invoiceTotal) > 0.01) {
      throw new BadRequestException(`Amount mismatch: Paid ${paidAmount} but invoice total is ${invoiceTotal}`);
    }

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        invoiceId,
        amount: paidAmount,
        paymentMethod: 'RAZORPAY',
        gatewayTransactionId: paymentId,
        gatewayResponse: { webhook_event: event.event },
        status,
        paidAt,
        tenantId: invoice.tenantId,
      },
    });

    if (status === 'SUCCESS') {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });
    }

    return tx;
  }

  async simulateWebhook(dto: PaymentWebhookDto): Promise<PaymentTransaction> {
    const isStripe = dto.paymentMethod.toUpperCase() === 'STRIPE';

    if (isStripe) {
      const mockEventId = `evt_sim_${Math.random().toString(36).substr(2, 9)}`;
      const mockPayload = {
        id: mockEventId,
        object: 'event',
        type: dto.event === 'payment.succeeded' ? 'payment_intent.succeeded' : 'payment_intent.failed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: dto.gatewayTransactionId || `pi_sim_${Math.random().toString(36).substr(2, 9)}`,
            object: 'payment_intent',
            amount: dto.amount * 100,
            amount_received: dto.event === 'payment.succeeded' ? dto.amount * 100 : 0,
            currency: 'usd',
            metadata: {
              invoiceId: dto.invoiceId
            },
            status: dto.event === 'payment.succeeded' ? 'succeeded' : 'failed'
          }
        }
      };

      const rawBody = JSON.stringify(mockPayload);
      const t = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${t}.${rawBody}`;
      const stripeSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_dev_secret';
      const hmac = crypto.createHmac('sha256', stripeSecret).update(signedPayload).digest('hex');
      const signature = `t=${t},v1=${hmac}`;

      return this.handleStripeWebhook(rawBody, signature);
    } else {
      const mockEventId = `rzp_evt_sim_${Math.random().toString(36).substr(2, 9)}`;
      const mockPayload = {
        entity: 'event',
        event: dto.event === 'payment.succeeded' ? 'payment.captured' : 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: dto.gatewayTransactionId || `pay_sim_${Math.random().toString(36).substr(2, 9)}`,
              entity: 'payment',
              amount: dto.amount * 100,
              currency: 'INR',
              status: dto.event === 'payment.succeeded' ? 'captured' : 'failed',
              notes: {
                invoiceId: dto.invoiceId
              }
            }
          }
        },
        created_at: Math.floor(Date.now() / 1000)
      };

      const rawBody = JSON.stringify(mockPayload);
      const razorpaySecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'razorpay_dev_secret';
      const signature = crypto.createHmac('sha256', razorpaySecret).update(rawBody).digest('hex');

      return this.handleRazorpayWebhook(rawBody, signature);
    }
  }
}

