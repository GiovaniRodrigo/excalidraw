import { describe, it, expect } from "vitest";
import {
  classifyPromptIntent,
  retrieveRAGContext,
  generateAntigravityRAGResponse,
} from "../services/llm/ragEngine";
import { generateAntigravityLocalResponse } from "../services/llm/llmService";

describe("RAG Engine & Semantic Intent Classification", () => {
  it("should classify natural conversation as CONVERSATIONAL_CHAT without forcing diagrams", () => {
    const prompt1 = "Olá, vamos planejar a arquitetura de um novo projeto de telemedicina?";
    const result1 = classifyPromptIntent(prompt1);
    expect(result1.intent).toBe("CONVERSATIONAL_CHAT");

    const response = generateAntigravityLocalResponse(prompt1);
    expect(response).toContain("Antigravity AI — Discussão e Planejamento");
    expect(response).not.toContain("```mermaid");
  });

  it("should classify requests to start a new diagram as CREATE_DIAGRAM", () => {
    const prompt = "desenhe o diagrama de arquitetura de microsserviços com kafka";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("CREATE_DIAGRAM");

    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("```mermaid");
  });

  it("should classify diagram modification requests as UPDATE_DIAGRAM", () => {
    const prompt = "altere o diagrama trocando o banco para PostgreSQL e adicionando Redis";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("UPDATE_DIAGRAM");

    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("Diagrama Atualizado com Modificações");
    expect(response).toContain("```mermaid");
  });

  it("should classify additive requests as EXTEND_DIAGRAM", () => {
    const prompt = "adicione ao diagrama uma camada de mensageria com workers de notificação";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("EXTEND_DIAGRAM");

    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("Diagrama Expandido com Novos Componentes");
    expect(response).toContain("```mermaid");
  });

  it("should classify card decomposition as DECOMPOSE_REFINE with subgraphs and leaves", () => {
    const prompt = "cada card, disfragmente em mais folhas que pertencem ao card";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("DECOMPOSE_REFINE");

    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("subgraph");
    expect(response).toContain("🍃 Folha");
    expect(response).not.toContain("Condição Satisfeita?");
  });

  it("should classify conceptual questions as EXPLANATION_QA", () => {
    const prompt = "o que é event sourcing e qual a diferença para CQRS?";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("EXPLANATION_QA");

    const response = generateAntigravityLocalResponse(prompt);
    expect(response).toContain("Análise Técnica & Conceitual");
    expect(response).not.toContain("```mermaid");
  });

  it("should classify canvas review as CANVAS_ANALYSIS", () => {
    const prompt = "analise este canvas e me dê feedback";
    const result = classifyPromptIntent(prompt);
    expect(result.intent).toBe("CANVAS_ANALYSIS");
  });
});
