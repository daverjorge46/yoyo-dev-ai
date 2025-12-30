/**
 * OpenAI Provider
 *
 * Implements LLM queries to OpenAI GPT models.
 */

import OpenAI from "openai";
import type {
  LLMProvider,
  NormalizedResponse,
  OpenAIQuery,
  ProviderErrorCode,
} from "../types.js";
import { ProviderError } from "../types.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  private client: OpenAI | null = null;

  constructor(private apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private getClient(): OpenAI {
    if (!this.apiKey) {
      throw new ProviderError(
        "openai",
        "API_KEY_MISSING",
        "OPENAI_API_KEY is not set"
      );
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }

    return this.client;
  }

  async query(params: OpenAIQuery): Promise<NormalizedResponse> {
    const client = this.getClient();
    const startTime = Date.now();

    const {
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
    } = params;

    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }

      messages.push({ role: "user", content: prompt });

      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      return {
        content: choice?.message?.content || "",
        model: response.model,
        provider: "openai",
        tokens: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
        latencyMs,
        finishReason: choice?.finish_reason || undefined,
        metadata: {
          id: response.id,
          created: response.created,
        },
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown): ProviderError {
    if (error instanceof ProviderError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      let code: ProviderErrorCode = "UNKNOWN";
      let message = error.message;

      if (error.status === 401) {
        code = "API_KEY_MISSING";
        message = "Invalid API key";
      } else if (error.status === 429) {
        code = "RATE_LIMITED";
        message = "Rate limited by OpenAI";
      } else if (error.status === 400) {
        code = "INVALID_REQUEST";
      } else if (error.status === 404) {
        code = "MODEL_NOT_FOUND";
      } else if (error.status && error.status >= 500) {
        code = "SERVER_ERROR";
      }

      return new ProviderError("openai", code, message, error);
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return new ProviderError("openai", "TIMEOUT", error.message, error);
      }
      if (error.message.includes("network") || error.message.includes("ECONNREFUSED")) {
        return new ProviderError("openai", "NETWORK_ERROR", error.message, error);
      }
      return new ProviderError("openai", "UNKNOWN", error.message, error);
    }

    return new ProviderError("openai", "UNKNOWN", String(error));
  }
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIProvider(apiKey?: string): OpenAIProvider {
  return new OpenAIProvider(apiKey);
}
