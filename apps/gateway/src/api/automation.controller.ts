import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProxyService } from './api-proxy.service';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
};

enum AutomationTriggerType {
  SCHEDULE = 'SCHEDULE',
  MEMBER_JOINED = 'MEMBER_JOINED',
  MESSAGE_KEYWORD = 'MESSAGE_KEYWORD',
  TASK_CREATED = 'TASK_CREATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
}

enum AutomationActionType {
  AI_AGENT = 'AI_AGENT',
  NOTIFY = 'NOTIFY',
  CREATE_TASK = 'CREATE_TASK',
  POST_CHANNEL = 'POST_CHANNEL',
}

class CreateAutomationRuleBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
    name!: string;

  @ApiProperty({ enum: AutomationTriggerType, enumName: 'AutomationTriggerType' })
  @IsEnum(AutomationTriggerType)
    triggerType!: AutomationTriggerType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
    triggerConfig?: Record<string, unknown>;

  @ApiProperty({ enum: AutomationActionType, enumName: 'AutomationActionType' })
  @IsEnum(AutomationActionType)
    actionType!: AutomationActionType;

  @ApiProperty()
  @IsObject()
    actionConfig!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
    stepsGraph?: Record<string, unknown>;
}

class UpdateAutomationRuleBodyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(1)
    name?: string;

  @ApiPropertyOptional({ enum: AutomationTriggerType, enumName: 'AutomationTriggerType' })
  @IsEnum(AutomationTriggerType)
  @IsOptional()
    triggerType?: AutomationTriggerType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
    triggerConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: AutomationActionType, enumName: 'AutomationActionType' })
  @IsEnum(AutomationActionType)
  @IsOptional()
    actionType?: AutomationActionType;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
    actionConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
    stepsGraph?: Record<string, unknown>;
}

class SuggestAutomationBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
    description!: string;
}

class ToggleAutomationRuleBodyDto {
  @ApiProperty()
  @IsBoolean()
    enabled!: boolean;
}

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationController {
  constructor(private readonly apiProxy: ApiProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List automation rules' })
  @ApiOkResponse({ description: 'Automation rules retrieved' })
  listRules(@Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardGetRequest('automations', authorization);
  }

  @Post()
  @ApiOperation({ summary: 'Create automation rule' })
  @ApiBody({ type: CreateAutomationRuleBodyDto })
  @ApiCreatedResponse({ description: 'Automation rule created' })
  createRule(@Req() req: RequestWithAuth, @Body() body: CreateAutomationRuleBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('automations', body, authorization);
  }

  @Post('suggest')
  @ApiOperation({ summary: 'AI-suggest an automation rule from a description' })
  @ApiOkResponse({ description: 'Suggested automation rule' })
  suggestRule(@Req() req: RequestWithAuth, @Body() body: SuggestAutomationBodyDto) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPostRequest('automations/suggest', body, authorization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update automation rule' })
  @ApiBody({ type: UpdateAutomationRuleBodyDto })
  @ApiOkResponse({ description: 'Automation rule updated' })
  updateRule(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: UpdateAutomationRuleBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`automations/${id}`, body, authorization);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle automation rule enabled status' })
  @ApiBody({ type: ToggleAutomationRuleBodyDto })
  @ApiOkResponse({ description: 'Automation rule status toggled' })
  toggleRule(
    @Param('id') id: string,
    @Req() req: RequestWithAuth,
    @Body() body: ToggleAutomationRuleBodyDto,
  ) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardPatchRequest(`automations/${id}/toggle`, body, authorization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete automation rule' })
  @ApiNoContentResponse({ description: 'Automation rule deleted' })
  deleteRule(@Param('id') id: string, @Req() req: RequestWithAuth) {
    const authorization = req.headers.authorization as string;
    return this.apiProxy.forwardDeleteRequest(`automations/${id}`, authorization);
  }
}
