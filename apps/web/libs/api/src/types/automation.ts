export type AutomationTriggerType =
  | 'SCHEDULE'
  | 'MEMBER_JOINED'
  | 'MESSAGE_KEYWORD'
  | 'TASK_CREATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'

export type AutomationActionType =
  | 'AI_AGENT'
  | 'NOTIFY'
  | 'CREATE_TASK'
  | 'POST_CHANNEL'

export type AutomationConditionType =
  | 'TIME_WINDOW'
  | 'CHANNEL_IS'
  | 'TASK_PRIORITY_IS'
  | 'USER_IN_DEPARTMENT'

export type StepNode = {
  id: string
  type: 'trigger' | 'condition' | 'action'
  nodeType: AutomationTriggerType | AutomationConditionType | AutomationActionType
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export type StepEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: 'true' | 'false'
}

export type StepsGraph = {
  nodes: StepNode[]
  edges: StepEdge[]
}

export type AutomationRule = {
  id: string
  orgId: string
  name: string
  enabled: boolean
  triggerType: AutomationTriggerType
  triggerConfig: Record<string, unknown>
  actionType: AutomationActionType
  actionConfig: Record<string, unknown>
  stepsGraph: StepsGraph | null
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
  stepsGraph?: StepsGraph
}

export type UpdateAutomationRuleInput = Partial<CreateAutomationRuleInput>

export type SuggestRuleResponse = {
  name: string
  stepsGraph: StepsGraph | null
}
