import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { AutomationActionType, AutomationTriggerType } from '@prisma/client';

export { AutomationTriggerType, AutomationActionType };

export type StepNode = {
  id: string;
  type: 'trigger' | 'action';
  nodeType: AutomationTriggerType | AutomationActionType;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

export type StepEdge = {
  id: string;
  source: string;
  target: string;
};

export type StepsGraph = {
  nodes: StepNode[];
  edges: StepEdge[];
};

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

  @IsObject()
  @IsOptional()
    stepsGraph?: StepsGraph;
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

  @IsObject()
  @IsOptional()
    stepsGraph?: StepsGraph;
}

export class ToggleAutomationRuleDto {
  @IsBoolean()
    enabled!: boolean;
}
