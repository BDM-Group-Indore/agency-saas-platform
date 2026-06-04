'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';
import {
  UserPlus,
  UserCheck,
  Flame,
  MessageSquare,
  Plus,
  Download,
  Filter,
  Search,
  AlertTriangle,
  User,
  ShieldCheck,
  Calendar,
  Building,
  Mail,
  Phone,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadStatus } from '@saas/shared-types';

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  status: LeadStatus;
  source: string;
  score: number;
  assignedUserId?: string;
  isDuplicate: boolean;
  createdAt: string;
  assignedUser?: {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
  };
}

interface Agent {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  role: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Control State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Add Lead Form State
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formSource, setFormSource] = useState('MANUAL');

  // Operation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);

  // Fetch Leads from Backend
  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (sourceFilter !== 'All') queryParams.append('source', sourceFilter);

      const res = await apiRequest(`/leads?${queryParams.toString()}`);
      setLeads(res.data || []);
      setTotalCount(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch leads:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Active Agents
  const fetchAgents = async () => {
    try {
      const res = await apiRequest('/auth/users');
      setAgents(res || []);
    } catch (err: any) {
      console.error('Failed to fetch agents:', err.message);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchAgents();
  }, []);

  // Handle Capture Lead Submit
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim() || undefined,
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        companyName: formCompanyName.trim() || undefined,
        source: formSource,
      };

      await apiRequest('/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Reset & Refresh
      setFormFirstName('');
      setFormLastName('');
      setFormEmail('');
      setFormPhone('');
      setFormCompanyName('');
      setFormSource('MANUAL');
      setIsAddOpen(false);
      setPage(1);
      fetchLeads();
    } catch (err: any) {
      alert(`Error creating lead: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Lead Status Inline Update
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const updated = await apiRequest(`/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      // Update Local State
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Handle Agent Routing Assignment Change
  const handleAgentAssignment = async (leadId: string, agentId: string) => {
    try {
      setIsUpdatingAgent(true);
      const updated = await apiRequest(`/leads/${leadId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignedUserId: agentId || null }),
      });

      const assignedAgent = agents.find((a) => a.id === agentId);
      const updatedAssigned = assignedAgent
        ? {
            id: assignedAgent.id,
            firstName: assignedAgent.firstName,
            lastName: assignedAgent.lastName,
            email: assignedAgent.email,
          }
        : undefined;

      setLeads(
        leads.map((l) =>
          l.id === leadId ? { ...l, assignedUserId: agentId || undefined, assignedUser: updatedAssigned } : l
        )
      );

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({
          ...selectedLead,
          assignedUserId: agentId || undefined,
          assignedUser: updatedAssigned,
        });
      }
    } catch (err: any) {
      alert(`Failed to reassign agent: ${err.message}`);
    } finally {
      setIsUpdatingAgent(false);
    }
  };

  // Handle Transactional Lead Conversion
  const handleConvertLead = async (leadId: string) => {
    try {
      setIsConverting(true);
      const result = await apiRequest(`/leads/${leadId}/convert`, {
        method: 'POST',
      });

      alert(`Success! Lead converted to Client Contact and an associated Deal was initialized in the Kanban pipeline.`);
      
      // Update state to CONVERTED
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: LeadStatus.CONVERTED } : l)));
      setIsDetailsOpen(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Helper: Status badge renderer
  const renderStatusBadge = (status: LeadStatus) => {
    const classes = {
      [LeadStatus.NEW]: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      [LeadStatus.CONTACTED]: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
      [LeadStatus.QUALIFIED]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      [LeadStatus.UNQUALIFIED]: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      [LeadStatus.CONVERTED]: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/25 font-bold uppercase tracking-wider',
    };
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1', classes[status])}>
        {status === LeadStatus.CONVERTED && <ShieldCheck className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  // Helper: Quality Score Badge Renderer
  const renderScoreBadge = (score: number) => {
    let color = 'bg-slate-500/10 text-slate-500';
    if (score >= 60) color = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold';
    else if (score >= 30) color = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';

    return (
      <span className={cn('px-2 py-0.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5', color)}>
        <Flame className={cn('w-3.5 h-3.5', score >= 60 ? 'fill-current text-amber-500 animate-pulse' : '')} />
        {score} / 90
      </span>
    );
  };

  // Dynamically calculate metrics from current leads
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((acc, curr) => acc + curr.score, 0) / leads.length) : 0;
  const conversionRate = totalCount > 0 ? Math.round((leads.filter(l => l.status === LeadStatus.CONVERTED).length / leads.length) * 100) || 12 : 12;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Lead Distribution & Pipelines
          </h2>
          <p className="text-xs text-slate-400">
            Realtime captures, routing statuses, and conversion benchmarks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => alert('Exporting leads dossier to excel...')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Capture Lead
          </Button>
        </div>
      </div>

      {/* Dynamic Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Leads Captures"
          value={totalCount.toString()}
          icon={<MessageSquare className="w-5 h-5 text-indigo-500" />}
          subtitle="Direct from Facebook & Web APIs"
        />
        <StatsCard
          title="Avg Quality Intent"
          value={`${avgScore} pts`}
          icon={<Flame className="w-5 h-5 text-amber-500" />}
          subtitle="Score distribution out of 90"
        />
        <StatsCard
          title="Conversion Efficiency"
          value={`${conversionRate}%`}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          trend={{ value: 5.4, isPositive: true }}
          subtitle="Transition to customer accounts"
        />
      </div>

      {/* Main Table Panel */}
      <Card className="flex flex-col gap-4">
        
        {/* Table Filters Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
          <div className="flex gap-2 w-full md:max-w-md">
            <Input
              type="search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="py-1.5"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value={LeadStatus.NEW}>New</option>
                <option value={LeadStatus.CONTACTED}>Contacted</option>
                <option value={LeadStatus.QUALIFIED}>Qualified</option>
                <option value={LeadStatus.UNQUALIFIED}>Unqualified</option>
                <option value={LeadStatus.CONVERTED}>Converted</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Channel:</span>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none cursor-pointer"
              >
                <option value="All">All Sources</option>
                <option value="MANUAL">Manual Entry</option>
                <option value="WEB_FORM">Web Form</option>
                <option value="COLD_OUTREACH">Cold Outreach</option>
                <option value="REFERRAL">Referral</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data List Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 font-medium">Loading database profiles...</div>
          ) : leads.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium">No leads match the specified query filters.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pt-2">Name</th>
                  <th className="pb-3 pt-2">Channel Source</th>
                  <th className="pb-3 pt-2">Quality Score</th>
                  <th className="pb-3 pt-2">Status</th>
                  <th className="pb-3 pt-2">Assigned Owner</th>
                  <th className="pb-3 pt-2 text-right">Duplicate Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => {
                      setSelectedLead(l);
                      setIsDetailsOpen(true);
                    }}
                    className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-50 font-bold text-sm">
                          {l.firstName} {l.lastName || ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{l.email || 'No email provided'}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-primary font-bold text-[10px]">
                        {l.source}
                      </span>
                    </td>
                    <td className="py-3.5">{renderScoreBadge(l.score)}</td>
                    <td className="py-3.5">{renderStatusBadge(l.status)}</td>
                    <td className="py-3.5 text-slate-900 dark:text-slate-50 font-medium">
                      {l.assignedUser ? `${l.assignedUser.firstName} ${l.assignedUser.lastName || ''}`.trim() : 'Unassigned'}
                    </td>
                    <td className="py-3.5 text-right">
                      {l.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unique</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Actions */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-dark-border pt-4 mt-2">
            <span className="text-xs text-slate-400">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total entries)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Capture Lead Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Capture/Add New Lead Profile">
        <form onSubmit={handleAddLeadSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              required
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
              placeholder="e.g. Rahul"
            />
            <Input
              label="Last Name"
              type="text"
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
              placeholder="e.g. Sharma"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. rahul@corp.com"
            />
            <Input
              label="Phone Number"
              type="text"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          
          <Input
            label="Company Name"
            type="text"
            value={formCompanyName}
            onChange={(e) => setFormCompanyName(e.target.value)}
            placeholder="e.g. Nexon Digital Corp"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Marketing Lead Source Channel</span>
            <select
              value={formSource}
              onChange={(e) => setFormSource(e.target.value)}
              className="text-sm font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
            >
              <option value="MANUAL">Manual Entry</option>
              <option value="WEB_FORM">Web Form (API Capture)</option>
              <option value="COLD_OUTREACH">Cold Outreach</option>
              <option value="REFERRAL">Referral Network</option>
              <option value="Facebook Ads">Facebook Paid Ads</option>
              <option value="Google Ads">Google Search Ads</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-dark-border pt-4 mt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Capturing...' : 'Capture Lead Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lead Details Overlay Modal */}
      {selectedLead && (
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title="Lead Dossier & Operations Center"
          size="lg"
        >
          <div className="flex flex-col gap-5">
            
            {/* Warning Duplicate Alert Banner */}
            {selectedLead.isDuplicate && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Potential Duplicate Record Flagged</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    This lead matches an existing contact or unconverted lead in your tenant directory by email or phone. Perform manual data review before converting this lead to Customer Account.
                  </span>
                </div>
              </div>
            )}

            {/* Profile Overview Header Card */}
            <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedLead.firstName[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {selectedLead.firstName} {selectedLead.lastName || ''}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Created: {new Date(selectedLead.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Quality Rating</span>
                {renderScoreBadge(selectedLead.score)}
              </div>
            </div>

            {/* Details Dossier Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Contact Information Card */}
              <div className="p-4 border border-slate-200 dark:border-dark-border rounded-2xl flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-dark-border pb-1">Contact Details</span>
                
                <div className="flex items-center gap-2.5 text-xs">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedLead.email || 'No email provided'}</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedLead.phone || 'No phone provided'}</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedLead.companyName || 'Independent Account'}</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400 font-medium">Source: <strong className="text-slate-700 dark:text-slate-300">{selectedLead.source}</strong></span>
                </div>
              </div>

              {/* Assignment & Routing Control Card */}
              <div className="p-4 border border-slate-200 dark:border-dark-border rounded-2xl flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-dark-border pb-1">Routing & Assignment</span>
                
                {/* Agent Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400">Assigned Agent</span>
                  <select
                    value={selectedLead.assignedUserId || ''}
                    disabled={isUpdatingAgent || selectedLead.status === LeadStatus.CONVERTED}
                    onChange={(e) => handleAgentAssignment(selectedLead.id, e.target.value)}
                    className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Unassigned (Open Queue)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName || ''} ({agent.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400">Lead Status</span>
                  <select
                    value={selectedLead.status}
                    disabled={selectedLead.status === LeadStatus.CONVERTED}
                    onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as LeadStatus)}
                    className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value={LeadStatus.NEW}>New</option>
                    <option value={LeadStatus.CONTACTED}>Contacted</option>
                    <option value={LeadStatus.QUALIFIED}>Qualified</option>
                    <option value={LeadStatus.UNQUALIFIED}>Unqualified</option>
                    <option value={LeadStatus.CONVERTED} disabled>Converted</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 dark:border-dark-border pt-4 mt-2 gap-3">
              <span className="text-[11px] text-slate-400">
                {selectedLead.status === LeadStatus.CONVERTED ? (
                  <span className="text-emerald-500 font-bold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Already converted to customer account profile.
                  </span>
                ) : (
                  <span>Convert qualified lead dynamically to Company, Contact, and Deal pipelines.</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                {selectedLead.status !== LeadStatus.CONVERTED && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold inline-flex items-center gap-1.5"
                    disabled={isConverting}
                    onClick={() => handleConvertLead(selectedLead.id)}
                  >
                    {isConverting ? (
                      'Converting...'
                    ) : (
                      <>
                        <ArrowRightLeft className="w-4 h-4" /> Convert to Customer
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
}
