'use client';

import { useEffect, useState } from 'react';
import { Message, setThreadMessages } from '@/lib/store/chat-slice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { chatApi } from '@/lib/api/chat';
import { MessageItem } from './message-item';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { useParams } from 'next/navigation';

interface ThreadPanelProps {
  parentMessage: Message;
}

export function ThreadPanel({ parentMessage }: ThreadPanelProps) {
  const { type } = useParams<{ type: 'channel' | 'conversation' }>();
  const dispatch = useAppDispatch();
  const { threadMessages } = useAppSelector((state) => state.chat);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parentMessage.id) {
      setLoading(true);
      chatApi.getThreadMessages(parentMessage.id).then((data: any) => {
        dispatch(setThreadMessages(data as any[]));
        setLoading(false);
      });
    }
  }, [parentMessage.id, dispatch]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Parent message focus */}
        <div className="border-b border-brand-border/60 bg-brand-light/5">
          <MessageItem message={parentMessage} />
        </div>

        <div className="px-4 py-2 border-b border-brand-border/40 bg-white sticky top-0 z-10">
          <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
            {threadMessages.length} {threadMessages.length === 1 ? 'Reply' : 'Replies'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-brand-muted text-xs italic">Loading thread...</div>
        ) : (
          <MessageList messages={threadMessages} />
        )}
      </div>

      <div className="p-4 bg-white border-t border-brand-border shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <ChatInput 
          chatId={parentMessage.channelId || parentMessage.conversationId || ''} 
          type={type}
          parentMessageId={parentMessage.id}
          placeholder="Reply to thread..."
        />
      </div>
    </div>
  );
}
