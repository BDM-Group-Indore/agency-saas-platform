'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Network, Plus, DollarSign, Sparkles, Milestone, Calendar, User, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

interface Deal {
  id: string;
  companyName: string;
  dealName: string;
  stage: string;
  stageId: string;
  amount: number;
  owner: string;
  closeDate: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  deals: any[];
}

export default function CRMPage() {
  const [pipelineId, setPipelineId] = useState<string>('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [dbCompanies, setDbCompanies] = useState<{ id: string; name: string }[]>([]);
  const [dbContacts, setDbContacts] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drag and Drop State Management
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // CRUD modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Add Deal form states
  const [newDealName, setNewDealName] = useState('');
  const [newAmount, setNewAmount] = useState('5000');
  const [newStageId, setNewStageId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [newCloseDate, setNewCloseDate] = useState('2026-06-30');

  const fetchPipelineData = async () => {
    try {
      setIsLoading(true);
      const [pipelinesRes, companiesRes, contactsRes] = await Promise.all([
        apiRequest('/pipelines'),
        apiRequest('/companies?limit=100'),
        apiRequest('/contacts?limit=100'),
      ]);

      setDbCompanies(companiesRes.data || []);
      setDbContacts(contactsRes.data || []);

      const activePipeline = pipelinesRes[0];
      if (activePipeline) {
        setPipelineId(activePipeline.id);
        setStages(activePipeline.stages || []);
        if (activePipeline.stages && activePipeline.stages.length > 0 && !newStageId) {
          setNewStageId(activePipeline.stages[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load CRM pipeline board:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedDealId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setActiveColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (activeColumn !== stageId) {
      setActiveColumn(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!id) return;

    try {
      await apiRequest(`/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId: targetStageId }),
      });
      await fetchPipelineData();
    } catch (err: any) {
      alert('Failed to move deal: ' + err.message);
    }

    setDraggedDealId(null);
    setActiveColumn(null);
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealName || !newStageId) return;

    try {
      const payload = {
        title: newDealName,
        value: Number(newAmount) || 0,
        stageId: newStageId,
        companyId: selectedCompanyId || undefined,
        contactId: selectedContactId || undefined,
      };

      await apiRequest('/deals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAddOpen(false);
      await fetchPipelineData();

      // Reset Form
      setNewDealName('');
      setNewAmount('5000');
      setSelectedCompanyId('');
      setSelectedContactId('');
      setNewCloseDate('2026-06-30');
    } catch (err: any) {
      alert('Error creating deal: ' + err.message);
    }
  };

  // Calculations
  const allDeals = stages.flatMap((s) =>
    (s.deals || []).map((d) => ({
      id: d.id,
      companyName: d.company?.name || 'Independent Account',
      dealName: d.title,
      stage: s.name,
      stageId: s.id,
      amount: d.value || 0,
      owner: 'Shivam Gupta',
      closeDate: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '2026-06-30',
    }))
  );

  const totalPipelineVal = allDeals.reduce((acc, curr) => acc + curr.amount, 0);
  const closedWonVal = allDeals.filter((d) => d.stage === 'Closed Won').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            High Velocity CRM Pipeline
          </h2>
          <p className="text-xs text-slate-400">
            Drag and drop deal cards below to dynamically transition sales stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Deal
          </Button>
        </div>
      </div>

      {/* CRM Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Pipeline Value" value={`$${totalPipelineVal.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-indigo-500" />} subtitle="Active sales pipeline" />
        <StatsCard title="Closed Won Deals" value={`$${closedWonVal.toLocaleString()}`} icon={<Sparkles className="w-5 h-5 text-amber-500" />} subtitle="Platform closure metric" />
        <StatsCard title="Pipeline Growth" value={`+${allDeals.length}`} icon={<Network className="w-5 h-5 text-emerald-500" />} subtitle="Active deals tracker" />
      </div>

      {/* Interactive Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-2 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = (stage.deals || []).map((d) => ({
            id: d.id,
            companyName: d.company?.name || 'Independent Account',
            dealName: d.title,
            stage: stage.name,
            stageId: stage.id,
            amount: d.value || 0,
            owner: 'Shivam Gupta',
            closeDate: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '2026-06-30',
          }));
          const totalVal = stageDeals.reduce((acc, curr) => acc + curr.amount, 0);
          const isOver = activeColumn === stage.id;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={cn(
                'flex flex-col gap-3.5 bg-slate-100/50 dark:bg-dark-card/45 border border-slate-200 dark:border-dark-border p-4 rounded-2xl relative transition-all duration-300 min-w-[220px] min-h-[450px]',
                {
                  'bg-primary/5 border-primary/40 shadow-lg scale-[1.01]': isOver,
                  'border-emerald-500/30 bg-emerald-500/5': isOver && stage.name === 'Closed Won',
                }
              )}
            >
              {/* Header column */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    {
                      'bg-indigo-500': stage.name === 'Lead In',
                      'bg-cyan-500': stage.name === 'Contact Made',
                      'bg-amber-500': stage.name === 'Demo Scheduled' || stage.name === 'Proposal Sent',
                      'bg-emerald-500': stage.name === 'Closed Won',
                      'bg-slate-400': stage.name === 'Closed Lost',
                    }
                  )} />
                  <span className="text-[10px] font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-wider truncate max-w-[120px]" title={stage.name}>
                    {stage.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {stageDeals.length}
                </span>
              </div>
              
              <div className="text-[10px] text-slate-400 font-semibold flex justify-between px-1 shrink-0">
                <span>VAL:</span>
                <span className="text-slate-900 dark:text-slate-200 font-bold">${totalVal.toLocaleString()}</span>
              </div>

              {/* Deals container */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[550px] pr-1 flex-1">
                {stageDeals.length > 0 ? (
                  stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        setSelectedDeal(deal);
                        setIsDetailsOpen(true);
                      }}
                      className={cn(
                        'p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg transition-premium group relative cursor-grab active:cursor-grabbing select-none',
                        draggedDealId === deal.id ? 'opacity-40 border-dashed border-primary shadow-none' : ''
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
                          {deal.companyName}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-50 group-hover:text-primary transition-colors leading-snug truncate">
                          {deal.dealName}
                        </h4>
                        
                        <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ${deal.amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-[9px]">
                            <Calendar className="w-2.5 h-2.5" /> {deal.closeDate.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-28 rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 flex items-center justify-center text-[9px] text-slate-400 text-center p-3 leading-relaxed flex-1">
                    Drag deal cards here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW DEAL MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Sales Deal"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddDeal}>Create Deal Card</Button>
          </>
        }
      >
        <form onSubmit={handleAddDeal} className="flex flex-col gap-4">
          <Input label="Deal Name / Scope" placeholder="e.g. Enterprise SEO Retainer" value={newDealName} onChange={(e) => setNewDealName(e.target.value)} required />
          <Input label="Deal Contract Amount ($)" type="number" placeholder="5000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pipeline Column Stage</label>
            <select
              value={newStageId}
              onChange={(e) => setNewStageId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client B2B Account</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="">Independent (No Company)</option>
              {dbCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Primary Lead Contact</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="">Unassigned (No Contact)</option>
              {dbContacts.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName || ''}</option>
              ))}
            </select>
          </div>

          <Input label="Expected Close Date" type="date" value={newCloseDate} onChange={(e) => setNewCloseDate(e.target.value)} />
        </form>
      </Modal>

      {/* DEAL DETAILS VIEW */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedDeal(null);
        }}
        title="Deal Pipeline Profile"
        size="md"
        footer={<Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>Close Profile</Button>}
      >
        {selectedDeal && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedDeal.dealName}</span>
                <span className="text-slate-400">Deal Card ID: {selectedDeal.id}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold uppercase text-[10px]">
                {selectedDeal.stage}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Account Client:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedDeal.companyName}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Contract Value:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">${selectedDeal.amount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Expected Close Date:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedDeal.closeDate}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Deal Owner Assignee:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedDeal.owner}</span>
              </div>
            </div>

            <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Pipeline Card assessment:</span>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                Card can be dragged between pipeline columns on the board to reflect real-time negotiation statuses. All stage values and column counts will recalculate automatically.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
