import { chatApi } from '@serenity/api'
import { useChatStore } from '../src/stores/chat-store'
import { useAuthStore } from '../src/stores/auth-store'
import type { ChatConversation, ChatMessage, ChatReaction } from '@serenity/api'

jest.mock('@serenity/api', () => ({
  chatApi: {
    listConversations: jest.fn(),
    listMessages: jest.fn(),
    createMessage: jest.fn(),
    editMessage: jest.fn(),
    unsendMessage: jest.fn(),
    deleteMessageForMe: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
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
  useAuthStore.setState({
    token: null,
    user: null,
    currentOrg: null,
    initializing: false,
  })
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

it('optimistically creates message before api resolves', async () => {
  useAuthStore.setState({
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member One',
    },
  })
  useChatStore.setState({ conversations: [conversation] })

  let resolveCreateMessage: (value: { message: ChatMessage }) => void = () => undefined
  mockedChatApi.createMessage.mockReturnValue(
    new Promise(resolve => {
      resolveCreateMessage = resolve
    }),
  )

  const createPromise = useChatStore.getState().createMessage('token', 'conversation-1', {
    content: 'Hello',
    attachmentIds: [],
  })

  const optimisticMessage = useChatStore.getState().messages[0]
  expect(optimisticMessage).toMatchObject({
    conversationId: 'conversation-1',
    authorId: 'user-1',
    content: 'Hello',
  })
  expect(optimisticMessage.id).toContain('optimistic-message')
  expect(useChatStore.getState().conversations[0].lastMessage?.id).toBe(optimisticMessage.id)

  resolveCreateMessage({ message })
  await createPromise

  expect(useChatStore.getState().messages).toEqual([message])
  expect(useChatStore.getState().conversations[0].lastMessage).toEqual(message)
})

it('optimistically updates parent reply references before api resolves', async () => {
  const parentMessage: ChatMessage = {
    ...message,
    replies: [],
  }
  const replyMessage: ChatMessage = {
    ...message,
    id: 'reply-1',
    parentId: 'message-1',
    content: 'Thread reply',
  }
  useAuthStore.setState({
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member One',
    },
  })
  useChatStore.setState({
    conversations: [{ ...conversation, lastMessage: parentMessage }],
    messages: [parentMessage],
    threadMessage: parentMessage,
  })

  let resolveCreateMessage: (value: { message: ChatMessage }) => void = () => undefined
  mockedChatApi.createMessage.mockReturnValue(
    new Promise(resolve => {
      resolveCreateMessage = resolve
    }),
  )

  const createPromise = useChatStore.getState().createMessage('token', 'conversation-1', {
    content: 'Thread reply',
    parentId: 'message-1',
    attachmentIds: [],
  })

  const optimisticReplyId = useChatStore.getState().messages[0].replies?.[0]?.id
  expect(optimisticReplyId).toContain('optimistic-message')
  expect(useChatStore.getState().threadMessage?.replies?.[0]?.id).toBe(optimisticReplyId)

  resolveCreateMessage({ message: replyMessage })
  await createPromise

  expect(useChatStore.getState().messages[0].replies).toEqual([{ id: 'reply-1' }])
  expect(useChatStore.getState().threadMessage?.replies).toEqual([{ id: 'reply-1' }])
})

it('rolls optimistic message back when create fails', async () => {
  useAuthStore.setState({
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member One',
    },
  })
  useChatStore.setState({ conversations: [conversation] })
  mockedChatApi.createMessage.mockRejectedValue(new Error('offline'))

  await expect(
    useChatStore.getState().createMessage('token', 'conversation-1', {
      content: 'Hello',
      attachmentIds: [],
    }),
  ).rejects.toThrow('offline')

  expect(useChatStore.getState().messages).toEqual([])
  expect(useChatStore.getState().conversations[0].lastMessage).toBeNull()
  expect(useChatStore.getState().messageError).toBe('offline')
})

it('applies realtime thread reply updates to parent message', () => {
  useChatStore.setState({
    activeConversationId: 'conversation-1',
    conversations: [conversation],
    messages: [{ ...message, replies: [] }],
    threadMessage: { ...message, replies: [] },
  })

  useChatStore.getState().applyRealtimeEvent({
    type: 'message.created',
    orgId: 'org-1',
    conversationId: 'conversation-1',
    payload: {
      ...message,
      id: 'reply-1',
      parentId: 'message-1',
      content: 'Thread reply',
    },
  })

  expect(useChatStore.getState().messages[0].replies).toEqual([{ id: 'reply-1' }])
  expect(useChatStore.getState().threadMessage?.replies).toEqual([{ id: 'reply-1' }])
})

it('optimistically edits message before api resolves', async () => {
  const editedMessage = {
    ...message,
    content: 'Hello edited',
    editedAt: '2026-05-13T00:00:02.000Z',
    updatedAt: '2026-05-13T00:00:02.000Z',
  }
  useChatStore.setState({
    conversations: [{ ...conversation, lastMessage: message }],
    messages: [message],
  })

  let resolveEditMessage: (value: { message: ChatMessage }) => void = () => undefined
  mockedChatApi.editMessage.mockReturnValue(
    new Promise(resolve => {
      resolveEditMessage = resolve
    }),
  )

  const editPromise = useChatStore.getState().editMessage('token', 'message-1', 'Hello edited')

  expect(useChatStore.getState().messages[0]).toMatchObject({
    id: 'message-1',
    content: 'Hello edited',
  })
  expect(useChatStore.getState().messages[0].editedAt).not.toBeNull()

  resolveEditMessage({ message: editedMessage })
  await editPromise

  expect(useChatStore.getState().messages[0]).toEqual(editedMessage)
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
