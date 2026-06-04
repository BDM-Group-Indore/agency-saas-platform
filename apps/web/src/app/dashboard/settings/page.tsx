'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmationModal } from '@/components/ui/Modal';
import { 
  Settings, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Key, 
  CheckCircle, 
  Sliders,
  Plus,
  Search,
  Edit3,
  Trash2,
  Loader2,
  Save,
  Grid
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');

  // General Settings States
  const [googleAdsConnected, setGoogleAdsConnected] = useState(true);
  const [metaAdsConnected, setMetaAdsConnected] = useState(true);
  const [whatsappApiConnected, setWhatsappApiConnected] = useState(false);
  const [apiKey, setApiKey] = useState('ap_live_72b38f89e24016a2c98d');
  const [webhookUrl, setWebhookUrl] = useState('https://agency-saas.com/api/v1/whatsapp-webhook');
  const [isCopied, setIsCopied] = useState(false);

  // AI Autopilot Configuration States
  const [systemPrompt, setSystemPrompt] = useState('You are an automated CRM Sales AI Copilot. You reply professionally to lead inquiries.');
  const [temperature, setTemperature] = useState(0.7);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  // Prompt Library CRUD Grid States
  const [prompts, setPrompts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Modal controller states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);

  // Prompt Form States
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('CHATBOT');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formUserPrompt, setFormUserPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  useEffect(() => {
    if (activeTab === 'ai') {
      fetchAgentConfig();
      fetchPrompts();
    }
  }, [activeTab]);

  const handleCopyKey = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // AI Agent Config APIs
  const fetchAgentConfig = async () => {
    setIsLoadingAgent(true);
    try {
      const data = await apiRequest('/ai/agent/config');
      setSystemPrompt(data.systemPrompt);
      setTemperature(data.temperature);
      setAiAssistantEnabled(data.isActive);
    } catch (err) {
      console.error('Failed to fetch AI agent configurations:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  const handleSaveAgentConfig = async () => {
    setIsSavingAgent(true);
    try {
      await apiRequest('/ai/agent/config', {
        method: 'PATCH',
        body: JSON.stringify({
          systemPrompt,
          temperature,
          isActive: aiAssistantEnabled,
        }),
      });
      alert('Autopilot configurations saved successfully to Redis cache!');
    } catch (err) {
      console.error('Failed to save AI agent configs:', err);
      alert('Failed to save configs. Verify API connections.');
    } finally {
      setIsSavingAgent(false);
    }
  };

  // Prompt Library APIs
  const fetchPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const data = await apiRequest('/ai/prompts');
      setPrompts(data);
    } catch (err) {
      console.error('Failed to fetch prompt templates:', err);
    } finally {
      setIsLoadingPrompts(true); // wait, let's set to false!
      setIsLoadingPrompts(false);
    }
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSystemPrompt.trim()) return;
    setIsSavingPrompt(true);

    try {
      const newPrompt = await apiRequest('/ai/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          systemPrompt: formSystemPrompt,
          userPrompt: formUserPrompt || undefined,
        }),
      });
      setPrompts((prev) => [newPrompt, ...prev]);
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleEditPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt || !formName.trim() || !formSystemPrompt.trim()) return;
    setIsSavingPrompt(true);

    try {
      const updated = await apiRequest(`/ai/prompts/${selectedPrompt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          systemPrompt: formSystemPrompt,
          userPrompt: formUserPrompt || undefined,
        }),
      });
      setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setIsEditOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to update prompt:', err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!selectedPrompt) return;
    try {
      await apiRequest(`/ai/prompts/${selectedPrompt.id}`, {
        method: 'DELETE',
      });
      setPrompts((prev) => prev.filter((p) => p.id !== selectedPrompt.id));
      setIsDeleteOpen(false);
      setSelectedPrompt(null);
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('CHATBOT');
    setFormSystemPrompt('');
    setFormUserPrompt('');
    setSelectedPrompt(null);
  };

  const openEditModal = (prompt: any) => {
    setSelectedPrompt(prompt);
    setFormName(prompt.name);
    setFormCategory(prompt.category);
    setFormSystemPrompt(prompt.systemPrompt);
    setFormUserPrompt(prompt.userPrompt || '');
    setIsEditOpen(true);
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.systemPrompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            SaaS System Configurations
          </h2>
          <p className="text-xs text-slate-400">
            Control API integrations, team permissions, webhook channels, and AI copilot configurations.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-dark-border self-start md:self-center">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-premium cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            General & Integrations
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-premium flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-primary text-white shadow-sm shadow-primary/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Autopilot & Prompts
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Toggles Grid: Integrations */}
          <Card className="lg:col-span-2 flex flex-col gap-5">
            <div className="border-b border-slate-200 dark:border-dark-border pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Live Marketing & Social Integrations
              </h3>
              <p className="text-xs text-slate-400">
                Toggle network credential hooks to sync campaigns data directly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Google Ads */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border border-slate-250/50 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Google Ads API Sync</span>
                  <span className="text-[10px] text-slate-400">Status: {googleAdsConnected ? 'Connected' : 'Offline'}</span>
                </div>
                <button onClick={() => setGoogleAdsConnected(!googleAdsConnected)} className="cursor-pointer">
                  {googleAdsConnected ? (
                    <ToggleRight className="w-10 h-10 text-primary" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Meta Ads */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border border-slate-250/50 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">Meta Ads API Sync</span>
                  <span className="text-[10px] text-slate-400">Status: {metaAdsConnected ? 'Connected' : 'Offline'}</span>
                </div>
                <button onClick={() => setMetaAdsConnected(!metaAdsConnected)} className="cursor-pointer">
                  {metaAdsConnected ? (
                    <ToggleRight className="w-10 h-10 text-primary" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-400" />
                  )}
                </button>
              </div>

              {/* WhatsApp Business API */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border border-slate-250/50 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">WhatsApp Cloud API</span>
                  <span className="text-[10px] text-slate-400">Status: {whatsappApiConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <button onClick={() => setWhatsappApiConnected(!whatsappApiConnected)} className="cursor-pointer">
                  {whatsappApiConnected ? (
                    <ToggleRight className="w-10 h-10 text-primary" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-400" />
                  )}
                </button>
              </div>

              {/* AI Assistant autopilot (linked to general view placeholder) */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-800/20 border border-slate-250/50 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">AI Agent Autopilot</span>
                  <span className="text-[10px] text-slate-400">Automatically drafts smart WhatsApp replies</span>
                </div>
                <button onClick={() => setAiAssistantEnabled(!aiAssistantEnabled)} className="cursor-pointer">
                  {aiAssistantEnabled ? (
                    <ToggleRight className="w-10 h-10 text-primary" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-400" />
                  )}
                </button>
              </div>

            </div>
          </Card>

          {/* Right Columns: API Keys & Webhook configuration */}
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                  Security API keys
                </h3>
                <p className="text-xs text-slate-400">
                  Access tokens for developer API endpoints.
                </p>
              </div>

              <div className="flex flex-col gap-2 relative">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Live Key</span>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    readOnly
                    className="font-mono text-xs py-2 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyKey}>
                    {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Key className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                  Webhooks Receiver Endpoint
                </h3>
                <p className="text-xs text-slate-400">
                  URL that will receive WhatsApp webhook payloads.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  label="Webhook Destination URL"
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="text-xs"
                />
                <span className="text-[9px] text-slate-400 leading-normal block">
                  Make sure this endpoint handles POST requests from our AI core engines.
                </span>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* AI & Autopilot Options View */
        <div className="flex flex-col gap-6">
          
          {/* Autopilot Redis Configuration Panel */}
          <Card className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-border pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                  <Sliders className="w-5 h-5 text-primary" /> AI Autopilot Agent Configuration
                </h3>
                <p className="text-xs text-slate-400">
                  Manage the automated AI assistant system instructions and creativity parameters synced to Redis memory.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Active switch */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Agent Status: {aiAssistantEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button onClick={() => setAiAssistantEnabled(!aiAssistantEnabled)} className="cursor-pointer">
                    {aiAssistantEnabled ? (
                      <ToggleRight className="w-9 h-9 text-primary" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-400" />
                    )}
                  </button>
                </div>
                
                <Button variant="primary" size="sm" onClick={handleSaveAgentConfig} disabled={isSavingAgent || isLoadingAgent}>
                  {isSavingAgent ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save Config
                </Button>
              </div>
            </div>

            {isLoadingAgent ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs text-slate-450">Syncing settings with Redis cache...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* System instructions Prompt area */}
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    System Autopilot Prompt Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-mono"
                    placeholder="Describe how the autopilot assistant should act..."
                  />
                </div>
                
                {/* Temperature slider widget */}
                <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800 p-4 rounded-xl">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Temperature (Creativity)</span>
                    <span className="text-[10px] text-slate-400 leading-normal">
                      Higher values produce more creative replies; lower values generate predictable results.
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs font-semibold font-mono">
                      <span className="text-slate-400">0.0 (Deterministic)</span>
                      <span className="text-primary font-bold">{temperature}</span>
                      <span className="text-slate-400">1.0 (Creative)</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

              </div>
            )}
          </Card>

          {/* Prompt Templates CRUD Grid Card */}
          <Card className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-dark-border pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                  <Grid className="w-5 h-5 text-primary" /> Prompt Library Templates
                </h3>
                <p className="text-xs text-slate-400">
                  Store isolated prompt templates in PostgreSQL for recurring tasks (e.g. Lead Scoring prompts, support chatbot variations).
                </p>
              </div>
              
              <Button variant="primary" size="sm" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Template
              </Button>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates name or prompt content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="flex gap-1.5">
                {['ALL', 'CHATBOT', 'LEAD_SCORING', 'EMAIL_DRAFT'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-premium cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-transparent text-slate-400 border-slate-200 dark:border-dark-border hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Cards Grid */}
            {isLoadingPrompts ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs text-slate-455">Loading template matrix...</span>
              </div>
            ) : filteredPrompts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-dark-border rounded-xl flex flex-col justify-between gap-4 hover:border-primary/50 transition-premium group relative"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {p.name}
                        </span>
                        <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-primary tracking-wider">
                          {p.category.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800 max-h-24 overflow-y-auto">
                        <span className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          System Prompt
                        </span>
                        <p className="text-[10.5px] font-mono leading-normal text-slate-600 dark:text-slate-350 whitespace-pre-wrap">
                          {p.systemPrompt}
                        </p>
                      </div>

                      {p.userPrompt && (
                        <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/20 dark:border-slate-850">
                          <span className="text-[9px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider">
                            User Prompt Context
                          </span>
                          <p className="text-[10.5px] font-mono leading-normal text-slate-500 dark:text-slate-400">
                            {p.userPrompt}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Added: {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                      
                      <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-primary/10 hover:text-primary text-slate-450 hover:border-primary/20 transition-all cursor-pointer bg-white dark:bg-dark-card"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedPrompt(p); setIsDeleteOpen(true); }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-455 hover:border-rose-500/20 transition-all cursor-pointer bg-white dark:bg-dark-card"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-dark-border rounded-xl bg-slate-50/20">
                No prompt templates match filters or search queries.
              </div>
            )}
          </Card>

        </div>
      )}

      {/* CREATE PROMPT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Prompt Template"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreatePrompt} disabled={isSavingPrompt}>
              {isSavingPrompt ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              Create Template
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePrompt} className="flex flex-col gap-4">
          <Input
            label="Template Name"
            type="text"
            placeholder="e.g. Lead Qualification Engine"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Template Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="CHATBOT">Chatbot Dialogues</option>
              <option value="LEAD_SCORING">Lead Pipeline Scoring</option>
              <option value="EMAIL_DRAFT">Email Marketing Campaigns</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              System Instruction Prompt
            </label>
            <textarea
              rows={4}
              value={formSystemPrompt}
              onChange={(e) => setFormSystemPrompt(e.target.value)}
              required
              placeholder="Define the behavior rules, format outputs, and role instructions..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-mono"
            />
          </div>

          <Input
            label="User Prompt Template Context (Optional)"
            type="text"
            placeholder="e.g. Analyze lead {leadName} with conversion value {value}"
            value={formUserPrompt}
            onChange={(e) => setFormUserPrompt(e.target.value)}
          />
        </form>
      </Modal>

      {/* EDIT PROMPT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Update Prompt Template"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleEditPrompt} disabled={isSavingPrompt}>
              {isSavingPrompt ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditPrompt} className="flex flex-col gap-4">
          <Input
            label="Template Name"
            type="text"
            placeholder="e.g. Lead Qualification Engine"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Template Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="CHATBOT">Chatbot Dialogues</option>
              <option value="LEAD_SCORING">Lead Pipeline Scoring</option>
              <option value="EMAIL_DRAFT">Email Marketing Campaigns</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              System Instruction Prompt
            </label>
            <textarea
              rows={4}
              value={formSystemPrompt}
              onChange={(e) => setFormSystemPrompt(e.target.value)}
              required
              placeholder="Define the behavior rules, format outputs, and role instructions..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 text-slate-900 dark:text-slate-100 p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-mono"
            />
          </div>

          <Input
            label="User Prompt Template Context (Optional)"
            type="text"
            placeholder="e.g. Analyze lead {leadName} with conversion value {value}"
            value={formUserPrompt}
            onChange={(e) => setFormUserPrompt(e.target.value)}
          />
        </form>
      </Modal>

      {/* DELETE PROMPT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setSelectedPrompt(null); }}
        onConfirm={handleDeletePrompt}
        title="Confirm Prompt Deletion"
        message={`Are you sure you wish to delete the prompt template "${selectedPrompt?.name}"? This action will permanently remove it from the PostgreSQL database.`}
        confirmText="Delete Template"
        variant="danger"
      />

    </div>
  );
}

