import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { AutomationActionType, AutomationTriggerType } from '@prisma/client';

export { AutomationTriggerType, AutomationActionType };

export class CreateAutomationRuleDto {
  @IsString()
  @MinLength(1)
    name!: string;

  @IsEnum(AutomationTriggerType)
    triggerType!: AutomationTriggerType;

  @IsObject()
  @IsOptional()
    triggerConfig?: Record<string, unknown>;

  @IsEnum(AutomationActionType)
    actionType!: AutomationActionType;

  @IsObject()
    actionConfig!: Record<string, unknown>;
}

export class UpdateAutomationRuleDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
    name?: string;

  @IsEnum(AutomationTriggerType)
  @IsOptional()
    triggerType?: AutomationTriggerType;

  @IsObject()
  @IsOptional()
    triggerConfig?: Record<string, unknown>;

  @IsEnum(AutomationActionType)
  @IsOptional()
    actionType?: AutomationActionType;

  @IsObject()
  @IsOptional()
    actionConfig?: Record<string, unknown>;
}

export class ToggleAutomationRuleDto {
  @IsBoolean()
    enabled!: boolean;
}
