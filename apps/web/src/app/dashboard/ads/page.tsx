'use client';

import React, { useState, useEffect } from 'react';
import { Card, StatsCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api';
import { 
  Megaphone, 
  RefreshCw, 
  BarChart, 
  Sparkles, 
  Percent, 
  Globe, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  History, 
  Link as LinkIcon, 
  Trash2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdAccount {
  id: string;
  platform: 'GOOGLE_ADS' | 'META_ADS';
  accountId: string;
  accountName: string | null;
  status: string;
  createdAt: string;
}

interface AdCampaign {
  id: string;
  campaignId: string;
  name: string;
  spend: number;
  budget: number;
  leadsGenerated: number;
  roas: number;
  status: string;
  platform: 'GOOGLE_ADS' | 'META_ADS';
}

interface AdSyncLog {
  id: string;
  platform: string;
  status: 'SUCCESS' | 'FAILED';
  message: string | null;
  syncedCount: number;
  createdAt: string;
}

export default function AdsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [syncLogs, setSyncLogs] = useState<AdSyncLog[]>([]);
  const [platformFilter, setPlatformFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setErrorMessage(null);
      const [accountsData, campaignsData, logsData] = await Promise.all([
        apiRequest('/ads/accounts'),
        apiRequest('/ads/campaigns'),
        apiRequest('/ads/sync-logs'),
      ]);
      setAccounts(accountsData);
      setCampaigns(campaignsData);
      setSyncLogs(logsData);
    } catch (err: any) {
      console.error('Failed to fetch ads telemetry:', err);
      setErrorMessage(err.message || 'Failed to fetch ads metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOAuthConnect = async (platform: 'google' | 'meta') => {
    try {
      setErrorMessage(null);
      const { url } = await apiRequest(`/ads/connect/${platform}`);
      
      // Open OAuth authorize window popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url,
        `${platform}-oauth-popup`,
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup) {
        setErrorMessage('Popup blocker prevented authentication. Please enable popups.');
        return;
      }

      // Listener for message sent from callback HTML window.close()
      const messageListener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'OAUTH_SYNC_COMPLETE') {
          fetchData();
          window.removeEventListener('message', messageListener);
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageListener);
          fetchData(); // Trigger final refresh in case message was missed
        }
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || `Failed to connect ${platform} Ads`);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this ad account? All synced campaigns will be removed.')) {
      return;
    }
    try {
      setIsLoading(true);
      await apiRequest(`/ads/accounts/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect ad account');
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (accounts.length === 0) {
      alert('Please connect at least one ad network first.');
      return;
    }
    try {
      setIsSyncing(true);
      setErrorMessage(null);
      await apiRequest('/ads/sync', { method: 'POST' });
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Synchronization failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const isGoogleConnected = accounts.some(a => a.platform === 'GOOGLE_ADS');
  const googleAccount = accounts.find(a => a.platform === 'GOOGLE_ADS');
  const isMetaConnected = accounts.some(a => a.platform === 'META_ADS');
  const metaAccount = accounts.find(a => a.platform === 'META_ADS');

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (platformFilter === 'All') return true;
    if (platformFilter === 'Google Ads') return c.platform === 'GOOGLE_ADS';
    if (platformFilter === 'Meta Ads') return c.platform === 'META_ADS';
    return true;
  });

  const totalSpent = filteredCampaigns.reduce((acc, curr) => acc + curr.spend, 0);
  const totalLeads = filteredCampaigns.reduce((acc, curr) => acc + curr.leadsGenerated, 0);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Ad Operations Command Center
          </h2>
          <p className="text-xs text-slate-400">
            Sync Google Ads, Meta Ads and YouTube Ads into a unified reporting interface.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualSync}
            disabled={isSyncing || accounts.length === 0}
            className="transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isSyncing && "animate-spin")} /> 
            {isSyncing ? 'Syncing...' : 'Sync Networks'}
          </Button>
          <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:scale-[1.02]">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Performance Max Builder
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Connection management section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Google Ads Connection Card */}
        <Card className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center font-bold text-amber-500 text-sm">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Google Ads</span>
              <span className="text-xs text-slate-400">
                {isGoogleConnected 
                  ? `Connected: ${googleAccount?.accountName || googleAccount?.accountId}` 
                  : 'Disconnected'}
              </span>
            </div>
          </div>
          {isGoogleConnected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> Linked
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDisconnect(googleAccount!.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors border-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleOAuthConnect('google')}
              className="text-xs transition-all hover:border-indigo-500 hover:text-indigo-500"
            >
              <LinkIcon className="w-3 h-3 mr-1" /> Link Account
            </Button>
          )}
        </Card>

        {/* Meta Ads Connection Card */}
        <Card className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center font-bold text-blue-600 text-sm">
              M
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Meta Ads</span>
              <span className="text-xs text-slate-400">
                {isMetaConnected 
                  ? `Connected: ${metaAccount?.accountName || metaAccount?.accountId}` 
                  : 'Disconnected'}
              </span>
            </div>
          </div>
          {isMetaConnected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> Linked
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDisconnect(metaAccount!.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors border-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleOAuthConnect('meta')}
              className="text-xs transition-all hover:border-indigo-500 hover:text-indigo-500"
            >
              <LinkIcon className="w-3 h-3 mr-1" /> Link Account
            </Button>
          )}
        </Card>
      </div>

      {/* Ads Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard title="Aggregated Spend" value={`$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<DollarSign className="w-5 h-5 text-indigo-500" />} subtitle="Active billing cycle" />
        <StatsCard title="Total Leads Generated" value={totalLeads} icon={<BarChart className="w-5 h-5 text-indigo-500" />} subtitle="Form & Click conversions" />
        <StatsCard title="Average Cost Per Lead" value={`$${(totalSpent / (totalLeads || 1)).toFixed(2)}`} icon={<Percent className="w-5 h-5 text-cyan-500" />} subtitle="Weighted mean score" />
        <StatsCard title="Integrated Accounts" value={`${accounts.length} Active`} icon={<Globe className="w-5 h-5 text-emerald-500" />} subtitle="Live external networks" />
      </div>

      {/* Main campaigns workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Campaign List */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-dark-border pb-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Integrated Campaign Registry
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Filter Platform:</span>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="text-xs font-semibold rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-700 dark:text-slate-200 p-2 focus:outline-none"
                >
                  <option value="All">All Networks</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Meta Ads">Meta Ads</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs">Loading campaign registry...</span>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Megaphone className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold">No active campaigns synced</p>
                <p className="text-[10px] text-slate-400 max-w-[280px]">
                  Link your ad accounts above and sync networks to pull campaigns.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-dark-border text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 pt-2">Campaign Name</th>
                      <th className="pb-3 pt-2">Network</th>
                      <th className="pb-3 pt-2">Spent / Budget</th>
                      <th className="pb-3 pt-2 text-right">Leads</th>
                      <th className="pb-3 pt-2 text-right">ROAS</th>
                      <th className="pb-3 pt-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {filteredCampaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 text-slate-900 dark:text-slate-50 font-bold max-w-[180px] truncate">
                          {c.name}
                        </td>
                        <td className="py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md font-semibold text-[10px]",
                            c.platform === 'GOOGLE_ADS' ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                          )}>
                            {c.platform === 'GOOGLE_ADS' ? 'Google' : 'Meta'}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex flex-col gap-1 w-44">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              ${c.spend.toLocaleString()} / ${c.budget.toLocaleString()}
                            </span>
                            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600" 
                                style={{ width: `${Math.min(100, (c.spend / (c.budget || 1)) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-bold text-slate-900 dark:text-white">
                          {c.leadsGenerated}
                        </td>
                        <td className="py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {c.roas}x
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase',
                            c.status.toLowerCase() === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-slate-500/10 text-slate-400'
                          )}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sync Logs and Audit Trail */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col gap-4 h-full">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-dark-border pb-4">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-50">
                Sync History & Audit Logs
              </h3>
            </div>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-slate-400 text-xs">
                Loading audit trail...
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No logs recorded yet. Run a synchronization to start logging.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                {syncLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 bg-slate-50 dark:bg-dark-card border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">
                        {log.platform === 'ALL' ? 'Unified Sync' : log.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'}
                      </span>
                      <span className={cn(
                        "flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md",
                        log.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {log.status === 'SUCCESS' ? (
                          <>
                            <CheckCircle className="w-2.5 h-2.5" /> Success
                          </>
                        ) : (
                          <>
                            <XCircle className="w-2.5 h-2.5" /> Fail
                          </>
                        )}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                      {log.message}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Synced: {log.syncedCount} campaigns</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
