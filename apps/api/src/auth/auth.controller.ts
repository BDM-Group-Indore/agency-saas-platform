import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@saas/shared-types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and tenant' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Request() req: any) {
    const { id, refreshToken } = req.user;
    return this.authService.refresh(id, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@Request() req: any) {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'] || '';
    await this.authService.logout(req.user.id, refreshToken);
    return { message: 'Logged out successfully' };
  }

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
}
