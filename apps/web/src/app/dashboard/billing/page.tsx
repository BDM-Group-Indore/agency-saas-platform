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
  AlertTriangle,
  History,
  Percent,
  Receipt
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
  businessGstin?: string | null;
  clientGstin?: string | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  taxAmount?: number | null;
  createdAt: string;
  updatedAt: string;
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

interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentMethod: string;
  gatewayTransactionId?: string | null;
  gatewayResponse?: any;
  paidAt?: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    invoiceNumber: string;
    clientName: string;
  };
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'subscription'>('invoices');
  
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
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);

  // UI Control States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States (Invoice Creation)
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [businessGstin, setBusinessGstin] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  // Phase 8 Interactive States
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<PaymentTransaction[]>([]);
  const [isLoadingInvoicePayments, setIsLoadingInvoicePayments] = useState(false);

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [gatewayTransactionId, setGatewayTransactionId] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookInvoiceId, setWebhookInvoiceId] = useState('');
  const [webhookAmount, setWebhookAmount] = useState<number>(0);
  const [webhookMethod, setWebhookMethod] = useState<string>('STRIPE');
  const [webhookGatewayId, setWebhookGatewayId] = useState('');
  const [webhookEvent, setWebhookEvent] = useState<string>('payment.succeeded');

  // Load All Data
  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const [invData, summaryData, subData, plansData, paymentsData] = await Promise.all([
        apiRequest('/billing/invoices'),
        apiRequest('/billing/summary'),
        apiRequest('/billing/subscription'),
        apiRequest('/billing/plans'),
        apiRequest('/billing/payments')
      ]);

      setInvoices(invData || []);
      setSummary(summaryData || { totalRevenue: 0, paidInvoices: 0, pendingAmount: 0, overdueCount: 0 });
      setSubscription(subData || null);
      setPlans(plansData || []);
      setPayments(paymentsData || []);
    } catch (err: any) {
      console.error('Failed to load billing metrics:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Invoice helper
  const getInvoiceTotal = (inv: Invoice) => {
    return inv.amount + (inv.taxAmount || 0);
  };

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

  // Load Payments for Selected Invoice
  const loadInvoicePayments = async (invoiceId: string) => {
    try {
      setIsLoadingInvoicePayments(true);
      const data = await apiRequest(`/billing/invoices/${invoiceId}/payments`);
      setInvoicePayments(data || []);
    } catch (err: any) {
      console.error('Failed to load invoice payment history:', err.message);
    } finally {
      setIsLoadingInvoicePayments(false);
    }
  };

  const openInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoiceForView(invoice);
    loadInvoicePayments(invoice.id);
  };

  const openRecordPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount(getInvoiceTotal(invoice));
    setPaymentMethod('CASH');
    setGatewayTransactionId('');
    setIsPaymentModalOpen(true);
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
        businessGstin: businessGstin.trim() || undefined,
        clientGstin: clientGstin.trim() || undefined,
        taxRate: taxRate ? Number(taxRate) : undefined,
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
      setBusinessGstin('');
      setClientGstin('');
      setTaxRate(18);
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

  // Record Manual Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    try {
      setIsSubmitting(true);
      const payload = {
        amount: Number(paymentAmount),
        paymentMethod,
        gatewayTransactionId: gatewayTransactionId.trim() || undefined,
      };
      await apiRequest(`/billing/invoices/${selectedInvoiceForPayment.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIsPaymentModalOpen(false);
      setSelectedInvoiceForPayment(null);
      
      // Reload
      await loadBillingData();
      
      // If we are currently looking at the invoice details, reload its records too
      if (selectedInvoiceForView && selectedInvoiceForView.id === selectedInvoiceForPayment.id) {
        const updatedInvoice = await apiRequest(`/billing/invoices/${selectedInvoiceForView.id}`);
        setSelectedInvoiceForView(updatedInvoice);
        await loadInvoicePayments(selectedInvoiceForView.id);
      }
      
      alert('Manual payment logged successfully in ledger.');
    } catch (err: any) {
      alert(`Failed to record payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process Simulated Webhook Handler
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInvoiceId) {
      alert('Please select an invoice for the webhook simulation.');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        event: webhookEvent,
        invoiceId: webhookInvoiceId,
        amount: Number(webhookAmount),
        paymentMethod: webhookMethod,
        gatewayTransactionId: webhookGatewayId.trim() || `webhk_${Math.random().toString(36).substr(2, 9)}`,
      };
      
      await apiRequest('/billing/payments/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setIsWebhookModalOpen(false);
      await loadBillingData();
      
      // If we are currently looking at the invoice details, reload its records too
      if (selectedInvoiceForView && selectedInvoiceForView.id === webhookInvoiceId) {
        const updatedInvoice = await apiRequest(`/billing/invoices/${selectedInvoiceForView.id}`);
        setSelectedInvoiceForView(updatedInvoice);
        await loadInvoicePayments(selectedInvoiceForView.id);
      }
      
      alert(`Simulated Webhook Ingestion Successful! The transaction status has been updated in the ledger.`);
    } catch (err: any) {
      alert(`Failed to simulate webhook event: ${err.message}`);
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
            Create client invoices, track receivables, audit the payment transaction ledger, and manage your agency subscription plan.
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
              onClick={() => setActiveTab('payments')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'payments'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Payments Ledger
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
          {activeTab === 'payments' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const pendingInvoice = invoices.find(i => i.status === 'SENT' || i.status === 'DRAFT');
                setWebhookInvoiceId(pendingInvoice?.id || '');
                setWebhookAmount(pendingInvoice ? getInvoiceTotal(pendingInvoice) : 0);
                setWebhookMethod('STRIPE');
                setWebhookGatewayId(`ch_${Math.random().toString(36).substr(2, 12)}`);
                setWebhookEvent('payment.succeeded');
                setIsWebhookModalOpen(true);
              }}
              className="border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Simulate Webhook
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
                  View and manage accounts receivable, log manual/online payment transactions, or audit tax parameters.
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
                            <div className="flex flex-col items-end">
                              <span>
                                {getInvoiceTotal(inv).toLocaleString(undefined, { style: 'currency', currency: inv.currency })}
                              </span>
                              {inv.taxAmount && inv.taxAmount > 0 ? (
                                <span className="text-[9px] text-indigo-500 font-bold tracking-wider mt-0.5">
                                  INCL. GST ({inv.currency === 'INR' ? '₹' : '$'}{inv.taxAmount})
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            {getStatusBadge(inv.status)}
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openInvoiceDetails(inv)}
                                title="View Details & Ledger"
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <FileText className="w-4.5 h-4.5" />
                              </button>
                              {inv.status === 'DRAFT' && (
                                <button
                                  onClick={() => handleInvoiceAction(inv.id, 'SEND')}
                                  title="Send Invoice to client"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 transition-colors cursor-pointer"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                                <button
                                  onClick={() => openRecordPaymentModal(inv)}
                                  title="Record Payment Transaction"
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 transition-colors cursor-pointer"
                                >
                                  <CreditCard className="w-4 h-4 font-bold" />
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
      ) : activeTab === 'payments' ? (
        /* Payment Ledger Tab */
        <Card className="flex flex-col gap-4">
          <div className="border-b border-slate-200 dark:border-dark-border pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Payment Transactions Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Audit trail of all incoming and outgoing payments, manual postings, and gateway captures.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const pendingInvoice = invoices.find(i => i.status === 'SENT' || i.status === 'DRAFT');
                setWebhookInvoiceId(pendingInvoice?.id || '');
                setWebhookAmount(pendingInvoice ? getInvoiceTotal(pendingInvoice) : 0);
                setWebhookMethod('STRIPE');
                setWebhookGatewayId(`ch_${Math.random().toString(36).substr(2, 12)}`);
                setWebhookEvent('payment.succeeded');
                setIsWebhookModalOpen(true);
              }}
              className="text-[10px] uppercase font-bold py-1 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            >
              Simulate External Webhook
            </Button>
          </div>

          <div className="overflow-x-auto">
            {payments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                No payment transactions have been logged. Register a payment or simulate a webhook to populate the ledger.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pt-2">Transaction ID</th>
                    <th className="pb-3 pt-2">Invoice Code</th>
                    <th className="pb-3 pt-2">Billed Client</th>
                    <th className="pb-3 pt-2">Payment Date</th>
                    <th className="pb-3 pt-2">Method</th>
                    <th className="pb-3 pt-2">Gateway reference</th>
                    <th className="pb-3 pt-2 text-right">Amount Billed</th>
                    <th className="pb-3 pt-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {payments.map((tx) => {
                    const matchedInvoice = invoices.find(i => i.id === tx.invoiceId);
                    const curr = matchedInvoice?.currency || 'USD';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-4 font-mono font-bold text-primary">{tx.id.substring(0, 10)}...</td>
                        <td className="py-4 font-mono font-bold">{tx.invoice?.invoiceNumber || 'Unknown'}</td>
                        <td className="py-4 font-semibold text-slate-850 dark:text-slate-200">{tx.invoice?.clientName || 'Unknown Client'}</td>
                        <td className="py-4">{tx.paidAt ? new Date(tx.paidAt).toLocaleString() : 'N/A'}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-4 font-mono text-slate-500 text-[10px]">{tx.gatewayTransactionId || 'CASH/MANUAL'}</td>
                        <td className="py-4 text-right font-black text-slate-900 dark:text-white font-mono">
                          {tx.amount.toLocaleString(undefined, { style: 'currency', currency: curr })}
                        </td>
                        <td className="py-4 text-center">
                          <span className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider',
                            tx.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' : 
                            tx.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' : 
                            'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                          )}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
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

          {/* GST Configuration Grid */}
          <div className="border-t border-slate-200 dark:border-dark-border pt-4 mt-1 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tax & GST Registration (Optional)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Business GSTIN (15-digit)"
                type="text"
                placeholder="e.g. 23AAAAA1111A1Z1"
                value={businessGstin}
                onChange={(e) => setBusinessGstin(e.target.value.toUpperCase())}
              />
              <Input
                label="Client GSTIN (15-digit)"
                type="text"
                placeholder="e.g. 23BBBBB2222B2Z2"
                value={clientGstin}
                onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
              />
              <Input
                label="GST Tax Rate (%)"
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 18"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              State-code logic automatically determines GST components: matching state digits extract SGST & CGST (50/50 split), whereas different code prefixes invoke 100% IGST.
            </p>
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

      {/* Invoice Details & Breakdown Modal */}
      {selectedInvoiceForView && (
        <Modal
          isOpen={!!selectedInvoiceForView}
          onClose={() => setSelectedInvoiceForView(null)}
          title={`Invoice Details: ${selectedInvoiceForView.invoiceNumber}`}
          size="lg"
        >
          <div className="flex flex-col gap-5 text-slate-800 dark:text-slate-200">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Client Info</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedInvoiceForView.clientName}</span>
                <span className="text-xs text-slate-500 font-mono mt-0.5">{selectedInvoiceForView.clientEmail || 'No Billing Email'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status & Date</span>
                <div className="mt-1">{getStatusBadge(selectedInvoiceForView.status)}</div>
                <span className="text-xs text-slate-400 font-semibold mt-1">Due: {new Date(selectedInvoiceForView.dueDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* GST Details */}
            {(selectedInvoiceForView.businessGstin || selectedInvoiceForView.clientGstin) && (
              <div className="bg-indigo-550/5 dark:bg-indigo-550/10 p-3 rounded-xl border border-indigo-500/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Business GSTIN</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedInvoiceForView.businessGstin || 'Not Provided'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Client GSTIN</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedInvoiceForView.clientGstin || 'Not Provided'}</span>
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Line Items</span>
              <div className="border border-slate-150 dark:border-slate-800/80 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center w-12">Qty</th>
                      <th className="p-2.5 text-right w-24">Price</th>
                      <th className="p-2.5 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {selectedInvoiceForView.lineItems.map((item, idx) => (
                      <tr key={idx} className="text-slate-750 dark:text-slate-300 font-medium">
                        <td className="p-2.5">{item.description}</td>
                        <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">{item.unitPrice.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{item.total.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations and Ledger Summary */}
            <div className="flex justify-between items-start pt-2">
              <div className="text-xs text-slate-450 max-w-[50%]">
                {selectedInvoiceForView.notes && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Invoice Notes</span>
                    <p className="italic text-slate-500 leading-normal">{selectedInvoiceForView.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-right font-semibold text-slate-600 dark:text-slate-350 w-48">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{selectedInvoiceForView.amount.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</span>
                </div>

                {selectedInvoiceForView.cgst !== null && selectedInvoiceForView.cgst !== undefined && selectedInvoiceForView.cgst > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>CGST (50%)</span>
                    <span className="font-mono">+{selectedInvoiceForView.cgst.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</span>
                  </div>
                ) : null}
                {selectedInvoiceForView.sgst !== null && selectedInvoiceForView.sgst !== undefined && selectedInvoiceForView.sgst > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>SGST (50%)</span>
                    <span className="font-mono">+{selectedInvoiceForView.sgst.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</span>
                  </div>
                ) : null}
                {selectedInvoiceForView.igst !== null && selectedInvoiceForView.igst !== undefined && selectedInvoiceForView.igst > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>IGST (100%)</span>
                    <span className="font-mono">+{selectedInvoiceForView.igst.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</span>
                  </div>
                ) : null}

                <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-sm font-black text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {getInvoiceTotal(selectedInvoiceForView).toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments Ledger list for this invoice */}
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transaction Ledger logs</span>
                {selectedInvoiceForView.status !== 'PAID' && selectedInvoiceForView.status !== 'VOID' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => openRecordPaymentModal(selectedInvoiceForView)} className="text-[9px] uppercase font-bold py-0.5">
                    Record Payment
                  </Button>
                )}
              </div>

              {isLoadingInvoicePayments ? (
                <div className="py-4 text-center text-xs text-slate-400">Loading transaction logs...</div>
              ) : invoicePayments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic font-medium bg-slate-50/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200/60 dark:border-slate-700/50">
                  No payment ledger transactions logged.
                </div>
              ) : (
                <div className="border border-slate-150 dark:border-slate-800/60 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-150 dark:border-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="p-2">Date</th>
                        <th className="p-2">Method</th>
                        <th className="p-2">Reference ID</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {invoicePayments.map((pay) => (
                        <tr key={pay.id} className="text-slate-600 dark:text-slate-350">
                          <td className="p-2 font-mono text-[10px]">{pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-105 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-700/40">
                              {pay.paymentMethod}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-[9px] text-slate-500">{pay.gatewayTransactionId || 'CASH/MANUAL'}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{pay.amount.toLocaleString(undefined, { style: 'currency', currency: selectedInvoiceForView.currency })}</td>
                          <td className="p-2 text-center">
                            <span className={cn(
                              'px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase',
                              pay.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            )}>
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedInvoiceForView(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Transaction Modal */}
      {selectedInvoiceForPayment && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          title={`Record Payment: ${selectedInvoiceForPayment.invoiceNumber}`}
          size="md"
        >
          <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Log a manual transaction record to the internal ledger. This updates the billing status.
            </p>

            <Input
              label="Payment Amount"
              type="number"
              step="any"
              min={0.01}
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-55 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="CASH">CASH / CASH IN HAND</option>
                <option value="BANK_TRANSFER">BANK WIRE / TRANSFER</option>
                <option value="STRIPE">STRIPE (CARD MANUAL)</option>
                <option value="RAZORPAY">RAZORPAY (NETBANKING)</option>
              </select>
            </div>

            <Input
              label="Gateway reference ID / Check Number (Optional)"
              type="text"
              placeholder="e.g. TXN_4193024823"
              value={gatewayTransactionId}
              onChange={(e) => setGatewayTransactionId(e.target.value)}
            />

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-dark-border pt-4 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedInvoiceForPayment(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Logging Transaction...' : 'Post Transaction'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Webhook Simulation Modal */}
      {isWebhookModalOpen && (
        <Modal
          isOpen={isWebhookModalOpen}
          onClose={() => setIsWebhookModalOpen(false)}
          title="Simulate Payment Gateway Webhook"
          size="md"
        >
          <form onSubmit={handleSimulateWebhook} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Dispatches an asynchronous payment event mock payload directly to the public endpoint `/api/billing/payments/webhook`.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Invoice
              </label>
              <select
                value={webhookInvoiceId}
                onChange={(e) => {
                  setWebhookInvoiceId(e.target.value);
                  const matched = invoices.find(i => i.id === e.target.value);
                  if (matched) setWebhookAmount(getInvoiceTotal(matched));
                }}
                className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-55 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Unpaid Invoice --</option>
                {invoices.filter(i => i.status !== 'PAID' && i.status !== 'VOID').map(i => (
                  <option key={i.id} value={i.id}>{i.invoiceNumber} - {i.clientName} ({i.currency} {getInvoiceTotal(i)})</option>
                ))}
              </select>
            </div>

            <Input
              label="Transaction Amount"
              type="number"
              step="any"
              required
              value={webhookAmount}
              onChange={(e) => setWebhookAmount(Number(e.target.value))}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Payment Processor Gateway
              </label>
              <select
                value={webhookMethod}
                onChange={(e) => setWebhookMethod(e.target.value)}
                className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-55 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="STRIPE">Stripe API Hook</option>
                <option value="RAZORPAY">Razorpay Hook</option>
              </select>
            </div>

            <Input
              label="Mock Gateway Reference ID"
              type="text"
              required
              placeholder="e.g. ch_1OtgX2LkdIw"
              value={webhookGatewayId}
              onChange={(e) => setWebhookGatewayId(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Webhook Event Payload
              </label>
              <select
                value={webhookEvent}
                onChange={(e) => setWebhookEvent(e.target.value)}
                className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-55 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="payment.succeeded">payment.succeeded (Success Capture)</option>
                <option value="payment.failed">payment.failed (Failed Capture)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-dark-border pt-4 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsWebhookModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Simulating Webhook Event...' : 'Inject Event Callback'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
