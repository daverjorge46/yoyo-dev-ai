/**
 * Google Gemini Provider
 *
 * Implements LLM queries to Google Gemini models.
 */

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import type {
  LLMProvider,
  NormalizedResponse,
  GoogleQuery,
  ProviderErrorCode,
} from "../types.js";
import { ProviderError } from "../types.js";

export class GoogleProvider implements LLMProvider {
  readonly name = "google" as const;
  private client: GoogleGenerativeAI | null = null;

  constructor(private apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.apiKey) {
      throw new ProviderError(
        "google",
        "API_KEY_MISSING",
        "GOOGLE_API_KEY is not set"
      );
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }

    return this.client;
  }

  async query(params: GoogleQuery): Promise<NormalizedResponse> {
    const client = this.getClient();
    const startTime = Date.now();

    const {
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      topK,
      topP,
    } = params;

    try {
      const generativeModel = client.getGenerativeModel({
        model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topK,
          topP,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      // Build prompt with optional system instruction
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const result = await generativeModel.generateContent(fullPrompt);
      const response = result.response;

      const latencyMs = Date.now() - startTime;
      const text = response.text();

      // Extract token usage from metadata if available
      const usageMetadata = response.usageMetadata;

      return {
        content: text,
        model,
        provider: "google",
        tokens: {
          input: usageMetadata?.promptTokenCount || 0,
          output: usageMetadata?.candidatesTokenCount || 0,
          total: usageMetadata?.totalTokenCount || 0,
        },
        latencyMs,
        finishReason: response.candidates?.[0]?.finishReason || undefined,
        metadata: {
          safetyRatings: response.candidates?.[0]?.safetyRatings,
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

    if (error instanceof Error) {
      let code: ProviderErrorCode = "UNKNOWN";
      const message = error.message;

      if (message.includes("API key")) {
        code = "API_KEY_MISSING";
      } else if (message.includes("quota") || message.includes("429")) {
        code = "RATE_LIMITED";
      } else if (message.includes("not found") || message.includes("404")) {
        code = "MODEL_NOT_FOUND";
      } else if (message.includes("invalid") || message.includes("400")) {
        code = "INVALID_REQUEST";
      } else if (message.includes("500") || message.includes("server")) {
        code = "SERVER_ERROR";
      } else if (message.includes("timeout")) {
        code = "TIMEOUT";
      } else if (message.includes("network") || message.includes("ECONNREFUSED")) {
        code = "NETWORK_ERROR";
      }

      return new ProviderError("google", code, message, error);
    }

    return new ProviderError("google", "UNKNOWN", String(error));
  }
}

/**
 * Create Google provider instance
 */
export function createGoogleProvider(apiKey?: string): GoogleProvider {
  return new GoogleProvider(apiKey);
}
