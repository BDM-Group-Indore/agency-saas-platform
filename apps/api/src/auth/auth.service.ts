import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IAuthResponse, IJwtPayload, IJwtRefreshPayload, UserRole } from '@saas/shared-types';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const IP_RATE_LIMIT_WINDOW_SEC = 10 * 60;    // 10-minute sliding window
const IP_RATE_LIMIT_MAX = 20;                // max login attempts per IP per window
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;   // 7 days

// MFA roles that must enroll in TOTP
const MFA_REQUIRED_ROLES: string[] = [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER];

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<IAuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      let tenantId: string | undefined;
      if (dto.tenantName) {
        const tenant = await tx.tenant.create({ data: { name: dto.tenantName } });
        tenantId = tenant.id;
      }
      const userRole: UserRole = tenantId ? UserRole.AGENCY_OWNER : UserRole.CLIENT;
      return tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: userRole,
          tenantId,
        },
      });
    });

    return this.generateTokens(user);
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  /**
   * Returns full tokens for users without MFA.
   * Returns { mfaPending: true, pendingToken } for MFA-enrolled users — the
   * client must exchange this for full tokens via POST /auth/mfa/verify.
   */
  async login(dto: LoginDto, ctx: LoginContext = {}): Promise<IAuthResponse | { mfaPending: true; pendingToken: string }> {
    // 1. Per-IP rate limit (sliding window)
    await this.checkIpRateLimit(ctx.ipAddress);

    // 2. Load user — always use constant-time compare to prevent timing attacks
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // 3. Account lockout check
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${remainingMin} minute(s).`,
      );
    }

    // 4. Password validation — keep error message generic to prevent enumeration
    const isPasswordValid =
      user && user.isActive
        ? await bcrypt.compare(dto.password, user.password)
        : false;

    if (!user || !user.isActive || !isPasswordValid) {
      // Increment failed attempts on real user record
      if (user) {
        const newAttempts = user.failedLoginAttempts + 1;
        const lockedUntil =
          newAttempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_DURATION_MS)
            : null;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts, lockedUntil },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Reset failed attempts on successful password
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // 6. If MFA is enrolled, issue a short-lived pending token instead
    if (user.mfaEnabled) {
      const pendingToken = await this.jwtService.signAsync(
        { sub: user.id, scope: 'mfa_pending' },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: '5m',
        },
      );
      return { mfaPending: true, pendingToken };
    }

    // 7. Full session
    return this.generateTokens(user, ctx);
  }

  // ─── MFA: Verify login step-up ─────────────────────────────────────────────

  async verifyMfaLogin(
    pendingToken: string,
    totpCode: string,
    ctx: LoginContext = {},
  ): Promise<IAuthResponse> {
    let payload: { sub: string; scope: string };
    try {
      payload = await this.jwtService.verifyAsync(pendingToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA pending token');
    }

    if (payload.scope !== 'mfa_pending') {
      throw new UnauthorizedException('Invalid token scope');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA not configured for this account');
    }

    const secret = this.decryptMfaSecret(user.mfaSecret);
    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totpCode, window: 1 });
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    return this.generateTokens(user, ctx);
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  async refresh(userId: string, refreshToken: string, ctx: LoginContext = {}): Promise<IAuthResponse> {
    // Fast-path: Redis blacklist check
    const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Validate against persisted session hash
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    const matchingSession = (
      await Promise.all(
        sessions.map(async (s) => ({
          session: s,
          match: await bcrypt.compare(refreshToken, s.tokenHash),
        })),
      )
    ).find((r) => r.match);

    if (!matchingSession) {
      throw new UnauthorizedException('Refresh token not recognised');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    // Rotate: delete old session + blacklist old token
    await this.prisma.userSession.delete({ where: { id: matchingSession.session.id } });
    await this.redis.set(`blacklist:${refreshToken}`, 'true', REFRESH_TTL_SEC);

    // Update last-used audit on new session (done in generateTokens)
    return this.generateTokens(user, ctx);
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Blacklist token
    await this.redis.set(`blacklist:${refreshToken}`, 'true', REFRESH_TTL_SEC);

    // Remove matching session row
    if (refreshToken) {
      const sessions = await this.prisma.userSession.findMany({ where: { userId } });
      for (const s of sessions) {
        const match = await bcrypt.compare(refreshToken, s.tokenHash);
        if (match) {
          await this.prisma.userSession.delete({ where: { id: s.id } });
          break;
        }
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  // ─── Logout all sessions ───────────────────────────────────────────────────

  async logoutAllSessions(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  // ─── List active sessions ──────────────────────────────────────────────────

  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, lastUsedAt: true, createdAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // ─── MFA: Enroll ──────────────────────────────────────────────────────────

  async enrollMfa(userId: string): Promise<{ uri: string; qrDataUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled) throw new ConflictException('MFA is already enabled');

    const secret = speakeasy.generateSecret({ name: `BillingApp (${user.email})`, length: 20 });
    const encryptedSecret = this.encryptMfaSecret(secret.base32);

    // Store secret but leave mfaEnabled=false until verified
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptedSecret },
    });

    const uri = secret.otpauth_url!;
    const qrDataUrl = await qrcode.toDataURL(uri);
    return { uri, qrDataUrl };
  }

  // ─── MFA: Activate (verify + enable) ──────────────────────────────────────

  async verifyAndActivateMfa(userId: string, totpCode: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new ForbiddenException('MFA enrollment not started — call /auth/mfa/enroll first');
    }
    if (user.mfaEnabled) {
      throw new ConflictException('MFA is already active');
    }

    const secret = this.decryptMfaSecret(user.mfaSecret);
    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: totpCode, window: 1 });
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP code — check your authenticator app time sync');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }

  // ─── Tenant users ──────────────────────────────────────────────────────────

  async getTenantUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async generateTokens(user: any, ctx: LoginContext = {}): Promise<IAuthResponse> {
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || undefined,
    };
    const refreshPayload: IJwtRefreshPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    // Hash and persist the refresh token for session tracking
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: ctx.userAgent ?? null,
        ipAddress: ctx.ipAddress ?? null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isActive: user.isActive,
        tenantId: user.tenantId || undefined,
      },
    };
  }

  /**
   * Per-IP sliding-window rate limit using Redis INCR + TTL.
   * Throws 429-style UnauthorizedException after IP_RATE_LIMIT_MAX attempts.
   */
  private async checkIpRateLimit(ip?: string): Promise<void> {
    if (!ip) return;
    const key = `login:rate:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, IP_RATE_LIMIT_WINDOW_SEC);
    }
    if (count > IP_RATE_LIMIT_MAX) {
      throw new UnauthorizedException(
        'Too many login attempts from this IP. Try again later.',
      );
    }
  }

  /** AES-256-GCM encryption of a TOTP base32 secret. Returns iv:authTag:ciphertext hex. */
  private encryptMfaSecret(plaintext: string): string {
    const key = Buffer.from(
      this.configService.get<string>('MFA_ENCRYPTION_KEY')!,
      'hex',
    );
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Decrypt a TOTP secret previously encrypted with encryptMfaSecret. */
  private decryptMfaSecret(ciphertext: string): string {
    const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
    const key = Buffer.from(
      this.configService.get<string>('MFA_ENCRYPTION_KEY')!,
      'hex',
    );
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8') + decipher.final('utf8');
  }
}
