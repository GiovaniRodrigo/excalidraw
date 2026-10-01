import React, { useState, useEffect, useRef, useCallback } from "react";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/element";
import { getTextFromElements } from "@excalidraw/excalidraw";
import {
  CloseIcon,
  settingsIcon,
  checkIcon,
  TrashIcon,
} from "@excalidraw/excalidraw/components/icons";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { atom, useAtom, useAtomValue, useSetAtom } from "../../app-jotai";
import {
  llmConfigAtom,
  llmSettingsDialogStateAtom,
} from "../LLMSettings/LLMSettingsDialog";
import {
  PROVIDERS_METADATA,
  saveStoredLLMConfig,
  getDefaultConfigForProvider,
} from "../../services/llm/config";
import {
  streamAIChatMessage,
  extractMermaidCode,
  testLLMConnection,
} from "../../services/llm/llmService";

import { AGENT_PERSONAS, DEFAULT_AGENT_ID } from "./agentPersonas";
import type { ChatMessage, AIChatWidgetState } from "./types";
import type {
  LLMConfig,
  LLMProviderType,
  TestConnectionResult,
} from "../../services/llm/types";

import "./AIChatWidget.scss";

export const aiChatWidgetStateAtom = atom<AIChatWidgetState>({
  isOpen: false,
  isMinimized: false,
  activeAgentId: DEFAULT_AGENT_ID,
});

const STORAGE_CHAT_KEY = "excalidraw_ai_chat_history";

