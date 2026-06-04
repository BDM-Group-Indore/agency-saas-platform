// Phase 5: Billing & Analytics shared interfaces

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  VOID = 'VOID',
  OVERDUE = 'OVERDUE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  clientName: string;
  clientEmail?: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date | null;
  lineItems: InvoiceLineItem[];
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  maxUsers: number;
  features: string[];
  isActive: boolean;
}

export interface ITenantSubscription {
  id: string;
  tenantId: string;
  plan: ISubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date | null;
  trialEndsAt?: Date | null;
}

// Analytics DTOs
export interface IAnalyticsSummary {
  totalLeads: number;
  leadsThisMonth: number;
  leadsGrowthPct: number;
  totalDeals: number;
  totalDealsValue: number;
  wonDealsValue: number;
  conversionRate: number;
  openConversations: number;
  totalCampaigns: number;
  totalRevenue: number;
}

export interface IFunnelStage {
  name: string;
  count: number;
  value?: number;
}

export interface IAnalyticsFunnel {
  stages: IFunnelStage[];
}

export interface IRevenuePoint {
  month: string;
  revenue: number;
  invoiceCount: number;
}
