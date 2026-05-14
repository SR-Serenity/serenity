import { ChatController } from './chat.controller';

describe('ChatController', () => {
  const user = { userId: 'user_1', orgId: 'org_1' };
  let service: Record<string, jest.Mock>;
  let controller: ChatController;

  beforeEach(() => {
    service = {
      listConversations: jest.fn(),
      listMessages: jest.fn(),
      addConversationMembers: jest.fn(),
      listConversationAssets: jest.fn(),
    };
    controller = new ChatController(service as never);
  });

  it('lists conversations from body pagination metadata', () => {
    controller.listConversations(user, { limit: 50 });

    expect(service.listConversations).toHaveBeenCalledWith(user, { limit: 50 });
  });

  it('lists messages from body metadata while keeping conversation id in the URL', () => {
    controller.listMessages(user, 'conversation_1', {
      parentId: 'message_1',
      limit: 50,
    });

    expect(service.listMessages).toHaveBeenCalledWith(
      user,
      'conversation_1',
      'message_1',
      { parentId: 'message_1', limit: 50 },
    );
  });

  it('routes member and asset requests to service', () => {
    controller.addConversationMembers(user, 'conversation_1', {
      memberIds: ['user_2'],
    });
    controller.listConversationAssets(user, 'conversation_1', {
      kind: 'DOC',
      limit: 50,
    });

    expect(service.addConversationMembers).toHaveBeenCalledWith(
      user,
      'conversation_1',
      { memberIds: ['user_2'] },
    );
    expect(service.listConversationAssets).toHaveBeenCalledWith(
      user,
      'conversation_1',
      { kind: 'DOC', limit: 50 },
    );
  });
});
