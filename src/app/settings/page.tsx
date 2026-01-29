'use client';

import { useState, useEffect } from 'react';
import { useSession, SessionProvider, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function SettingsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stripeKey, setStripeKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      const res = await fetch('/api/settings/stripe-key');
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
      }
    } catch (error) {
      console.error('Failed to fetch key status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Frontend validation for test key only
    if (!stripeKey.startsWith('sk_test_')) {
      setMessage({
        type: 'error',
        text: 'テスト用のキー（sk_test_で始まるもの）のみ使用できます。',
      });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/settings/stripe-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSecretKey: stripeKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setHasKey(true);
        setStripeKey('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      console.error('Failed to save key:', error);
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Stripeキーを削除しますか？チャット機能が使用できなくなります。')) return;

    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch('/api/settings/stripe-key', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setHasKey(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      console.error('Failed to delete key:', error);
      setMessage({ type: 'error', text: '削除に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="min-vh-100" style={{ background: 'var(--background)' }}>
      <nav className="navbar navbar-light bg-white border-bottom">
        <div className="container">
          <a className="navbar-brand logo" href="/chat">
            Stripe Assist
          </a>
          <div className="d-flex align-items-center gap-3">
            <a href="/chat" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-chat-dots me-2"></i>
              チャットに戻る
            </a>
            <div className="dropdown">
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                type="button"
                data-bs-toggle="dropdown"
              >
                <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                </div>
                <i className="bi bi-chevron-down"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button className="dropdown-item text-danger" onClick={() => signOut({ callbackUrl: '/login' })}>
                    <i className="bi bi-box-arrow-right"></i>
                    ログアウト
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="settings-container py-4">
        <h2 className="mb-4">設定</h2>

        {/* Organization Info */}
        <div className="card settings-card mb-4">
          <div className="card-header">
            <h4>
              <i className="bi bi-building me-2"></i>
              組織情報
            </h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p className="text-muted mb-1">組織名</p>
                <p className="fw-medium">{session?.user?.organizationName || '-'}</p>
              </div>
              <div className="col-md-6">
                <p className="text-muted mb-1">あなたの役割</p>
                <p className="fw-medium">
                  {session?.user?.role === 'admin' ? (
                    <span className="badge bg-primary">管理者</span>
                  ) : (
                    <span className="badge bg-secondary">メンバー</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe API Key */}
        <div className="card settings-card">
          <div className="card-header">
            <h4>
              <i className="bi bi-key me-2"></i>
              Stripe APIキー
            </h4>
          </div>
          <div className="card-body">
            {!isAdmin ? (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                APIキーの設定は管理者のみが行えます。
              </div>
            ) : loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {message && (
                  <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
                    {message.text}
                  </div>
                )}

                {hasKey ? (
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <p className="mb-1">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          APIキーが設定されています
                        </p>
                        <p className="text-muted small mb-0">
                          キーは暗号化して保存されています
                        </p>
                      </div>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={handleDelete}
                        disabled={saving}
                      >
                        <i className="bi bi-trash me-1"></i>
                        削除
                      </button>
                    </div>
                    <hr />
                    <p className="text-muted small mb-2">新しいキーで上書き:</p>
                  </div>
                ) : (
                  <div className="alert alert-info mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    チャット機能を使用するには、Stripeのシークレットキーを設定してください。
                    <br />
                    <small className="text-muted">
                      Stripeダッシュボード → 開発者 → APIキー からシークレットキーをコピーできます
                    </small>
                  </div>
                )}

                <form onSubmit={handleSave}>
                  <div className="alert alert-warning mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>テスト用キーのみ使用可能</strong>
                    <br />
                    <small>
                      本番用キー（sk_live_）は使用できません。
                      テスト用キー（sk_test_で始まるもの）を入力してください。
                    </small>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="stripeKey" className="form-label">
                      シークレットキー（テスト用）
                    </label>
                    <input
                      type="password"
                      className="form-control key-input"
                      id="stripeKey"
                      value={stripeKey}
                      onChange={(e) => setStripeKey(e.target.value)}
                      placeholder="sk_test_..."
                      pattern="sk_test_.*"
                      title="テスト用のキー（sk_test_で始まるもの）を入力してください"
                      required
                      disabled={saving}
                    />
                    <div className="form-text">
                      キーは暗号化して安全に保存されます
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !stripeKey}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        保存中...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        {hasKey ? '更新する' : '保存する'}
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SessionProvider>
      <SettingsContent />
    </SessionProvider>
  );
}
