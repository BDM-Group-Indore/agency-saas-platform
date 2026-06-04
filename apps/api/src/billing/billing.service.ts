import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceStatusAction } from './dto/update-invoice.dto';
import { Invoice, TenantSubscription, SubscriptionPlan } from '@saas/database';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Invoice Sequence Generator ───────────────────────────────────────────
  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    return `INV-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────
  async createInvoice(dto: CreateInvoiceDto, tenantId: string): Promise<Invoice> {
    const amount = dto.lineItems.reduce((sum, item) => sum + item.total, 0);
    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
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
      },
    });
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
    const invoices = await this.prisma.invoice.findMany({ where: { tenantId } });

    const totalRevenue = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + i.amount, 0);

    const paidInvoices = invoices.filter((i) => i.status === 'PAID').length;

    const pendingAmount = invoices
      .filter((i) => ['DRAFT', 'SENT'].includes(i.status))
      .reduce((s, i) => s + i.amount, 0);

    const overdueCount = invoices.filter((i) => {
      return (
        ['DRAFT', 'SENT'].includes(i.status) && new Date(i.dueDate) < new Date()
      );
    }).length;

    return { totalRevenue, paidInvoices, pendingAmount, overdueCount };
  }
}

