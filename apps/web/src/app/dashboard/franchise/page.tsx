'use client';

import { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  Users,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Check,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';

interface FranchiseTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  supportEmail?: string;
  isActive: boolean;
  _count?: { users: number };
  createdAt: string;
}

// ── stat card component ────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-2 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </Card>
  );
}

// ── activity mock (no separate endpoint needed, generated client-side) ─────────
const MOCK_ACTIVITY = [
  { label: 'New franchise onboarded', time: '2 hours ago', icon: Store, color: 'text-primary' },
  { label: 'Plan upgraded: GROWTH → PRO', time: '5 hours ago', icon: TrendingUp, color: 'text-violet-500' },
  { label: 'Branding applied to FreshMart', time: '1 day ago', icon: ShieldCheck, color: 'text-emerald-500' },
];

export default function FranchisePage() {
  const [tenants, setTenants] = useState<FranchiseTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newPlan, setNewPlan] = useState('STARTER');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newSupportEmail, setNewSupportEmail] = useState('');
  const [createError, setCreateError] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/enterprise/children');
      // Franchise tenants are same collection as reseller — filter/display differently
      setTenants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load franchise tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) {
      setCreateError('Name and Slug are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await apiRequest('/enterprise/children', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          plan: newPlan,
          companyName: newCompanyName || undefined,
          supportEmail: newSupportEmail || undefined,
        }),
      });
      setShowCreateModal(false);
      setNewName(''); setNewSlug(''); setNewPlan('STARTER');
      setNewCompanyName(''); setNewSupportEmail('');
      fetchTenants();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create franchise tenant.');
    } finally {
      setCreating(false);
    }
  };

  const handleSwitchContext = (tenantId: string) => {
    setSwitchingTo(tenantId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeSwitchTenantId', tenantId);
      window.dispatchEvent(new Event('tenant-switch'));
    }
    setTimeout(() => setSwitchingTo(null), 1500);
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-7 h-7 text-violet-500" />
            Franchise Panel
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Oversee your franchise network — manage branches, assign plans, and operate from their context.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTenants}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 border-violet-600"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Franchise
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Franchises" value={tenants.length} icon={Store} color="text-violet-500" />
        <StatCard label="Active" value={tenants.filter((t) => t.isActive).length} icon={Check} color="text-emerald-500" />
        <StatCard
          label="Total Members"
          value={tenants.reduce((a, t) => a + (t._count?.users ?? 0), 0)}
          icon={Users}
          color="text-primary"
        />
        <StatCard
          label="Enterprise Plans"
          value={tenants.filter((t) => t.plan === 'ENTERPRISE').length}
          icon={TrendingUp}
          color="text-amber-500"
          sub="Highest tier"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: franchise list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search franchise by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {loading ? (
            <Card className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading franchise tenants...</p>
            </Card>
          ) : error ? (
            <Card className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
              <p className="text-sm text-rose-500">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTenants}>Retry</Button>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 gap-3">
              <Store className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {tenants.length === 0
                  ? 'No franchise branches yet. Create your first one!'
                  : 'No results match your search.'}
              </p>
              {tenants.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 border-violet-600"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Franchise
                </Button>
              )}
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((tenant, idx) => (
                <Card
                  key={tenant.id}
                  className="flex flex-col gap-3 hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: tenant.primaryColor || '#7c3aed' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-extrabold"
                        style={{
                          background: tenant.primaryColor
                            ? `linear-gradient(135deg, ${tenant.primaryColor}, #7c3aed)`
                            : 'linear-gradient(135deg, #7c3aed, #1f2937)',
                        }}
                      >
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          (tenant.companyName || tenant.name)[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {tenant.companyName || tenant.name}
                        </p>
                        <p className="text-xs font-mono text-slate-400">/{tenant.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          tenant.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}
                      >
                        {tenant.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {tenant.supportEmail && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Mail className="w-3 h-3" /> {tenant.supportEmail}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="w-3 h-3" /> {tenant._count?.users ?? 0} members
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />{' '}
                      {new Date(tenant.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                      {tenant.plan}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-dark-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSwitchContext(tenant.id)}
                      disabled={switchingTo === tenant.id}
                    >
                      {switchingTo === tenant.id ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Switching...</>
                      ) : (
                        <><ArrowRight className="w-3 h-3 mr-1" /> Enter Context</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <BarChart2 className="w-3 h-3 mr-1" /> Analytics
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Activity Feed */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="border-b border-slate-200 dark:border-dark-border pb-3">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-50">
                Recent Activity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest franchise events across the network.</p>
            </div>

            <div className="flex flex-col gap-4">
              {MOCK_ACTIVITY.map(({ label, time, icon: Icon, color }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 ${color} shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Tips */}
          <Card className="flex flex-col gap-3 bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
            <p className="text-xs font-semibold text-violet-800 dark:text-violet-300">
              Franchise Isolation
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
              Each franchise branch operates in full data isolation. Switching context gives you
              read/write access to that branch's leads, invoices and reports.
            </p>
          </Card>
        </div>
      </div>

      {/* Create Franchise Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(''); }}
        title="Create New Franchise Branch"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Branch Name *"
            type="text"
            placeholder="e.g. FreshMart Indore"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
            }}
            required
          />
          <Input
            label="Slug *"
            type="text"
            placeholder="freshmart-indore"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              {['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <Input
            label="Company / Branch Display Name"
            type="text"
            placeholder="FreshMart — Indore Branch"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
          />
          <Input
            label="Support Email"
            type="email"
            placeholder="support@freshmart-indore.com"
            value={newSupportEmail}
            onChange={(e) => setNewSupportEmail(e.target.value)}
          />

          {createError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs text-rose-600 dark:text-rose-400">{createError}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 bg-violet-600 hover:bg-violet-700 border-violet-600"
              disabled={creating}
            >
              {creating ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Franchise</>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
