import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Model mapping for different providers
export const MODEL_MAPPING = {
  // OpenAI models
  'gpt-4o': 'gpt-4',
  'gpt-4-turbo': 'gpt-4-turbo-preview',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',

  // Anthropic models
  'claude-3-opus': 'claude-3-opus-20240229',
  'claude-3-sonnet': 'claude-3-sonnet-20240229',
  'claude-3-haiku': 'claude-3-haiku-20240307',

  // Google models
  'gemini-pro': 'gemini-pro',
  'gemini-1.5-pro': 'gemini-1.5-pro-latest',

  // Open source models via Replicate
  'llama-3': 'replicate/meta/llama-3-70b-instruct',
  'mistral-large': 'replicate/mistralai/mistral-7b-instruct-v0.2',
};

// Cost per 1K tokens (approximate)
export const MODEL_COSTS = {
  'gpt-4o': { input: 0.01, output: 0.03 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-pro': { input: 0.0005, output: 0.0015 },
  'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
  'llama-3': { input: 0.0008, output: 0.0008 },
  'mistral-large': { input: 0.0002, output: 0.0002 },
};

interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  style: string;
  temperature: number;
  maxTokens: number;
  preserveFormat: boolean;
  improveGrammar: boolean;
}

interface TranslationResponse {
  translation: string;
  tokensUsed: number;
  cost: number;
  model: string;
  provider: string;
}

class LiteLLMService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      console.log('Initializing OpenAI with key:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.log('OpenAI API key not found in environment variables');
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize Google
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your-google-api-key') {
      this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
  }

  private buildPrompt(req: TranslationRequest): string {
    const styleInstructions = {
      academic: "Use formal academic language with appropriate terminology.",
      physics: "Use physics-specific terminology and conventions.",
      chemistry: "Use chemistry nomenclature and IUPAC standards.",
      biology: "Use biological and medical terminology appropriately.",
      mathematics: "Preserve mathematical notation and use standard mathematical language.",
      'computer-science': "Use computer science terminology and preserve code formatting.",
      medicine: "Use medical and clinical terminology appropriately.",
      engineering: "Use engineering terminology and technical specifications.",
      formal: "Use formal, professional language.",
      simplified: "Use simple, clear language that is easy to understand.",
    };

    let prompt = `Translate the following text from ${req.sourceLang} to ${req.targetLang}.

Style: ${styleInstructions[req.style as keyof typeof styleInstructions] || styleInstructions.academic}`;

    if (req.preserveFormat) {
      prompt += "\nPreserve the original formatting, including paragraphs, lists, and citations.";
    }

    if (req.improveGrammar) {
      prompt += "\nImprove grammar and style while maintaining the original meaning.";
    }

    prompt += `\n\nText to translate:\n${req.text}\n\nTranslation:`;

    return prompt;
  }

  async translate(req: TranslationRequest): Promise<TranslationResponse> {
    const prompt = this.buildPrompt(req);
    const modelKey = req.model as keyof typeof MODEL_MAPPING;
    const actualModel = MODEL_MAPPING[modelKey] || req.model;

    let translation = '';
    let tokensUsed = 0;
    let provider = '';

    try {
      // Route to appropriate provider based on model
      if (actualModel.includes('gpt')) {
        provider = 'openai';
        if (!this.openai) throw new Error('OpenAI API key not configured');

        const response = await this.openai.chat.completions.create({
          model: actualModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: req.temperature,
          max_tokens: req.maxTokens,
        });

        translation = response.choices[0]?.message?.content || '';
        tokensUsed = response.usage?.total_tokens || 0;

      } else if (actualModel.includes('claude')) {
        provider = 'anthropic';
        if (!this.anthropic) throw new Error('Anthropic API key not configured');

        const response = await this.anthropic.messages.create({
          model: actualModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: req.maxTokens,
          temperature: req.temperature,
        });

        translation = response.content[0].type === 'text' ? response.content[0].text : '';
        tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;

      } else if (actualModel.includes('gemini')) {
        provider = 'google';
        if (!this.google) throw new Error('Google API key not configured');

        const model = this.google.getGenerativeModel({ model: actualModel });
        const result = await model.generateContent(prompt);
        const response = await result.response;

        translation = response.text();
        tokensUsed = Math.floor(prompt.length / 4 + translation.length / 4); // Approximate

      } else {
        // Fallback to OpenAI for unsupported models
        provider = 'openai';
        if (!this.openai) throw new Error('No API keys configured');

        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: req.temperature,
          max_tokens: req.maxTokens,
        });

        translation = response.choices[0]?.message?.content || '';
        tokensUsed = response.usage?.total_tokens || 0;
      }

      // Calculate cost
      const modelCost = MODEL_COSTS[modelKey] || { input: 0.001, output: 0.001 };
      const inputTokens = Math.floor(prompt.length / 4);
      const outputTokens = Math.floor(translation.length / 4);
      const cost = (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1000;

      return {
        translation,
        tokensUsed,
        cost,
        model: actualModel,
        provider,
      };

    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get available models based on configured API keys
  getAvailableModels(): string[] {
    const available = [];

    if (process.env.OPENAI_API_KEY) {
      available.push('gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      available.push('claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku');
    }

    if (process.env.GOOGLE_API_KEY) {
      available.push('gemini-pro', 'gemini-1.5-pro');
    }

    if (process.env.REPLICATE_API_KEY) {
      available.push('llama-3', 'mistral-large');
    }

    return available;
  }
}

// Export singleton instance
export const litellm = new LiteLLMService();