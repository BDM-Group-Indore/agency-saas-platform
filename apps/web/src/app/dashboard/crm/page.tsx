'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmationModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Network, Plus, DollarSign, Sparkles, Milestone, Calendar, User, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deal {
  id: string;
  companyName: string;
  dealName: string;
  stage: 'Proposal' | 'Negotiation' | 'Contract Sent' | 'Closed Won';
  amount: number;
  owner: string;
  closeDate: string;
}

export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>([
    { id: 'D-201', companyName: 'Nexon Digital Corp', dealName: 'Enterprise SEO & SEM retainer', stage: 'Proposal', amount: 8500, owner: 'Shivam Gupta', closeDate: '2026-06-15' },
    { id: 'D-202', companyName: 'Apex Health Ltd', dealName: 'Lead Generation Campaign Setup', stage: 'Negotiation', amount: 4500, owner: 'Shivam Gupta', closeDate: '2026-06-18' },
    { id: 'D-203', companyName: 'Elite Real Estate', dealName: 'Meta Ads Retainer Q3', stage: 'Contract Sent', amount: 12000, owner: 'Amit Kumar', closeDate: '2026-06-25' },
    { id: 'D-204', companyName: 'Zetta E-learning', dealName: 'Growth Strategy Consulting', stage: 'Closed Won', amount: 6000, owner: 'Sneha Rao', closeDate: '2026-05-29' },
  ]);

  const stages: Deal['stage'][] = ['Proposal', 'Negotiation', 'Contract Sent', 'Closed Won'];

  // Drag and Drop State Management
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // CRUD modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Add Deal form states
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newDealName, setNewDealName] = useState('');
  const [newAmount, setNewAmount] = useState('5000');
  const [newStage, setNewStage] = useState<Deal['stage']>('Proposal');
  const [newCloseDate, setNewCloseDate] = useState('2026-06-30');

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

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (activeColumn !== stage) {
      setActiveColumn(stage);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: Deal['stage']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (!id) return;

    // Update the stage of the dragged card
    setDeals((prevDeals) =>
      prevDeals.map((deal) =>
        deal.id === id ? { ...deal, stage: targetStage } : deal
      )
    );

    // If a deal is dragged to "Closed Won", push a console celebration
    if (targetStage === 'Closed Won') {
      console.log(`🎉 Closed Won Deal Milestone Reached for deal ID ${id}!`);
    }

    setDraggedDealId(null);
    setActiveColumn(null);
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newDealName) return;

    const newDeal: Deal = {
      id: `D-${200 + deals.length + 1}`,
      companyName: newCompanyName,
      dealName: newDealName,
      stage: newStage,
      amount: Number(newAmount) || 1000,
      owner: 'Shivam Gupta',
      closeDate: newCloseDate || '2026-06-30',
    };

    setDeals([...deals, newDeal]);
    setIsAddOpen(false);

    // Reset Form
    setNewCompanyName('');
    setNewDealName('');
    setNewAmount('5000');
    setNewStage('Proposal');
    setNewCloseDate('2026-06-30');
  };

  const getDealsByStage = (stage: Deal['stage']) => {
    return deals.filter((d) => d.stage === stage);
  };

  const calculateTotalInStage = (stage: Deal['stage']) => {
    return getDealsByStage(stage).reduce((acc, curr) => acc + curr.amount, 0);
  };

  const totalPipelineVal = deals.reduce((acc, curr) => acc + curr.amount, 0);
  const closedWonVal = getDealsByStage('Closed Won').reduce((acc, curr) => acc + curr.amount, 0);

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
          <Button variant="outline" size="sm">
            <Milestone className="w-3.5 h-3.5 mr-1.5" /> Customize Stages
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add New Deal
          </Button>
        </div>
      </div>

      {/* CRM Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Pipeline Value" value={`$${totalPipelineVal.toLocaleString()}`} icon={<DollarSign className="w-5 h-5 text-indigo-500" />} subtitle="Active sales pipeline" />
        <StatsCard title="Closed Won Deals" value={`$${closedWonVal.toLocaleString()}`} icon={<Sparkles className="w-5 h-5 text-amber-500" />} trend={{ value: 18.4, isPositive: true }} subtitle="vs last 30 days" />
        <StatsCard title="Pipeline Growth" value="+24%" icon={<Network className="w-5 h-5 text-emerald-500" />} subtitle="Active contacts indexed" />
      </div>

      {/* Interactive Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage);
          const totalVal = calculateTotalInStage(stage);
          const isOver = activeColumn === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDrop={(e) => handleDrop(e, stage)}
              className={cn(
                'flex flex-col gap-3.5 bg-slate-100/50 dark:bg-dark-card/45 border border-slate-200 dark:border-dark-border p-4 rounded-2xl relative transition-all duration-300 min-h-[450px]',
                {
                  'bg-primary/5 border-primary/40 shadow-lg scale-[1.01]': isOver,
                  'border-emerald-500/30 bg-emerald-500/5': isOver && stage === 'Closed Won',
                }
              )}
            >
              {/* Header column */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    {
                      'bg-indigo-500': stage === 'Proposal',
                      'bg-cyan-500': stage === 'Negotiation',
                      'bg-amber-500': stage === 'Contract Sent',
                      'bg-emerald-500': stage === 'Closed Won',
                    }
                  )} />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-wider">{stage}</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {stageDeals.length}
                </span>
              </div>
              
              <div className="text-[10px] text-slate-400 font-semibold flex justify-between px-1 shrink-0">
                <span>VALUATION:</span>
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
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {deal.companyName}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-50 group-hover:text-primary transition-colors leading-snug">
                          {deal.dealName}
                        </h4>
                        
                        <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ${deal.amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {deal.closeDate.split('-').slice(1).join('/')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-44 rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 flex items-center justify-center text-[10px] text-slate-400 text-center p-4 leading-relaxed flex-1">
                    Drag and drop deal cards here to transition stage
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
          <Input label="B2B Company Account" placeholder="e.g. Nexon Digital Corp" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} required />
          <Input label="Deal Name / Scope" placeholder="e.g. Enterprise SEO Retainer" value={newDealName} onChange={(e) => setNewDealName(e.target.value)} required />
          <Input label="Deal Contract Amount ($)" type="number" placeholder="5000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pipeline Stage</label>
            <select
              value={newStage}
              onChange={(e) => setNewStage(e.target.value as any)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Contract Sent">Contract Sent</option>
              <option value="Closed Won">Closed Won</option>
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
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-white font-bold uppercase text-[10px]',
                {
                  'bg-indigo-500': selectedDeal.stage === 'Proposal',
                  'bg-cyan-500': selectedDeal.stage === 'Negotiation',
                  'bg-amber-500': selectedDeal.stage === 'Contract Sent',
                  'bg-emerald-500': selectedDeal.stage === 'Closed Won',
                }
              )}>
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
                Card can be dragged between pipeline columns on the board to reflect real-time negotiation statuses. All stage values and column counts will recalculate automatically in the parent cockpit workspace.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
