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
    console.log('Available models:', availableModels);
    console.log('Requested model:', model);
    console.log('OpenAI key present:', !!process.env.OPENAI_API_KEY);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not specified. Available models: ' + availableModels.join(', ') },
        { status: 400 }
      );
    }

    if (!availableModels.includes(model)) {
      return NextResponse.json(
        {
          error: `Model ${model} is not available. Available models: ${availableModels.join(', ')}`,
          debug: {
            requested: model,
            available: availableModels,
            hasOpenAI: !!process.env.OPENAI_API_KEY,
            hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
            hasGoogle: !!process.env.GOOGLE_API_KEY
          }
        },
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

    // Provide more detailed error info for debugging
    const errorMessage = error instanceof Error ? error.message : 'Translation service error';
    const errorDetails = {
      message: errorMessage,
      availableModels: litellm.getAvailableModels(),
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      openAIKeyStart: process.env.OPENAI_API_KEY?.substring(0, 10),
    };

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails
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