import { getOllamaClient, getModelName } from './client';
import { stripeTools } from './stripe-functions';
import { functionHandlers } from './function-handlers';
import { Message } from 'ollama';
import Stripe from 'stripe';

export type ChatMode = 'simulation' | 'actual';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface ChatResponse {
  content: string;
  functionCalls: FunctionCallResult[];
}

function getSystemPrompt(mode: ChatMode): string {
  const basePrompt = `あなたはStripe APIを操作するアシスタントです。
ユーザーの要望に応じて、Stripeのデータを検索、作成、更新、削除できます。

対応できる操作:
- 顧客(Customer)の作成・一覧・詳細取得
- 商品(Product)の作成・一覧
- 価格(Price)の作成・一覧
- サブスクリプション(Subscription)の作成・一覧・キャンセル
- クーポン(Coupon)の作成・一覧・削除
- 請求書プレビュー(Invoice Preview)によるシミュレーション
- テストクロック(Test Clock)の作成・一覧・時刻進行・削除
- 支払い方法(PaymentMethod)の作成・紐付け・一覧・切り離し・デフォルト設定

【支払い方法について】
支払い方法はカード等の決済手段を管理する機能です。
- createPaymentMethod: テスト用カード情報から支払い方法を作成（テストカード: 4242424242424242）
- attachPaymentMethod: 支払い方法を顧客に紐付け
- listPaymentMethods: 顧客の支払い方法一覧を取得
- setDefaultPaymentMethod: デフォルトの支払い方法を設定

【テストクロックについて】
テストクロックは時間を固定・進行させてサブスクリプションのライフサイクルをテストできる機能です。
- createTestClock: 特定の時刻でテストクロックを作成
- advanceTestClock: 時刻を未来に進める（トライアル終了、請求サイクルの進行などをテスト）
- 顧客をテストクロックに紐付けるには、createCustomer時にtestClockIdを指定
- テストクロックを削除すると、紐付いた顧客・サブスクリプションも全て削除されます

金額は日本円(JPY)を基本としてください（ユーザーが他の通貨を指定した場合は除く）。
結果は分かりやすく日本語で説明してください。
ツールを呼び出す際は、必要なパラメータを正しく設定してください。`;

  if (mode === 'simulation') {
    return `${basePrompt}

【シミュレーションモード】
現在はシミュレーションモードです。
- データを実際に作成・変更する操作を行う場合は、必ずユーザーに確認を取ってください
- previewInvoice や previewSubscription を使ってシミュレーション結果を表示できます
- シミュレーションであることを明確に伝えてください`;
  }

  return `${basePrompt}

【実行モード】
現在は実行モードです。
- 実際にStripeのデータを作成・変更します
- 重要な操作（作成・更新・削除）の前にはユーザーに確認を取ることを推奨します
- 操作の結果を明確に報告してください`;
}

export async function processChat(
  messages: ChatMessage[],
  stripeSecretKey: string,
  mode: ChatMode
): Promise<ChatResponse> {
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });

  const ollama = getOllamaClient();
  const modelName = getModelName();

  // Convert messages to Ollama format
  const ollamaMessages: Message[] = [
    {
      role: 'system',
      content: getSystemPrompt(mode),
    },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    })),
  ];

  const functionCallResults: FunctionCallResult[] = [];
  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await ollama.chat({
      model: modelName,
      messages: ollamaMessages,
      tools: stripeTools,
    });

    const assistantMessage = response.message;

    // Check if there are tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to history
      ollamaMessages.push(assistantMessage);

      // Process each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = toolCall.function.arguments as Record<string, unknown>;
        const handler = functionHandlers[functionName];

        let result: unknown;
        if (handler) {
          try {
            result = await handler(stripe, functionArgs);
            functionCallResults.push({
              name: functionName,
              args: functionArgs,
              result,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            result = { error: errorMessage };
            functionCallResults.push({
              name: functionName,
              args: functionArgs,
              result: { error: errorMessage },
            });
          }
        } else {
          result = { error: `Unknown function: ${functionName}` };
        }

        // Add tool response to messages
        ollamaMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
        });
      }

      // Continue the loop to get the next response
      continue;
    }

    // No tool calls - return the final text response
    return {
      content: assistantMessage.content || 'エラーが発生しました。',
      functionCalls: functionCallResults,
    };
  }

  // Max iterations reached
  return {
    content: '処理が複雑すぎるため、中断しました。もう少し具体的にお伝えいただけますか？',
    functionCalls: functionCallResults,
  };
}
