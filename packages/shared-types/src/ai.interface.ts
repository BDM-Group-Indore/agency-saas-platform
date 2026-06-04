export enum PromptTemplateCategory {
  LEAD_SCORING = 'LEAD_SCORING',
  CHATBOT = 'CHATBOT',
  EMAIL_DRAFT = 'EMAIL_DRAFT',
  CRM_ASSISTANT = 'CRM_ASSISTANT',
}

export interface IPromptTemplate {
  id: string;
  name: string;
  category: PromptTemplateCategory;
  systemPrompt: string;
  userPrompt?: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface IAiConversation {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: IAiMessage[];
}

export interface IAiAgentConfig {
  systemPrompt: string;
  temperature: number;
  isActive: boolean;
}

export interface IAiInsight {
  metric: string;
  value: string | number;
  status: 'positive' | 'warning' | 'neutral';
  recommendation: string;
}

export interface IAiInsightsResponse {
  summary: string;
  insights: IAiInsight[];
  generatedAt: Date;
}
