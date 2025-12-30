/**
 * Types Tests
 *
 * Tests for schema validation and type definitions.
 */

import { describe, expect, it } from "vitest";
import {
  BaseQuerySchema,
  OpenAIQuerySchema,
  GoogleQuerySchema,
  OllamaQuerySchema,
  ProviderError,
} from "../types.js";

describe("types", () => {
  describe("BaseQuerySchema", () => {
    it("should accept valid base query", () => {
      const result = BaseQuerySchema.parse({
        prompt: "Hello, world!",
      });

      expect(result.prompt).toBe("Hello, world!");
      expect(result.temperature).toBe(0.7); // default
      expect(result.maxTokens).toBe(4096); // default
    });

    it("should accept optional system prompt", () => {
      const result = BaseQuerySchema.parse({
        prompt: "Hello",
        systemPrompt: "You are a helpful assistant",
      });

      expect(result.systemPrompt).toBe("You are a helpful assistant");
    });

    it("should validate temperature bounds", () => {
      expect(() =>
        BaseQuerySchema.parse({ prompt: "test", temperature: -1 })
      ).toThrow();

      expect(() =>
        BaseQuerySchema.parse({ prompt: "test", temperature: 3 })
      ).toThrow();

      const result = BaseQuerySchema.parse({ prompt: "test", temperature: 1.5 });
      expect(result.temperature).toBe(1.5);
    });

    it("should require prompt", () => {
      expect(() => BaseQuerySchema.parse({})).toThrow();
    });
  });

  describe("OpenAIQuerySchema", () => {
    it("should accept valid OpenAI query", () => {
      const result = OpenAIQuerySchema.parse({
        prompt: "Hello",
        model: "gpt-4o",
      });

      expect(result.model).toBe("gpt-4o");
      expect(result.prompt).toBe("Hello");
    });

    it("should use default model", () => {
      const result = OpenAIQuerySchema.parse({
        prompt: "Hello",
      });

      expect(result.model).toBe("gpt-4o");
    });

    it("should validate model enum", () => {
      expect(() =>
        OpenAIQuerySchema.parse({ prompt: "test", model: "invalid-model" })
      ).toThrow();
    });

    it("should accept optional parameters", () => {
      const result = OpenAIQuerySchema.parse({
        prompt: "Hello",
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      });

      expect(result.topP).toBe(0.9);
      expect(result.frequencyPenalty).toBe(0.5);
      expect(result.presencePenalty).toBe(0.3);
    });

    it("should validate penalty bounds", () => {
      expect(() =>
        OpenAIQuerySchema.parse({ prompt: "test", frequencyPenalty: 3 })
      ).toThrow();

      expect(() =>
        OpenAIQuerySchema.parse({ prompt: "test", presencePenalty: -3 })
      ).toThrow();
    });
  });

  describe("GoogleQuerySchema", () => {
    it("should accept valid Google query", () => {
      const result = GoogleQuerySchema.parse({
        prompt: "Hello",
        model: "gemini-1.5-pro",
      });

      expect(result.model).toBe("gemini-1.5-pro");
    });

    it("should use default model", () => {
      const result = GoogleQuerySchema.parse({
        prompt: "Hello",
      });

      expect(result.model).toBe("gemini-2.0-flash-exp");
    });

    it("should accept topK and topP", () => {
      const result = GoogleQuerySchema.parse({
        prompt: "Hello",
        topK: 40,
        topP: 0.95,
      });

      expect(result.topK).toBe(40);
      expect(result.topP).toBe(0.95);
    });
  });

  describe("OllamaQuerySchema", () => {
    it("should accept valid Ollama query", () => {
      const result = OllamaQuerySchema.parse({
        prompt: "Hello",
        model: "mistral",
      });

      expect(result.model).toBe("mistral");
    });

    it("should use default model", () => {
      const result = OllamaQuerySchema.parse({
        prompt: "Hello",
      });

      expect(result.model).toBe("llama3.2");
    });

    it("should use default base URL", () => {
      const result = OllamaQuerySchema.parse({
        prompt: "Hello",
      });

      expect(result.baseUrl).toBe("http://localhost:11434");
    });

    it("should accept custom base URL", () => {
      const result = OllamaQuerySchema.parse({
        prompt: "Hello",
        baseUrl: "http://192.168.1.100:11434",
      });

      expect(result.baseUrl).toBe("http://192.168.1.100:11434");
    });

    it("should validate base URL format", () => {
      expect(() =>
        OllamaQuerySchema.parse({ prompt: "test", baseUrl: "not-a-url" })
      ).toThrow();
    });

    it("should accept repeatPenalty", () => {
      const result = OllamaQuerySchema.parse({
        prompt: "Hello",
        repeatPenalty: 1.1,
      });

      expect(result.repeatPenalty).toBe(1.1);
    });
  });

  describe("ProviderError", () => {
    it("should create error with provider and code", () => {
      const error = new ProviderError(
        "openai",
        "API_KEY_MISSING",
        "API key not found"
      );

      expect(error.provider).toBe("openai");
      expect(error.code).toBe("API_KEY_MISSING");
      expect(error.message).toBe("[openai] API key not found");
      expect(error.name).toBe("ProviderError");
    });

    it("should include cause if provided", () => {
      const cause = new Error("Original error");
      const error = new ProviderError(
        "google",
        "NETWORK_ERROR",
        "Connection failed",
        cause
      );

      expect(error.cause).toBe(cause);
    });

    it("should be instanceof Error", () => {
      const error = new ProviderError("ollama", "TIMEOUT", "Request timed out");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProviderError);
    });
  });
});
