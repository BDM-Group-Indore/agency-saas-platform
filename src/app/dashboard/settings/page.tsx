'use client';

import React, { useState } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, Key, CheckCircle, Network } from 'lucide-react';

export default function SettingsPage() {
  const [googleAdsConnected, setGoogleAdsConnected] = useState(true);
  const [metaAdsConnected, setMetaAdsConnected] = useState(true);
  const [whatsappApiConnected, setWhatsappApiConnected] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);

  const [apiKey, setApiKey] = useState('ap_live_72b38f89e24016a2c98d');
  const [webhookUrl, setWebhookUrl] = useState('https://agency-saas.com/api/v1/whatsapp-webhook');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyKey = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            SaaS System Configurations
          </h2>
          <p className="text-xs text-slate-400">
            Control API integrations, team permissions, webhook channels, and security settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => alert('All settings committed successfully.')}>
            Cancel Changes
          </Button>
          <Button variant="primary" size="sm" onClick={() => alert('Settings successfully deployed to production!')}>
            Save Configuration
          </Button>
        </div>
      </div>

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

            {/* AI Assistant autopilot */}
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

    </div>
  );
}
