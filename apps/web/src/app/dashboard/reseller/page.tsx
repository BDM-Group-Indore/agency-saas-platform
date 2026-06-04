'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  BarChart2,
  Palette,
  ExternalLink,
  Loader2,
  ArrowRight,
  ChevronRight,
  Globe,
  Mail,
  Briefcase,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  isActive: boolean;
  _count?: { users: number };
  createdAt: string;
}

export default function ResellerPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
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
      setTenants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reseller tenants.');
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
      setCreateError(err?.message || 'Failed to create tenant.');
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

  const PLAN_COLORS: Record<string, string> = {
    STARTER: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    GROWTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PROFESSIONAL: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    ENTERPRISE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            Reseller Panel
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your sub-tenant reseller network — create, configure, and switch context.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTenants}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Reseller
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Resellers', value: tenants.length, icon: Building2, color: 'text-primary' },
          { label: 'Active', value: tenants.filter((t) => t.isActive).length, icon: Check, color: 'text-emerald-500' },
          { label: 'Total Users', value: tenants.reduce((a, t) => a + (t._count?.users ?? 0), 0), icon: Users, color: 'text-violet-500' },
          { label: 'White Labeled', value: tenants.filter((t) => !!t.companyName).length, icon: Palette, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-3 py-4">
            <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, slug, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table / Grid */}
      {loading ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-slate-400">Loading reseller tenants...</p>
        </Card>
      ) : error ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="w-7 h-7 text-rose-500" />
          <p className="text-sm text-rose-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTenants}>Retry</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {tenants.length === 0 ? 'No reseller tenants yet. Create your first one!' : 'No results match your search.'}
          </p>
          {tenants.length === 0 && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Reseller
            </Button>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((tenant) => (
            <Card
              key={tenant.id}
              className="flex flex-col md:flex-row md:items-center gap-4 hover:shadow-lg transition-shadow"
            >
              {/* Color bar / Avatar */}
              <div
                className="w-2 self-stretch rounded-full shrink-0 hidden md:block"
                style={{ background: tenant.primaryColor || '#3b82f6' }}
              />
              <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-extrabold"
                style={{ background: `linear-gradient(135deg, ${tenant.primaryColor || '#3b82f6'}, ${tenant.secondaryColor || '#1f2937'})` }}
              >
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-contain rounded-xl" />
                ) : (
                  (tenant.companyName || tenant.name)[0].toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {tenant.companyName || tenant.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[tenant.plan] || PLAN_COLORS.STARTER}`}>
                    {tenant.plan}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      tenant.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                    }`}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-slate-400 font-mono">/{tenant.slug}</span>
                  {tenant.supportEmail && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Mail className="w-3 h-3" /> {tenant.supportEmail}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="w-3 h-3" /> {tenant._count?.users ?? 0} users
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwitchContext(tenant.id)}
                  disabled={switchingTo === tenant.id}
                >
                  {switchingTo === tenant.id ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Switching...</>
                  ) : (
                    <><ArrowRight className="w-3 h-3 mr-1" /> Switch Context</>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Reseller Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setCreateError(''); }}
        title="Create New Reseller Tenant"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Tenant Name *"
            type="text"
            placeholder="e.g. Acme Agency"
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
            placeholder="acme-agency"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {['STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <Input
            label="Company Display Name"
            type="text"
            placeholder="Optional — e.g. Acme Solutions Pvt Ltd"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
          />
          <Input
            label="Support Email"
            type="email"
            placeholder="support@acmeagency.com"
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
            <Button type="submit" variant="primary" className="flex-1" disabled={creating}>
              {creating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creating...</> : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Create Reseller</>}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
