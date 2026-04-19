'use client';

import { useState } from 'react';
import { Message, setActiveThread } from '@/lib/store/chat-slice';
import { useAppDispatch } from '@/lib/store';
import { format } from 'date-fns';
import { MessageSquare, Pencil, Reply, Smile, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { io } from 'socket.io-client';
import dynamic from 'next/dynamic';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageItemProps {
  message: Message;
  showCompact?: boolean;
}

export function MessageItem({ message, showCompact = false }: MessageItemProps) {
  const dispatch = useAppDispatch();
  const { currentOrg } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwner = currentOrg?.memberId === message.senderId;

  const handleReact = (emojiData: any) => {
    if (!currentOrg?.memberId) return;
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996');
    socket.emit('sendReaction', {
      emoji: emojiData.emoji,
      messageId: message.id,
      memberId: currentOrg.memberId,
    });
  };

  const handleEdit = () => {
    if (editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996');
    socket.emit('editMessage', {
      messageId: message.id,
      content: editContent,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996');
    socket.emit('deleteMessage', {
      messageId: message.id,
    });
  };

  const initials = message.sender.user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn(
      "group relative flex items-start gap-3 px-2 py-1 hover:bg-brand-light/20 transition-colors rounded-md",
      showCompact ? "mt-0" : "mt-4"
    )}>
      {!showCompact && (
        <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center text-sm font-bold shrink-0">
          {initials}
        </div>
      )}

      <div className={cn("flex-1 min-w-0", showCompact && "pl-12")}>
        {!showCompact && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold text-sm text-brand">{message.sender.user.displayName}</span>
            <span className="text-[10px] text-brand-muted">{format(new Date(message.createdAt), 'h:mm a')}</span>
          </div>
        )}

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white border border-brand-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleEdit} className="text-[11px] bg-brand text-white px-3 py-1 rounded-md hover:bg-brand-hover">Save</button>
              <button onClick={() => setIsEditing(false)} className="text-[11px] text-brand-muted hover:text-brand">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p className={cn(
              "text-sm leading-relaxed text-brand-dark whitespace-pre-wrap",
              message.isDeleted && "italic text-brand-muted/60"
            )}>
              {message.content}
              {message.isEdited && !message.isDeleted && (
                <span className="text-[10px] text-brand-muted ml-1">(edited)</span>
              )}
            </p>

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {message.reactions.map((r) => (
                  <div key={r.id} className="inline-flex items-center gap-1 bg-brand-light/30 border border-brand-light px-1.5 py-0.5 rounded-md text-[11px]">
                    <span>{r.emoji}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Thread indicator */}
            {message._count && message._count.replies > 0 && (
              <button 
                onClick={() => dispatch(setActiveThread(message))}
                className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand hover:underline"
              >
                <Reply className="w-3 h-3" />
                {message._count.replies} {message._count.replies === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Toolbar */}
      {!message.isDeleted && (
        <div className="absolute top-0 right-4 opacity-0 group-hover:opacity-100 flex items-center bg-white border border-brand-border rounded-md shadow-sm translate-y-[-50%] transition-opacity overflow-hidden">
          <Popover>
            <PopoverTrigger className="p-2 hover:bg-brand-light text-brand-muted transition-colors">
              <Smile className="w-4 h-4" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-xl">
              <EmojiPicker 
                onEmojiClick={handleReact} 
                lazyLoadEmojis={true}
                previewConfig={{ showPreview: false }}
                height={350}
                width={300}
              />
            </PopoverContent>
          </Popover>

          <button 
            onClick={() => dispatch(setActiveThread(message))}
            className="p-2 hover:bg-brand-light text-brand-muted transition-colors"
            title="Reply to thread"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {isOwner && (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-brand-light text-brand-muted transition-colors"
                title="Edit message"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 hover:bg-brand-light text-destructive transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
