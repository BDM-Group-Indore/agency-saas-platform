'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';
import {
  MessageSquare,
  Send,
  CheckCheck,
  Cpu,
  Smartphone,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  Radio,
  Users,
  Check,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types matching shared-types and database
interface Conversation {
  id: string;
  phoneNumber: string;
  lastMessage?: string;
  lastMessageAt: string;
  status: string; // OPEN, CLOSED, SNOOZED
  contactId?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
  };
}

interface Message {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'TEMPLATE';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  templateName?: string;
  mediaUrl?: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any;
  status: string;
  createdAt: string;
}

interface Broadcast {
  id: string;
  name: string;
  templateId: string;
  template?: {
    id: string;
    name: string;
  };
  status: string; // DRAFT, SENDING, COMPLETED, FAILED
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'broadcasts' | 'templates'>('inbox');

  // ----------------------------------------------------
  // Tab 1: Inbox States
  // ----------------------------------------------------
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // ----------------------------------------------------
  // Simulator Panel States
  // ----------------------------------------------------
  const [simPhone, setSimPhone] = useState('+12065550199');
  const [simBody, setSimBody] = useState('menu');
  const [simulating, setSimulating] = useState(false);

  // ----------------------------------------------------
  // Tab 2: Broadcasts States
  // ----------------------------------------------------
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const [bcName, setBcName] = useState('');
  const [bcTemplateId, setBcTemplateId] = useState('');
  const [bcPhoneNumbers, setBcPhoneNumbers] = useState('');
  const [launchingBc, setLaunchingBc] = useState(false);

