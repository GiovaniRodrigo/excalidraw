import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  getDefaultConfigForProvider,
  getStoredLLMConfig,
  PROVIDERS_METADATA,
  resetStoredLLMConfig,
  saveStoredLLMConfig,
} from "../services/llm/config";
import {
  extractHtmlCode,
  extractMermaidCode,
  streamTextToDiagram,
  testLLMConnection,
} from "../services/llm/llmService";

import type { LLMConfig } from "../services/llm/types";

describe("LLM Integration Service & Configuration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Configuration & Providers Metadata", () => {
    it("should provide metadata for local and cloud providers", () => {
      expect(PROVIDERS_METADATA.antigravity.name).toContain("Antigravity");
      expect(PROVIDERS_METADATA.ollama.category).toBe("local");
      expect(PROVIDERS_METADATA.ollama.defaultBaseUrl).toBe(
        "http://localhost:11434",
      );
      expect(PROVIDERS_METADATA.lmstudio.category).toBe("local");

      expect(PROVIDERS_METADATA.openai.category).toBe("web");
      expect(PROVIDERS_METADATA.gemini.category).toBe("web");
      expect(PROVIDERS_METADATA.groq.category).toBe("web");
      expect(PROVIDERS_METADATA.openrouter.category).toBe("web");
    });

    it("should retrieve default config when localStorage is empty", () => {
      const config = getStoredLLMConfig();
      expect(config.provider).toBe("antigravity");
      expect(config.model).toBe("gemini-1.5-flash");
    });

    it("should save and retrieve custom LLM config", () => {
      const customConfig: LLMConfig = {
        provider: "openai",
        apiKey: "sk-test-key-123",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o",
        visionModel: "gpt-4o",
        temperature: 0.1,
      };

      saveStoredLLMConfig(customConfig);
      const retrieved = getStoredLLMConfig();

      expect(retrieved.provider).toBe("openai");
      expect(retrieved.apiKey).toBe("sk-test-key-123");
      expect(retrieved.model).toBe("gpt-4o");
      expect(retrieved.temperature).toBe(0.1);
    });

    it("should reset config to default", () => {
      saveStoredLLMConfig({
        provider: "groq",
        apiKey: "gsk-test",
        baseUrl: "https://api.groq.com/openai/v1",
        model: "llama-3.3-70b-versatile",
        visionModel: "llama-3.2-11b-vision-preview",
        temperature: 0.5,
      });

      const reset = resetStoredLLMConfig();
      expect(reset.provider).toBe("antigravity");
      expect(getStoredLLMConfig().provider).toBe("antigravity");
    });

    it("should get provider specific defaults", () => {
      const geminiConfig = getDefaultConfigForProvider("gemini");
      expect(geminiConfig.provider).toBe("gemini");
      expect(geminiConfig.model).toBe("gemini-1.5-flash");
      expect(geminiConfig.baseUrl).toContain("googleapis.com");
    });
  });

  describe("Mermaid Code Sanitizer & Extractor", () => {
    it("should extract pure Mermaid code from markdown code fences", () => {
      const raw = `\`\`\`mermaid
flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[OK]
  B -->|No| D[Cancel]
\`\`\``;

      const extracted = extractMermaidCode(raw);
      expect(extracted).toBe(`flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[OK]
  B -->|No| D[Cancel]`);
    });

    it("should remove conversational text before diagram", () => {
      const raw = `Here is the architecture diagram you requested:

flowchart LR
  Client --> API[API Gateway]
  API --> DB[(Database)]`;

      const extracted = extractMermaidCode(raw);
      expect(extracted).toBe(`flowchart LR
  Client --> API[API Gateway]
  API --> DB[(Database)]`);
    });

    it("should support sequence diagrams and class diagrams", () => {
      const sequence = `sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi!`;

      expect(extractMermaidCode(sequence)).toBe(sequence);

      const classDiag = `classDiagram
  class Animal {
    +String name
  }`;

      expect(extractMermaidCode(classDiag)).toBe(classDiag);
    });
  });

  describe("HTML Code Sanitizer & Extractor", () => {
    it("should strip markdown code blocks and ensure Tailwind is included", () => {
      const raw = `\`\`\`html
<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body><div class="p-4 bg-blue-500 text-white">Hello World</div></body>
</html>
\`\`\``;

      const extracted = extractHtmlCode(raw);
      expect(extracted).toContain("cdn.tailwindcss.com");
      expect(extracted).toContain("Hello World");
      expect(extracted).not.toContain("```html");
    });

    it("should wrap partial HTML snippet in full HTML document with Tailwind", () => {
      const raw = `<div class="flex items-center justify-center h-screen"><button class="btn">Click me</button></div>`;
      const extracted = extractHtmlCode(raw);

      expect(extracted).toContain("<!DOCTYPE html>");
      expect(extracted).toContain("cdn.tailwindcss.com");
      expect(extracted).toContain("Click me");
    });
  });

  describe("Stream Text to Diagram Execution", () => {
    it("should stream responses correctly and return extracted mermaid diagram", async () => {
      const mockSSEChunks = [
        'data: {"choices":[{"delta":{"content":"flowchart TD\\n"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"  A[User] --> "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"B[Server]"}}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of mockSSEChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "text/event-stream" }),
        body: stream,
      } as any);

      const receivedChunks: string[] = [];
      const result = await streamTextToDiagram({
        config: {
          provider: "openai",
          apiKey: "sk-test",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini",
          visionModel: "gpt-4o-mini",
          temperature: 0.2,
        },
        messages: [
          { role: "user", content: "Create a simple client-server diagram" },
        ],
        onChunk: (chunk) => receivedChunks.push(chunk),
      });

      expect(result.error).toBeNull();
      expect(result.generatedResponse).toBe(
        "flowchart TD\n  A[User] --> B[Server]",
      );
      expect(receivedChunks.join("")).toBe(
        "flowchart TD\n  A[User] --> B[Server]",
      );
    });
  });

  describe("Test LLM Connection", () => {
    it("should return success when Ollama /api/tags succeeds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: "llama3.2:latest" }, { name: "deepseek-r1:latest" }],
        }),
      } as any);

      const result = await testLLMConnection({
        provider: "ollama",
        apiKey: "",
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        visionModel: "llama3.2-vision",
        temperature: 0.2,
      });

      expect(result.success).toBe(true);
      expect(result.availableModels).toContain("llama3.2:latest");
      expect(result.availableModels).toContain("deepseek-r1:latest");
    });

    it("should return failure with helpful CORS instructions when Ollama is unreachable", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Failed to fetch"),
      );

      const result = await testLLMConnection({
        provider: "ollama",
        apiKey: "",
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
        visionModel: "llama3.2-vision",
        temperature: 0.2,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("OLLAMA_ORIGINS");
    });
  });
});
