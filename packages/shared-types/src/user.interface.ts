export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  AGENCY_OWNER = 'Agency Owner',
  MANAGER = 'Manager',
  SALES = 'Sales',
  SUPPORT = 'Support',
  CLIENT = 'Client'
}

export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenant {
  id: string;
  name: string;
  domain?: string;
  createdAt: Date;
  updatedAt: Date;
}
