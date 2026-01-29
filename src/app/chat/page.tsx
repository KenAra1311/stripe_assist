'use client';

import { SessionProvider } from 'next-auth/react';
import ChatContainer from '@/components/chat/ChatContainer';

export default function ChatPage() {
  return (
    <SessionProvider>
      <ChatContainer />
    </SessionProvider>
  );
}
