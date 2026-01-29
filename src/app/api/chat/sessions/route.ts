import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSessionSchema = z.object({
  mode: z.enum(['simulation', 'actual']).optional(),
});

// GET /api/chat/sessions - List sessions
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        mode: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title || '新しいチャット',
        mode: s.mode,
        messageCount: s._count.messages,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/chat/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = createSessionSchema.parse(body);

    const chatSession = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        mode: validated.mode || 'simulation',
      },
    });

    return NextResponse.json({
      id: chatSession.id,
      mode: chatSession.mode,
      createdAt: chatSession.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Session create error:', error);

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
