export type AutomationTriggerType = 'SCHEDULE' | 'MEMBER_JOINED' | 'MESSAGE_KEYWORD'
export type AutomationActionType = 'AI_AGENT'

export type AutomationRule = {
  id: string
  orgId: string
  name: string
  enabled: boolean
  triggerType: AutomationTriggerType
  triggerConfig: Record<string, unknown>
  actionType: AutomationActionType
  actionConfig: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type ListAutomationRulesResponse = {
  rules: AutomationRule[]
}

export type CreateAutomationRuleInput = {
  name: string
  triggerType: AutomationTriggerType
  triggerConfig?: Record<string, unknown>
  actionType: AutomationActionType
  actionConfig: Record<string, unknown>
}

export type UpdateAutomationRuleInput = Partial<CreateAutomationRuleInput>
