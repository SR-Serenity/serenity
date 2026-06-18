import { Clock, Users, MessageSquare, CheckSquare, Hash, Flag, Bell, Bot } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BlockKind = 'trigger' | 'condition' | 'action'

export interface BlockDef {
  nodeKind: BlockKind
  nodeType: string
  label: string
  description: string
  Icon: LucideIcon
  iconBg: string
}

export interface BlockSection {
  title: string
  kind: BlockKind
  accentColor: string     // Tailwind text class used for selected borders / highlights
  accentBg: string        // Tailwind bg class for section pill
  accentText: string
  items: BlockDef[]
}

export const BLOCK_SECTIONS: BlockSection[] = [
  {
    title: 'Triggers',
    kind: 'trigger',
    accentColor: 'blue',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    items: [
      { nodeKind: 'trigger', nodeType: 'SCHEDULE',            label: 'Schedule',            description: 'Run on a time interval',     Icon: Clock,         iconBg: 'bg-blue-500' },
      { nodeKind: 'trigger', nodeType: 'MEMBER_JOINED',       label: 'Member joins',        description: 'When someone joins',         Icon: Users,         iconBg: 'bg-green-500' },
      { nodeKind: 'trigger', nodeType: 'MESSAGE_KEYWORD',     label: 'Keyword in message',  description: 'Message contains a keyword', Icon: MessageSquare, iconBg: 'bg-orange-500' },
      { nodeKind: 'trigger', nodeType: 'TASK_CREATED',        label: 'Task created',        description: 'When any task is created',   Icon: CheckSquare,   iconBg: 'bg-purple-500' },
      { nodeKind: 'trigger', nodeType: 'TASK_STATUS_CHANGED', label: 'Task status changes', description: 'Status transition',          Icon: CheckSquare,   iconBg: 'bg-purple-500' },
      { nodeKind: 'trigger', nodeType: 'TASK_ASSIGNED',       label: 'Task assigned',       description: 'Assigned to a member',       Icon: CheckSquare,   iconBg: 'bg-purple-500' },
    ],
  },
  {
    title: 'Conditions',
    kind: 'condition',
    accentColor: 'amber',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    items: [
      { nodeKind: 'condition', nodeType: 'TIME_WINDOW',        label: 'Time window',         description: 'Hour range + day of week',    Icon: Clock,  iconBg: 'bg-amber-500' },
      { nodeKind: 'condition', nodeType: 'CHANNEL_IS',         label: 'Channel is',          description: 'Event in a specific channel', Icon: Hash,   iconBg: 'bg-blue-500' },
      { nodeKind: 'condition', nodeType: 'TASK_PRIORITY_IS',   label: 'Task priority is',    description: 'Task has a specific priority', Icon: Flag,  iconBg: 'bg-orange-500' },
      { nodeKind: 'condition', nodeType: 'USER_IN_DEPARTMENT', label: 'User in department',  description: 'User belongs to a dept',      Icon: Users,  iconBg: 'bg-green-500' },
    ],
  },
  {
    title: 'Actions',
    kind: 'action',
    accentColor: 'purple',
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    items: [
      { nodeKind: 'action', nodeType: 'AI_AGENT',     label: 'AI Agent',        description: 'Generate & post AI message', Icon: Bot,         iconBg: 'bg-purple-500' },
      { nodeKind: 'action', nodeType: 'NOTIFY',       label: 'Notify user',     description: 'DM a workspace member',      Icon: Bell,        iconBg: 'bg-green-500' },
      { nodeKind: 'action', nodeType: 'CREATE_TASK',  label: 'Create task',     description: 'Add a task to the board',    Icon: CheckSquare, iconBg: 'bg-orange-500' },
      { nodeKind: 'action', nodeType: 'POST_CHANNEL', label: 'Post to channel', description: 'Send a message to a channel', Icon: Hash,       iconBg: 'bg-blue-500' },
    ],
  },
]

export function findBlock(nodeType: string): BlockDef | undefined {
  for (const s of BLOCK_SECTIONS) {
    const found = s.items.find(i => i.nodeType === nodeType)
    if (found) return found
  }
  return undefined
}

export function sectionForKind(kind: BlockKind): BlockSection {
  const found = BLOCK_SECTIONS.find(s => s.kind === kind)
  if (!found) throw new Error(`No section for kind: ${kind}`)
  return found
}
