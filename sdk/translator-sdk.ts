// sdk/translator-sdk.ts
/**
 * Scientific Translator SDK for B2B Integration
 * 
 * Installation:
 * npm install @your-company/translator-sdk
 * 
 * Usage:
 * import { TranslatorClient } from '@your-company/translator-sdk';
 * 
 * const client = new TranslatorClient({
 *   apiKey: 'sk-your-api-key',
 *   baseUrl: 'https://api.your-domain.com' // optional
 * });
 */

interface TranslatorConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

interface TranslationOptions {
  text: string;
  sourceLang?: string;
  targetLang: string;
  model?: string;
  style?: string;
  temperature?: number;
  maxTokens?: number;
  showChanges?: boolean;
  preserveFormatting?: boolean;
  improveGrammar?: boolean;
}

interface TranslationResult {
  translation: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  style: string;
  cost?: number;
  duration?: number;
}

interface BatchTranslationOptions {
  texts: string[];
  sourceLang?: string;
  targetLang: string;
  model?: string;
  style?: string;
  parallel?: boolean;
}

export class TranslatorClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(config: TranslatorConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.translator.vercel.app';
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  /**
   * Translate a single text
   */
  async translate(options: TranslationOptions): Promise<TranslationResult> {
    return this.makeRequest('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        text: options.text,
        sourceLang: options.sourceLang || 'auto',
        targetLang: options.targetLang,
        model: options.model || 'gpt-4o',
        style: options.style || 'academic',
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 2000,
        showChanges: options.showChanges || false,
        preserveFormatting: options.preserveFormatting !== false,
        improveGrammar: options.improveGrammar !== false,
      }),
    });
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(options: BatchTranslationOptions): Promise<TranslationResult[]> {
    if (options.parallel === false) {
      // Sequential processing
      const results: TranslationResult[] = [];
      for (const text of options.texts) {
        const result = await this.translate({
          text,
          sourceLang: options.sourceLang,
          targetLang: options.targetLang,
          model: options.model,
          style: options.style,
        });
        results.push(result);
      }
      return results;
    }

    // Parallel processing (default)
    const promises = options.texts.map(text =>
      this.translate({
        text,
        sourceLang: options.sourceLang,
        targetLang: options.targetLang,
        model: options.model,
        style: options.style,
      })
    );

    return Promise.all(promises);
  }

  /**
   * Stream translation for long texts
   */
  async translateStream(
    options: TranslationOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/translate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Stream not available');
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    return this.makeRequest('/api/models', { method: 'GET' });
  }

  /**
   * Get available styles
   */
  async getStyles(): Promise<string[]> {
    return this.makeRequest('/api/styles', { method: 'GET' });
  }

  /**
   * Get usage statistics
   */
  async getUsage(startDate?: Date, endDate?: Date): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());

    return this.makeRequest(`/api/usage?${params}`, { method: 'GET' });
  }

  /**
   * Validate API key
   */
  async validateKey(): Promise<boolean> {
    try {
      await this.makeRequest('/api/validate', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit,
    attempt = 1
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && attempt < this.retryAttempts) {
          // Rate limited, retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, options, attempt + 1);
        }

        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      if (attempt < this.retryAttempts && this.isRetryableError(error)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('network')
    );
  }
}

// Export types for TypeScript users
export type {
  TranslatorConfig,
  TranslationOptions,
  TranslationResult,
  BatchTranslationOptions,
};

// Default export for CommonJS compatibility
export default TranslatorClient;

/**
 * Example Usage:
 * 
 * // Initialize client
 * const translator = new TranslatorClient({
 *   apiKey: process.env.TRANSLATOR_API_KEY
 * });
 * 
 * // Simple translation
 * const result = await translator.translate({
 *   text: 'Your scientific text here',
 *   targetLang: 'ru',
 *   style: 'physics'
 * });
 * 
 * // Batch translation
 * const results = await translator.translateBatch({
 *   texts: ['Text 1', 'Text 2', 'Text 3'],
 *   targetLang: 'de',
 *   style: 'chemistry'
 * });
 * 
 * // Stream translation for long texts
 * await translator.translateStream(
 *   { text: longText, targetLang: 'fr' },
 *   (chunk) => console.log(chunk)
 * );
 */
