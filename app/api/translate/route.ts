import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Demo response
    return NextResponse.json({
      success: true,
      translation: `Translated: ${body.text}`,
      targetLang: body.targetLang
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Translation service not configured' },
      { status: 500 }
    );
  }
}