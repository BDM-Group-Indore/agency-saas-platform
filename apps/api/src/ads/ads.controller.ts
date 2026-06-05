import { Controller, Get, Post, Delete, Param, Query, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // ─── OAuth Link Redirections (Secured) ─────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('connect/google')
  @ApiOperation({ summary: 'Get Google Ads OAuth link' })
  getGoogleConnect(@TenantId() tenantId: string) {
    return { url: this.adsService.googleConnectUrl(tenantId) };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('connect/meta')
  @ApiOperation({ summary: 'Get Meta Ads OAuth link' })
  getMetaConnect(@TenantId() tenantId: string) {
    return { url: this.adsService.metaConnectUrl(tenantId) };
  }

  // ─── OAuth Callbacks (Public, scopes state back to tenant) ─────────────────
  @Get('callback/google')
  @ApiOperation({ summary: 'Public Google Ads OAuth Callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing state parameter');
    }
    
    await this.adsService.handleGoogleCallback(code, state);

    // Return HTML to post message back to the popup opener window
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Link Completed</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SYNC_COMPLETE', platform: 'GOOGLE_ADS' }, '*');
          }
          window.close();
        </script>
        <h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          Google Ads account linked successfully. You may close this window.
        </h3>
      </body>
      </html>
    `);
  }

  @Get('callback/meta')
  @ApiOperation({ summary: 'Public Meta Ads OAuth Callback' })
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!state) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing state parameter');
    }

    await this.adsService.handleMetaCallback(code, state);

    // Return HTML to post message back to the popup opener window
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Link Completed</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SYNC_COMPLETE', platform: 'META_ADS' }, '*');
          }
          window.close();
        </script>
        <h3 style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          Meta Ads account linked successfully. You may close this window.
        </h3>
      </body>
      </html>
    `);
  }

  // ─── Connected Accounts & Sync (Secured) ───────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts')
  @ApiOperation({ summary: 'List all connected ad account files' })
  getAccounts(@TenantId() tenantId: string) {
    return this.adsService.getAccounts(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Disconnect an ad account integration' })
  async disconnectAccount(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.adsService.disconnectAccount(id, tenantId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('campaigns')
  @ApiOperation({ summary: 'List synchronized campaign stats' })
  @ApiQuery({ name: 'platform', required: false, type: String })
  getCampaigns(@TenantId() tenantId: string, @Query('platform') platform?: string) {
    return this.adsService.getCampaigns(tenantId, platform);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sync')
  @ApiOperation({ summary: 'Trigger manual sync for all linked accounts' })
  triggerSync(@TenantId() tenantId: string) {
    return this.adsService.syncAllAccounts(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sync-logs')
  @ApiOperation({ summary: 'Get sync job audit logs' })
  getSyncLogs(@TenantId() tenantId: string) {
    return this.adsService.getSyncLogs(tenantId);
  }
}
