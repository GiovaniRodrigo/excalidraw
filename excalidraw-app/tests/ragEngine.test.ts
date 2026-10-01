import { describe, it, expect } from "vitest";
import {
  classifyPromptIntent,
  retrieveRAGContext,
  generateAntigravityRAGResponse,
} from "../services/llm/ragEngine";
import { generateAntigravityLocalResponse } from "../services/llm/llmService";

describe("RAG Engine & Semantic Intent Classification", () => {
  it("should classify card decomposition and leaf breakdown as DECOMPOSE_REFINE", () => {
    const prompt = "cada card, disfragmente em mais folhas que pertencem ao card";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("DECOMPOSE_REFINE");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("should classify other refinement prompts as DECOMPOSE_REFINE", () => {
    const prompt1 = "quebre os cards em subtarefas detalhadas";
    const prompt2 = "adicione mais detalhes ao diagrama subdividindo em sub-etapas";
    expect(classifyPromptIntent(prompt1).intent).toBe("DECOMPOSE_REFINE");
    expect(classifyPromptIntent(prompt2).intent).toBe("DECOMPOSE_REFINE");
  });

  it("should classify conceptual questions as EXPLANATION_QA", () => {
    const prompt = "o que é event sourcing e qual a diferença para CQRS?";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("EXPLANATION_QA");
  });

  it("should classify explicit diagram generation as CREATE_DIAGRAM", () => {
    const prompt = "crie um diagrama de arquitetura de microsserviços com kafka";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("CREATE_DIAGRAM");
  });

  it("should classify canvas review as CANVAS_ANALYSIS", () => {
    const prompt = "analise este canvas e me dê feedback";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("CANVAS_ANALYSIS");
  });

  it("should generate hierarchical subgraphs and leaves for DECOMPOSE_REFINE instead of dummy decision diamonds", () => {
    const prompt = "cada card, disfragmente em mais folhas que pertencem ao card";
    const ragContext = retrieveRAGContext(prompt);
    const response = generateAntigravityRAGResponse(prompt, ragContext);

    // Verify response contains subgraphs and leaf nodes
    expect(response).toContain("subgraph");
    expect(response).toContain("Folha");
    expect(response).toContain("Desfragmentação Hierárquica");
    // Verify it doesn't have the old naive decision diamond text
    expect(response).not.toContain("Condição Satisfeita?");
    expect(response).not.toContain("Tratamento Alternativo");
  });

  it("should generate clean textual explanations for EXPLANATION_QA without dummy diagrams", () => {
    const prompt = "como funciona a autenticação com JWT e refresh tokens?";
    const ragContext = retrieveRAGContext(prompt);
    const response = generateAntigravityRAGResponse(prompt, ragContext);

    expect(response).toContain("Análise Técnica & Conceitual");
    expect(response).toContain("Boas Práticas");
    expect(response).not.toContain("```mermaid\nflowchart TD\n    Start[\"🚀 Início:");
  });

  it("should work end-to-end via generateAntigravityLocalResponse", () => {
    const prompt = "cada card, disfragmente em mais folhas que pertencem ao card";
    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("subgraph");
    expect(response).toContain("🍃 Folha");
  });
});
