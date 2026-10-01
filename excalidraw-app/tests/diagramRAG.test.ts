import { describe, it, expect } from "vitest";
import {
  detectDiagramOperation,
  extractPreviousDiagram,
  buildRAGAugmentedPrompt,
  MERMAID_DIAGRAM_STANDARD,
} from "../services/llm/diagramRAG";

describe("Diagram RAG & Prompt Augmentation Engine", () => {
  describe("detectDiagramOperation", () => {
    it("should correctly identify DECOMPOSE_CARDS intent", () => {
      const prompt1 = "cada card, disfragmente em mais folhas que pertencem ao card";
      const res1 = detectDiagramOperation(prompt1);
      expect(res1.operation).toBe("DECOMPOSE_CARDS");
      expect(res1.confidence).toBeGreaterThanOrEqual(0.9);

      const prompt2 = "desfragmente os cards em subtarefas e folhas atômicas";
      const res2 = detectDiagramOperation(prompt2);
      expect(res2.operation).toBe("DECOMPOSE_CARDS");

      const prompt3 = "quebre cada etapa em folhas";
      const res3 = detectDiagramOperation(prompt3);
      expect(res3.operation).toBe("DECOMPOSE_CARDS");

      const prompt4 = "decompose cards into leaves";
      const res4 = detectDiagramOperation(prompt4);
      expect(res4.operation).toBe("DECOMPOSE_CARDS");
    });

    it("should correctly identify UPDATE_DIAGRAM intent", () => {
      const prompt1 = "mude o banco para PostgreSQL e troque o gateway por Envoy";
      const res1 = detectDiagramOperation(prompt1);
      expect(res1.operation).toBe("UPDATE_DIAGRAM");

      const prompt2 = "altere o diagrama para usar Redis no cache";
      const res2 = detectDiagramOperation(prompt2);
      expect(res2.operation).toBe("UPDATE_DIAGRAM");

      const prompt3 = "remova o nó de autenticação legado";
      const res3 = detectDiagramOperation(prompt3);
      expect(res3.operation).toBe("UPDATE_DIAGRAM");

      const historyWithDiagram = [
        {
          role: "assistant",
          content: "```mermaid\nflowchart TD\nA-->B\n```",
        },
      ];
      const prompt4 = "troque a fila por Kafka";
      const res4 = detectDiagramOperation(prompt4, historyWithDiagram);
      expect(res4.operation).toBe("UPDATE_DIAGRAM");
    });

    it("should correctly identify EXTEND_DIAGRAM intent", () => {
      const prompt1 = "adicione ao diagrama um serviço de pagamentos com Stripe";
      const res1 = detectDiagramOperation(prompt1);
      expect(res1.operation).toBe("EXTEND_DIAGRAM");

      const prompt2 = "acrescente no diagrama uma fila RabbitMQ e conecte com o worker";
      const res2 = detectDiagramOperation(prompt2);
      expect(res2.operation).toBe("EXTEND_DIAGRAM");

      const historyWithDiagram = [
        {
          role: "assistant",
          content: "```mermaid\nflowchart TD\nA-->B\n```",
        },
      ];
      const prompt3 = "adicione uma camada de CDN antes do frontend";
      const res3 = detectDiagramOperation(prompt3, historyWithDiagram);
      expect(res3.operation).toBe("EXTEND_DIAGRAM");
    });

    it("should correctly identify CREATE_DIAGRAM intent", () => {
      const prompt1 = "crie um diagrama de arquitetura para e-commerce com microsserviços";
      const res1 = detectDiagramOperation(prompt1);
      expect(res1.operation).toBe("CREATE_DIAGRAM");

      const prompt2 = "desenhe o fluxo de autenticação com OAuth2 e JWT";
      const res2 = detectDiagramOperation(prompt2);
      expect(res2.operation).toBe("CREATE_DIAGRAM");

      const prompt3 = "monte um fluxograma do pipeline de CI/CD";
      const res3 = detectDiagramOperation(prompt3);
      expect(res3.operation).toBe("CREATE_DIAGRAM");

      const prompt4 = "gere um diagrama de sequência do checkout";
      const res4 = detectDiagramOperation(prompt4);
      expect(res4.operation).toBe("CREATE_DIAGRAM");
    });

    it("should classify standard conversational queries as CONVERSATIONAL_CHAT", () => {
      const prompt1 = "Qual é a principal diferença entre RabbitMQ e Apache Kafka?";
      const res1 = detectDiagramOperation(prompt1);
      expect(res1.operation).toBe("CONVERSATIONAL_CHAT");

      const prompt2 = "Olá! Como você pode me ajudar a desenhar arquiteturas?";
      const res2 = detectDiagramOperation(prompt2);
      expect(res2.operation).toBe("CONVERSATIONAL_CHAT");

      const prompt3 = "O que são princípios SOLID?";
      const res3 = detectDiagramOperation(prompt3);
      expect(res3.operation).toBe("CONVERSATIONAL_CHAT");
    });
  });

  describe("extractPreviousDiagram", () => {
    it("should extract mermaid code from fenced markdown block", () => {
      const history = [
        { role: "user", content: "Crie um fluxo" },
        {
          role: "assistant",
          content:
            "Aqui está o seu diagrama:\n```mermaid\nflowchart TD\n  A[Início] --> B[Fim]\n```\nEspero que ajude!",
        },
      ];

      const previous = extractPreviousDiagram(history);
      expect(previous).toBe("flowchart TD\n  A[Início] --> B[Fim]");
    });

    it("should extract latest diagram when multiple messages exist", () => {
      const history = [
        {
          role: "assistant",
          content: "```mermaid\nflowchart TD\n  V1 --> V1_End\n```",
        },
        { role: "user", content: "Atualize" },
        {
          role: "assistant",
          content: "```mermaid\nflowchart TD\n  V2 --> V2_End\n```",
        },
      ];

      const previous = extractPreviousDiagram(history);
      expect(previous).toBe("flowchart TD\n  V2 --> V2_End");
    });

    it("should return null when history has no diagram", () => {
      const history = [
        { role: "user", content: "Olá" },
        { role: "assistant", content: "Olá! Como posso ajudar hoje?" },
      ];

      const previous = extractPreviousDiagram(history);
      expect(previous).toBeNull();
    });
  });

  describe("buildRAGAugmentedPrompt", () => {
    it("should augment prompt for DECOMPOSE_CARDS with leaves standard", () => {
      const prompt = "cada card, disfragmente em mais folhas que pertencem ao card";
      const result = buildRAGAugmentedPrompt({
        prompt,
        systemPrompt: "Você é um arquiteto.",
      });

      expect(result.analysis.operation).toBe("DECOMPOSE_CARDS");
      expect(result.augmentedSystemPrompt).toContain("DESFRAGMENTAÇÃO / DECOMPOSIÇÃO DE CARDS EM FOLHAS");
      expect(result.augmentedSystemPrompt).toContain("🍃");
      expect(result.augmentedSystemPrompt).toContain("subgraph");
      expect(result.augmentedSystemPrompt).toContain("PADRÃO OBRIGATÓRIO DE FORMATAÇÃO DE DIAGRAMAS MERMAID");
    });

    it("should augment prompt for UPDATE_DIAGRAM with previous diagram context", () => {
      const messages = [
        {
          role: "assistant",
          content: "```mermaid\nflowchart TD\n  API[API] --> DB[(MySQL)]\n```",
        },
      ];
      const prompt = "mude o banco para PostgreSQL";
      const result = buildRAGAugmentedPrompt({
        prompt,
        messages,
        systemPrompt: "Você é um assistente técnico.",
      });

      expect(result.analysis.operation).toBe("UPDATE_DIAGRAM");
      expect(result.augmentedSystemPrompt).toContain("DIAGRAMA ANTERIOR PARA MODIFICAR");
      expect(result.augmentedSystemPrompt).toContain("DB[(MySQL)]");
      expect(result.augmentedSystemPrompt).toContain("Mermaid COMPLETO atualizado");
    });

    it("should include canvas context when provided", () => {
      const canvasContext = "Elementos no canvas: 3 retângulos, 2 setas, texto 'API Gateway'";
      const result = buildRAGAugmentedPrompt({
        prompt: "crie um diagrama baseado nisso",
        canvasContext,
        systemPrompt: "Assistente de Diagramas",
      });

      expect(result.augmentedSystemPrompt).toContain("[ELEMENTOS ATUAIS NO CANVAS EXCALIDRAW]");
      expect(result.augmentedSystemPrompt).toContain("API Gateway");
    });

    it("should instruct conversational behavior for general chat without forcing diagrams", () => {
      const result = buildRAGAugmentedPrompt({
        prompt: "Qual a diferença entre REST e GraphQL?",
        systemPrompt: "Você é um arquiteto de software.",
      });

      expect(result.analysis.operation).toBe("CONVERSATIONAL_CHAT");
      expect(result.augmentedSystemPrompt).toContain("O usuário está conversando, planejando ou tirando dúvidas conceituais");
      expect(result.augmentedSystemPrompt).toContain("NÃO gere blocos de código Mermaid a menos que o usuário explicitamente peça");
    });
  });
});
