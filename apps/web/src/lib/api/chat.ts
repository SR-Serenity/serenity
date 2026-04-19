import { request } from '@serenity/api';

export const chatApi = {
  getChannels: (orgId: string) =>
    request(`/chat/organizations/${orgId}/channels`),

  getChannelMessages: (channelId: string, limit = 50, cursor?: string) =>
    request(`/chat/channels/${channelId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  getThreadMessages: (messageId: string) =>
    request(`/chat/messages/${messageId}/thread`),

  getConversations: (memberId: string) =>
    request(`/chat/members/${memberId}/conversations`),

  getConversationMessages: (conversationId: string, limit = 50, cursor?: string) =>
    request(`/chat/conversations/${conversationId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
};
