import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripeSecretKey } from '@/lib/stripe';
import { processChat, ChatMode } from '@/lib/ai/chat';
import { z } from 'zod';

const sendMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(10000),
  mode: z.enum(['simulation', 'actual']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const validated = sendMessageSchema.parse(body);

    // Verify session belongs to user's organization
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: validated.sessionId,
        organizationId: session.user.organizationId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // Get Stripe secret key
    const stripeSecretKey = await getStripeSecretKey(session.user.organizationId);
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripeキーが設定されていません。設定画面からAPIキーを登録してください。' },
        { status: 400 }
      );
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: 'user',
        content: validated.message,
      },
    });

    // Build message history
    const messages = [
      ...chatSession.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: validated.message },
    ];

    // Process with AI
    const response = await processChat(
      messages,
      stripeSecretKey,
      validated.mode as ChatMode
    );

    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: 'assistant',
        content: response.content,
        functionCalls:
          response.functionCalls.length > 0
            ? JSON.stringify(response.functionCalls)
            : null,
      },
    });

    // Update session title if it's the first message
    if (!chatSession.title && messages.length === 1) {
      const title =
        validated.message.length > 30
          ? validated.message.substring(0, 30) + '...'
          : validated.message;
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: { title },
      });
    }

    // Update session mode if changed
    if (chatSession.mode !== validated.mode) {
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: { mode: validated.mode },
      });
    }

    // Log function calls for audit
    for (const fc of response.functionCalls) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: session.user.organizationId,
          action: fc.name,
          resourceType: getResourceType(fc.name),
          input: JSON.stringify(fc.args),
          output: JSON.stringify(fc.result),
          success: !('error' in (fc.result as Record<string, unknown>)),
        },
      });
    }

    return NextResponse.json({
      content: response.content,
      functionCalls: response.functionCalls,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力が不正です', details: error.issues },
        { status: 400 }
      );
    }

    // Handle Gemini API-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // API key issues
    if (errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'Gemini APIキーが設定されていないか無効です。',
          hint: '環境変数 GEMINI_API_KEY を設定してください。APIキーは https://aistudio.google.com/apikey から取得できます。'
        },
        { status: 401 }
      );
    }

    // Model not found or invalid
    if (errorMessage.includes('model') && (errorMessage.includes('not found') || errorMessage.includes('invalid'))) {
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      return NextResponse.json(
        {
          error: `AIモデル「${modelName}」が見つかりません。`,
          hint: '有効なモデル名: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.5-pro'
        },
        { status: 400 }
      );
    }

    // Rate limiting (15 RPM for free tier)
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        {
          error: 'APIのレート制限に達しました。しばらく待ってから再試行してください。',
          hint: 'Gemini APIの無料枠は1分あたり15リクエストです。'
        },
        { status: 429 }
      );
    }

    // Network/connection errors
    if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
      return NextResponse.json(
        {
          error: 'Gemini APIへの接続に失敗しました。インターネット接続を確認してください。',
          hint: 'Google APIサービスのステータスを https://status.cloud.google.com/ で確認できます。'
        },
        { status: 503 }
      );
    }

    // Safety/content filtering
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return NextResponse.json(
        {
          error: 'コンテンツが安全性フィルターによってブロックされました。',
          hint: '別の表現で試してください。'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

function getResourceType(functionName: string): string {
  if (functionName.includes('Customer')) return 'customer';
  if (functionName.includes('Product')) return 'product';
  if (functionName.includes('Price')) return 'price';
  if (functionName.includes('Subscription')) return 'subscription';
  if (functionName.includes('Coupon')) return 'coupon';
  if (functionName.includes('Invoice')) return 'invoice';
  if (functionName.includes('TestClock')) return 'test_clock';
  if (functionName.includes('PaymentMethod')) return 'payment_method';
  return 'unknown';
}
