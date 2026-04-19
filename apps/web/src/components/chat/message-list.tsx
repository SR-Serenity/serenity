'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/lib/store/chat-slice';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Group messages by date
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div 
      ref={scrollRef}
      className="h-full w-full overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar"
    >
      {sortedMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-brand-muted/60 space-y-2">
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs">Start the conversation by sending a message below.</p>
        </div>
      ) : (
        sortedMessages.map((msg, index) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            showCompact={index > 0 && sortedMessages[index-1].senderId === msg.senderId && 
              (new Date(msg.createdAt).getTime() - new Date(sortedMessages[index-1].createdAt).getTime() < 300000)
            }
          />
        ))
      )}
    </div>
  );
}
