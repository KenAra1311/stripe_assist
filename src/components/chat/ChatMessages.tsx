'use client';

import { useEffect, useRef } from 'react';

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

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
}

function formatFunctionName(name: string): string {
  const names: Record<string, string> = {
    createCustomer: '顧客作成',
    listCustomers: '顧客一覧',
    getCustomer: '顧客詳細',
    createProduct: '商品作成',
    listProducts: '商品一覧',
    createPrice: '価格作成',
    listPrices: '価格一覧',
    createSubscription: 'サブスク作成',
    listSubscriptions: 'サブスク一覧',
    cancelSubscription: 'サブスクキャンセル',
    createCoupon: 'クーポン作成',
    listCoupons: 'クーポン一覧',
    deleteCoupon: 'クーポン削除',
    previewInvoice: '請求書プレビュー',
    previewSubscription: 'サブスクプレビュー',
    createTestClock: 'テストクロック作成',
    getTestClock: 'テストクロック詳細',
    listTestClocks: 'テストクロック一覧',
    advanceTestClock: 'テストクロック進行',
    deleteTestClock: 'テストクロック削除',
    createPaymentMethod: '支払い方法作成',
    attachPaymentMethod: '支払い方法紐付け',
    listPaymentMethods: '支払い方法一覧',
    detachPaymentMethod: '支払い方法切り離し',
    setDefaultPaymentMethod: 'デフォルト支払い方法設定',
  };
  return names[name] || name;
}

// Extract dashboard URLs from result object
function extractDashboardUrls(result: unknown): { label: string; url: string }[] {
  const urls: { label: string; url: string }[] = [];

  if (Array.isArray(result)) {
    // For list results, extract URLs from each item
    result.forEach((item, index) => {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (obj.dashboardUrl && typeof obj.dashboardUrl === 'string') {
          const id = obj.id || `#${index + 1}`;
          urls.push({ label: `${id}`, url: obj.dashboardUrl });
        }
      }
    });
  } else if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    // Check for dashboardUrl
    if (obj.dashboardUrl && typeof obj.dashboardUrl === 'string') {
      urls.push({ label: 'ダッシュボードで開く', url: obj.dashboardUrl });
    }
    // Check for customerDashboardUrl (used in preview functions)
    if (obj.customerDashboardUrl && typeof obj.customerDashboardUrl === 'string') {
      urls.push({ label: '顧客をダッシュボードで開く', url: obj.customerDashboardUrl });
    }
  }

  return urls;
}

// Remove dashboard URL fields from result for cleaner display
function cleanResultForDisplay(result: unknown): unknown {
  if (Array.isArray(result)) {
    return result.map(item => cleanResultForDisplay(item));
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'dashboardUrl' && key !== 'customerDashboardUrl') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  return result;
}

// Render text with URLs as clickable links
function renderTextWithLinks(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function FunctionResultCard({ fc }: { fc: FunctionCall }) {
  const dashboardUrls = extractDashboardUrls(fc.result);
  const cleanedResult = cleanResultForDisplay(fc.result);

  return (
    <div className="function-result">
      <div className="function-result-header">
        <i className="bi bi-code-slash"></i>
        {formatFunctionName(fc.name)}
      </div>
      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(cleanedResult, null, 2)}
      </pre>
      {dashboardUrls.length > 0 && (
        <div className="mt-2 pt-2 border-top">
          {dashboardUrls.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary me-2 mb-1"
            >
              <i className="bi bi-box-arrow-up-right me-1"></i>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-messages">
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="bi bi-chat-dots"></i>
          </div>
          <h4>Stripe Assist</h4>
          <p>
            AIに話しかけてStripeのデータを操作しましょう。
            顧客の作成、サブスクリプションのシミュレーションなどができます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${
            message.role === 'user' ? 'message-user' : 'message-assistant'
          }`}
        >
          <div className="message-content">
            {message.content.split('\n').map((line, i) => (
              <span key={i}>
                {renderTextWithLinks(line)}
                {i < message.content.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
          {message.functionCalls && message.functionCalls.length > 0 && (
            <div className="mt-2">
              {message.functionCalls.map((fc, i) => (
                <FunctionResultCard key={i} fc={fc} />
              ))}
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="message message-assistant">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
