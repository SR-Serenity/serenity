import type { AutomationTriggerType } from '@serenity/api'

export type TemplateId = 'BLANK' | 'WELCOME_MEMBER' | 'DAILY_STANDUP'

export type TemplatePreset = {
  id: TemplateId
  label: string
  description: string
  emoji: string
  bgColor: string
  triggerType: AutomationTriggerType
  cronFrequency?: 'daily' | 'weekly'
  cronTime?: string
  keywords?: string
  instruction: string
  targetType: 'CHANNEL' | 'DM_TRIGGER_USER'
  defaultName: string
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'BLANK',
    label: 'Blank',
    description: 'Build a rule from scratch with your own trigger and AI instruction.',
    emoji: '⚡',
    bgColor: 'bg-slate-100',
    triggerType: 'SCHEDULE',
    cronFrequency: 'daily',
    cronTime: '09:00',
    instruction: '',
    targetType: 'CHANNEL',
    defaultName: '',
  },
  {
    id: 'WELCOME_MEMBER',
    label: 'Welcome New Member',
    description: 'Automatically sends a warm welcome DM to every new member who joins the workspace.',
    emoji: '👋',
    bgColor: 'bg-blue-100',
    triggerType: 'MEMBER_JOINED',
    instruction:
      'Write a warm, friendly welcome message to {user.name} who just joined {org.name}. Introduce the workspace briefly, encourage them to say hi in the general channel, and let them know the team is happy to help. Keep it conversational and short.',
    targetType: 'DM_TRIGGER_USER',
    defaultName: 'Welcome New Member',
  },
  {
    id: 'DAILY_STANDUP',
    label: 'Daily Standup Reminder',
    description: 'Posts a standup prompt to a channel every morning to keep the team aligned.',
    emoji: '☀️',
    bgColor: 'bg-yellow-100',
    triggerType: 'SCHEDULE',
    cronFrequency: 'daily',
    cronTime: '09:00',
    instruction:
      'Write a short, friendly standup reminder for the team. Ask them to share: (1) What they worked on yesterday, (2) What they plan to do today, (3) Any blockers. Keep it brief and energetic. Today is {date}.',
    targetType: 'CHANNEL',
    defaultName: 'Daily Standup Reminder',
  },
]
