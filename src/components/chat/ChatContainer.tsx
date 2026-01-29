'use client';

import { useState, useEffect } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ModeToggle from './ModeToggle';

interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: FunctionCall[];
  createdAt: string;
}

interface ErrorInfo {
  message: string;
  hint?: string;
}

interface ChatContainerProps {
  sessionId?: string;
}

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<'simulation' | 'actual'>('simulation');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);

  // Load session messages
  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
      fetchSession(sessionId);
    } else {
      setMessages([]);
      setMode('simulation');
      setCurrentSessionId(null);
    }
  }, [sessionId]);

  const fetchSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setMode(data.mode || 'simulation');
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const createSession = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(data.id);
        // Update URL without full navigation
        window.history.pushState({}, '', `/chat/${data.id}`);
        return data.id;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  };

  const sendMessage = async (content: string) => {
    setError(null);
    setLoading(true);

    // Create session if needed
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = await createSession();
      if (!activeSessionId) {
        setError({ message: 'セッションの作成に失敗しました' });
        setLoading(false);
        return;
      }
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: content,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || 'エラーが発生しました',
          hint: data.hint,
        });
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        return;
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        functionCalls: data.functionCalls,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Send message error:', err);
      setError({ message: 'メッセージの送信に失敗しました' });
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <ChatSidebar
        currentSessionId={currentSessionId || undefined}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="chat-main">
        <div className="chat-header">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-sm btn-outline-secondary d-md-none"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list"></i>
            </button>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <div className="d-flex align-items-center gap-2">
            {mode === 'simulation' ? (
              <span className="badge badge-simulation">
                <i className="bi bi-shield-check me-1"></i>
                シミュレーション中
              </span>
            ) : (
              <span className="badge badge-actual">
                <i className="bi bi-lightning-charge me-1"></i>
                実行モード
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger m-3 mb-0" role="alert">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error.message}
                {error.hint && (
                  <div className="mt-2 small">
                    <i className="bi bi-lightbulb me-1"></i>
                    <code>{error.hint}</code>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setError(null)}
              ></button>
            </div>
          </div>
        )}

        <ChatMessages messages={messages} loading={loading} />
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
