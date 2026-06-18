import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/auth.types';
import type { AuthUser } from '../auth/auth.types';
import { AutomationService } from './automation.service';
import { AutomationEngineService } from './automation-engine.service';
import type { CreateAutomationRuleDto, UpdateAutomationRuleDto, ToggleAutomationRuleDto } from './dto/automation.dto';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  private readonly logger = new Logger(AutomationController.name);

  constructor(
    private readonly automationService: AutomationService,
    private readonly engine: AutomationEngineService,
  ) {}

  @Get()
  listRules(@CurrentUser() user: AuthUser) {
    return this.automationService.listRules(user.orgId);
  }

  @Post()
  createRule(@CurrentUser() user: AuthUser, @Body() dto: CreateAutomationRuleDto) {
    return this.automationService.createRule(user.orgId, dto);
  }

  @Patch(':id')
  updateRule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationRuleDto,
  ) {
    return this.automationService.updateRule(user.orgId, id, dto);
  }

  @Patch(':id/toggle')
  toggleRule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ToggleAutomationRuleDto,
  ) {
    return this.automationService.toggleRule(user.orgId, id, dto.enabled);
  }

  @Delete(':id')
  deleteRule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.automationService.deleteRule(user.orgId, id);
  }

  @Post('suggest')
  async suggestRule(@CurrentUser() user: AuthUser, @Body() body: { description: string }) {
    const aiBaseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001/api/internal/v1';
    const internalToken = process.env.AI_INTERNAL_API_TOKEN ?? '';

    try {
      const res = await fetch(`${aiBaseUrl}/ai/automation/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-api-token': internalToken },
        body: JSON.stringify({ description: body.description, org_id: user.orgId }),
      });

      if (!res.ok) {
        this.logger.error(`AI suggest error ${res.status}: ${await res.text()}`);
        return { name: '', stepsGraph: null };
      }

      return res.json();
    } catch (err) {
      this.logger.error(`Failed to call AI suggest: ${err}`);
      return { name: '', stepsGraph: null };
    }
  }

  @Post('internal/member-joined')
  async memberJoined(@Body() body: { orgId: string; userId: string; secret: string }) {
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
    if (!internalSecret || body.secret !== internalSecret) {
      return { ignored: true };
    }
    await this.engine.runMemberJoined(body.orgId, body.userId);
    return { ok: true };
  }
}
