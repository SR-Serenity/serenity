'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch } from '@/lib/store';
import {
  addMessage,
  updateMessage,
  deleteMessage,
  setReactions,
  setConnected
} from '@/lib/store/chat-slice';
import { useAuth } from '@/hooks/use-auth';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Replace with your actual realtime service URL
    const socket = io(process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:2996', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch(setConnected(true));
      console.log('Connected to chat server');
    });

    socket.on('disconnect', () => {
      dispatch(setConnected(false));
    });

    socket.on('messageReceived', (message) => {
      dispatch(addMessage(message));
    });

    socket.on('messageUpdated', (message) => {
      dispatch(updateMessage(message));
    });

    socket.on('messageDeleted', ({ messageId }) => {
      dispatch(deleteMessage(messageId));
    });

    socket.on('reactionUpdated', ({ messageId, reaction }) => {
      dispatch(setReactions({ messageId, reaction }));
    });

    socket.on('threadReplyReceived', (message) => {
      dispatch(addMessage(message));
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user, dispatch]);

  return <>{children}</>;
}
