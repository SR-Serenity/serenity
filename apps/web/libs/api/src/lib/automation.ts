import { api } from './client'
import type {
  AutomationRule,
  CreateAutomationRuleInput,
  ListAutomationRulesResponse,
  SuggestRuleResponse,
  UpdateAutomationRuleInput,
} from '../types/automation'

export const automationApi = {
  listRules: (token: string): Promise<ListAutomationRulesResponse> =>
    api.get('automations', { token }),

  createRule: (token: string, input: CreateAutomationRuleInput): Promise<AutomationRule> =>
    api.post('automations', { token, body: input }),

  updateRule: (token: string, id: string, input: UpdateAutomationRuleInput): Promise<AutomationRule> =>
    api.patch(`automations/${id}`, { token, body: input }),

  toggleRule: (token: string, id: string, enabled: boolean): Promise<AutomationRule> =>
    api.patch(`automations/${id}/toggle`, { token, body: { enabled } }),

  deleteRule: (token: string, id: string): Promise<{ success: boolean }> =>
    api.delete(`automations/${id}`, { token }),

  suggestRule: (token: string, description: string): Promise<SuggestRuleResponse> =>
    api.post('automations/suggest', { token, body: { description } }),
}
