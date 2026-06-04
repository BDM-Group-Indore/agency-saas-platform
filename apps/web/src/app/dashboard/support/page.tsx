'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  LifeBuoy, 
  AlertCircle, 
  Clock, 
  BookOpen, 
  Plus, 
  ShieldCheck,
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  PlusCircle,
  User
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'chatbot'>('tickets');
  
  // Chatbot states
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  
  const [isLoadingConvos, setIsLoadingConvos] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tickets = [
    { id: 'TKT-1082', subject: 'Facebook Pixel Integration hydration failure', client: 'Apex Health Ltd', priority: 'High', status: 'In Review', sla: '1.2h remaining' },
    { id: 'TKT-1042', subject: 'Custom field mapping error on HubSpot export', client: 'Nexon Digital Corp', priority: 'Medium', status: 'Open', sla: '4.5h remaining' },
    { id: 'TKT-0985', subject: 'Invoice address verification required', client: 'Elite Real Estate', priority: 'Low', status: 'Resolved', sla: 'Met' },
  ];

  // Fetch conversations list when tab is active
  useEffect(() => {
    if (activeTab === 'chatbot') {
      fetchConversations();
    }
  }, [activeTab]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConvoId) {
      fetchMessages(activeConvoId);
    } else {
      setMessages([]);
    }
  }, [activeConvoId]);

  // Auto-scroll chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function fetchConversations() {
    setIsLoadingConvos(true);
    try {
      const data = await apiRequest('/ai/chat/conversations');
      setConversations(data);
      if (data.length > 0 && !activeConvoId) {
        setActiveConvoId(data[0].id || data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoadingConvos(false);
    }
  };

  async function fetchMessages(convoId: string) {
    setIsLoadingMessages(true);
    try {
      const data = await apiRequest(`/ai/chat/conversations/${convoId}/messages`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userMsgText = inputMessage;
    setInputMessage('');
    setIsSending(true);

    // Optimistically push user message
    const tempUserMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: userMsgText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMsgText,
          conversationId: activeConvoId || undefined,
        }),
      });

      if (!activeConvoId) {
        // If it was a new thread, set the active conversation ID and refresh list
        setActiveConvoId(response.conversationId);
        await fetchConversations();
      } else {
        // Append response reply
        const assistantMsg = {
          id: 'temp-assistant-' + Date.now(),
          role: 'assistant',
          content: response.reply,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          tempUserMsg,
          assistantMsg,
        ]);
        // Update list update times
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to dispatch chat message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConvo = async (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(convoId);

    try {
      await apiRequest(`/ai/chat/conversations/${convoId}`, {
        method: 'DELETE',
      });
      setConversations((prev) => prev.filter((c) => (c.id || c._id) !== convoId));
      if (activeConvoId === convoId) {
        setActiveConvoId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation thread:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNewConvo = () => {
    setActiveConvoId(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-8.5rem)] md:h-[calc(100vh-7rem)]">
      
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Customer Success & SLA Monitoring
          </h2>
          <p className="text-xs text-slate-400">
            Handle platform support tickets, helpdesk documents, and dynamic AI assistant resolutions.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-dark-border self-start md:self-center">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-premium cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-premium flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chatbot'
                ? 'bg-primary text-white shadow-sm shadow-primary/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Chat Copilot
          </button>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Row Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <StatsCard title="Mean Resolution Speed" value="2.8 hours" icon={<Clock className="w-5 h-5 text-indigo-500" />} subtitle="SLA commitment: 4.0 hours" />
            <StatsCard title="SLA Compliance Rate" value="98.4%" icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />} trend={{ value: 0.6, isPositive: true }} subtitle="vs last 30 days" />
            <StatsCard title="Unresolved Tickets" value="2 Active" icon={<AlertCircle className="w-5 h-5 text-rose-500" />} subtitle="0 critical bottlenecks" />
          </div>

          {/* Tickets List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Ticket index table */}
            <Card className="lg:col-span-2 flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                      Active Client Support Tickets
                    </h3>
                    <p className="text-xs text-slate-400">
                      Assigned issues requiring developer review or client assistance.
                    </p>
                  </div>
                  <Button variant="primary" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Open Ticket
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 pt-2">Ticket ID</th>
                      <th className="pb-3 pt-2">Subject Issue</th>
                      <th className="pb-3 pt-2">Client Account</th>
                      <th className="pb-3 pt-2 text-center">Priority</th>
                      <th className="pb-3 pt-2 text-center">SLA Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 font-mono font-bold text-primary">{t.id}</td>
                        <td className="py-3.5 text-slate-900 dark:text-slate-50 font-bold max-w-xs truncate">{t.subject}</td>
                        <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-350">{t.client}</td>
                        <td className="py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            t.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3.5 text-center text-slate-400 font-semibold">{t.sla}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Right FAQ cards */}
            <Card className="flex flex-col gap-4">
              <div className="border-b border-slate-200 dark:border-dark-border pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                  Agency Knowledge base
                </h3>
                <p className="text-xs text-slate-400">
                  Help articles for self-service setups.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { title: 'Meta Webhooks callback setup guide', category: 'WhatsApp API' },
                  { title: 'Google AdWords OAuth credentials auth key', category: 'Ads Integration' },
                  { title: 'Invoice auto formatting settings rules', category: 'Billing ledger' },
                ].map((art) => (
                  <div key={art.title} className="p-3 bg-slate-100/50 dark:bg-slate-800/30 border border-slate-250/50 dark:border-slate-800/50 rounded-xl text-xs hover:border-primary transition-colors cursor-pointer">
                    <span className="text-[9px] font-bold uppercase text-primary tracking-widest">{art.category}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block mt-1 leading-normal">{art.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* AI Chat Copilot View */
        <div className="flex-1 min-h-0 flex gap-6 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
          
          {/* Sidebar Chat History List */}
          <div className="w-80 border-r border-slate-200 dark:border-dark-border flex flex-col shrink-0 bg-slate-50/50 dark:bg-dark-bg/20">
            <div className="p-4 border-b border-slate-200 dark:border-dark-border flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Conversations
              </span>
              <button
                onClick={handleNewConvo}
                className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-premium cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Thread
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingConvos ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-[10px] text-slate-400 font-semibold">Loading history...</span>
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((convo) => {
                  const id = convo.id || convo._id;
                  const isActive = activeConvoId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setActiveConvoId(id)}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-premium ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'hover:bg-slate-150/40 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate leading-snug">
                            {convo.title}
                          </span>
                          <span className={`text-[9px] font-semibold ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                            {new Date(convo.updatedAt || convo.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteConvo(id, e)}
                        disabled={deletingId === id}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200/20 text-slate-400 hover:text-rose-500 transition-all ${
                          isActive ? 'text-white hover:text-white' : ''
                        }`}
                      >
                        {deletingId === id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  No chat histories yet.
                </div>
              )}
            </div>
          </div>

          {/* Active Chat Workspace Panel */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            
            {/* Thread Header */}
            <div className="h-13 border-b border-slate-200 dark:border-dark-border px-4 flex items-center justify-between shrink-0 bg-slate-50/20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {activeConvoId 
                    ? conversations.find(c => (c.id || c._id) === activeConvoId)?.title || 'Active Dialogue'
                    : 'New Autopilot Support Session'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                SaaS CRM Autopilot
              </div>
            </div>

            {/* Chat Messages scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConvoId && isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="text-xs text-slate-450">Loading message dialogues...</span>
                </div>
              ) : messages.length > 0 ? (
                messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id || m._id}
                      className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        isUser 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' 
                          : 'bg-primary/10 text-primary border border-primary/10'
                      }`}>
                        {isUser ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4.5 h-4.5" />
                        )}
                      </div>
                      
                      {/* Body Bubble */}
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/5'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-850 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-slate-800'
                      }`}>
                        <p className="whitespace-pre-line">{m.content}</p>
                        <span className={`block text-[9px] mt-1.5 font-medium ${isUser ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-lg shadow-primary/5">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Ask AdPulse CRM Autopilot
                    </h4>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Ask about your live leads sourcing metrics, overdue client invoices, active social campaigns performance, or let it write follow-up messages for active pipeline deals.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-2">
                    {[
                      'How many active leads do I have?',
                      'Check overdue invoices & revenues status',
                      'Tell me about my active pipeline deals',
                    ].map((sample) => (
                      <button
                        key={sample}
                        onClick={() => setInputMessage(sample)}
                        className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-full text-[11px] font-bold text-slate-650 dark:text-slate-350 hover:border-primary hover:text-primary transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/20"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Typing indicator */}
              {isSending && (
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/10">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl rounded-tl-none border border-slate-200/40 dark:border-slate-800 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Footer */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-slate-200 dark:border-dark-border flex gap-3 bg-slate-50/20 shrink-0"
            >
              <input
                type="text"
                placeholder={isSending ? 'AI is drafting message...' : 'Send message prompt...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
                className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-850 dark:text-white"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white p-2.5 rounded-xl transition-premium shadow-md shadow-primary/10 shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

