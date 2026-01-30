import { getGeminiClient, getModelName } from './client';
import { stripeTools } from './stripe-functions';
import { functionHandlers } from './function-handlers';
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

  const gemini = getGeminiClient();
  const modelName = getModelName();

  // Convert messages to Gemini format
  // Gemini doesn't have a 'system' role, so prepend system prompt to first user message
  const systemPrompt = getSystemPrompt(mode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geminiContents: any[] = [];

  if (messages.length > 0) {
    // Prepend system prompt to first user message
    geminiContents.push({
      role: 'user' as const,
      parts: [{ text: `${systemPrompt}\n\n${messages[0].content}` }],
    });

    // Add remaining messages
    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      geminiContents.push({
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.content }],
      });
    }
  } else {
    // Fallback: if no messages, just add system prompt as user message
    geminiContents.push({
      role: 'user' as const,
      parts: [{ text: systemPrompt }],
    });
  }

  const functionCallResults: FunctionCallResult[] = [];
  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Call Gemini API with function declarations
    const response = await gemini.models.generateContent({
      model: modelName,
      contents: geminiContents,
      config: {
        tools: [stripeTools], // Tools go inside config
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('No valid response from Gemini');
    }

    const parts = candidate.content.parts || [];

    // Check if there are function calls
    const functionCalls = parts.filter((part) => 'functionCall' in part && part.functionCall);

    if (functionCalls.length > 0) {
      // Add model's response to history
      geminiContents.push({
        role: 'model' as const,
        parts: parts,
      });

      // Process each function call
      const functionResponseParts = [];

      for (const part of functionCalls) {
        if (!('functionCall' in part) || !part.functionCall) continue;

        const functionCall = part.functionCall;
        const functionName = functionCall.name;
        if (!functionName) continue; // Skip if function name is undefined

        const functionArgs = (functionCall.args || {}) as Record<string, unknown>;
        const handler = functionHandlers[functionName];

        let result: Record<string, unknown>;
        if (handler) {
          try {
            const rawResult = await handler(stripe, functionArgs);
            // Ensure result is a plain object for Gemini API
            result = typeof rawResult === 'object' && rawResult !== null
              ? (rawResult as Record<string, unknown>)
              : { value: rawResult };
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
          functionCallResults.push({
            name: functionName,
            args: functionArgs,
            result,
          });
        }

        // Add function response part
        functionResponseParts.push({
          functionResponse: {
            name: functionName,
            response: result,
          },
        });
      }

      // Add function responses to history as 'user' role (required by Gemini)
      geminiContents.push({
        role: 'user' as const,
        parts: functionResponseParts,
      });

      // Continue the loop to get the next response
      continue;
    }

    // No function calls - extract text response
    const textParts = parts.filter((part: any) => part.text);
    const finalText = textParts.map((part: any) => part.text).join('');

    return {
      content: finalText || 'エラーが発生しました。',
      functionCalls: functionCallResults,
    };
  }

  // Max iterations reached
  return {
    content: '処理が複雑すぎるため、中断しました。もう少し具体的にお伝えいただけますか？',
    functionCalls: functionCallResults,
  };
}
