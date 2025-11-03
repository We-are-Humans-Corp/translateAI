import { NextResponse } from 'next/server';
import { litellm } from '@/lib/litellm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, sourceLang, targetLang, model, style, temperature, maxTokens, preserveFormat, improveGrammar } = body;

    // Validate input
    if (!text || text.length > 10000) {
      return NextResponse.json(
        { error: 'Invalid text length (max 10000 characters)' },
        { status: 400 }
      );
    }

    // Check if model is available
    const availableModels = litellm.getAvailableModels();
    if (!availableModels.includes(model)) {
      return NextResponse.json(
        { error: `Model ${model} is not available. Available models: ${availableModels.join(', ')}` },
        { status: 400 }
      );
    }

    // Perform translation
    const result = await litellm.translate({
      text,
      sourceLang: sourceLang || 'auto',
      targetLang: targetLang || 'en',
      model,
      style: style || 'academic',
      temperature: temperature || 0.3,
      maxTokens: maxTokens || 2000,
      preserveFormat: preserveFormat !== false,
      improveGrammar: improveGrammar !== false,
    });

    // TODO: Track usage in database for billing
    // await trackUsage(userId, result.tokensUsed, result.cost);

    return NextResponse.json({
      success: true,
      translation: result.translation,
      metadata: {
        sourceLang,
        targetLang,
        model: result.model,
        provider: result.provider,
        tokensUsed: result.tokensUsed,
        cost: result.cost.toFixed(4),
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Translation service error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check available models
export async function GET() {
  try {
    const models = litellm.getAvailableModels();
    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get available models' },
      { status: 500 }
    );
  }
}