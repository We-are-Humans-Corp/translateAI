import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, validateApiKey, trackUsage, getMonthlyUsage } from '@/lib/auth';
import { litellm } from '@/lib/litellm';

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_MONTHLY_COST = {
  free: 5,
  pro: 100,
  enterprise: 1000,
};

export async function POST(request: Request) {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    let userId: string | null = null;
    let userTier: string = 'free';

    if (apiKey) {
      // API Key authentication
      const validatedKey = await validateApiKey(apiKey);
      if (!validatedKey) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
      userId = validatedKey.user.id;
      userTier = validatedKey.user.tier;
    } else {
      // Session authentication
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in or use an API key.' },
          { status: 401 }
        );
      }
      userId = session.user.id;
      userTier = session.user.tier || 'free';
    }

    // Check monthly usage limit
    const monthlyUsage = await getMonthlyUsage(userId);
    const maxCost = MAX_MONTHLY_COST[userTier as keyof typeof MAX_MONTHLY_COST] || MAX_MONTHLY_COST.free;

    if (monthlyUsage.totalCost >= maxCost) {
      return NextResponse.json(
        {
          error: 'Monthly usage limit exceeded',
          details: {
            used: monthlyUsage.totalCost.toFixed(2),
            limit: maxCost,
            tier: userTier
          }
        },
        { status: 429 }
      );
    }

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
        {
          error: `Model ${model} is not available`,
          availableModels
        },
        { status: 400 }
      );
    }

    // Perform translation
    const startTime = Date.now();
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
    const responseTime = Date.now() - startTime;

    // Track usage in database
    await trackUsage(
      userId,
      model,
      result.provider,
      result.tokensUsed,
      result.cost,
      apiKey ? (await validateApiKey(apiKey))?.id : undefined
    );

    // Save translation to history (optional, based on user preferences)
    // await saveTranslation(userId, text, result.translation, ...);

    return NextResponse.json({
      success: true,
      translation: result.translation,
      usage: {
        tokensUsed: result.tokensUsed,
        cost: result.cost.toFixed(4),
        responseTime,
        monthlyUsageRemaining: (maxCost - monthlyUsage.totalCost - result.cost).toFixed(2),
      },
      metadata: {
        sourceLang,
        targetLang,
        model: result.model,
        provider: result.provider,
        style,
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

// GET endpoint to check available models and usage
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');

    let userId: string | null = null;
    let userTier: string = 'free';

    if (apiKey) {
      const validatedKey = await validateApiKey(apiKey);
      if (!validatedKey) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      userId = validatedKey.user.id;
      userTier = validatedKey.user.tier;
    } else if (session?.user) {
      userId = session.user.id;
      userTier = session.user.tier || 'free';
    }

    const models = litellm.getAvailableModels();

    let usage = null;
    if (userId) {
      usage = await getMonthlyUsage(userId);
    }

    return NextResponse.json({
      success: true,
      models,
      tier: userTier,
      usage: usage ? {
        totalTokens: usage.totalTokens,
        totalCost: usage.totalCost.toFixed(2),
        totalRequests: usage.totalRequests,
        limit: MAX_MONTHLY_COST[userTier as keyof typeof MAX_MONTHLY_COST],
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get service info' },
      { status: 500 }
    );
  }
}