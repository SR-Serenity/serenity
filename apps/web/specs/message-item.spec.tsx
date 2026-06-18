import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ChatMessage } from '@serenity/api'
import { MessageItem } from '../src/app/(workspace)/[orgSlug]/chat/components/message-item'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children, components }: { children: string; components?: Record<string, (props: { children: React.ReactNode }) => React.ReactNode> }) => (
    <div>{components?.p ? components.p({ children }) : children}</div>
  ),
}))

jest.mock('remark-breaks', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => null,
}))

const message: ChatMessage = {
  id: 'message-1',
  conversationId: 'conversation-1',
  authorId: 'user-2',
  content: 'Hello team',
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  author: {
    id: 'user-2',
    displayName: 'Member Two',
  },
  attachments: [],
  reactions: [],
}

it('exposes separate inline reply and thread actions', () => {
  const onReply = jest.fn()
  const onOpenThread = jest.fn()

  render(
    <MessageItem
      message={message}
      currentUserId="user-1"
      onReply={onReply}
      onOpenThread={onOpenThread}
    />,
  )

  fireEvent.click(screen.getByTitle('Reply'))
  fireEvent.click(screen.getByTitle('Thread'))

  expect(onReply).toHaveBeenCalledWith(message)
  expect(onOpenThread).toHaveBeenCalledWith(message)
})

it('renders the replied-to message preview', () => {
  render(
    <MessageItem
      message={{
        ...message,
        id: 'message-2',
        content: 'Yes, this is the follow-up',
        replyToId: message.id,
        replyTo: {
          id: message.id,
          authorId: message.authorId,
          content: message.content,
          author: message.author,
        },
      }}
      currentUserId="user-1"
    />,
  )

  expect(screen.getAllByText('Member Two')).toHaveLength(2)
  expect(screen.getByText('Hello team')).toBeTruthy()
  expect(screen.getByText('Yes, this is the follow-up')).toBeTruthy()
})

it('highlights mentions in message content', () => {
  render(
    <MessageItem
      message={{
        ...message,
        content: 'Thanks @Copilot and @Huy',
      }}
      currentUserId="user-1"
    />,
  )

  expect(screen.getByText('@Copilot').className).toContain('text-blue-700')
  expect(screen.getByText('@Huy').className).toContain('text-blue-700')
})
