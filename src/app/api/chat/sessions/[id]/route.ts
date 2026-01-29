import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

// GET /api/chat/sessions/[id] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: session.user.id,
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

    return NextResponse.json({
      id: chatSession.id,
      title: chatSession.title || '新しいチャット',
      mode: chatSession.mode,
      createdAt: chatSession.createdAt.toISOString(),
      updatedAt: chatSession.updatedAt.toISOString(),
      messages: chatSession.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        functionCalls: m.functionCalls ? JSON.parse(m.functionCalls) : null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Session get error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat/sessions/[id] - Update session (title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSessionSchema.parse(body);

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        title: validated.title,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      success: true,
    });
  } catch (error) {
    console.error('Session update error:', error);

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

// DELETE /api/chat/sessions/[id] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    await prisma.chatSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
