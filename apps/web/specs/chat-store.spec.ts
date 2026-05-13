import { chatApi } from '@serenity/api'
import { useChatStore } from '../src/stores/chat-store'
import type { ChatConversation, ChatMessage, ChatReaction } from '@serenity/api'

jest.mock('@serenity/api', () => ({
  chatApi: {
    listConversations: jest.fn(),
    listMessages: jest.fn(),
    createMessage: jest.fn(),
  },
}))

const mockedChatApi = jest.mocked(chatApi)

const message: ChatMessage = {
  id: 'message-1',
  conversationId: 'conversation-1',
  authorId: 'user-1',
  content: 'Hello',
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  author: {
    id: 'user-1',
    displayName: 'Member One',
  },
  attachments: [],
  reactions: [],
}

const conversation: ChatConversation = {
  id: 'conversation-1',
  orgId: 'org-1',
  type: 'PUBLIC_CHANNEL',
  name: 'general',
  createdById: 'user-1',
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  members: [],
  lastMessage: null,
}

function resetChatStore() {
  useChatStore.getState().reset()
}

beforeEach(() => {
  jest.resetAllMocks()
  resetChatStore()
})

it('loads conversations into chat store', async () => {
  mockedChatApi.listConversations.mockResolvedValue({
    conversations: [conversation],
  })

  await useChatStore.getState().loadConversations('token')

  expect(mockedChatApi.listConversations).toHaveBeenCalledWith('token')
  expect(useChatStore.getState()).toMatchObject({
    conversations: [conversation],
    isLoadingConversations: false,
    conversationError: null,
  })
})

it('creates message and updates active conversation state', async () => {
  useChatStore.setState({ conversations: [conversation] })
  mockedChatApi.createMessage.mockResolvedValue({ message })

  await useChatStore.getState().createMessage('token', 'conversation-1', {
    content: 'Hello',
    attachmentIds: [],
  })

  expect(mockedChatApi.createMessage).toHaveBeenCalledWith('token', 'conversation-1', {
    content: 'Hello',
    attachmentIds: [],
  })
  expect(useChatStore.getState().messages).toEqual([message])
  expect(useChatStore.getState().conversations[0].lastMessage).toEqual(message)
})

it('applies realtime reaction updates to active messages', () => {
  const reaction: ChatReaction = {
    id: 'reaction-1',
    messageId: 'message-1',
    userId: 'user-2',
    emoji: '+1',
    createdAt: '2026-05-13T00:00:01.000Z',
  }
  useChatStore.setState({
    activeConversationId: 'conversation-1',
    conversations: [conversation],
    messages: [message],
  })

  useChatStore.getState().applyRealtimeEvent({
    type: 'reaction.added',
    orgId: 'org-1',
    conversationId: 'conversation-1',
    payload: {
      messageId: 'message-1',
      reaction,
    },
  })

  expect(useChatStore.getState().messages[0].reactions).toEqual([reaction])

  useChatStore.getState().applyRealtimeEvent({
    type: 'reaction.removed',
    orgId: 'org-1',
    conversationId: 'conversation-1',
    payload: {
      messageId: 'message-1',
      userId: 'user-2',
      emoji: '+1',
    },
  })

  expect(useChatStore.getState().messages[0].reactions).toEqual([])
})
