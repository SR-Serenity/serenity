import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Bot,
  Calendar,
  CheckSquare,
  Globe,
  Hash,
  MessageSquare,
  UserPlus,
  Zap,
} from 'lucide-react'

export type TemplateCategory = 'All' | 'Productivity' | 'HR' | 'Support'

export interface PresetNode {
  id: string
  type: 'trigger' | 'condition' | 'action'
  nodeType: string
  config: Record<string, any>
  position: { x: number; y: number }
}

export interface PresetEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

export interface PresetGraph {
  nodes: PresetNode[]
  edges: PresetEdge[]
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  icons: LucideIcon[]
  iconColors: string[]
  presetGraph: PresetGraph
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'daily-standup',
    name: 'Daily standup reminder',
    description: 'Every morning, AI posts a standup prompt to your team channel. Members can reply directly in the thread.',
    category: 'Productivity',
    icons: [Calendar, Bot],
    iconColors: ['text-blue-500', 'text-purple-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'SCHEDULE',
          config: { frequency: 'daily', time: '09:00', cron: '0 9 * * *' },
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'AI_AGENT',
          config: {
            instruction: 'Write a brief daily standup prompt for the team. Ask what they worked on yesterday, what they plan to work on today, and if there are any blockers.',
            targetType: 'CHANNEL',
            targetId: '',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'welcome-new-member',
    name: 'Welcome new member',
    description: 'When someone joins the workspace, automatically send them a personalized welcome message via DM.',
    category: 'HR',
    icons: [UserPlus, Bot],
    iconColors: ['text-green-500', 'text-purple-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'MEMBER_JOINED',
          config: {},
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'AI_AGENT',
          config: {
            instruction: 'Write a warm, friendly welcome message for {user.name} who just joined {org.name}. Mention that the team is excited to have them and encourage them to introduce themselves.',
            targetType: 'DM_TRIGGER_USER',
            targetId: '',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'keyword-alert',
    name: 'Urgent keyword alert',
    description: 'When a message contains urgent keywords like "blocker" or "bug", notify the team lead immediately via DM.',
    category: 'Support',
    icons: [MessageSquare, Bell],
    iconColors: ['text-orange-500', 'text-red-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'MESSAGE_KEYWORD',
          config: { keywords: ['urgent', 'blocker', 'bug', 'down'] },
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'NOTIFY',
          config: {
            message: 'Heads up — a message flagged as urgent was just posted. Please check the channel.',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'task-assigned-notify',
    name: 'Task assigned notification',
    description: 'When a task is assigned, the assignee receives an instant DM so nothing falls through the cracks.',
    category: 'Productivity',
    icons: [CheckSquare, Bell],
    iconColors: ['text-blue-500', 'text-green-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'TASK_ASSIGNED',
          config: {},
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'NOTIFY',
          config: {
            message: 'You have been assigned a new task: {task.title}. Check your task board for details.',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'task-done-followup',
    name: 'Task completed → review task',
    description: 'When a task is marked Done, automatically create a review or QA follow-up task to keep quality high.',
    category: 'Productivity',
    icons: [CheckSquare, Zap],
    iconColors: ['text-emerald-500', 'text-blue-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'TASK_STATUS_CHANGED',
          config: { status: 'DONE' },
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'CREATE_TASK',
          config: {
            title: 'Review: {task.title}',
            status: 'TODO',
            priority: 'MEDIUM',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'weekly-news-digest',
    name: 'Weekly news digest',
    description: 'Every Monday, AI searches the web for the latest news on a topic you choose and posts a digest to your team channel.',
    category: 'Productivity',
    icons: [Calendar, Globe, Bot],
    iconColors: ['text-blue-500', 'text-green-500', 'text-purple-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'SCHEDULE',
          config: { frequency: 'weekly', time: '09:00', cron: '0 9 * * 1' },
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'AI_AGENT',
          config: {
            instruction: 'Search for the latest news from this week. Summarize the top 3–5 stories in a clear, concise format with bullet points. Include the key takeaways for each story.',
            targetType: 'CHANNEL',
            targetId: '',
            useWebSearch: true,
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
  {
    id: 'new-task-announce',
    name: 'New task → channel announcement',
    description: 'When a task is created, post an announcement to the team channel so everyone stays in the loop.',
    category: 'Productivity',
    icons: [CheckSquare, Hash],
    iconColors: ['text-purple-500', 'text-blue-500'],
    presetGraph: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          nodeType: 'TASK_CREATED',
          config: {},
          position: { x: 250, y: 80 },
        },
        {
          id: 'action-1',
          type: 'action',
          nodeType: 'POST_CHANNEL',
          config: {
            channelId: '',
            message: 'New task created: {task.title} — check the board for details.',
          },
          position: { x: 250, y: 300 },
        },
      ],
      edges: [{ id: 'trigger-1->action-1', source: 'trigger-1', target: 'action-1' }],
    },
  },
]

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ['All', 'Productivity', 'HR', 'Support']