export const AIChatWidget: React.FC<{
  excalidrawAPI: ExcalidrawImperativeAPI;
}> = ({ excalidrawAPI }) => {
  const [widgetState, setWidgetState] = useAtom(aiChatWidgetStateAtom);
  const setLlmSettingsDialogState = useSetAtom(llmSettingsDialogStateAtom);
  const [activeLLMConfig, setActiveLLMConfig] = useAtom(llmConfigAtom);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [insertedMessages, setInsertedMessages] = useState<
    Record<string, boolean>
  >({});

  // Inline configuration form state
  const [inlineConfig, setInlineConfig] = useState<LLMConfig>(activeLLMConfig);
  const [inlineTesting, setInlineTesting] = useState(false);
  const [inlineTestResult, setInlineTestResult] =
    useState<TestConnectionResult | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  useEffect(() => {
    setInlineConfig(activeLLMConfig);
  }, [activeLLMConfig]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentAgent =
    AGENT_PERSONAS[widgetState.activeAgentId] ||
    AGENT_PERSONAS[DEFAULT_AGENT_ID];
  const providerMeta =
    PROVIDERS_METADATA[activeLLMConfig.provider] ||
    PROVIDERS_METADATA.antigravity;

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Falha ao salvar histórico do chat de IA:", e);
    }
  }, [messages]);

  // Auto-scroll on new messages or stream chunks
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (widgetState.isOpen && !widgetState.isMinimized) {
      scrollToBottom();
    }
  }, [messages, widgetState.isOpen, widgetState.isMinimized, scrollToBottom]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  };

  // Inline Provider Change
  const handleInlineProviderChange = (provider: LLMProviderType) => {
    const defaults = getDefaultConfigForProvider(provider);
    setInlineConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      visionModel: defaults.visionModel,
      apiKey: provider === prev.provider ? prev.apiKey : "",
    }));
    setInlineTestResult(null);
    setDiscoveredModels([]);
  };

  // Test inline connection
  const handleInlineTestConnection = async () => {
    setInlineTesting(true);
    setInlineTestResult(null);
    try {
      const res = await testLLMConnection(inlineConfig);
      setInlineTestResult(res);
      if (res.availableModels && res.availableModels.length > 0) {
        setDiscoveredModels(res.availableModels);
        if (!res.availableModels.includes(inlineConfig.model)) {
          setInlineConfig((prev) => ({
            ...prev,
            model: res.availableModels![0],
          }));
        }
      }
    } catch (err: any) {
      setInlineTestResult({
        success: false,
        message: err.message || "Falha ao testar conexão",
      });
    } finally {
      setInlineTesting(false);
    }
  };

  // Save inline configuration
  const handleInlineSaveConfig = () => {
    saveStoredLLMConfig(inlineConfig);
    setActiveLLMConfig(inlineConfig);
    setShowConfigDrawer(false);
    setInlineTestResult(null);
    excalidrawAPI.setToast({
      message: `✨ Provedor atualizado para ${
        PROVIDERS_METADATA[inlineConfig.provider]?.name || inlineConfig.provider
      } (${inlineConfig.model})`,
      closable: true,
      duration: 3000,
    });
  };

  // Helper to extract canvas context
  const getCanvasContext = (): string => {
    try {
      const appState = excalidrawAPI.getAppState();
      const sceneElements = excalidrawAPI.getSceneElements();
      const selectedIds = appState.selectedElementIds || {};

      const selectedElements = sceneElements.filter(
        (el: NonDeletedExcalidrawElement) => selectedIds[el.id],
      );

      const targetElements =
        selectedElements.length > 0 ? selectedElements : sceneElements;
      const nonDeleted = targetElements.filter(
        (el: NonDeletedExcalidrawElement) => !el.isDeleted,
      );

      if (nonDeleted.length === 0) {
        return "O canvas está vazio no momento.";
      }

      const typesList = Array.from(
        new Set(nonDeleted.map((el: NonDeletedExcalidrawElement) => el.type)),
      ).join(", ");
      const textSummary = getTextFromElements(nonDeleted);

      let summary = `[Contexto do Canvas Excalidraw - ${
        selectedElements.length > 0 ? "Elementos Selecionados" : "Cena Completa"
      }]\n`;
      summary += `- Total de elementos: ${nonDeleted.length} (${typesList})\n`;
      if (textSummary && textSummary.trim()) {
        summary += `- Textos e anotações no canvas:\n${textSummary}`;
      }
      return summary;
    } catch {
      return "";
    }
  };

  // Insert generated diagram directly onto Excalidraw canvas
  const handleInsertDiagram = async (messageId: string, mermaidCode: string) => {
    try {
      const cleanMermaid = extractMermaidCode(mermaidCode);
      const { elements: mermaidSkeletons } = await parseMermaidToExcalidraw(
        cleanMermaid,
      );

      const newElements = convertToExcalidrawElements(mermaidSkeletons, {
        regenerateIds: true,
      });

      if (!newElements || newElements.length === 0) {
        throw new Error(
          "Nenhum elemento pôde ser convertido a partir do diagrama.",
        );
      }

      const currentElements = excalidrawAPI.getSceneElements();

      // Position new elements cleanly
      let offsetX = 0;
      let offsetY = 0;

      if (currentElements.length > 0) {
        const maxX = Math.max(
          ...currentElements.map((el) => (el.x || 0) + (el.width || 0)),
        );
        offsetX = maxX + 80;
      }

      const positionedElements = newElements.map((el) => ({
        ...el,
        x: (el.x || 0) + offsetX,
        y: (el.y || 0) + offsetY,
      }));

      excalidrawAPI.updateScene({
        elements: [...currentElements, ...positionedElements],
      });

      excalidrawAPI.setViewport({
        target: positionedElements,
        fit: "scale-down",
        animation: true,
      });

      excalidrawAPI.setToast({
        message: "✨ Diagrama inserido no canvas com sucesso!",
        closable: true,
        duration: 3000,
      });

      setInsertedMessages((prev) => ({ ...prev, [messageId]: true }));
    } catch (err: any) {
      console.error("Falha ao inserir diagrama no canvas:", err);
      excalidrawAPI.setToast({
        message: `Não foi possível renderizar o diagrama: ${
          err.message || "Sintaxe Mermaid inválida"
        }`,
        closable: true,
        duration: 4000,
      });
    }
  };

  // Send message and stream AI response
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!content || isGenerating) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const assistantMsgId = `asst_${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      agentId: currentAgent.id,
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage, initialAssistantMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsGenerating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const previousContext = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let fullAccumulated = "";

    try {
      const canvasContext = getCanvasContext();
      const { content: finalContent, error } = await streamAIChatMessage({
        config: activeLLMConfig,
        systemPrompt: currentAgent.systemPrompt,
        canvasContext,
        messages: [...previousContext, { role: "user", content }],
        onChunk: (delta) => {
          fullAccumulated += delta;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: fullAccumulated,
                    hasMermaid:
                      fullAccumulated.includes("```mermaid") ||
                      /flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram/i.test(
                        fullAccumulated,
                      ),
                  }
                : msg,
            ),
          );
        },
        signal: abortController.signal,
      });

      const hasMermaidCode =
        finalContent.includes("```mermaid") ||
        /flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram/i.test(
          finalContent,
        );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: finalContent || fullAccumulated,
                isStreaming: false,
                error: error ? error.message : undefined,
                hasMermaid: hasMermaidCode,
                mermaidCode: hasMermaidCode
                  ? extractMermaidCode(finalContent || fullAccumulated)
                  : undefined,
              }
            : msg,
        ),
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isStreaming: false,
                error: err.message || "Erro durante comunicação com a IA",
              }
            : msg,
        ),
      );
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleAttachCanvasContext = () => {
    const context = getCanvasContext();
    if (!context) {
      return;
    }
    setInputValue((prev) => {
      const prefix = prev ? `${prev}\n\n` : "";
      return `${prefix}${context}\n\n[Pergunta/Instrução]: `;
    });
    setTimeout(() => {
      textareaRef.current?.focus();
      adjustTextareaHeight();
    }, 50);
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_CHAT_KEY);
    setInsertedMessages({});
  };

  const renderFormattedContent = (content: string, msg: ChatMessage) => {
    const cleanContent = content.trim();

    // Check for mermaid blocks
    const mermaidMatch = cleanContent.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
    const mermaidSnippet = mermaidMatch ? mermaidMatch[1].trim() : null;

    return (
      <div className="message-content">
        {cleanContent.split("\n").map((line, idx) => {
          if (line.startsWith("```")) {
            return null; // Handled separately
          }
          if (line.startsWith("# ")) {
            return (
              <h3 key={idx} style={{ margin: "6px 0 4px" }}>
                {line.slice(2)}
              </h3>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h4 key={idx} style={{ margin: "5px 0 3px" }}>
                {line.slice(3)}
              </h4>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return <li key={idx}>{line.slice(2)}</li>;
          }
          if (!line.trim()) {
            return <div key={idx} style={{ height: 6 }} />;
          }
          return <p key={idx}>{line}</p>;
        })}

        {mermaidSnippet && (
          <div className="mermaid-insert-card">
            <div className="card-header">
              <span>
                {cleanContent.includes("Atualizado")
                  ? "🔄 Diagrama Atualizado com Modificações"
                  : cleanContent.includes("Expandido")
                  ? "➕ Diagrama Expandido com Novos Blocos"
                  : cleanContent.includes("Desfragmentação")
                  ? "🌿 Diagrama com Cards e Folhas Desfragmentadas"
                  : "📊 Diagrama Mermaid Pronto para Canvas"}
              </span>
            </div>
            <button
              type="button"
              className={`insert-canvas-btn ${
                insertedMessages[msg.id] ? "inserted" : ""
              }`}
              onClick={() => handleInsertDiagram(msg.id, mermaidSnippet)}
            >
              {insertedMessages[msg.id] ? (
                <>
                  <span style={{ width: 14, height: 14, display: "inline-flex" }}>
                    {checkIcon}
                  </span>
                  <span>Inserido no Canvas</span>
                </>
              ) : (
                <>
                  <span>
                    {cleanContent.includes("Atualizado")
                      ? "🔄 Atualizar no Canvas Excalidraw"
                      : cleanContent.includes("Expandido")
                      ? "➕ Adicionar ao Canvas Excalidraw"
                      : "🎨 Inserir no Canvas Excalidraw"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  // If chat is closed, render floating trigger button
  if (!widgetState.isOpen) {
    return (
      <div className="ai-chat-widget-container">
        <button
          type="button"
          className="ai-chat-trigger-btn"
          onClick={() =>
            setWidgetState((prev) => ({
              ...prev,
              isOpen: true,
              isMinimized: false,
            }))
          }
          title="Abrir Chat de Agentes de IA"
        >
          <span className="trigger-icon">{currentAgent.avatar}</span>
          <span className="trigger-label">Chat Antigravity IA</span>
          <span className="trigger-badge">{providerMeta.name.split(" ")[0]}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`ai-chat-panel ${widgetState.isMinimized ? "minimized" : ""}`}
    >
      {/* Header */}
      <div className="ai-chat-header">
        <div
          className="header-agent-info"
          onClick={() => {
            setShowAgentPicker((prev) => !prev);
            setShowConfigDrawer(false);
          }}
          title="Clique para trocar de Especialista / Persona"
        >
          <div className="header-avatar">{currentAgent.avatar}</div>
          <div className="header-titles">
            <div className="agent-name-row">
              <span className="agent-name">{currentAgent.name}</span>
              <span className="agent-chevron">{showAgentPicker ? "▲" : "▼"}</span>
            </div>
            <button
              type="button"
              className="provider-pill-btn"
              title="Clique para alterar Provedor e Modelo de IA"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfigDrawer((prev) => !prev);
                setShowAgentPicker(false);
              }}
            >
              <span className="status-dot" />
              <span>
                {providerMeta.name.split(" ")[0]} ({activeLLMConfig.model})
              </span>
              <span className="config-hint-icon">⚙️</span>
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`icon-btn ${showConfigDrawer ? "active" : ""}`}
            title="Configurações de IA / Modelo"
            onClick={() => {
              setShowConfigDrawer((prev) => !prev);
              setShowAgentPicker(false);
            }}
          >
            <span style={{ width: 16, height: 16, display: "inline-flex" }}>
              {settingsIcon}
            </span>
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Limpar Histórico"
            onClick={handleClearHistory}
          >
            <span style={{ width: 16, height: 16, display: "inline-flex" }}>
              {TrashIcon}
            </span>
          </button>
          <button
            type="button"
            className="icon-btn"
            title={widgetState.isMinimized ? "Expandir" : "Minimizar"}
            onClick={() =>
              setWidgetState((prev) => ({
                ...prev,
                isMinimized: !prev.isMinimized,
              }))
            }
          >
            {widgetState.isMinimized ? "◻" : "—"}
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Fechar Chat"
            onClick={() =>
              setWidgetState((prev) => ({
                ...prev,
                isOpen: false,
              }))
            }
          >
            <span style={{ width: 16, height: 16, display: "inline-flex" }}>
              {CloseIcon}
            </span>
          </button>
        </div>
      </div>

      {!widgetState.isMinimized && (
        <>
          {/* Inline Quick Model & Provider Configuration Drawer */}
          {showConfigDrawer && (
            <div className="provider-config-drawer">
              <div className="drawer-header">
                <span>⚙️ Configuração de IA / Modelo</span>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setShowConfigDrawer(false)}
                >
                  ✕
                </button>
              </div>

              {/* Provider selector */}
              <div className="config-field">
                <label>Provedor de IA</label>
                <select
                  value={inlineConfig.provider}
                  onChange={(e) =>
                    handleInlineProviderChange(
                      e.target.value as LLMProviderType,
                    )
                  }
                >
                  {Object.values(PROVIDERS_METADATA).map((meta) => (
                    <option key={meta.id} value={meta.id}>
                      {meta.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model selector / input */}
              <div className="config-field">
                <label>Modelo</label>
                <select
                  value={inlineConfig.model}
                  onChange={(e) =>
                    setInlineConfig({ ...inlineConfig, model: e.target.value })
                  }
                >
                  {Array.from(
                    new Set([
                      ...(discoveredModels.length > 0 ? discoveredModels : []),
                      ...(PROVIDERS_METADATA[inlineConfig.provider]?.popularModels || []),
                    ]),
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key if required */}
              {PROVIDERS_METADATA[inlineConfig.provider]?.requiresApiKey && (
                <div className="config-field">
                  <label>
                    <span>Chave de API</span>
                    {PROVIDERS_METADATA[inlineConfig.provider]?.docUrl && (
                      <a
                        href={PROVIDERS_METADATA[inlineConfig.provider].docUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Obter chave gratuita
                      </a>
                    )}
                  </label>
                  <input
                    type="password"
                    value={inlineConfig.apiKey}
                    onChange={(e) =>
                      setInlineConfig({
                        ...inlineConfig,
                        apiKey: e.target.value,
                      })
                    }
                    placeholder={
                      PROVIDERS_METADATA[inlineConfig.provider]
                        ?.apiKeyPlaceholder || "Cole sua chave de API aqui"
                    }
                  />
                </div>
              )}

              {/* Base URL for local providers */}
              {PROVIDERS_METADATA[inlineConfig.provider]?.category ===
                "local" && (
                <div className="config-field">
                  <label>URL Base do Servidor Local</label>
                  <input
                    type="text"
                    value={inlineConfig.baseUrl}
                    onChange={(e) =>
                      setInlineConfig({
                        ...inlineConfig,
                        baseUrl: e.target.value,
                      })
                    }
                    placeholder="http://localhost:11434"
                  />
                </div>
              )}

              {/* Test Connection feedback */}
              {inlineTestResult && (
                <div
                  className={`test-status-msg ${
                    inlineTestResult.success ? "success" : "error"
                  }`}
                >
                  {inlineTestResult.success ? "✅ " : "❌ "}
                  {inlineTestResult.message}
                </div>
              )}

              <div className="config-drawer-actions">
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn-test-inline"
                    onClick={handleInlineTestConnection}
                    disabled={inlineTesting}
                  >
                    {inlineTesting ? "Testando..." : "Testar"}
                  </button>
                  <button
                    type="button"
                    className="btn-test-inline"
                    onClick={() => {
                      setShowConfigDrawer(false);
                      setLlmSettingsDialogState({ isOpen: true });
                    }}
                  >
                    Mais opções...
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-save-inline"
                  onClick={handleInlineSaveConfig}
                >
                  Salvar e Usar
                </button>
              </div>
            </div>
          )}

          {/* Agent Persona Drawer Selector */}
          {showAgentPicker && (
            <div className="agent-selector-drawer">
              {Object.values(AGENT_PERSONAS).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  className={`persona-item ${
                    agent.id === currentAgent.id ? "active" : ""
                  }`}
                  onClick={() => {
                    setWidgetState((prev) => ({
                      ...prev,
                      activeAgentId: agent.id,
                    }));
                    setShowAgentPicker(false);
                  }}
                >
                  <div className="persona-avatar">{agent.avatar}</div>
                  <div className="persona-details">
                    <span className="persona-name">{agent.name}</span>
                    <span className="persona-desc">{agent.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Messages Area */}
          <div className="ai-chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome-state">
                <div className="welcome-avatar">{currentAgent.avatar}</div>
                <div className="welcome-title">{currentAgent.name}</div>
                <div className="welcome-desc">{currentAgent.description}</div>

                <div className="welcome-prompts-title">Sugestões de Prompts</div>
                <div className="prompt-starters-grid">
                  {currentAgent.suggestedPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="prompt-chip"
                      onClick={() => handleSendMessage(item.prompt)}
                    >
                      {item.icon && <span className="chip-icon">{item.icon}</span>}
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-message-item ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <div className="message-meta">
                      <span>
                        {AGENT_PERSONAS[msg.agentId || DEFAULT_AGENT_ID]?.avatar}{" "}
                        {AGENT_PERSONAS[msg.agentId || DEFAULT_AGENT_ID]?.name}
                      </span>
                      <span className="agent-badge-pill">
                        {AGENT_PERSONAS[msg.agentId || DEFAULT_AGENT_ID]?.badge}
                      </span>
                    </div>
                  )}

                  <div className="message-bubble">
                    {msg.content ? (
                      renderFormattedContent(msg.content, msg)
                    ) : msg.isStreaming ? (
                      <span style={{ color: "var(--text-secondary-color)" }}>
                        Pensando
                        <span className="streaming-indicator">
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
                    ) : null}

                    {msg.isStreaming && msg.content && (
                      <span className="streaming-indicator">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}

                    {msg.error && (
                      <div className="error-action-card">
                        <div className="error-text">⚠️ {msg.error}</div>
                        <button
                          type="button"
                          className="error-config-btn"
                          onClick={() => {
                            setShowConfigDrawer(true);
                            setShowAgentPicker(false);
                          }}
                        >
                          ⚙️ Configurar Provedor / Inserir Chave API
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer & Input */}
          <div className="ai-chat-footer">
            <div className="chat-toolbar-row">
              <button
                type="button"
                className="canvas-context-btn"
                onClick={handleAttachCanvasContext}
                title="Anexa elementos selecionados ou o texto do canvas à sua pergunta"
              >
                📎 Anexar Canvas Atual
              </button>

              {isGenerating && (
                <button
                  type="button"
                  className="stop-stream-btn"
                  onClick={handleStopStream}
                >
                  ⏹ Parar
                </button>
              )}
            </div>

            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={`Pergunte ao ${currentAgent.name}... (Enter para enviar)`}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isGenerating}
              />
              <button
                type="button"
                className="send-msg-btn"
                disabled={!inputValue.trim() || isGenerating}
                onClick={() => handleSendMessage()}
                title="Enviar mensagem"
              >
                ➤
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
