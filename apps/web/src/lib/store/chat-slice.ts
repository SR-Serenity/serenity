import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  user: User;
}

export interface Reaction {
  id: string;
  emoji: string;
  memberId: string;
  member: WorkspaceMember;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: WorkspaceMember;
  channelId?: string;
  conversationId?: string;
  parentMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: Reaction[];
  _count?: {
    replies: number;
  };
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  _count?: {
    members: number;
  };
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  members: { member: WorkspaceMember }[];
}

interface ChatState {
  channels: Channel[];
  conversations: Conversation[];
  activeChatId: string | null;
  activeChatType: 'channel' | 'conversation' | null;
  messages: Message[];
  activeThread: Message | null;
  threadMessages: Message[];
  isConnected: boolean;
}

const initialState: ChatState = {
  channels: [],
  conversations: [],
  activeChatId: null,
  activeChatType: null,
  messages: [],
  activeThread: null,
  threadMessages: [],
  isConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChannels(state, action: PayloadAction<Channel[]>) {
      state.channels = action.payload;
    },
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload;
    },
    setActiveChat(state, action: PayloadAction<{ id: string; type: 'channel' | 'conversation' }>) {
      state.activeChatId = action.payload.id;
      state.activeChatType = action.payload.type;
      state.messages = [];
    },
    setMessages(state, action: PayloadAction<Message[]>) {
      state.messages = action.payload;
    },
    addMessage(state, action: PayloadAction<Message>) {
      // Avoid duplicates
      if (!state.messages.find((m) => m.id === action.payload.id)) {
        if (action.payload.parentMessageId === state.activeThread?.id) {
          state.threadMessages.push(action.payload);
        } else if (!action.payload.parentMessageId) {
          state.messages.push(action.payload);
        }
      }
    },
    updateMessage(state, action: PayloadAction<Message>) {
      const index = state.messages.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = action.payload;
      }
      const tIndex = state.threadMessages.findIndex((m) => m.id === action.payload.id);
      if (tIndex !== -1) {
        state.threadMessages[tIndex] = action.payload;
      }
      if (state.activeThread?.id === action.payload.id) {
        state.activeThread = action.payload;
      }
    },
    deleteMessage(state, action: PayloadAction<string>) {
      const index = state.messages.findIndex((m) => m.id === action.payload);
      if (index !== -1) {
        state.messages[index].isDeleted = true;
        state.messages[index].content = 'This message was deleted';
      }
      const tIndex = state.threadMessages.findIndex((m) => m.id === action.payload);
      if (tIndex !== -1) {
        state.threadMessages[tIndex].isDeleted = true;
        state.threadMessages[tIndex].content = 'This message was deleted';
      }
    },
    setReactions(state, action: PayloadAction<{ messageId: string; reaction: Reaction }>) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) {
        const rIndex = msg.reactions.findIndex(r => r.id === action.payload.reaction.id);
        if (rIndex === -1) {
          msg.reactions.push(action.payload.reaction);
        }
      }
      const tMsg = state.threadMessages.find((m) => m.id === action.payload.messageId);
      if (tMsg) {
        const rIndex = tMsg.reactions.findIndex(r => r.id === action.payload.reaction.id);
        if (rIndex === -1) {
          tMsg.reactions.push(action.payload.reaction);
        }
      }
    },
    setActiveThread(state, action: PayloadAction<Message | null>) {
      state.activeThread = action.payload;
      state.threadMessages = [];
    },
    setThreadMessages(state, action: PayloadAction<Message[]>) {
      state.threadMessages = action.payload;
    },
    setConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
  },
});

export const {
  setChannels,
  setConversations,
  setActiveChat,
  setMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  setReactions,
  setActiveThread,
  setThreadMessages,
  setConnected,
} = chatSlice.actions;

export default chatSlice.reducer;
