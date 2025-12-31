#!/usr/bin/env node
/**
 * Multi-Model MCP Server
 *
 * An MCP server that provides access to multiple LLM providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Google (Gemini)
 * - Ollama (local models)
 *
 * Usage:
 *   npx @yoyo-dev/multi-model-mcp
 *
 * Environment variables:
 *   OPENAI_API_KEY - OpenAI API key
 *   GOOGLE_API_KEY - Google AI API key
 *   OLLAMA_HOST - Ollama server URL (default: http://localhost:11434)
 */

// Load environment variables from .env file
// Searches current directory and parent directories up to project root
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find .env file by walking up directory tree
function findEnvFile(): string | undefined {
  let currentDir = process.cwd();
  const root = resolve("/");

  while (currentDir !== root) {
    const envPath = resolve(currentDir, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }
    currentDir = dirname(currentDir);
  }
  return undefined;
}

const envPath = findEnvFile();
if (envPath) {
  config({ path: envPath });
  console.error(`[multi-model-mcp] Loaded .env from: ${envPath}`);
} else {
  console.error("[multi-model-mcp] No .env file found, using environment variables");
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  OpenAIQuerySchema,
  GoogleQuerySchema,
  OllamaQuerySchema,
  type NormalizedResponse,
  ProviderError,
} from "./types.js";
import {
  createOpenAIProvider,
  createGoogleProvider,
  createOllamaProvider,
} from "./providers/index.js";

// Initialize providers
const openaiProvider = createOpenAIProvider();
const googleProvider = createGoogleProvider();
const ollamaProvider = createOllamaProvider();

/**
 * Format response for MCP tool result
 */
function formatResponse(response: NormalizedResponse): string {
  return JSON.stringify(
    {
      content: response.content,
      model: response.model,
      provider: response.provider,
      tokens: response.tokens,
      latencyMs: response.latencyMs,
      finishReason: response.finishReason,
    },
    null,
    2
  );
}

/**
 * Format error for MCP tool result
 */
function formatError(error: unknown): string {
  if (error instanceof ProviderError) {
    return JSON.stringify(
      {
        error: true,
        provider: error.provider,
        code: error.code,
        message: error.message,
      },
      null,
      2
    );
  }

  if (error instanceof Error) {
    return JSON.stringify(
      {
        error: true,
        message: error.message,
      },
      null,
      2
    );
  }

  return JSON.stringify({ error: true, message: String(error) });
}

/**
 * Create and configure the MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: "multi-model-mcp",
    version: "1.0.0",
  });

  // Register query_openai tool
  server.tool(
    "query_openai",
    "Query OpenAI GPT models (GPT-4, GPT-3.5, etc.)",
    {
      model: z
        .enum(["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"])
        .default("gpt-4o")
        .describe("OpenAI model to use"),
      prompt: z.string().describe("The prompt to send to the model"),
      systemPrompt: z.string().optional().describe("Optional system prompt"),
      temperature: z.number().min(0).max(2).default(0.7).describe("Temperature (0-2)"),
      maxTokens: z.number().positive().default(4096).describe("Maximum tokens in response"),
      topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
      frequencyPenalty: z.number().min(-2).max(2).optional().describe("Frequency penalty"),
      presencePenalty: z.number().min(-2).max(2).optional().describe("Presence penalty"),
    },
    async (args) => {
      try {
        if (!openaiProvider.isAvailable()) {
          return {
            content: [
              {
                type: "text",
                text: formatError(
                  new ProviderError("openai", "API_KEY_MISSING", "OPENAI_API_KEY not set")
                ),
              },
            ],
          };
        }

        const params = OpenAIQuerySchema.parse(args);
        const response = await openaiProvider.query(params);

        return {
          content: [{ type: "text", text: formatResponse(response) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error) }],
        };
      }
    }
  );

  // Register query_google tool
  server.tool(
    "query_google",
    "Query Google Gemini models",
    {
      model: z
        .enum(["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"])
        .default("gemini-2.0-flash-exp")
        .describe("Google Gemini model to use"),
      prompt: z.string().describe("The prompt to send to the model"),
      systemPrompt: z.string().optional().describe("Optional system prompt"),
      temperature: z.number().min(0).max(2).default(0.7).describe("Temperature (0-2)"),
      maxTokens: z.number().positive().default(4096).describe("Maximum tokens in response"),
      topK: z.number().positive().optional().describe("Top-k sampling parameter"),
      topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
    },
    async (args) => {
      try {
        if (!googleProvider.isAvailable()) {
          return {
            content: [
              {
                type: "text",
                text: formatError(
                  new ProviderError("google", "API_KEY_MISSING", "GOOGLE_API_KEY not set")
                ),
              },
            ],
          };
        }

        const params = GoogleQuerySchema.parse(args);
        const response = await googleProvider.query(params);

        return {
          content: [{ type: "text", text: formatResponse(response) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error) }],
        };
      }
    }
  );

  // Register query_ollama tool
  server.tool(
    "query_ollama",
    "Query local Ollama models (Llama, Mistral, etc.)",
    {
      model: z.string().default("llama3.2").describe("Ollama model name"),
      prompt: z.string().describe("The prompt to send to the model"),
      systemPrompt: z.string().optional().describe("Optional system prompt"),
      temperature: z.number().min(0).max(2).default(0.7).describe("Temperature (0-2)"),
      maxTokens: z.number().positive().default(4096).describe("Maximum tokens in response"),
      baseUrl: z
        .string()
        .url()
        .default("http://localhost:11434")
        .describe("Ollama server URL"),
      topK: z.number().positive().optional().describe("Top-k sampling parameter"),
      topP: z.number().min(0).max(1).optional().describe("Top-p sampling parameter"),
      repeatPenalty: z.number().optional().describe("Repeat penalty"),
    },
    async (args) => {
      try {
        const params = OllamaQuerySchema.parse(args);
        const response = await ollamaProvider.query(params);

        return {
          content: [{ type: "text", text: formatResponse(response) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error) }],
        };
      }
    }
  );

  // Register list_ollama_models tool
  server.tool(
    "list_ollama_models",
    "List available models on the Ollama server",
    {
      baseUrl: z
        .string()
        .url()
        .default("http://localhost:11434")
        .describe("Ollama server URL"),
    },
    async (args) => {
      try {
        const models = await ollamaProvider.listModels(args.baseUrl);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ models, count: models.length }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatError(error) }],
        };
      }
    }
  );

  // Register provider_status tool
  server.tool(
    "provider_status",
    "Check which LLM providers are available",
    {},
    async () => {
      const status = {
        openai: {
          available: openaiProvider.isAvailable(),
          reason: openaiProvider.isAvailable() ? "API key present" : "OPENAI_API_KEY not set",
        },
        google: {
          available: googleProvider.isAvailable(),
          reason: googleProvider.isAvailable() ? "API key present" : "GOOGLE_API_KEY not set",
        },
        ollama: {
          available: true,
          reason: "Local server (availability checked on query)",
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    }
  );

  return server;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr so it doesn't interfere with stdio transport
  console.error("[multi-model-mcp] Server started");
}

// Run if executed directly
main().catch((error) => {
  console.error("[multi-model-mcp] Fatal error:", error);
  process.exit(1);
});
