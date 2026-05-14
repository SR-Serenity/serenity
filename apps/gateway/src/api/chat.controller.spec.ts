import { ChatController } from './chat.controller';

describe('Gateway ChatController', () => {
  const req = { headers: { authorization: 'Bearer token' } };
  let apiProxy: Record<string, jest.Mock>;
  let controller: ChatController;

  beforeEach(() => {
    apiProxy = {
      forwardPatchRequest: jest.fn(),
      forwardPostRequest: jest.fn(),
      forwardDeleteRequest: jest.fn(),
    };
    controller = new ChatController(apiProxy);
  });

  it('proxies conversation and message list metadata as JSON bodies', () => {
    controller.listConversations(req, { limit: 50 });
    controller.listMessages(req, 'conversation_1', {
      parentId: 'message_1',
      limit: 50,
    });

    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/conversations/list',
      { limit: 50 },
      'Bearer token',
    );
    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/conversations/conversation_1/messages/list',
      { parentId: 'message_1', limit: 50 },
      'Bearer token',
    );
  });

  it('proxies chat attachment upload intent and completion as JSON with auth header', () => {
    controller.createUploadIntent(req, {
      filename: 'file.png',
      contentType: 'image/png',
      size: 4,
      conversationId: 'conversation_1',
    });
    controller.completeAttachmentUpload(req, 'attachment_1', {
      publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
      secureUrl: 'https://res.cloudinary.com/file.png',
      bytes: 4,
      resourceType: 'image',
    });

    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/attachments/upload-intent',
      {
        filename: 'file.png',
        contentType: 'image/png',
        size: 4,
        conversationId: 'conversation_1',
      },
      'Bearer token',
    );
    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/attachments/attachment_1/complete',
      {
        publicId: 'serenity/org_1/conversations/conversation_1/attachment_1',
        secureUrl: 'https://res.cloudinary.com/file.png',
        bytes: 4,
        resourceType: 'image',
      },
      'Bearer token',
    );
  });

  it('proxies group member and conversation asset routes', () => {
    controller.addConversationMembers(req, 'conversation_1', {
      memberIds: ['user_2'],
    });
    controller.listConversationAssets(req, 'conversation_1', {
      kind: 'DOC',
      limit: 50,
    });

    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/conversations/conversation_1/members',
      { memberIds: ['user_2'] },
      'Bearer token',
    );
    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/conversations/conversation_1/assets/list',
      { kind: 'DOC', limit: 50 },
      'Bearer token',
    );
  });

  it('proxies message edit, unsend, and delete-for-me routes', () => {
    controller.editMessage(req, 'message_1', { content: 'updated' });
    controller.unsendMessage(req, 'message_1');
    controller.deleteMessageForMe(req, 'message_1');

    expect(apiProxy.forwardPatchRequest).toHaveBeenCalledWith(
      'chat/messages/message_1',
      { content: 'updated' },
      'Bearer token',
    );
    expect(apiProxy.forwardPostRequest).toHaveBeenCalledWith(
      'chat/messages/message_1/unsend',
      {},
      'Bearer token',
    );
    expect(apiProxy.forwardDeleteRequest).toHaveBeenCalledWith(
      'chat/messages/message_1',
      'Bearer token',
    );
  });

  it('proxies reaction removal as a JSON body', () => {
    controller.removeReaction(req, 'message_1', { emoji: 'ok' });

    expect(apiProxy.forwardDeleteRequest).toHaveBeenCalledWith(
      'chat/messages/message_1/reactions',
      'Bearer token',
      { emoji: 'ok' },
    );
  });
});