  // ----------------------------------------------------
  // Tab 3: Templates States
  // ----------------------------------------------------
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [tplLanguage, setTplLanguage] = useState('en_US');
  const [tplHeader, setTplHeader] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplFooter, setTplFooter] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------
  // API Fetch Utilities
  // ----------------------------------------------------
  const fetchConversations = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setConversationsLoading(true);
      const queryParams = new URLSearchParams({ page: '1', limit: '50' });
      if (searchQuery) queryParams.append('search', searchQuery);

      const res = await apiRequest(`/whatsapp/conversations?${queryParams.toString()}`);
      setConversations(res.data || []);
    } catch (err: any) {
      console.error('Failed to load conversations:', err.message);
    } finally {
      if (!isSilent) setConversationsLoading(false);
    }
  }, [searchQuery]);

  const fetchMessages = useCallback(async (convId: string, isSilent = false) => {
    try {
      if (!isSilent) setMessagesLoading(true);
      const res = await apiRequest(`/whatsapp/conversations/${convId}/messages?page=1&limit=100`);
      // API returns messages ascending (oldest first). Sort ascending for UI view.
      const msgs = res.data || [];
      setMessages(msgs);
    } catch (err: any) {
      console.error('Failed to load messages:', err.message);
    } finally {
      if (!isSilent) setMessagesLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const res = await apiRequest('/whatsapp/templates');
      setTemplates(res || []);
    } catch (err: any) {
      console.error('Failed to load templates:', err.message);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchBroadcasts = useCallback(async () => {
    try {
      setBroadcastsLoading(true);
      const res = await apiRequest('/whatsapp/broadcasts');
      setBroadcasts(res || []);
    } catch (err: any) {
      console.error('Failed to load broadcasts:', err.message);
    } finally {
      setBroadcastsLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // Effects & Lifecycle Hooks
  // ----------------------------------------------------
  // Initial Loads
  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    fetchBroadcasts();
  }, [fetchConversations, fetchTemplates, fetchBroadcasts]);

  // Load active chat details & message stream
  useEffect(() => {
    if (activeConvId) {
      const match = conversations.find((c) => c.id === activeConvId);
      if (match) setActiveConv(match);
      fetchMessages(activeConvId);
    } else {
      setActiveConv(null);
      setMessages([]);
    }
  }, [activeConvId, fetchMessages, conversations]);

  // Poll active chat and conversation feeds every 5 seconds for live flow
  useEffect(() => {
    const timer = setInterval(() => {
      fetchConversations(true);
      if (activeConvId) {
        fetchMessages(activeConvId, true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeConvId, fetchConversations, fetchMessages]);

  // Scroll to bottom of chat screen
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------
  // Outbound Manual Message Send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConv) return;

    try {
      setSendingMessage(true);
      await apiRequest('/whatsapp/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: activeConv.phoneNumber,
          body: newMessageText.trim(),
          type: 'TEXT'
        })
      });
      setNewMessageText('');
      // Reload feeds
      await fetchMessages(activeConv.id, true);
      await fetchConversations(true);
    } catch (err: any) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Mock Inbound Webhook Execution (Simulator)
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone.trim() || !simBody.trim()) return;

    try {
      setSimulating(true);
      const res = await apiRequest('/whatsapp/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: simPhone.trim(),
          body: simBody.trim()
        })
      });

      // Reload conversations list instantly
      const qParams = new URLSearchParams({ page: '1', limit: '50' });
      if (searchQuery) qParams.append('search', searchQuery);
      const convRes = await apiRequest(`/whatsapp/conversations?${qParams.toString()}`);
      const updatedConvs = convRes.data || [];
      setConversations(updatedConvs);

      // Deduce conversation ID to auto-focus or refresh
      const match = updatedConvs.find((c: any) => c.phoneNumber === simPhone.trim());
      if (match) {
        setActiveConvId(match.id);
        await fetchMessages(match.id);
      }
    } catch (err: any) {
      alert(`Simulator payload error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Add Custom Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplBody.trim()) return;

    // Build components JSON schema structure
    const components = [];
    if (tplHeader.trim()) {
      components.push({ type: 'HEADER', format: 'TEXT', text: tplHeader.trim() });
    }
    components.push({ type: 'BODY', text: tplBody.trim() });
    if (tplFooter.trim()) {
      components.push({ type: 'FOOTER', text: tplFooter.trim() });
    }

    try {
      setCreatingTemplate(true);
      await apiRequest('/whatsapp/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: tplName.trim().toLowerCase().replace(/\s+/g, '_'),
          category: tplCategory,
          language: tplLanguage,
          components
        })
      });

      // Clear & Close
      setTplName('');
      setTplHeader('');
      setTplBody('');
      setTplFooter('');
      setIsCreateTemplateOpen(false);
      fetchTemplates();
    } catch (err: any) {
      alert(`Template creation failed: ${err.message}`);
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message template?')) return;
    try {
      await apiRequest(`/whatsapp/templates/${id}`, {
        method: 'DELETE'
      });
      fetchTemplates();
    } catch (err: any) {
      alert(`Failed to delete template: ${err.message}`);
    }
  };

  // Trigger campaign broadcast
  const handleLaunchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcName.trim() || !bcTemplateId || !bcPhoneNumbers.trim()) return;

    // Parse recipient phone list
    const phones = bcPhoneNumbers
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phones.length === 0) {
      alert('Please enter at least one valid recipient phone number.');
      return;
    }

    try {
      setLaunchingBc(true);
      await apiRequest('/whatsapp/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          name: bcName.trim(),
          templateId: bcTemplateId,
          phoneNumbers: phones
        })
      });

      // Clear & Close
      setBcName('');
      setBcTemplateId('');
      setBcPhoneNumbers('');
      setIsLaunchOpen(false);
      fetchBroadcasts();
      fetchConversations();
    } catch (err: any) {
      alert(`Failed to launch campaign broadcast: ${err.message}`);
    } finally {
      setLaunchingBc(false);
    }
  };

  // ----------------------------------------------------
  // UI Render Helpers
  // ----------------------------------------------------
  const renderTemplateComponents = (components: any) => {
    if (!components || !Array.isArray(components)) return null;
    const header = components.find((c: any) => c.type === 'HEADER');
    const body = components.find((c: any) => c.type === 'BODY');
    const footer = components.find((c: any) => c.type === 'FOOTER');

    return (
      <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800/30 text-xs">
        {header && <div className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{header.text}</div>}
        {body && <div className="text-slate-700 dark:text-slate-200 leading-relaxed py-1.5 font-medium">{body.text}</div>}
        {footer && <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">{footer.text}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
      
      {/* Header and navigation tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-dark-border pb-3 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-500 animate-pulse" /> WhatsApp Suite & Chatbot Auto-Pilot
          </h2>
          <p className="text-xs text-slate-400">
            Configure pre-approved templates, run simulated broadcast campaign loops, and test bot keyword routers.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/20">
          <button
            onClick={() => setActiveTab('inbox')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-premium cursor-pointer',
              activeTab === 'inbox'
                ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-800/30'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            Conversations Inbox
          </button>
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-premium cursor-pointer',
              activeTab === 'broadcasts'
                ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-800/30'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            Campaigns Hub
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-premium cursor-pointer',
              activeTab === 'templates'
                ? 'bg-white dark:bg-dark-card text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-800/30'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            Templates Registry
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB 1: CONVERSATIONS INBOX & MOCK CLIENT SIMULATOR */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'inbox' && (
        <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
          
          {/* Left panel: Conversations List */}
          <Card className="w-80 p-0 overflow-hidden flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-dark-border">
              <Input
                type="search"
                placeholder="Search phone or message..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchConversations();
                }}
                className="py-1.5 text-xs"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
              {conversationsLoading ? (
                <div className="py-10 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  Loading sessions...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  No messaging sessions found.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const initials = conv.contact
                    ? `${conv.contact.firstName[0] || ''}${conv.contact.lastName?.[0] || ''}`
                    : '?';
                  const title = conv.contact
                    ? `${conv.contact.firstName} ${conv.contact.lastName || ''}`
                    : conv.phoneNumber;
                  const time = new Date(conv.lastMessageAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={cn(
                        'w-full p-4 flex flex-col gap-1 text-left cursor-pointer transition-premium hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-l-4 border-transparent',
                        isActive ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-l-primary' : ''
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm',
                            conv.contact ? 'bg-indigo-500/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          )}>
                            {initials}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate max-w-[140px]">
                            {title}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">{time}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] pl-9">
                        <span className="text-slate-400 truncate max-w-[150px]">
                          {conv.lastMessage || 'No messages logged yet'}
                        </span>
                        <span className={cn(
                          'text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                          conv.status === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : conv.status === 'CLOSED'
                            ? 'bg-slate-500/10 text-slate-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        )}>
                          {conv.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Middle panel: Chat Window */}
          <Card className="flex-1 p-0 overflow-hidden flex flex-col relative border border-slate-200 dark:border-dark-border">
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-dark-border flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-dark-card/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-primary flex items-center justify-center font-bold text-xs shadow-sm">
                      {activeConv.contact ? activeConv.contact.firstName[0] : '#'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-50">
                        {activeConv.contact
                          ? `${activeConv.contact.firstName} ${activeConv.contact.lastName || ''}`
                          : activeConv.phoneNumber}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        Phone: {activeConv.phoneNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-full uppercase tracking-wider border border-accent/20">
                      <Cpu className="w-3 h-3 text-accent animate-pulse" /> Bot Auto-reply On
                    </span>
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/10">
                  {messagesLoading ? (
                    <div className="py-20 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      Fetching conversation log...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-20 text-center text-xs text-slate-400">
                      No messages registered. Use the simulator or manual sender to start chat log history.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isOutbound = m.direction === 'OUTBOUND';
                      const formattedTime = new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={m.id}
                          className={cn(
                            'flex flex-col max-w-sm rounded-2xl p-3.5 text-xs shadow-sm',
                            isOutbound
                              ? 'bg-primary text-white ml-auto rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-200 mr-auto rounded-tl-none'
                          )}
                        >
                          <span className="font-semibold block mb-1 text-[9px] opacity-75 uppercase tracking-wider">
                            {isOutbound ? 'Manual Agent / Autopilot' : 'Customer Client'}
                          </span>
                          <p className="leading-relaxed whitespace-pre-wrap font-medium">{m.body}</p>
                          <div className="flex justify-end items-center gap-1 mt-2 text-[9px] opacity-60">
                            <span>{formattedTime}</span>
                            {isOutbound && (
                              <CheckCheck className={cn(
                                'w-3.5 h-3.5',
                                m.status === 'READ'
                                  ? 'text-accent'
                                  : m.status === 'FAILED'
                                  ? 'text-rose-500'
                                  : 'text-slate-100'
                              )} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Outgoing manual response form */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-dark-border flex gap-3 bg-white dark:bg-dark-card shrink-0">
                  <Input
                    type="text"
                    placeholder="Type manual response to client..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    disabled={sendingMessage}
                    className="py-2.5"
                  />
                  <Button type="submit" disabled={sendingMessage || !newMessageText.trim()} className="shrink-0 cursor-pointer">
                    {sendingMessage ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">No active conversation</span>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Select a communication session from the list, or trigger an incoming test message using the Sandbox Simulator.
                </p>
              </div>
            )}
          </Card>

          {/* Right panel: Webhook sandbox client */}
          <Card className="w-80 shrink-0 p-5 flex flex-col gap-4 border border-slate-200 dark:border-dark-border">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Autopilot Sandbox
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Webhook Event Simulator
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal">
                Submit raw JSON webhook triggers to simulate clients messaging your business. This tests the bot's auto-reply keyword logic.
              </p>
            </div>

            <form onSubmit={handleSimulateWebhook} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Client Phone Number
                </label>
                <Input
                  type="text"
                  placeholder="+12065550199"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="py-1 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Webhook Inbound Message Body
                </label>
                <Input
                  type="text"
                  placeholder="e.g. help"
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  className="py-1 text-xs"
                />
              </div>

              {/* Bot preset macros */}
              <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/40 pt-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Preset Messages
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimBody('help')}
                    className="text-[10px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 text-left transition-premium cursor-pointer font-medium"
                  >
                    🤖 Help / Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimBody('1')}
                    className="text-[10px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 text-left transition-premium cursor-pointer font-medium"
                  >
                    💼 1: Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimBody('2')}
                    className="text-[10px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 text-left transition-premium cursor-pointer font-medium"
                  >
                    🔧 2: Support
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimBody('3')}
                    className="text-[10px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 text-left transition-premium cursor-pointer font-medium"
                  >
                    👤 3: Live Agent
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={simulating || !simPhone.trim() || !simBody.trim()}
                className="w-full mt-2 cursor-pointer"
              >
                {simulating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>Mock Payload Event</>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB 2: CAMPAIGN BROADCASTS HUB */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'broadcasts' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
          <div className="flex justify-between items-center bg-slate-50/50 dark:bg-dark-card/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/20">
            <div className="flex items-center gap-2">
              <StatsCard
                title="Total Campaigns"
                value={broadcasts.length.toString()}
                icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
                className="w-52 shadow-sm border border-slate-200/60"
              />
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsLaunchOpen(true)} className="cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Launch Broadcast
            </Button>
          </div>

          <Card className="p-0 overflow-hidden border border-slate-200 dark:border-dark-border">
            <div className="overflow-x-auto">
              {broadcastsLoading ? (
                <div className="py-20 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                  Loading broadcasts table...
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No broadcast campaigns launched yet. Start a marketing blast to view analytics.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Campaign Name</th>
                      <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Template Used</th>
                      <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="p-4 font-bold text-slate-500 text-center uppercase tracking-wider text-[10px]">Sent</th>
                      <th className="p-4 font-bold text-slate-500 text-center uppercase tracking-wider text-[10px]">Delivered</th>
                      <th className="p-4 font-bold text-slate-500 text-center uppercase tracking-wider text-[10px]">Read (Receipts)</th>
                      <th className="p-4 font-bold text-slate-500 text-center uppercase tracking-wider text-[10px]">Failed</th>
                      <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Launched At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {broadcasts.map((bc) => (
                      <tr key={bc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/5 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-50">{bc.name}</td>
                        <td className="p-4 font-medium text-slate-500 dark:text-slate-400">
                          {bc.template?.name || 'Unknown Template'}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            'px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border',
                            bc.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : bc.status === 'SENDING'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 animate-pulse'
                              : 'bg-slate-500/10 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}>
                            {bc.status}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-center text-slate-700 dark:text-slate-300">{bc.sentCount}</td>
                        <td className="p-4 font-bold text-center text-emerald-500">{bc.deliveredCount}</td>
                        <td className="p-4 font-bold text-center text-indigo-500">{bc.readCount}</td>
                        <td className="p-4 font-bold text-center text-rose-500">{bc.failedCount}</td>
                        <td className="p-4 text-slate-400">
                          {new Date(bc.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB 3: TEMPLATES REGISTRY */}
      {/* -------------------------------------------------------------------------------- */}
      {activeTab === 'templates' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto">
          <div className="flex justify-between items-center bg-slate-50/50 dark:bg-dark-card/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/20">
            <span className="text-xs font-semibold text-slate-400">
              Templates are pre-approved content blocks to send notifications, transactional messages, and promo codes.
            </span>
            <Button variant="primary" size="sm" onClick={() => setIsCreateTemplateOpen(true)} className="cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              Loading templates registry...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">
              No messaging templates found. Click "Create Template" to populate your catalog.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="flex flex-col gap-3 justify-between border border-slate-200/80 dark:border-slate-800 shadow-sm relative group">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-50 truncate max-w-[150px]">
                        {tpl.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {tpl.category}
                        </span>
                        <span className="text-[8px] font-semibold text-slate-400">
                          {tpl.language}
                        </span>
                      </div>
                    </div>

                    {/* Preview of parts */}
                    {renderTemplateComponents(tpl.components)}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-3 text-[10px]">
                    <span className="text-[8px] text-slate-400 font-medium">
                      Created: {new Date(tpl.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer flex items-center gap-1 hover:bg-rose-500/5 px-2 py-1 rounded transition-colors font-semibold"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* LAUNCH BROADCAST CAMPAIGN MODAL */}
      {/* -------------------------------------------------------------------------------- */}
      <Modal
        isOpen={isLaunchOpen}
        onClose={() => setIsLaunchOpen(false)}
        title="Launch Marketing Campaign Broadcast"
        size="md"
      >
        <form onSubmit={handleLaunchBroadcast} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Campaign Blast Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Promo July Codes"
              value={bcName}
              onChange={(e) => setBcName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Select Approved Message Template
            </label>
            <select
              value={bcTemplateId}
              onChange={(e) => setBcTemplateId(e.target.value)}
              required
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose Template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
              <span>Target Phone Numbers</span>
              <span className="text-[9px] text-slate-400 font-medium normal-case">
                Enter phone numbers separated by comma or new lines.
              </span>
            </label>
            <textarea
              placeholder="e.g.&#10;+12061111111&#10;+12062222222&#10;+12063333333"
              rows={4}
              value={bcPhoneNumbers}
              onChange={(e) => setBcPhoneNumbers(e.target.value)}
              required
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none w-full"
            />
            <p className="text-[9px] text-slate-400 italic">
              Tip: Numbers starting with "999" (e.g., 999111) will trigger simulated send failures for visual analytics audits.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsLaunchOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={launchingBc || !bcName.trim() || !bcTemplateId || !bcPhoneNumbers.trim()}>
              {launchingBc ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>Launch Campaign Blast</>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------------------- */}
      {/* CREATE MESSAGE TEMPLATE MODAL */}
      {/* -------------------------------------------------------------------------------- */}
      <Modal
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        title="Register Message Template"
        size="md"
      >
        <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Template Name (lowercase, no spaces)
            </label>
            <Input
              type="text"
              placeholder="e.g. promo_coupon_aug"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                value={tplCategory}
                onChange={(e) => setTplCategory(e.target.value as any)}
                className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Language Code
              </label>
              <Input
                type="text"
                placeholder="en_US"
                value={tplLanguage}
                onChange={(e) => setTplLanguage(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800/40 pt-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Header Text (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Exclusive Offer"
              value={tplHeader}
              onChange={(e) => setTplHeader(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Body Message Content
            </label>
            <textarea
              placeholder="e.g. Hello, thank you for being a valued customer. Use code SAVE20 for 20% off."
              rows={4}
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              required
              className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2.5 focus:outline-none w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Footer Text (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Reply STOP to opt out"
              value={tplFooter}
              onChange={(e) => setTplFooter(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={creatingTemplate || !tplName.trim() || !tplBody.trim()}>
              {creatingTemplate ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>Register Template</>
              )}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
