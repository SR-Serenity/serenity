'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';

interface ChatInputProps {
  chatId: string;
  type: 'channel' | 'conversation';
  parentMessageId?: string;
  placeholder?: string;
}

export function ChatInput({ chatId, type, parentMessageId, placeholder }: ChatInputProps) {
  const [content, setContent] = useState('');
  const { user, currentOrg } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996');

    if (type === 'channel') {
      socket.emit('joinChannel', { channelId: chatId });
    } else {
      socket.emit('joinConversation', { conversationId: chatId });
    }

    return () => {
      socket.disconnect();
    };
  }, [chatId, type]);

  const handleSend = () => {
    if (!content.trim() || !user || !currentOrg) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996');

    socket.emit('sendMessage', {
      content,
      senderId: currentOrg.memberId,
      channelId: type === 'channel' ? chatId : undefined,
      conversationId: type === 'conversation' ? chatId : undefined,
      parentMessageId,
    });

    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border border-brand-border rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-brand transition-all">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || `Message ${type === 'channel' ? '#' : ''}${chatId}`}
        className="w-full bg-transparent border-none resize-none p-3 text-sm focus:outline-none min-h-[44px]"
        rows={1}
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-brand-light rounded-md text-brand-muted transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-brand-light rounded-md text-brand-muted transition-colors">
            <Smile className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="p-1.5 bg-brand text-white rounded-md hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
