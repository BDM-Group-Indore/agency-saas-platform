export interface ICompany {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPipeline {
  id: string;
  name: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStage {
  id: string;
  name: string;
  order: number;
  pipelineId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DealStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST'
}

export interface IDeal {
  id: string;
  title: string;
  value?: number;
  status: DealStatus;
  stageId: string;
  companyId?: string;
  contactId?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ActivityType {
  CALL = 'CALL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT'
}

export interface IActivity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  dueDate?: Date;
  isCompleted: boolean;
  contactId?: string;
  dealId?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote {
  id: string;
  content: string;
  contactId?: string;
  dealId?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}
