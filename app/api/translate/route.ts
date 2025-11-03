// app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getPromptTemplate, validateApiKey, trackUsage } from '@/lib/utils';
import { TranslationRequest, TranslationResponse } from '@/types';

// Initialize LLM clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Style-specific prompts configuration
const STYLE_PROMPTS = {
  academic: {
    systemPrompt: `You are an expert scientific translator specializing in academic texts. 
    Maintain formal academic tone, preserve technical terminology, and ensure citations format is kept.
    Focus on clarity and precision while maintaining the scholarly voice.`,
    instructions: `Translate the following academic text while:
    - Preserving all citations and references
    - Maintaining formal academic language
    - Ensuring technical accuracy
    - Using field-specific terminology correctly`,
  },
  physics: {
    systemPrompt: `You are a physics expert translator with deep knowledge of physics terminology.
    Ensure all physics concepts, formulas, and units are accurately translated.`,
    instructions: `Translate this physics text while:
    - Preserving all mathematical equations
    - Using standard physics notation
    - Maintaining SI units consistency
    - Keeping physics-specific terminology accurate`,
  },
  chemistry: {
    systemPrompt: `You are a chemistry expert translator familiar with IUPAC nomenclature and chemical terminology.`,
    instructions: `Translate this chemistry text while:
    - Preserving chemical formulas and structures
    - Using IUPAC naming conventions
    - Maintaining reaction equations format
    - Ensuring chemical terminology accuracy`,
  },
  biology: {
    systemPrompt: `You are a biology expert translator with knowledge of biological nomenclature and taxonomy.`,
    instructions: `Translate this biology text while:
    - Preserving Latin species names
    - Maintaining biological classification accuracy
    - Using standard biological terminology
    - Keeping gene/protein names in original format`,
  },
  mathematics: {
    systemPrompt: `You are a mathematics expert translator specializing in mathematical texts and proofs.`,
    instructions: `Translate this mathematical text while:
    - Preserving all mathematical notation
    - Maintaining proof structure
    - Using standard mathematical terminology
    - Keeping theorem/lemma numbering`,
  },
  'computer-science': {
    systemPrompt: `You are a computer science expert translator familiar with programming and CS concepts.`,
    instructions: `Translate this computer science text while:
    - Preserving code snippets unchanged
    - Maintaining algorithm names
    - Using standard CS terminology
    - Keeping technical specifications accurate`,
  },
  medicine: {
    systemPrompt: `You are a medical translator with expertise in medical terminology and clinical language.`,
    instructions: `Translate this medical text while:
    - Using standard medical terminology
    - Preserving drug names and dosages
    - Maintaining clinical accuracy
    - Following medical writing conventions`,
  },
  engineering: {
    systemPrompt: `You are an engineering translator with expertise in technical specifications and engineering terminology.`,
    instructions: `Translate this engineering text while:
    - Preserving technical specifications
    - Maintaining measurement units
    - Using standard engineering terminology
    - Keeping technical drawings references`,
  },
  formal: {
    systemPrompt: `You are a professional translator specializing in formal documents.`,
    instructions: `Translate this text using formal language, professional tone, and standard conventions.`,
  },
  simplified: {
    systemPrompt: `You are a translator specializing in making complex texts accessible.`,
    instructions: `Translate and simplify this text to make it more accessible while preserving accuracy.`,
  },
};

export async function POST(request: NextRequest) {
  try {
    // Validate API key from headers
    const apiKey = request.headers.get('x-api-key');
    const { valid, userId, tier } = await validateApiKey(apiKey);
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body: TranslationRequest = await request.json();
    const {
      text,
      sourceLang,
      targetLang,
      model,
      style = 'academic',
      temperature = 0.3,
      maxTokens = 2000,
      showChanges = false,
      preserveFormatting = true,
      improveGrammar = true,
    } = body;

    // Check rate limits based on tier
    const rateLimitOk = await checkRateLimit(userId, tier);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get style-specific prompts
    const styleConfig = STYLE_PROMPTS[style] || STYLE_PROMPTS.academic;
    
    // Build the complete prompt
    const systemPrompt = `${styleConfig.systemPrompt}
    
    Additional requirements:
    ${preserveFormatting ? '- Preserve original formatting and structure' : ''}
    ${improveGrammar ? '- Improve grammar and style while translating' : ''}
    ${showChanges ? '- Mark all changes clearly' : ''}
    
    Source language: ${sourceLang}
    Target language: ${targetLang}`;

    const userPrompt = `${styleConfig.instructions}
    
    Text to translate:
    ${text}`;

    let translatedText = '';
    let usage = {};

    // Route to appropriate LLM provider
    if (model.startsWith('gpt')) {
      // OpenAI GPT models
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
      });

      translatedText = completion.choices[0].message.content || '';
      usage = {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      };

    } else if (model.startsWith('claude')) {
      // Anthropic Claude models
      const message = await anthropic.messages.create({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });

      translatedText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';
      
      usage = {
        promptTokens: message.usage?.input_tokens,
        completionTokens: message.usage?.output_tokens,
        totalTokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
      };

    } else if (model.startsWith('gemini')) {
      // Google Gemini models
      // Implementation for Gemini API
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens,
          }
        })
      });

      const data = await response.json();
      translatedText = data.candidates[0].content.parts[0].text;
      
    } else if (model.startsWith('llama') || model.startsWith('mistral')) {
      // Open source models via Together AI or Replicate
      const response = await fetch('https://api.together.xyz/inference', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          temperature: temperature,
          max_tokens: maxTokens,
        })
      });

      const data = await response.json();
      translatedText = data.output.choices[0].text;
    }

    // Track usage for billing
    await trackUsage({
      userId,
      model,
      tokens: usage.totalTokens || 0,
      cost: calculateCost(model, usage.totalTokens || 0),
    });

    // Process for change tracking if needed
    let processedText = translatedText;
    if (showChanges && text && translatedText) {
      processedText = generateDiff(text, translatedText);
    }

    // Log translation for analytics
    await logTranslation({
      userId,
      sourceLang,
      targetLang,
      model,
      style,
      inputLength: text.length,
      outputLength: translatedText.length,
    });

    return NextResponse.json({
      translation: processedText,
      usage,
      model,
      style,
    } as TranslationResponse);

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
async function checkRateLimit(userId: string, tier: string): Promise<boolean> {
  // Implement rate limiting logic using Redis/KV store
  const limits = {
    free: 10,
    basic: 100,
    pro: 1000,
    enterprise: 10000,
  };
  
  // Check against Vercel KV or Redis
  // Return true if within limits
  return true;
}

function calculateCost(model: string, tokens: number): number {
  const pricing = {
    'gpt-4o': 0.00003,
    'gpt-4-turbo': 0.00002,
    'gpt-3.5-turbo': 0.0000015,
    'claude-3-opus': 0.000075,
    'claude-3-sonnet': 0.000018,
    'claude-3-haiku': 0.0000025,
    'gemini-pro': 0.000001,
    'llama-3': 0.0000008,
    'mistral-large': 0.000002,
  };
  
  return (pricing[model] || 0.000001) * tokens;
}

function generateDiff(original: string, translated: string): string {
  // Implement diff generation logic
  // This would compare and mark changes
  return translated;
}

async function logTranslation(data: any): Promise<void> {
  // Log to analytics database
  // Implement logging logic
}
