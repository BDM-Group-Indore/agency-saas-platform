import { IUser } from './user.interface';

export interface IJwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  tenantId?: string;
}

export interface IJwtRefreshPayload {
  sub: string;
  tokenVersion?: number;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<IUser, 'createdAt' | 'updatedAt'>;
}

export interface ITokenValidationResult {
  isValid: boolean;
  userId: string;
  role: string;
}
