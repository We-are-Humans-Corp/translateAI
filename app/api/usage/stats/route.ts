import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalTranslations: 0,
    totalTokens: 0,
    totalCost: 0,
    mostUsedModel: 'gpt-4',
    averageResponseTime: 150
  });
}