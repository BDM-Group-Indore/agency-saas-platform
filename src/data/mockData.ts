export interface Lead {
  id: string;
  leadName: string;
  phone: string;
  email: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Nurturing';
  value: number;
  assignedTo: string;
  dateCreated: string;
}

export interface Deal {
  id: string;
  companyName: string;
  dealName: string;
  stage: 'Proposal' | 'Negotiation' | 'Contract Sent' | 'Closed Won' | 'Closed Lost';
  amount: number;
  owner: string;
  closeDate: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: 'Google Ads' | 'Meta Ads' | 'YouTube Ads' | 'Instagram Ads';
  budget: number;
  spend: number;
  leadsGenerated: number;
  roas: number;
  status: 'Active' | 'Paused' | 'Completed';
}

export const mockLeads: Lead[] = [
  { id: 'L-101', leadName: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@gmail.com', source: 'Facebook Ads', status: 'Qualified', value: 1200, assignedTo: 'Amit Kumar', dateCreated: '2026-06-01' },
  { id: 'L-102', leadName: 'Priya Patel', phone: '9812345678', email: 'priya.patel@yahoo.com', source: 'Google Search', status: 'New', value: 2500, assignedTo: 'Sneha Rao', dateCreated: '2026-06-02' },
  { id: 'L-103', leadName: 'Vikram Singh', phone: '9765432109', email: 'vikram.singh@outlook.com', source: 'LinkedIn Outbound', status: 'Contacted', value: 5000, assignedTo: 'Amit Kumar', dateCreated: '2026-05-30' },
  { id: 'L-104', leadName: 'Ananya Iyer', phone: '9988776655', email: 'ananya.iyer@gmail.com', source: 'Instagram Ads', status: 'Nurturing', value: 800, assignedTo: 'Sneha Rao', dateCreated: '2026-05-28' },
  { id: 'L-105', leadName: 'Kabir Mehta', phone: '9123456789', email: 'kabir.mehta@rediff.com', source: 'YouTube Ads', status: 'Unqualified', value: 0, assignedTo: 'Unassigned', dateCreated: '2026-05-25' },
];

export const mockDeals: Deal[] = [
  { id: 'D-201', companyName: 'Nexon Digital Corp', dealName: 'Enterprise SEO & SEM retainer', stage: 'Proposal', amount: 8500, owner: 'Shivam', closeDate: '2026-06-15' },
  { id: 'D-202', companyName: 'Apex Health Ltd', dealName: 'Lead Generation Campaign Setup', stage: 'Negotiation', amount: 4500, owner: 'Shivam', closeDate: '2026-06-18' },
  { id: 'D-203', companyName: 'Elite Real Estate', dealName: 'Meta Ads Retainer Q3', stage: 'Contract Sent', amount: 12000, owner: 'Shivam', closeDate: '2026-06-25' },
  { id: 'D-204', companyName: 'Zetta E-learning', dealName: 'Growth Strategy Consulting', stage: 'Closed Won', amount: 6000, owner: 'Shivam', closeDate: '2026-05-29' },
  { id: 'D-205', companyName: 'Kross Clothing', dealName: 'E-commerce Performance Ads', stage: 'Closed Lost', amount: 7500, owner: 'Shivam', closeDate: '2026-05-20' },
];

export const mockCampaigns: Campaign[] = [
  { id: 'C-301', name: 'Q2 Performance Max', platform: 'Google Ads', budget: 5000, spend: 3200, leadsGenerated: 145, roas: 3.8, status: 'Active' },
  { id: 'C-302', name: 'Summer Lead Gen Carousel', platform: 'Meta Ads', budget: 3000, spend: 1850, leadsGenerated: 98, roas: 4.2, status: 'Active' },
  { id: 'C-303', name: 'Agency Video Pitch', platform: 'YouTube Ads', budget: 2000, spend: 2000, leadsGenerated: 42, roas: 2.1, status: 'Completed' },
  { id: 'C-304', name: 'Brand Awareness Stories', platform: 'Instagram Ads', budget: 1500, spend: 600, leadsGenerated: 15, roas: 1.5, status: 'Paused' },
];

export const roleDetails = {
  'Super Admin': {
    description: 'Full administrative override of all system panels, databases, agency clients, billing systems, and integrations.',
    colorClass: 'bg-red-500/10 text-red-500 border border-red-500/20',
  },
  'Agency Owner': {
    description: 'Owner-level access to agency leads, team CRM pipeline, ad statistics, WhatsApp automation dashboards, and platform billing.',
    colorClass: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  },
  'Manager': {
    description: 'Operational team lead control, including assignment of sales agents, CRM pipeline review, and performance metrics.',
    colorClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  },
  'Sales': {
    description: 'Direct deal closer panel focused on active CRM contacts, leads communication, WhatsApp inbox chat, and pipeline progression.',
    colorClass: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
  },
  'Support': {
    description: 'Customer success interface with high-priority support tickets, SLA monitoring, and client renewals panels.',
    colorClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  },
  'Client': {
    description: 'Client dashboard showing active campaigns performance, spent ad budget, current ROAS figures, and active invoices.',
    colorClass: 'bg-pink-500/10 text-pink-500 border border-pink-500/20',
  },
};
