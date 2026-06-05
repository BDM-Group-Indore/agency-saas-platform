import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto, MfaLoginVerifyDto } from './dto/mfa-verify.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@saas/shared-types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Cookie helpers ────────────────────────────────────────────────────────

  private setCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProd = process.env.NODE_ENV === 'production';
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    return csrfToken;
  }

  private clearCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const opts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
    res.clearCookie('csrf_token', { ...opts, httpOnly: false });
  }

  // ─── Register ──────────────────────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and tenant' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    const csrfToken = this.setCookies(res, result as { accessToken: string; refreshToken: string });
    return { user: (result as any).user, csrfToken };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Logged in — full session or MFA pending' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto, { ipAddress: ip, userAgent });

    if ('mfaPending' in result) {
      // Return pending token — client must call /auth/mfa/verify next
      return { mfaPending: true, pendingToken: result.pendingToken };
    }

    const csrfToken = this.setCookies(res, result);
    return { user: result.user, csrfToken };
  }

  // ─── MFA: Enroll ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enroll')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA enrollment — returns QR code data URL' })
  async mfaEnroll(@Request() req: any) {
    return this.authService.enrollMfa(req.user.id);
  }

  // ─── MFA: Activate (confirm enrollment) ───────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('mfa/activate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify TOTP code to activate MFA on this account' })
  async mfaActivate(@Request() req: any, @Body() dto: MfaVerifyDto) {
    await this.authService.verifyAndActivateMfa(req.user.id, dto.totpCode);
    return { message: 'MFA enabled successfully' };
  }

  // ─── MFA: Verify login step-up ─────────────────────────────────────────────

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange MFA pending token + TOTP code for full session' })
  async mfaVerify(
    @Body() dto: MfaLoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.verifyMfaLogin(dto.pendingToken, dto.totpCode, {
      ipAddress: ip,
      userAgent,
    });
    const csrfToken = this.setCookies(res, result);
    return { user: result.user, csrfToken };
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { id, refreshToken } = req.user;
    const result = await this.authService.refresh(id, refreshToken, { ipAddress: ip, userAgent });
    const csrfToken = this.setCookies(res, result);
    return { user: result.user, csrfToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate current refresh token' })
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      req.cookies?.refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'] ||
      '';
    await this.authService.logout(req.user.id, refreshToken);
    this.clearCookies(res);
    return { message: 'Logged out successfully' };
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions for the current user' })
  async getSessions(@Request() req: any) {
    return this.authService.getActiveSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions (sign out all devices)' })
  async deleteAllSessions(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAllSessions(req.user.id);
    this.clearCookies(res);
    return { message: 'All sessions revoked' };
  }

  // ─── Profile / admin helpers ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENCY_OWNER, UserRole.SUPER_ADMIN)
  @Get('admin-only')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin only route (RBAC test)' })
  async adminRoute() {
    return { message: 'Welcome Admin! This is a secure route.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active users in the tenant' })
  async getTenantUsers(@Request() req: any) {
    return this.authService.getTenantUsers(req.user.tenantId);
  }
}
