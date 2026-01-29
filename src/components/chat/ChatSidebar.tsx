'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface ChatSession {
  id: string;
  title: string;
  mode: string;
  messageCount: number;
  updatedAt: string;
}

interface ChatSidebarProps {
  currentSessionId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({
  currentSessionId,
  isOpen,
  onClose,
}: ChatSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'simulation' }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/chat/${data.id}`);
        onClose();
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('このセッションを削除しますか？')) return;

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (currentSessionId === sessionId) {
          router.push('/chat');
        }
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const startEditing = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(sessionId);
    setEditTitle(currentTitle);
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const saveTitle = async (sessionId: string, e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    if (!editTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, title: editTitle.trim() } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update session title:', error);
    } finally {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleEditKeyDown = (sessionId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle(sessionId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今日';
    } else if (days === 1) {
      return '昨日';
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0 logo">Stripe Assist</h5>
          <button
            className="btn btn-sm btn-link text-white d-md-none"
            onClick={onClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="chat-sidebar-content">
          <button
            className="new-session-btn d-flex align-items-center justify-content-center gap-2"
            onClick={createNewSession}
          >
            <i className="bi bi-plus-lg"></i>
            新しいチャット
          </button>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm text-secondary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <p className="small mb-0">チャット履歴はありません</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}
                onClick={() => {
                  if (editingId !== s.id) {
                    router.push(`/chat/${s.id}`);
                    onClose();
                  }
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1 overflow-hidden">
                    {editingId === s.id ? (
                      <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={editInputRef}
                          type="text"
                          className="form-control form-control-sm"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(s.id, e)}
                          onBlur={() => saveTitle(s.id)}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="session-title">{s.title}</div>
                        <div className="session-date">
                          {formatDate(s.updatedAt)}
                          <span
                            className={`badge ms-2 ${
                              s.mode === 'simulation'
                                ? 'badge-simulation'
                                : 'badge-actual'
                            }`}
                          >
                            {s.mode === 'simulation' ? 'SIM' : '実行'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {editingId !== s.id && (
                    <div className="d-flex gap-1 ms-2">
                      <button
                        className="btn btn-sm btn-link text-muted p-0"
                        onClick={(e) => startEditing(s.id, s.title, e)}
                        title="名前を変更"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-link text-muted p-0"
                        onClick={(e) => deleteSession(s.id, e)}
                        title="削除"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-top">
          {/* 設定リンク */}
          <a
            href="/settings"
            className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center gap-2 mb-2"
          >
            <i className="bi bi-gear"></i>
            <span className="flex-grow-1 text-start">設定</span>
          </a>

          {/* ユーザーメニュー */}
          <div className="dropdown">
            <button
              className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
              </div>
              <span className="flex-grow-1 text-start text-truncate">
                {session?.user?.name || session?.user?.email}
              </span>
              <i className="bi bi-chevron-down"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end w-100">
              <li>
                <button className="dropdown-item text-danger" onClick={handleSignOut}>
                  <i className="bi bi-box-arrow-right"></i>
                  ログアウト
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
