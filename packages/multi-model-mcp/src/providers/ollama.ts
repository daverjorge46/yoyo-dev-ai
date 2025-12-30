/**
 * Ollama Provider
 *
 * Implements LLM queries to local Ollama models.
 */

import { Ollama } from "ollama";
import type {
  LLMProvider,
  NormalizedResponse,
  OllamaQuery,
  ProviderErrorCode,
} from "../types.js";
import { ProviderError } from "../types.js";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama" as const;
  private clients: Map<string, Ollama> = new Map();
  private defaultBaseUrl: string;

  constructor(defaultBaseUrl?: string) {
    this.defaultBaseUrl = defaultBaseUrl || process.env.OLLAMA_HOST || "http://localhost:11434";
  }

  isAvailable(): boolean {
    // Ollama is locally hosted, so we assume it's available
    // Actual availability is checked during query
    return true;
  }

  private getClient(baseUrl: string): Ollama {
    if (!this.clients.has(baseUrl)) {
      this.clients.set(baseUrl, new Ollama({ host: baseUrl }));
    }
    return this.clients.get(baseUrl)!;
  }

  async query(params: OllamaQuery): Promise<NormalizedResponse> {
    const startTime = Date.now();

    const {
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      baseUrl = this.defaultBaseUrl,
      topK,
      topP,
      repeatPenalty,
    } = params;

    const client = this.getClient(baseUrl);

    try {
      const response = await client.generate({
        model,
        prompt,
        system: systemPrompt,
        options: {
          temperature,
          num_predict: maxTokens,
          top_k: topK,
          top_p: topP,
          repeat_penalty: repeatPenalty,
        },
      });

      const latencyMs = Date.now() - startTime;

      return {
        content: response.response,
        model: response.model,
        provider: "ollama",
        tokens: {
          input: response.prompt_eval_count || 0,
          output: response.eval_count || 0,
          total: (response.prompt_eval_count || 0) + (response.eval_count || 0),
        },
        latencyMs,
        finishReason: response.done ? "stop" : undefined,
        metadata: {
          context: response.context,
          totalDuration: response.total_duration,
          loadDuration: response.load_duration,
          promptEvalDuration: response.prompt_eval_duration,
          evalDuration: response.eval_duration,
        },
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * List available models on the Ollama server
   */
  async listModels(baseUrl?: string): Promise<string[]> {
    const client = this.getClient(baseUrl || this.defaultBaseUrl);

    try {
      const response = await client.list();
      return response.models.map((m) => m.name);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(model: string, baseUrl?: string): Promise<boolean> {
    try {
      const models = await this.listModels(baseUrl);
      return models.some((m) => m === model || m.startsWith(`${model}:`));
    } catch {
      return false;
    }
  }

  private normalizeError(error: unknown): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof Error) {
      let code: ProviderErrorCode = "UNKNOWN";
      const message = error.message;

      if (message.includes("ECONNREFUSED") || message.includes("connect")) {
        code = "NETWORK_ERROR";
        return new ProviderError(
          "ollama",
          code,
          "Cannot connect to Ollama server. Is it running?",
          error
        );
      } else if (message.includes("not found") || message.includes("404")) {
        code = "MODEL_NOT_FOUND";
      } else if (message.includes("timeout")) {
        code = "TIMEOUT";
      } else if (message.includes("invalid")) {
        code = "INVALID_REQUEST";
      }

      return new ProviderError("ollama", code, message, error);
    }

    return new ProviderError("ollama", "UNKNOWN", String(error));
  }
}

/**
 * Create Ollama provider instance
 */
export function createOllamaProvider(defaultBaseUrl?: string): OllamaProvider {
  return new OllamaProvider(defaultBaseUrl);
}
