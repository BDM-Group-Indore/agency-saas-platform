'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Send, CheckCheck, Cpu, Smartphone, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isSuggestion?: boolean;
}

export default function WhatsAppPage() {
  const [activeChat, setActiveChat] = useState('Rahul Sharma');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'Rahul', text: 'Hi, I saw your Meta campaign for real estate leads. Can I get a quote?', time: '13:02 PM' },
    { id: 2, sender: 'AI Agent', text: 'Hello Rahul! Absolutely. Our custom lead generation package for elite agencies starts with 50 qualified leads guaranteed. Would you like to check out our portfolio?', time: '13:03 PM' },
    { id: 3, sender: 'Rahul', text: 'Yes, please share the portfolio link.', time: '13:04 PM' },
  ]);
  const [typedMessage, setTypedMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage) return;

    const newMsg = {
      id: messages.length + 1,
      sender: 'You',
      text: typedMessage,
      time: '13:06 PM',
    };

    setMessages([...messages, newMsg]);
    setTypedMessage('');

    // Trigger dummy AI suggest response after 1s
    setTimeout(() => {
      const aiReply = {
        id: messages.length + 2,
        sender: 'AI Agent',
        text: `Suggesting follow-up: Rahul, I've updated your deal profile value in our CRM. Would you like to schedule a 15-minute sync with Shivam tomorrow?`,
        time: '13:07 PM',
        isSuggestion: true,
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 1200);
  };

  const conversations = [
    { name: 'Rahul Sharma', lastMsg: 'Yes, please share the portfolio link.', unread: 0, active: true },
    { name: 'Priya Patel', lastMsg: 'Awesome! Let me confirm the invoice details.', unread: 2, active: false },
    { name: 'Ananya Iyer', lastMsg: 'When is our next onboarding meeting?', unread: 0, active: false },
    { name: 'Vikram Singh', lastMsg: 'Sending over the Google Ads access credentials.', unread: 1, active: false },
  ];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-dark-border pb-3 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            WhatsApp Marketing & AI Outreach Suite
          </h2>
          <p className="text-xs text-slate-400">
            Realtime customer engagement logs with conversational autopilot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Mobile App Link
          </Button>
          <Button variant="primary" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Broadcast campaign
          </Button>
        </div>
      </div>

      {/* Main Inbox Workspace layout */}
      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        
        {/* Left conversations list */}
        <Card className="w-80 p-0 overflow-hidden flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-dark-border">
            <Input type="search" placeholder="Search conversations..." className="py-1 text-xs" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {conversations.map((conv) => (
              <button
                key={conv.name}
                onClick={() => setActiveChat(conv.name)}
                className={cn(
                  'w-full p-4 flex flex-col gap-1 transition-premium text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
                  activeChat === conv.name ? 'bg-slate-100/50 dark:bg-slate-800/30 border-l-4 border-primary' : ''
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{conv.name}</span>
                  <span className="text-[9px] text-slate-400">13:04 PM</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 truncate max-w-[180px]">{conv.lastMsg}</span>
                  {conv.unread > 0 && (
                    <span className="w-4 h-4 bg-primary rounded-full text-white flex items-center justify-center font-bold text-[8px]">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Middle Active Chat window */}
        <Card className="flex-1 p-0 overflow-hidden flex flex-col relative">
          {/* Active Chat Header */}
          <div className="p-4 border-b border-slate-200 dark:border-dark-border flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-dark-card/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-primary flex items-center justify-center font-bold text-xs">
                {activeChat[0]}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-50">{activeChat}</span>
                <span className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-full">
                <Cpu className="w-3 h-3" /> AI Autopilot Active
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex flex-col max-w-sm rounded-2xl p-3.5 text-xs relative',
                  m.sender === 'You'
                    ? 'bg-primary text-white ml-auto rounded-tr-none'
                    : m.isSuggestion
                    ? 'bg-gradient-to-br from-indigo-950/20 to-accent/5 border border-indigo-500/20 text-indigo-200 ml-auto rounded-tr-none shadow-md glow-primary'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'
                )}
              >
                {m.isSuggestion && (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-accent uppercase tracking-widest block mb-1">
                    <Cpu className="w-2.5 h-2.5" /> AI Suggestion (Approve to Send)
                  </span>
                )}
                <span className="font-semibold block mb-0.5 text-[9px] opacity-75">{m.sender}</span>
                <p className="leading-relaxed font-medium">{m.text}</p>
                <div className="flex justify-end items-center gap-1 mt-2 text-[9px] opacity-60">
                  <span>{m.time}</span>
                  {m.sender === 'You' && <CheckCheck className="w-3.5 h-3.5 text-slate-100" />}
                </div>
              </div>
            ))}
          </div>

          {/* Form Message input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-dark-border flex gap-3 shrink-0">
            <Input
              type="text"
              placeholder="Type your response or let AI compose followups..."
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              className="py-2.5"
            />
            <Button type="submit" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
