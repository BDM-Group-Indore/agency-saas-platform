'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';
import {
  CreditCard,
  Download,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Send,
  Check,
  Ban,
  Calendar,
  Mail,
  User,
  AlertCircle,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string | null;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE';
  dueDate: string;
  paidAt?: string | null;
  lineItems: InvoiceLineItem[];
  notes?: string | null;
  createdAt: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  maxUsers: number;
  features: string[];
  isActive: boolean;
}

interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: SubscriptionPlan;
}

interface BillingSummary {
  totalRevenue: number;
  paidInvoices: number;
  pendingAmount: number;
  overdueCount: number;
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscription'>('invoices');
  
  // Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [summary, setSummary] = useState<BillingSummary>({
    totalRevenue: 0,
    paidInvoices: 0,
    pendingAmount: 0,
    overdueCount: 0,
  });

  // UI Control States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  // Load All Data
  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const [invData, summaryData, subData, plansData] = await Promise.all([
        apiRequest('/billing/invoices'),
        apiRequest('/billing/summary'),
        apiRequest('/billing/subscription'),
        apiRequest('/billing/plans')
      ]);

      setInvoices(invData || []);
      setSummary(summaryData || { totalRevenue: 0, paidInvoices: 0, pendingAmount: 0, overdueCount: 0 });
      setSubscription(subData || null);
      setPlans(plansData || []);
    } catch (err: any) {
      console.error('Failed to load billing metrics:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Line Items Helper
  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const item = updated[index];
    
    if (field === 'description') {
      item.description = value;
    } else if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value) || 1);
      item.total = item.quantity * item.unitPrice;
    } else if (field === 'unitPrice') {
      item.unitPrice = Math.max(0, parseFloat(value) || 0);
      item.total = item.quantity * item.unitPrice;
    }
    
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((acc, curr) => acc + curr.total, 0);
  };

  // Submit Invoice Creation Form
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || lineItems.some(i => !i.description.trim())) {
      alert('Please fill in the client name and all line item descriptions.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        dueDate: new Date(dueDate).toISOString(),
        currency,
        notes: notes.trim() || undefined,
        lineItems: lineItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total
        }))
      };

      await apiRequest('/billing/invoices', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Clear Form & Close Modal
      setClientName('');
      setClientEmail('');
      setDueDate('');
      setNotes('');
      setLineItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setIsModalOpen(false);

      // Reload
      await loadBillingData();
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status Action Handler
  const handleInvoiceAction = async (invoiceId: string, action: 'SEND' | 'MARK_PAID' | 'VOID') => {
    try {
      await apiRequest(`/billing/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
      });
      await loadBillingData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Delete Invoice Handler
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action is irreversible.')) return;
    try {
      await apiRequest(`/billing/invoices/${invoiceId}`, {
        method: 'DELETE'
      });
      await loadBillingData();
    } catch (err: any) {
      alert(`Failed to delete invoice: ${err.message}`);
    }
  };

  // Upgrade Plan Action Handler
  const handleUpgradePlan = async (planId: string, planName: string) => {
    if (!confirm(`Confirm upgrade/change to subscription tier: "${planName}"?`)) return;
    try {
      setIsSubmitting(true);
      await apiRequest('/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ planId })
      });
      alert(`Success! Your platform subscription tier has been upgraded to ${planName}.`);
      await loadBillingData();
    } catch (err: any) {
      alert(`Upgrade failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper Status Badge
  const getStatusBadge = (status: Invoice['status']) => {
    const styles = {
      DRAFT: 'bg-slate-500/10 text-slate-500 border border-slate-500/25',
      SENT: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25',
      PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold',
      VOID: 'bg-rose-500/10 text-rose-500 border border-rose-500/25',
      OVERDUE: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/25 font-semibold animate-pulse',
    };
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1', styles[status])}>
        {status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header and Toggle Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Billing & Invoicing Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Create client invoices, track receivables, and manage your agency subscription plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/60 inline-flex">
            <button
              onClick={() => setActiveTab('invoices')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'invoices'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Client Invoices
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'subscription'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Agency Tier Subscription
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={loadBillingData} title="Refresh Ledger Data">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {activeTab === 'invoices' && (
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5 font-bold" /> Create Invoice
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-slate-400 font-medium">
          Loading billing module databases...
        </div>
      ) : activeTab === 'invoices' ? (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Aggregate Revenue (PAID)"
              value={`$${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
              subtitle="From successfully paid invoices"
            />
            <StatsCard
              title="Paid Invoices count"
              value={summary.paidInvoices.toString()}
              icon={<CheckCircle2 className="w-5 h-5 text-indigo-500" />}
              subtitle="Total completed transactions"
            />
            <StatsCard
              title="Pending Receivables"
              value={`$${summary.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<FileText className="w-5 h-5 text-amber-500" />}
              subtitle="Draft or Sent invoices outstanding"
            />
            <StatsCard
              title="Overdue Invoices"
              value={summary.overdueCount.toString()}
              icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
              subtitle="Passed payment terms due date"
            />
          </div>

          {/* Invoices Directory Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Table registry */}
            <Card className="lg:col-span-3 flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                  Client Invoices List
                </h3>
                <p className="text-xs text-slate-400">
                  View and manage accounts receivable, change invoice state, or delete drafts.
                </p>
              </div>

              <div className="overflow-x-auto">
                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    No invoices have been logged. Click "Create Invoice" to begin.
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="pb-3 pt-2">Invoice Code</th>
                        <th className="pb-3 pt-2">Billed Client</th>
                        <th className="pb-3 pt-2">Due Date</th>
                        <th className="pb-3 pt-2 text-right">Invoice Amount</th>
                        <th className="pb-3 pt-2 text-center">Status</th>
                        <th className="pb-3 pt-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-4 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                {inv.clientName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.clientEmail || 'No billing email'}</span>
                            </div>
                          </td>
                          <td className="py-4 font-semibold">{new Date(inv.dueDate).toLocaleDateString()}</td>
                          <td className="py-4 text-right font-bold text-slate-900 dark:text-white">
                            {inv.amount.toLocaleString(undefined, { style: 'currency', currency: inv.currency })}
                          </td>
                          <td className="py-4 text-center">
                            {getStatusBadge(inv.status)}
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {inv.status === 'DRAFT' && (
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'SEND')}
                                  title="Send Invoice to client"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 transition-colors cursor-pointer"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              {(inv.status === 'DRAFT' || inv.status === 'SENT') && (
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'MARK_PAID')}
                                  title="Mark as Paid"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 transition-colors cursor-pointer"
                                >
                                  <Check className="w-4 h-4 font-bold" />
                                </button>
                              )}
                              {inv.status !== 'VOID' && inv.status !== 'PAID' && (
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'VOID')}
                                  title="Void Invoice"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 transition-colors cursor-pointer"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              {inv.status !== 'PAID' && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  title="Delete Invoice"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* SaaS Subscriptions Tab */
        <div className="flex flex-col gap-6">
          
          {/* Active plan overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Active Plan Detail */}
            <Card className="md:col-span-2 flex flex-col gap-4 border-l-4 border-indigo-500">
              <div className="pb-2 border-b border-slate-200 dark:border-dark-border flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">ACTIVE SUBSCRIPTION</span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-50 mt-0.5">
                    {subscription ? subscription.plan.name : 'No Active Plan'}
                  </h3>
                </div>
                {subscription && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase border border-emerald-500/20">
                    {subscription.status}
                  </span>
                )}
              </div>

              {subscription ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Billing Rate</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      ${subscription.plan.price} / mo
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Maximum Agents</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      {subscription.plan.maxUsers} Users limit
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 mt-2">
                    <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Renews / Ends On</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-normal">
                  Your tenant profile does not currently have an active plan linked. Select a tier package below to initialize agency services.
                </p>
              )}
            </Card>

            {/* Payment Details info card */}
            <Card className="flex flex-col gap-4 justify-between">
              <div className="pb-2 border-b border-slate-200 dark:border-dark-border">
                <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-50">Active Payment Gateway</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Secure card profile logged under billing account.</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950 to-indigo-900 text-white relative overflow-hidden flex flex-col gap-3 shadow-lg border border-indigo-800">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-300">VISA BUSINESS PLATINUM</span>
                  <CreditCard className="w-5 h-5 text-indigo-200" />
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-xs font-mono tracking-widest font-bold">••••  ••••  ••••  4242</span>
                  <div className="flex justify-between items-center text-[8px] text-indigo-200 mt-1">
                    <span>SHIVAM GUPTA</span>
                    <span>EXP: 09/28</span>
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* Pricing Grid */}
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">Available Subscription Plan Tiers</h3>
              <p className="text-xs text-slate-400">Select the plan package that scales with your agency. Upgrades/downgrades apply instantly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isActive = subscription?.planId === plan.id;
                
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'flex flex-col gap-5 justify-between relative border border-slate-200/50 dark:border-slate-800/60 p-6',
                      isActive ? 'border-primary dark:border-primary ring-2 ring-primary/20 bg-indigo-50/10 dark:bg-indigo-950/5' : ''
                    )}
                  >
                    {isActive && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                        Active Plan
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.name}</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-display font-bold text-slate-900 dark:text-slate-50">${plan.price}</span>
                        <span className="text-xs text-slate-400 font-semibold">/ month</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Supports up to {plan.maxUsers} agent users.</p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex-1">
                      <ul className="flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-350">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 leading-tight">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant={isActive ? 'outline' : 'primary'}
                        size="sm"
                        className="w-full font-bold uppercase tracking-wider text-[10px]"
                        disabled={isActive || isSubmitting}
                        onClick={() => handleUpgradePlan(plan.id, plan.name)}
                      >
                        {isActive ? 'Current Plan' : 'Subscribe Tier'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Invoice Creation Overlay Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate New Client Invoice"
        size="xl"
      >
        <form onSubmit={handleCreateInvoice} className="flex flex-col gap-5">
          
          {/* Client Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Client Name / Business Name"
              type="text"
              required
              placeholder="e.g. BDM Group Indore"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Input
              label="Client Invoice Email"
              type="email"
              placeholder="e.g. accounts@bdm.in"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payment Terms Due Date"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Invoice Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Line Items Builder Section */}
          <div className="flex flex-col gap-3.5 border-t border-slate-200 dark:border-dark-border pt-4 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice Line Items</span>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="text-[10px] uppercase font-bold py-1">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>

            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-1">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      type="text"
                      required
                      placeholder="Line Description"
                      className="py-2"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      min={1}
                      required
                      className="py-2 text-center"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      required
                      placeholder="Price"
                      className="py-2"
                      value={item.unitPrice || ''}
                      onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                    />
                  </div>
                  <div className="w-24 text-right pr-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                    {item.total.toLocaleString(undefined, { style: 'currency', currency })}
                  </div>
                  <button
                    type="button"
                    disabled={lineItems.length === 1}
                    onClick={() => removeLineItem(idx)}
                    className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total area */}
          <div className="flex justify-between items-center border-t border-slate-200 dark:border-dark-border pt-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Notes (Optional)</span>
              <input
                type="text"
                placeholder="Payment terms, bank coordinates, thank you..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/30 text-slate-800 dark:text-slate-200 p-2 w-64 md:w-80 mt-1 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">GRAND TOTAL</span>
              <span className="text-xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                {calculateGrandTotal().toLocaleString(undefined, { style: 'currency', currency })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-200 dark:border-dark-border pt-4 mt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Invoice...' : 'Create Draft Invoice'}
            </Button>
          </div>

        </form>
      </Modal>

    </div>
  );
}
