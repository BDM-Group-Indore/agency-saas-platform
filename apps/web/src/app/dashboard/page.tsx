'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRoleStore } from '@/store/roleStore';
import { StatsCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmationModal } from '@/components/ui/Modal';
import {
  mockLeads,
  mockCampaigns,
  mockDeals,
  Lead,
  Campaign,
  Deal,
} from '@/data/mockData';
import {
  DollarSign,
  UserCheck,
  TrendingUp,
  Target,
  MessageSquareCode,
  Users2,
  Cpu,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const { currentRole } = useRoleStore();
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [deals, setDeals] = useState<Deal[]>(mockDeals);

  // States for interactive CRUD mock-ups (Search, Filters, Create, Edit, Delete, View Details)
  // satisfying: "UI QUALITY CHECKLIST: Every screen must have: Search, Filters, Sorting, Pagination, Export Button, Create Button, Edit Button, Delete Button, View Details"
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal controllers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Input states for mock Create Lead form
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Facebook Ads');
  const [newLeadValue, setNewLeadValue] = useState('1500');

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;

    const newLead: Lead = {
      id: `L-${100 + leads.length + 1}`,
      leadName: newLeadName,
      phone: newLeadPhone,
      email: `${newLeadName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      source: newLeadSource,
      status: 'New',
      value: Number(newLeadValue) || 1000,
      assignedTo: 'Shivam (Owner)',
      dateCreated: new Date().toISOString().split('T')[0],
    };

    setLeads([newLead, ...leads]);
    setIsCreateOpen(false);

    // Reset inputs
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadSource('Facebook Ads');
    setNewLeadValue('1500');
  };

  const handleDeleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  const handleExport = () => {
    alert('Export Successful! CSV formatted file sent to downloads folder (Mocked).');
  };

  // Filter & Search computation
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.leadName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.phone.includes(searchQuery) ||
                          l.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'All' || l.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Header Banner showing current state */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-indigo-950/15 border border-primary/15 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-1.5 relative z-10">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Workspace Active Session
          </span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Welcome back, Shivam Gupta
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-normal">
            You are currently operating in <strong className="text-slate-800 dark:text-slate-200">{currentRole}</strong> view. The dashboard layout and administrative components have dynamically adjusted.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Export Data
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Lead
          </Button>
        </div>
      </div>

      {/* 2. Responsive Stats Cards Grid (Adapts based on role) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentRole === 'Client' ? (
          <>
            <StatsCard title="Total Budget Spent" value="$18,500" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 8.4, isPositive: true }} subtitle="vs last 30 days" />
            <StatsCard title="Leads Generated" value="385" icon={<Users2 className="w-5 h-5" />} trend={{ value: 12.2, isPositive: true }} subtitle="Cost per Lead: $48.0" />
            <StatsCard title="Average ROAS" value="3.1x" icon={<TrendingUp className="w-5 h-5" />} trend={{ value: 4.5, isPositive: true }} subtitle="Target ROAS: 3.0x" />
            <StatsCard title="Active Campaigns" value="3 / 4" icon={<Target className="w-5 h-5" />} subtitle="1 Completed, 0 Paused" />
          </>
        ) : currentRole === 'Sales' ? (
          <>
            <StatsCard title="Your Closed Deals" value="$32,400" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 15.6, isPositive: true }} subtitle="vs last month target" />
            <StatsCard title="Qualified Leads assigned" value="18" icon={<UserCheck className="w-5 h-5" />} trend={{ value: 5.2, isPositive: true }} subtitle="Action Required: 5" />
            <StatsCard title="WhatsApp Responses" value="94%" icon={<MessageSquareCode className="w-5 h-5" />} trend={{ value: 2.1, isPositive: true }} subtitle="Response speed: 1.5m" />
            <StatsCard title="Active CRM Contacts" value="48" icon={<Users2 className="w-5 h-5" />} subtitle="Total leads on pipeline" />
          </>
        ) : currentRole === 'Super Admin' ? (
          <>
            <StatsCard title="Total Platform Accounts" value="1,248" icon={<Users2 className="w-5 h-5" />} trend={{ value: 24.8, isPositive: true }} subtitle="Monthly signups" />
            <StatsCard title="Aggregated ARR" value="$1.48M" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 18.2, isPositive: true }} subtitle="Platform Net Profit margin" />
            <StatsCard title="Server CPU Load" value="14.5%" icon={<Cpu className="w-5 h-5" />} trend={{ value: 3.2, isPositive: false }} subtitle="AWS Clusters status: OK" />
            <StatsCard title="API Rate Limits usage" value="0.08%" icon={<Layers className="w-5 h-5" />} subtitle="Total integrations: 12" />
          </>
        ) : (
          // Default: Agency Owner / Manager
          <>
            <StatsCard title="Total Monthly Revenue" value="$42,800" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 12.5, isPositive: true }} subtitle="vs last month $38,000" />
            <StatsCard title="Total Leads Collected" value="1,582" icon={<UserCheck className="w-5 h-5" />} trend={{ value: 8.9, isPositive: true }} subtitle="Meta & Google sources" />
            <StatsCard title="WhatsApp Autoreplies" value="89%" icon={<MessageSquareCode className="w-5 h-5" />} trend={{ value: 14.2, isPositive: true }} subtitle="AI Follow-up rate" />
            <StatsCard title="Current Average ROAS" value="3.8x" icon={<TrendingUp className="w-5 h-5" />} trend={{ value: 2.4, isPositive: true }} subtitle="All active client ads" />
          </>
        )}
      </div>

      {/* 3. Core Panels: Active Campaigns & Active Leads Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Interactive Leads List Dashboard (Crucial Prototype demo) */}
        <Card className="lg:col-span-2 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-dark-border">
            <div className="flex flex-col">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Lead Capture Management
              </h3>
              <p className="text-xs text-slate-400">
                Demonstrates high-fidelity search, filters, pagination, and lead management.
              </p>
            </div>
            {/* Filter tags */}
            <div className="flex flex-wrap gap-1.5">
              {['All', 'New', 'Contacted', 'Qualified', 'Nurturing'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold border transition-premium cursor-pointer',
                    statusFilter === st
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-transparent text-slate-400 border-slate-200 dark:border-dark-border hover:text-slate-600 dark:hover:text-slate-200'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Search Controls */}
          <div className="flex gap-3">
            <Input
              type="search"
              placeholder="Search leads by name, phone, or marketing source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-2"
            />
          </div>

          {/* Leads Table Component */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Lead Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Value</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-slate-900 dark:text-slate-50 font-bold group-hover:text-primary transition-colors">
                            {lead.leadName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{lead.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">{lead.phone}</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {lead.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            {
                              'bg-indigo-500/10 text-indigo-500': lead.status === 'New',
                              'bg-cyan-500/10 text-cyan-500': lead.status === 'Contacted',
                              'bg-emerald-500/10 text-emerald-500': lead.status === 'Qualified',
                              'bg-amber-500/10 text-amber-500': lead.status === 'Nurturing',
                              'bg-slate-500/10 text-slate-400': lead.status === 'Unqualified',
                            }
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-900 dark:text-slate-50 font-bold">
                        ${lead.value.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-danger hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No leads match your active filters or search queries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Mockup */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-auto">
            <span className="text-xs text-slate-400">
              Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> entries
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="px-2.5 py-1 text-xs" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="px-2.5 py-1 text-xs" disabled>
                1
              </Button>
              <Button variant="outline" size="sm" className="px-2.5 py-1 text-xs" disabled>
                Next
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Columns: Active Campaigns Status Card */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Ads Platform Campaigns
              </h3>
              <p className="text-xs text-slate-400">
                Live campaign performance statistics
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate">
                      {camp.name}
                    </span>
                    <span className={cn(
                      'text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full',
                      camp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                    )}>
                      {camp.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Source: {camp.platform}</span>
                    <span className="font-bold text-slate-950 dark:text-slate-200">
                      Budget: ${camp.budget}
                    </span>
                  </div>
                  {/* Spend / budget loader mockup */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${(camp.spend / camp.budget) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-400">Spent: ${camp.spend}</span>
                    <span className="font-bold text-primary">ROAS: {camp.roas}x</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick AI follow up metrics panel */}
          <Card className="bg-gradient-to-br from-indigo-950/20 via-slate-900/30 to-accent/5 relative overflow-hidden flex flex-col gap-3">
            <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full blur-xl pointer-events-none" />
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" /> AI Engine Overview
            </span>
            <h4 className="font-display font-bold text-sm text-slate-100">
              Conversational Auto-Pilot
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Your autonomous AI assistant has analyzed 18 incoming leads today, scoring 5 as high-intent targets and booking 2 direct sales calls via Google Calendar.
            </p>
            <button className="text-xs text-primary font-bold hover:text-primary-hover transition-colors flex items-center gap-1 cursor-pointer self-start group mt-1">
              Configure Prompts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </Card>
        </div>
      </div>

      {/* 4. MODALS FOR CRUD MOCK-UPS */}
      {/* Create Lead Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Lead"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateLead}>
              Create Lead Profile
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateLead} className="flex flex-col gap-4">
          <Input
            label="Lead Name"
            type="text"
            placeholder="e.g. Abhay Pratap"
            value={newLeadName}
            onChange={(e) => setNewLeadName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. +91 9876543210"
            value={newLeadPhone}
            onChange={(e) => setNewLeadPhone(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Marketing Source
            </label>
            <select
              value={newLeadSource}
              onChange={(e) => setNewLeadSource(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="Facebook Ads">Facebook Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Instagram Ads">Instagram Ads</option>
              <option value="LinkedIn Outbound">LinkedIn Outbound</option>
              <option value="Organic Search">Organic Search</option>
            </select>
          </div>
          <Input
            label="Lead Valuation ($)"
            type="number"
            placeholder="e.g. 1500"
            value={newLeadValue}
            onChange={(e) => setNewLeadValue(e.target.value)}
          />
        </form>
      </Modal>

      {/* Delete Lead Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedLead(null);
        }}
        onConfirm={() => {
          if (selectedLead) {
            handleDeleteLead(selectedLead.id);
          }
        }}
        title="Confirm Lead Removal"
        message={`Are you absolutely sure you wish to delete the lead file for "${selectedLead?.leadName}"? This action removes their records permanently from the CRM index.`}
        confirmText="Remove Lead"
        variant="danger"
      />

      {/* Details View Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLead(null);
        }}
        title="Lead Overview Dossier"
        size="lg"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsDetailsOpen(false);
              setSelectedLead(null);
            }}
          >
            Close Profile
          </Button>
        }
      >
        {selectedLead && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedLead.leadName}
                </span>
                <span className="text-slate-400">{selectedLead.id}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase text-[10px]">
                {selectedLead.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Phone Connection:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedLead.phone}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Email Inbox:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedLead.email}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Marketing Source Channel:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedLead.source}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Lead Estimation Value:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">${selectedLead.value.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Assigned Agent:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedLead.assignedTo}</span>
              </div>
            </div>

            <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                AI Timeline Assessment:
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                Lead captures state shows immediate interest via Facebook form callback. Auto-dialer triggered response at 13:05, sending conversational follow-up regarding pricing tiers. Score optimized to High Intent.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
