import { config } from '../config/index';
import { AIProvider, AIOptions, AIAnalysisResult, AIResearchResult } from './types';
import { GeminiProvider } from './providers/geminiProvider';
import { MockProvider } from './providers/mockProvider';

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderId: string;

  constructor() {
    const gemini = new GeminiProvider();
    const mock = new MockProvider();

    this.providers.set(gemini.id, gemini);
    this.providers.set(mock.id, mock);

    // Default to configured provider or fallback to mock if key is missing
    const defaultProvider = process.env.AI_PROVIDER_DEFAULT || config.defaultAiProvider;
    if (defaultProvider === 'gemini' && gemini.isAvailable) {
      this.activeProviderId = 'gemini';
    } else {
      this.activeProviderId = 'mock';
    }
  }

  public getActiveProvider(): AIProvider {
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      return this.providers.get('mock')!;
    }
    return provider;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public getActiveModelName(): string {
    return this.getActiveProvider().modelName;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public setActiveProvider(providerId: string): void {
    if (!this.providers.has(providerId)) {
      throw new Error(`AI Provider with id '${providerId}' is not registered.`);
    }
    this.activeProviderId = providerId;
  }

  public getRegisteredProviders(): Array<{ id: string; name: string; modelName: string; isAvailable: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      modelName: p.modelName,
      isAvailable: p.isAvailable,
    }));
  }

  public getAvailableProviders(): Array<{ id: string; name: string; modelName: string; isAvailable: boolean }> {
    return this.getRegisteredProviders();
  }

  // Proxied AI abstractions used by Engines
  public async generateText(prompt: string, options?: AIOptions): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.generateText(prompt, options);
  }

  public async analyze(content: string, context?: Record<string, unknown>): Promise<AIAnalysisResult> {
    const provider = this.getActiveProvider();
    return provider.analyze(content, context);
  }

  public async summarize(text: string, maxWords?: number): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.summarize(text, maxWords);
  }

  public async classify(input: string, categories: string[]): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.classify(input, categories);
  }

  public async extract(input: string, schemaDescription: string): Promise<Record<string, unknown>> {
    const provider = this.getActiveProvider();
    return provider.extract(input, schemaDescription);
  }

  public async research(topic: string, constraints?: Record<string, unknown>): Promise<AIResearchResult> {
    const provider = this.getActiveProvider();
    return provider.research(topic, constraints);
  }

  public async structuredOutput<T>(prompt: string, schemaDescription: string): Promise<T> {
    const provider = this.getActiveProvider();
    return provider.structuredOutput<T>(prompt, schemaDescription);
  }
}

export const aiService = new AIService();
