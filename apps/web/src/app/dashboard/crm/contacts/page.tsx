'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmationModal } from '@/components/ui/Modal';
import { UserCheck, Trash2, Edit3, ExternalLink, Plus, Search, Mail, Phone, Briefcase, HeartHandshake, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  dealValue: number;
  status: 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  owner: string;
  lastActivity: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dbCompanies, setDbCompanies] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // CRUD state parameters
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newValue, setNewValue] = useState('5000');
  const [newStatus, setNewStatus] = useState<'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Closed Won'>('Lead');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [contactsRes, companiesRes] = await Promise.all([
        apiRequest(`/contacts?limit=100&search=${search}`),
        apiRequest('/companies?limit=100'),
      ]);

      setDbCompanies(companiesRes.data || []);

      const mappedContacts = (contactsRes.data || []).map((c: any) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim(),
        email: c.email || '',
        phone: c.phone || '',
        company: c.company?.name || 'Independent Account',
        dealValue: 5000, // fallback UI stats
        status: 'Contacted', // fallback UI stats
        owner: 'Shivam Gupta',
        lastActivity: 'Active',
      }));

      setContacts(mappedContacts);
    } catch (err: any) {
      console.error('Failed to load contacts data:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    try {
      const nameParts = newName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const payload = {
        firstName,
        lastName,
        email: newEmail,
        phone: newPhone || undefined,
        companyId: newCompanyId || undefined,
      };

      const c = await apiRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const selectedCompName = dbCompanies.find((comp) => comp.id === newCompanyId)?.name || 'Independent Account';

      const newContact: Contact = {
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim(),
        email: c.email || '',
        phone: c.phone || '',
        company: selectedCompName,
        dealValue: Number(newValue) || 0,
        status: newStatus,
        owner: 'Shivam Gupta',
        lastActivity: 'Just now',
      };

      setContacts([newContact, ...contacts]);
      setIsAddOpen(false);

      // Reset Form
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewCompanyId('');
      setNewValue('5000');
      setNewStatus('Lead');
    } catch (err: any) {
      alert('Error creating contact: ' + err.message);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await apiRequest(`/contacts/${id}`, {
        method: 'DELETE',
      });
      setContacts(contacts.filter((c) => c.id !== id));
      setIsDeleteOpen(false);
    } catch (err: any) {
      alert('Error deleting contact: ' + err.message);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                        c.company.toLowerCase().includes(search.toLowerCase()) || 
                        c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Contacts Indexed" value={contacts.length} icon={<Users className="w-5 h-5 text-indigo-500" />} subtitle="Active sales leads database" />
        <StatsCard title="Pipeline value" value={`$${contacts.reduce((acc, curr) => acc + curr.dealValue, 0).toLocaleString()}`} icon={<Briefcase className="w-5 h-5 text-cyan-500" />} subtitle="Combined potential deal valuation" />
        <StatsCard title="Conversion Win rate" value="78.5%" icon={<HeartHandshake className="w-5 h-5 text-emerald-500" />} subtitle="Weighted team closure score" />
      </div>

      {/* Main Table view */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
          <div className="flex gap-2 w-full md:max-w-md">
            <Input
              type="search"
              placeholder="Search by contact name, email, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="py-1.5"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold shrink-0">Stage:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none"
              >
                <option value="All">All Stages</option>
                <option value="Lead">Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>
            
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Contact
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pt-2 pl-2">Name / Company</th>
                <th className="pb-3 pt-2">Contact Details</th>
                <th className="pb-3 pt-2 text-right">Potential Value</th>
                <th className="pb-3 pt-2 text-center">Stage</th>
                <th className="pb-3 pt-2">Owner</th>
                <th className="pb-3 pt-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors group">
                    <td className="py-3.5 pl-2">
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-50 font-bold group-hover:text-primary transition-colors">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400">{c.company}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {c.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {c.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-slate-900 dark:text-white">
                      ${c.dealValue.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                        {
                          'bg-indigo-500/10 text-indigo-500': c.status === 'Lead',
                          'bg-cyan-500/10 text-cyan-500': c.status === 'Contacted',
                          'bg-amber-500/10 text-amber-500': c.status === 'Proposal' || c.status === 'Negotiation',
                          'bg-emerald-500/10 text-emerald-500': c.status === 'Closed Won',
                          'bg-slate-500/10 text-slate-400': c.status === 'Closed Lost',
                        }
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5">{c.owner}</td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setSelectedContact(c);
                            setIsDetailsOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View dossier"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContact(c);
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
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active contacts matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ADD CONTACT MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New CRM Contact"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddContact}>
              Register Contact
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddContact} className="flex flex-col gap-4">
          <Input label="Contact Full Name" placeholder="e.g. Abhay Pratap" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <Input label="Work Email" type="email" placeholder="e.g. abhay@agency.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <Input label="Phone Number" placeholder="e.g. +91 98765 43210" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Associated Company Account</label>
            <select
              value={newCompanyId}
              onChange={(e) => setNewCompanyId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="">Select Company Account (Optional)</option>
              {dbCompanies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Estimated Deal Value ($)" type="number" placeholder="5000" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pipeline Stage</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none"
            >
              <option value="Lead">Lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedContact(null);
        }}
        onConfirm={() => {
          if (selectedContact) handleDeleteContact(selectedContact.id);
        }}
        title="Remove CRM Contact"
        message={`Are you sure you want to permanently delete the contact dossier for ${selectedContact?.name}? This action removes their deal associations from the sales pipeline.`}
        confirmText="Remove Contact"
        variant="danger"
      />

      {/* DETAILS DOSSIER VIEW MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedContact(null);
        }}
        title="CRM Contact Dossier File"
        size="lg"
        footer={<Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>Close Dossier</Button>}
      >
        {selectedContact && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedContact.name}</span>
                <span className="text-slate-400">Account ID: {selectedContact.id}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase text-[10px]">
                {selectedContact.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Email Connection:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedContact.email}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Phone Direct Line:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedContact.phone}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">B2B Account Company:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedContact.company}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Target Valuation Value:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">${selectedContact.dealValue.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Sales Owner Assignee:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedContact.owner}</span>
              </div>
            </div>

            <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">CRM Interactive Log Summary:</span>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                Account files show dynamic lead scoring optimization. Last contacted via WhatsApp auto-agent follow-up {selectedContact.lastActivity}. Client has expressed intent to review custom ad pitch proposals.
              </p>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
