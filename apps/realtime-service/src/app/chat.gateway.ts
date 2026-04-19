import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
    server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  private readonly redisMessageHandler = (data: ChatBroadcastMessage) => {
    this.server.to(data.room).emit('messageReceived', data.message);
  };

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService
  ) {}

  async onModuleInit() {
    await this.redisService.subscribe('chat_messages', this.redisMessageHandler);
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Authentication logic would go here
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string }
  ) {
    client.join(`channel:${data.channelId}`);
    return { event: 'joinedChannel', data: { channelId: data.channelId } };
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    client.join(`conversation:${data.conversationId}`);
    return { event: 'joinedConversation', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      content: string;
      senderId: string;
      channelId?: string;
      conversationId?: string;
      parentMessageId?: string;
    }
  ) {
    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        senderId: data.senderId,
        channelId: data.channelId,
        conversationId: data.conversationId,
        parentMessageId: data.parentMessageId,
      },
      include: {
        sender: {
          include: {
            user: true
          }
        },
        reactions: true,
      },
    });

    const room = data.channelId
      ? `channel:${data.channelId}`
      : `conversation:${data.conversationId}`;

    // Broadcast to the room
    this.server.to(room).emit('messageReceived', message);

    // If it's a thread reply, also notify the thread room if needed
    if (data.parentMessageId) {
      this.server.to(`thread:${data.parentMessageId}`).emit('threadReplyReceived', message);
    }

    // Publish to Redis for other instances
    await this.redisService.publish('chat_messages', { room, message });

    return message;
  }

  @SubscribeMessage('sendReaction')
  async handleSendReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      emoji: string;
      messageId: string;
      memberId: string;
    }
  ) {
    const reaction = await this.prisma.reaction.upsert({
      where: {
        messageId_memberId_emoji: {
          messageId: data.messageId,
          memberId: data.memberId,
          emoji: data.emoji,
        },
      },
      create: {
        emoji: data.emoji,
        messageId: data.messageId,
        memberId: data.memberId,
      },
      update: {},
      include: {
        member: {
          include: {
            user: true
          }
        }
      }
    });

    const message = await this.prisma.message.findUnique({
      where: { id: data.messageId }
    });

    if (!message) {
      return reaction;
    }

    const room = message.channelId
      ? `channel:${message.channelId}`
      : `conversation:${message.conversationId}`;

    this.server.to(room).emit('reactionUpdated', { messageId: data.messageId, reaction });

    return reaction;
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string }
  ) {
    const message = await this.prisma.message.update({
      where: { id: data.messageId },
      data: {
        content: data.content,
        isEdited: true,
      },
      include: {
        sender: {
          include: {
            user: true
          }
        },
        reactions: true,
      }
    });

    const room = message.channelId
      ? `channel:${message.channelId}`
      : `conversation:${message.conversationId}`;

    this.server.to(room).emit('messageUpdated', message);
    return message;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string }
  ) {
    const message = await this.prisma.message.update({
      where: { id: data.messageId },
      data: {
        isDeleted: true,
        content: 'This message was deleted',
      },
    });

    const room = message.channelId
      ? `channel:${message.channelId}`
      : `conversation:${message.conversationId}`;

    this.server.to(room).emit('messageDeleted', { messageId: data.messageId });
    return { messageId: data.messageId };
  }
}

type ChatBroadcastMessage = {
  room: string;
  message: unknown;
};
