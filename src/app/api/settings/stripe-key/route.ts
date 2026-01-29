import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { z } from 'zod';
import Stripe from 'stripe';

const updateKeySchema = z.object({
  stripeSecretKey: z
    .string()
    .min(1)
    .refine(
      (key) => key.startsWith('sk_test_'),
      { message: 'テスト用のキー（sk_test_で始まるもの）のみ使用できます。本番キーは使用できません。' }
    ),
});

// GET /api/settings/stripe-key - Check if key is set
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Only admin can manage Stripe key
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        stripeSecretKey: true,
      },
    });

    return NextResponse.json({
      hasKey: !!organization?.stripeSecretKey,
      keyPreview: organization?.stripeSecretKey
        ? 'sk_****...****'
        : null,
    });
  } catch (error) {
    console.error('Get Stripe key status error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/settings/stripe-key - Save Stripe key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Only admin can manage Stripe key
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateKeySchema.parse(body);

    // Double-check: Only allow test keys (sk_test_)
    if (validated.stripeSecretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: '本番用のキー（sk_live_）は使用できません。テスト用のキー（sk_test_）を使用してください。' },
        { status: 400 }
      );
    }

    if (!validated.stripeSecretKey.startsWith('sk_test_')) {
      return NextResponse.json(
        { error: '無効なキー形式です。Stripeのテスト用シークレットキー（sk_test_で始まるもの）を入力してください。' },
        { status: 400 }
      );
    }

    // Validate the key by making a test API call
    try {
      const stripe = new Stripe(validated.stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
      });
      await stripe.customers.list({ limit: 1 });
    } catch {
      return NextResponse.json(
        { error: 'Stripeキーが無効です。正しいシークレットキーを入力してください。' },
        { status: 400 }
      );
    }

    // Encrypt and save
    const { encrypted, iv } = encrypt(validated.stripeSecretKey);

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        stripeSecretKey: encrypted,
        stripeKeyIv: iv,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stripeキーを保存しました',
    });
  } catch (error) {
    console.error('Save Stripe key error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力が不正です', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/stripe-key - Delete Stripe key
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Only admin can manage Stripe key
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        stripeSecretKey: null,
        stripeKeyIv: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stripeキーを削除しました',
    });
  } catch (error) {
    console.error('Delete Stripe key error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
