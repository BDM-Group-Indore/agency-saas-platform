'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmationModal } from '@/components/ui/Modal';
import { Building2, Search, Plus, Trash2, Edit3, ExternalLink, Globe, Landmark, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  industry: string;
  size: '1-10' | '11-50' | '51-200' | '200+';
  spentARR: number;
  adBudget: number;
  country: string;
  contactsCount: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All');

  // CRUD modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('E-commerce & SaaS');
  const [newSize, setNewSize] = useState<'1-10' | '11-50' | '51-200' | '200+'>('1-10');
  const [newARR, setNewARR] = useState('15000');
  const [newBudget, setNewBudget] = useState('5000');
  const [newCountry, setNewCountry] = useState('India');

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest(`/companies?limit=100&search=${search}`);
      const mapped = (res.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        industry: c.industry || 'Other',
        size: '11-50',
        spentARR: 15000,
        adBudget: 5000,
        country: c.country || 'India',
        contactsCount: 1,
      }));
      setCompanies(mapped);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    try {
      const payload = {
        name: newName,
        industry: newIndustry,
        website: '',
        phone: '',
      };

      const c = await apiRequest('/companies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const newComp: Company = {
        id: c.id,
        name: c.name,
        industry: c.industry || 'Other',
        size: newSize,
        spentARR: Number(newARR) || 0,
        adBudget: Number(newBudget) || 0,
        country: newCountry || 'India',
        contactsCount: 1,
      };

      setCompanies([newComp, ...companies]);
      setIsAddOpen(false);

      // Reset Form
      setNewName('');
      setNewIndustry('E-commerce & SaaS');
      setNewSize('1-10');
      setNewARR('15000');
      setNewBudget('5000');
      setNewCountry('India');
    } catch (err: any) {
      alert('Error creating company: ' + err.message);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await apiRequest(`/companies/${id}`, {
        method: 'DELETE',
      });
      setCompanies(companies.filter((c) => c.id !== id));
      setIsDeleteOpen(false);
    } catch (err: any) {
      alert('Error deleting company: ' + err.message);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industryFilter === 'All' || c.industry === industryFilter;
    return matchSearch && matchIndustry;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="B2B Accounts Directory" value={companies.length} icon={<Building2 className="w-5 h-5 text-indigo-500" />} subtitle="Associated corporate networks" />
        <StatsCard title="Combined ARR Billed" value={`$${companies.reduce((acc, curr) => acc + curr.spentARR, 0).toLocaleString()}`} icon={<Landmark className="w-5 h-5 text-cyan-500" />} subtitle="Platform-wide accumulated ARR spend" />
        <StatsCard title="Ad Budget Under Management" value={`$${companies.reduce((acc, curr) => acc + curr.adBudget, 0).toLocaleString()}`} icon={<Globe className="w-5 h-5 text-emerald-500" />} subtitle="Active monthly ad budgets" />
      </div>

      {/* Index list */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
          <div className="flex gap-2 w-full md:max-w-md">
            <Input
              type="search"
              placeholder="Search by company name, industry, or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="py-1.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Industry:</span>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none"
              >
                <option value="All">All Industries</option>
                <option value="E-commerce & SaaS">E-commerce & SaaS</option>
                <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                <option value="Real Estate & Builders">Real Estate & Builders</option>
                <option value="EdTech & Education">EdTech & Education</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
              </select>
            </div>

            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add B2B Account
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pt-2 pl-2">Account Name</th>
                <th className="pb-3 pt-2">Industry Class</th>
                <th className="pb-3 pt-2">Size (Emp)</th>
                <th className="pb-3 pt-2 text-right">ARR Billed</th>
                <th className="pb-3 pt-2 text-right">Active Ad Budget</th>
                <th className="pb-3 pt-2 text-center">Country</th>
                <th className="pb-3 pt-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
              {filteredCompanies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors group">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {c.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-50 font-bold group-hover:text-primary transition-colors">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{c.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">{c.industry}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                      {c.size}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-bold text-slate-900 dark:text-white">
                    ${c.spentARR.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right font-bold text-primary">
                    ${c.adBudget.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-center text-slate-500 dark:text-slate-450">{c.country}</td>
                  <td className="py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setIsDetailsOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCompany(c);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-danger hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD B2B ACCOUNT MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add B2B Account Profile"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddCompany}>Register Account</Button>
          </>
        }
      >
        <form onSubmit={handleAddCompany} className="flex flex-col gap-4">
          <Input label="B2B Account Corporate Name" placeholder="e.g. Nexus Software Solutions" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Industry Class</label>
            <select
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="E-commerce & SaaS">E-commerce & SaaS</option>
              <option value="Healthcare & Pharma">Healthcare & Pharma</option>
              <option value="Real Estate & Builders">Real Estate & Builders</option>
              <option value="EdTech & Education">EdTech & Education</option>
              <option value="Fashion & Apparel">Fashion & Apparel</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Company size (employees)</label>
            <select
              value={newSize}
              onChange={(e) => setNewSize(e.target.value as any)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="1-10">1-10 Employees</option>
              <option value="11-50">11-50 Employees</option>
              <option value="51-200">51-200 Employees</option>
              <option value="200+">200+ Employees</option>
            </select>
          </div>
          <Input label="ARR Spent ($)" type="number" placeholder="15000" value={newARR} onChange={(e) => setNewARR(e.target.value)} />
          <Input label="Monthly Advertising Budget ($)" type="number" placeholder="5000" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} />
          <Input label="Country Headquartered" placeholder="India" value={newCountry} onChange={(e) => setNewCountry(e.target.value)} />
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedCompany(null);
        }}
        onConfirm={() => {
          if (selectedCompany) handleDeleteCompany(selectedCompany.id);
        }}
        title="Remove B2B Account Profile"
        message={`Are you sure you want to permanently delete the profile of ${selectedCompany?.name}? This action removes all contacts associated with this account from the database.`}
        confirmText="Remove Account"
        variant="danger"
      />

      {/* DOSSIER DETAILS VIEW */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedCompany(null);
        }}
        title="B2B Company Account Dossier"
        size="lg"
        footer={<Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>Close Dossier</Button>}
      >
        {selectedCompany && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                {selectedCompany.name[0]}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCompany.name}</span>
                <span className="text-slate-400">Account ID: {selectedCompany.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Industry Class:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCompany.industry}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Company Size Segment:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCompany.size} employees</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Accumulated ARR Billed:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">${selectedCompany.spentARR.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Active Advertising Budget:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">${selectedCompany.adBudget.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Headquarters Location:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCompany.country}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Active Contacts Associated:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCompany.contactsCount} contacts</span>
              </div>
            </div>

            <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">Corporate Profile Notes:</span>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                Account categorized as key enterprise growth target. High monthly advertising budgets spent actively. Webhooks integration is currently operational.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
