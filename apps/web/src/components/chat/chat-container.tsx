'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { setActiveChat, setMessages, setActiveThread } from '@/lib/store/chat-slice';
import { chatApi } from '@/lib/api/chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ThreadPanel } from './thread-panel';
import { Hash, MessageCircle, X } from 'lucide-react';

export function ChatContainer() {
  const { type, chatId } = useParams<{ type: 'channel' | 'conversation'; chatId: string }>();
  const dispatch = useAppDispatch();
  const { messages, activeThread, channels, conversations } = useAppSelector((state) => state.chat);
  const [loading, setLoading] = useState(true);

  const activeInfo = type === 'channel'
    ? channels.find(c => c.id === chatId)
    : conversations.find(c => c.id === chatId);

  const displayName = type === 'channel'
    ? (activeInfo as any)?.name
    : (activeInfo as any)?.members?.find((m: any) => m.member.user.displayName !== 'Me')?.member.user.displayName;

  useEffect(() => {
    if (chatId && type) {
      dispatch(setActiveChat({ id: chatId, type }));
      setLoading(true);

      const fetchMessages = type === 'channel'
        ? chatApi.getChannelMessages(chatId)
        : chatApi.getConversationMessages(chatId);

      fetchMessages.then((data: any) => {
        dispatch(setMessages(data as any[]));
        setLoading(false);
      });
    }
  }, [chatId, type, dispatch]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-brand-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {type === 'channel' ? <Hash className="w-4 h-4 text-brand-muted" /> : <MessageCircle className="w-4 h-4 text-brand-muted" />}
            <h1 className="font-semibold text-brand">{displayName || 'Loading...'}</h1>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-brand-muted text-sm italic">
              Loading messages...
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>

        {/* Input area */}
        <div className="p-4 shrink-0">
          <ChatInput chatId={chatId} type={type} />
        </div>
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <div className="w-96 border-l border-brand-border flex flex-col shrink-0 bg-brand-light/10">
          <header className="h-14 border-b border-brand-border px-4 flex items-center justify-between shrink-0 bg-white">
            <h2 className="font-semibold text-brand text-sm">Thread</h2>
            <button
              onClick={() => dispatch(setActiveThread(null))}
              className="p-1 hover:bg-brand-light rounded-md text-brand-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </header>
          <div className="flex-1 overflow-hidden">
            <ThreadPanel parentMessage={activeThread} />
          </div>
        </div>
      )}
    </div>
  );
}
