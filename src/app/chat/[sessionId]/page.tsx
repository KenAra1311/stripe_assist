'use client';

import { SessionProvider } from 'next-auth/react';
import { use } from 'react';
import ChatContainer from '@/components/chat/ChatContainer';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default function ChatSessionPage({ params }: Props) {
  const { sessionId } = use(params);

  return (
    <SessionProvider>
      <ChatContainer sessionId={sessionId} />
    </SessionProvider>
  );
}
