/**
 * Multi-Model MCP Types
 *
 * Type definitions for the multi-model MCP gateway server.
 */

import { z } from "zod";

/**
 * Supported LLM providers
 */
export type Provider = "openai" | "google" | "ollama";

/**
 * Common query parameters shared across providers
 */
export const BaseQuerySchema = z.object({
  prompt: z.string().describe("The prompt to send to the model"),
  systemPrompt: z.string().optional().describe("Optional system prompt"),
  temperature: z.number().min(0).max(2).default(0.7).describe("Temperature (0-2)"),
  maxTokens: z.number().positive().default(4096).describe("Maximum tokens in response"),
});

export type BaseQuery = z.infer<typeof BaseQuerySchema>;

/**
 * OpenAI query parameters
 */
export const OpenAIQuerySchema = BaseQuerySchema.extend({
  model: z
    .enum(["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"])
    .default("gpt-4o")
    .describe("OpenAI model to use"),
  topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
  frequencyPenalty: z.number().min(-2).max(2).optional().describe("Frequency penalty"),
  presencePenalty: z.number().min(-2).max(2).optional().describe("Presence penalty"),
});

export type OpenAIQuery = z.infer<typeof OpenAIQuerySchema>;

/**
 * Google Gemini query parameters
 */
export const GoogleQuerySchema = BaseQuerySchema.extend({
  model: z
    .enum(["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"])
    .default("gemini-2.0-flash-exp")
    .describe("Google Gemini model to use"),
  topK: z.number().positive().optional().describe("Top-k sampling parameter"),
  topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
});

export type GoogleQuery = z.infer<typeof GoogleQuerySchema>;

/**
 * Ollama query parameters
 */
export const OllamaQuerySchema = BaseQuerySchema.extend({
  model: z.string().default("llama3.2").describe("Ollama model name"),
  baseUrl: z
    .string()
    .url()
    .default("http://localhost:11434")
    .describe("Ollama server URL"),
  topK: z.number().positive().optional().describe("Top-k sampling parameter"),
  topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
  repeatPenalty: z.number().optional().describe("Repeat penalty"),
});

export type OllamaQuery = z.infer<typeof OllamaQuerySchema>;

/**
 * Normalized response from any provider
 */
export interface NormalizedResponse {
  /** Response content */
  content: string;

  /** Model used */
  model: string;

  /** Provider name */
  provider: Provider;

  /** Token usage statistics */
  tokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Response latency in milliseconds */
  latencyMs: number;

  /** Finish reason */
  finishReason?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provider interface that all providers must implement
 */
export interface LLMProvider {
  /** Provider name */
  readonly name: Provider;

  /** Check if provider is available (API key present, etc.) */
  isAvailable(): boolean;

  /** Query the provider */
  query(params: BaseQuery & Record<string, unknown>): Promise<NormalizedResponse>;
}

/**
 * Provider error
 */
export class ProviderError extends Error {
  constructor(
    public readonly provider: Provider,
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

/**
 * Provider error codes
 */
export type ProviderErrorCode =
  | "API_KEY_MISSING"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "MODEL_NOT_FOUND"
  | "INVALID_REQUEST"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

/**
 * MCP tool definition
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
}
