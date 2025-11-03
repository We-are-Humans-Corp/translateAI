import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({
    id: 'demo-key-' + Date.now(),
    key: 'sk-demo-' + Math.random().toString(36).substring(2),
    name: 'Demo Key',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastUsed: null
  });
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}