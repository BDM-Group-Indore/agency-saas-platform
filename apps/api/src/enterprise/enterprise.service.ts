import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@saas/shared-types';

@Injectable()
export class EnterpriseService {
  constructor(private readonly prisma: PrismaService) {}

  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        companyName: true,
        supportEmail: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateBranding(tenantId: string, data: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
    supportEmail?: string;
  }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        companyName: data.companyName,
        supportEmail: data.supportEmail,
      },
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        companyName: true,
        supportEmail: true,
      },
    });
  }

  async getChildTenants(parentId: string) {
    const tenants = await this.prisma.tenant.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });

    if (tenants.length === 0) {
      return [];
    }

    const tenantIds = tenants.map((t) => t.id);

    // 1. Grouped user counts
    const userCountsGrouped = await this.prisma.user.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: { id: true },
    });
    const userCountsMap = new Map<string, number>();
    for (const item of userCountsGrouped) {
      if (item.tenantId) {
        userCountsMap.set(item.tenantId, item._count.id);
      }
    }

    // 2. Grouped invoice counts
    const invoiceCountsGrouped = await this.prisma.invoice.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: { id: true },
    });
    const invoiceCountsMap = new Map<string, number>();
    for (const item of invoiceCountsGrouped) {
      if (item.tenantId) {
        invoiceCountsMap.set(item.tenantId, item._count.id);
      }
    }

    // 3. Grouped revenue sums
    const revenueSumsGrouped = await this.prisma.invoice.groupBy({
      by: ['tenantId'],
      where: {
        tenantId: { in: tenantIds },
        status: 'PAID',
      },
      _sum: { amount: true },
    });
    const revenueSumsMap = new Map<string, number>();
    for (const item of revenueSumsGrouped) {
      if (item.tenantId) {
        revenueSumsMap.set(item.tenantId, item._sum.amount || 0);
      }
    }

    // 4. Batch fetch subscriptions and plans
    const subscriptions = await this.prisma.tenantSubscription.findMany({
      where: { tenantId: { in: tenantIds } },
      include: { plan: true },
    });
    const subscriptionsMap = new Map<string, any>();
    for (const sub of subscriptions) {
      subscriptionsMap.set(sub.tenantId, sub);
    }

    return tenants.map((tenant) => {
      const usersCount = userCountsMap.get(tenant.id) || 0;
      const invoicesCount = invoiceCountsMap.get(tenant.id) || 0;
      const totalRevenue = revenueSumsMap.get(tenant.id) || 0;
      const subscription = subscriptionsMap.get(tenant.id);

      return {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        usersCount,
        invoicesCount,
        totalRevenue,
        subscriptionStatus: subscription ? subscription.status : 'NO_SUBSCRIPTION',
        subscriptionPlan: subscription ? subscription.plan.name : 'None',
        createdAt: tenant.createdAt,
      };
    });
  }

  async provisionChildTenant(parentId: string, data: {
    name: string;
    domain: string;
    adminEmail: string;
    adminPasswordPlain: string;
    adminFirstName: string;
    adminLastName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }) {
    // Check if domain is already taken
    const existingDomain = await this.prisma.tenant.findUnique({
      where: { domain: data.domain },
    });
    if (existingDomain) {
      throw new BadRequestException('Domain name is already registered');
    }

    // Check if admin email is already in use
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException('Administrator email is already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.adminPasswordPlain, 10);

    // Create the child tenant and initial administrator user in a database transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          domain: data.domain,
          parentId,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor || '#3b82f6',
          secondaryColor: data.secondaryColor || '#1f2937',
          companyName: data.name,
        },
      });

      // 2. Create User
      const user = await tx.user.create({
        data: {
          email: data.adminEmail,
          password: hashedPassword,
          firstName: data.adminFirstName,
          lastName: data.adminLastName || '',
          role: UserRole.AGENCY_OWNER, // New child tenant administrator
          tenantId: tenant.id,
        },
      });

      // 3. Bind a JIT Starter plan subscription
      let starterPlan = await tx.subscriptionPlan.findUnique({
        where: { name: 'Starter' },
      });

      if (!starterPlan) {
        starterPlan = await tx.subscriptionPlan.create({
          data: {
            name: 'Starter',
            price: 49.0,
            billingCycle: 'MONTHLY',
            features: ['CRM Basic', 'Lead scoring', 'WhatsApp integration (100 messages/mo)', 'Billing basic'],
          },
        });
      }

      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: starterPlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
      });

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        domain: tenant.domain,
        adminUserId: user.id,
        adminEmail: user.email,
      };
    });
  }

  async getEnterpriseAnalytics(parentId: string) {
    const children = await this.prisma.tenant.findMany({
      where: { parentId },
      select: { id: true, name: true },
    });

    const childrenIds = children.map(c => c.id);

    if (childrenIds.length === 0) {
      return {
        totalSubTenants: 0,
        totalAggregatedRevenue: 0,
        totalAggregatedInvoices: 0,
        totalAggregatedUsers: 0,
        revenueByLocation: [],
      };
    }

    const totalAggregatedInvoices = await this.prisma.invoice.count({
      where: { tenantId: { in: childrenIds } },
    });

    const totalAggregatedUsers = await this.prisma.user.count({
      where: { tenantId: { in: childrenIds } },
    });

    // 1. Grouped revenue sums
    const revenueGrouped = await this.prisma.invoice.groupBy({
      by: ['tenantId'],
      where: {
        tenantId: { in: childrenIds },
        status: 'PAID',
      },
      _sum: { amount: true },
    });
    const revenueMap = new Map<string, number>();
    for (const item of revenueGrouped) {
      if (item.tenantId) {
        revenueMap.set(item.tenantId, item._sum.amount || 0);
      }
    }

    // 2. Grouped leads counts
    const leadCountsGrouped = await this.prisma.lead.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: childrenIds } },
      _count: { id: true },
    });
    const leadCountsMap = new Map<string, number>();
    for (const item of leadCountsGrouped) {
      if (item.tenantId) {
        leadCountsMap.set(item.tenantId, item._count.id);
      }
    }

    let totalAggregatedRevenue = 0;
    const revenueByLocation = children.map((child) => {
      const revenue = revenueMap.get(child.id) || 0;
      const leadsCount = leadCountsMap.get(child.id) || 0;
      totalAggregatedRevenue += revenue;

      return {
        id: child.id,
        name: child.name,
        revenue,
        leadsCount,
      };
    });

    return {
      totalSubTenants: childrenIds.length,
      totalAggregatedRevenue,
      totalAggregatedInvoices,
      totalAggregatedUsers,
      revenueByLocation: revenueByLocation.sort((a, b) => b.revenue - a.revenue),
    };
  }
}
