import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AGENT_PERSONAS, DEFAULT_AGENT_ID } from "../components/AIChat/agentPersonas";
import { streamAIChatMessage, extractMermaidCode } from "../services/llm/llmService";
import type { LLMConfig } from "../services/llm/types";

describe("AI Agent Chat Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Agent Personas & Capabilities", () => {
    it("should provide well-defined specialist personas including Antigravity", () => {
      expect(AGENT_PERSONAS).toHaveProperty("antigravity");
      expect(AGENT_PERSONAS).toHaveProperty("architect");
      expect(AGENT_PERSONAS).toHaveProperty("flowchart");
      expect(AGENT_PERSONAS).toHaveProperty("canvas_reviewer");
      expect(AGENT_PERSONAS).toHaveProperty("frontend_coder");
      expect(AGENT_PERSONAS).toHaveProperty("general_assistant");

      expect(DEFAULT_AGENT_ID).toBe("antigravity");

      const antigravity = AGENT_PERSONAS.antigravity;
      expect(antigravity.name).toBe("Antigravity AI");
      expect(antigravity.systemPrompt).toContain("DeepMind");
      expect(antigravity.systemPrompt).toContain("Excalidraw");
      expect(antigravity.systemPrompt).toContain("Mermaid.js");
      expect(antigravity.suggestedPrompts.length).toBeGreaterThan(0);

      const architect = AGENT_PERSONAS.architect;
      expect(architect.name).toBe("Arquiteto de Software");
      expect(architect.systemPrompt).toContain("Excalidraw");
      expect(architect.systemPrompt).toContain("Mermaid.js");
      expect(architect.suggestedPrompts.length).toBeGreaterThan(0);

      const reviewer = AGENT_PERSONAS.canvas_reviewer;
      expect(reviewer.name).toBe("Analista de Canvas");
      expect(reviewer.systemPrompt).toContain("canvas");
    });
  });

  describe("Conversational Stream Execution (streamAIChatMessage)", () => {
    const mockConfig: LLMConfig = {
      provider: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3",
      apiKey: "",
      visionModel: "llava",
      temperature: 0.3,
    };

    it("should stream message chunks and accumulate full response", async () => {
      const sseChunks = [
        'data: {"choices":[{"delta":{"content":"Aqui está o "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"diagrama:\\n```mermaid\\nflowchart TD\\nA-->B\\n```"}}]}\n\n',
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          sseChunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      });

      const chunksReceived: string[] = [];
      const onChunk = vi.fn((c: string) => chunksReceived.push(c));

      const result = await streamAIChatMessage({
        config: mockConfig,
        systemPrompt: "Você é um arquiteto.",
        messages: [{ role: "user", content: "Crie um fluxo simples A para B" }],
        onChunk,
      });

      expect(result.error).toBeNull();
      expect(result.content).toBe(
        "Aqui está o diagrama:\n```mermaid\nflowchart TD\nA-->B\n```",
      );
      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(chunksReceived.join("")).toBe(result.content);

      // Verify mermaid extraction
      const extracted = extractMermaidCode(result.content);
      expect(extracted).toContain("flowchart TD");
      expect(extracted).toContain("A-->B");
    });

    it("should handle connection errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      const result = await streamAIChatMessage({
        config: mockConfig,
        messages: [{ role: "user", content: "Teste de falha" }],
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Ollama");
    });

    it("should handle abort signals properly", async () => {
      const abortController = new AbortController();
      abortController.abort();

      const result = await streamAIChatMessage({
        config: mockConfig,
        messages: [{ role: "user", content: "Teste abort" }],
        signal: abortController.signal,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("cancelada");
    });
  });
});
