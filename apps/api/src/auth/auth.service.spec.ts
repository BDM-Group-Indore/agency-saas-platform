import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '@saas/shared-types';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token'),
  };

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return values[key];
    }),
  };

  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const createService = (prisma: any) =>
    new AuthService(prisma, redisService as any, jwtService as any, configService as any);

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
  });

  it('rejects duplicate registration emails', async () => {
    const service = createService({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
      },
    });

    await expect(
      service.register({
        email: 'owner@example.com',
        password: 'password123',
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates tenant signup users as agency owners', async () => {
    const createdUser = {
      id: 'user-1',
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: null,
      role: UserRole.AGENCY_OWNER,
      isActive: true,
      tenantId: 'tenant-1',
      tokenVersion: 0,
    };

    const tx = {
      tenant: {
        create: jest.fn().mockResolvedValue({ id: 'tenant-1' }),
      },
      user: {
        create: jest.fn().mockResolvedValue(createdUser),
      },
    };

    const service = createService({
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      userSession: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    });

    const result = await service.register({
      email: 'owner@example.com',
      password: 'password123',
      firstName: 'Owner',
      tenantName: 'Agency',
      role: UserRole.SUPER_ADMIN,
    } as any);

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: UserRole.AGENCY_OWNER,
        tenantId: 'tenant-1',
      }),
    });
    expect(result.user.role).toBe(UserRole.AGENCY_OWNER);
  });

  it('does not allow public registration to choose elevated roles', async () => {
    const createdUser = {
      id: 'user-2',
      email: 'client@example.com',
      firstName: null,
      lastName: null,
      role: UserRole.CLIENT,
      isActive: true,
      tenantId: null,
      tokenVersion: 0,
    };

    const tx = {
      tenant: {
        create: jest.fn(),
      },
      user: {
        create: jest.fn().mockResolvedValue(createdUser),
      },
    };

    const service = createService({
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      userSession: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    });

    const result = await service.register({
      email: 'client@example.com',
      password: 'password123',
      role: UserRole.SUPER_ADMIN,
    } as any);

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: UserRole.CLIENT,
        tenantId: undefined,
      }),
    });
    expect(result.user.role).toBe(UserRole.CLIENT);
  });
});
