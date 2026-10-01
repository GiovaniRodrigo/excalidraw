import {
  exportToBlob,
  getNonDeletedElements,
  getTextFromElements,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import { getDataURL } from "@excalidraw/excalidraw/data/blob";
import { RequestError } from "@excalidraw/excalidraw/errors";
import { safelyParseJSON } from "@excalidraw/common";

import type {
  LLMMessage,
  TTTDDialog,
} from "@excalidraw/excalidraw/components/TTDDialog/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawMagicFrameElement,
  NonDeleted,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { getStoredLLMConfig, PROVIDERS_METADATA } from "./config";
import {
  buildRAGAugmentedPrompt,
  MERMAID_DIAGRAM_STANDARD,
} from "./diagramRAG";

import type { LLMConfig, TestConnectionResult } from "./types";

// ============================================================================
// Prompts
// ============================================================================

export const MERMAID_SYSTEM_PROMPT = `You are an expert software architect and technical diagramming AI assistant for Excalidraw.
Your task is to generate clean, accurate, and syntactically valid Mermaid.js diagrams based on the user's request.

SUPPORTED MERMAID DIAGRAM TYPES:
1. Flowcharts: "flowchart TD" or "flowchart LR"
2. Sequence Diagrams: "sequenceDiagram"
3. Class Diagrams: "classDiagram"
4. Entity Relationship Diagrams: "erDiagram"
5. State Diagrams: "stateDiagram-v2"

CRITICAL SYNTAX RULES:
1. Output ONLY valid Mermaid syntax. Do NOT write conversational text, explanations, or introductory/closing sentences.
2. Avoid markdown wrappers if possible, but if using code blocks, use standard \`\`\`mermaid.
3. In flowcharts, always wrap node text with special characters or spaces in quotes: id["Node Label (details)"] or id("Label with spaces").
4. In sequence diagrams, define participants clearly and use valid arrows (->>, -->>, -x).
5. In ER diagrams, follow exact syntax: ENTITY1 ||--o{ ENTITY2 : "relationship".
6. Keep diagrams clean, well-organized, readable, and directly addressing the user's requirements.`;

export const DIAGRAM_TO_CODE_SYSTEM_PROMPT = `You are an expert frontend engineer and UI/UX designer.
Your task is to convert the provided hand-drawn wireframe or diagram from Excalidraw into a fully responsive, modern, beautiful, and interactive HTML prototype.

GUIDELINES:
1. Output a COMPLETE standalone HTML5 document including <!DOCTYPE html>, <html>, <head>, and <body>.
2. Include Tailwind CSS via CDN in the <head>:
   <script src="https://cdn.tailwindcss.com"></script>
3. Include Lucide Icons or FontAwesome via CDN, or clean inline SVGs for icons.
4. Use modern, professional colors, typography, paddings, shadows, rounded corners, and micro-interactions.
5. Faithfully reflect the components, layout, hierarchy, and text labels present in the wireframe.
6. Add lightweight JavaScript inside <script> tags for realistic interactivity (tabs switching, modals, dropdowns, buttons click feedback).
7. Return ONLY the raw HTML code without markdown code blocks (\`\`\`html) or conversational filler.`;

// ============================================================================
// Helpers & Sanitizers
// ============================================================================

export function extractMermaidCode(rawText: string): string {
  let text = rawText.trim();

  // Strip ```mermaid ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // Find the first occurrence of a valid mermaid diagram type keyword
  const keywords = [
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "erDiagram",
    "stateDiagram-v2",
    "stateDiagram",
    "graph",
    "journey",
    "gantt",
    "pie",
    "gitGraph",
    "architecture-beta",
  ];

  let lowestIndex = -1;

  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1 && (lowestIndex === -1 || idx < lowestIndex)) {
      lowestIndex = idx;
    }
  }

  if (lowestIndex > 0) {
    text = text.substring(lowestIndex).trim();
  }

  return text;
}

export function extractHtmlCode(rawText: string): string {
  let text = rawText.trim();

  // Strip ```html ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // Ensure Tailwind CDN is included if not present
  if (!text.includes("cdn.tailwindcss.com") && text.includes("<head>")) {
    text = text.replace(
      "<head>",
      '<head>\n  <script src="https://cdn.tailwindcss.com"></script>',
    );
  } else if (
    !text.includes("cdn.tailwindcss.com") &&
    !text.includes("<!DOCTYPE html>")
  ) {
    text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excalidraw Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen p-6">
  ${text}
</body>
</html>`;
  }

  return text;
}

// ============================================================================
// SSE Streaming Parser
// ============================================================================

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6).trim();
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function isGeminiProvider(config: LLMConfig): boolean {
  return (
    config.provider === "antigravity" ||
    config.provider === "gemini" ||
    (typeof config.baseUrl === "string" &&
      config.baseUrl.includes("generativelanguage.googleapis.com"))
  );
}

export function resolveEndpointAndHeaders(config: LLMConfig): {
  endpoint: string;
  headers: Record<string, string>;
} {
  let baseUrl = config.baseUrl.replace(/\/+$/, "");

  // Auto-normalize OpenAI-compatible endpoint
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.customHeaders || {}),
  };

  if (config.apiKey?.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`;
  }

  return { endpoint, headers };
}

// ============================================================================
// Connection Tester
// ============================================================================

export async function testLLMConnection(
  configOverride?: LLMConfig,
): Promise<TestConnectionResult> {
  const config = configOverride || getStoredLLMConfig();

  // Validate required API key
  if (
    PROVIDERS_METADATA[config.provider]?.requiresApiKey &&
    !config.apiKey?.trim()
  ) {
    return {
      success: false,
      message: `Chave de API necessária para ${
        PROVIDERS_METADATA[config.provider]?.name || config.provider
      }. Obtenha sua chave gratuita em ${
        PROVIDERS_METADATA[config.provider]?.docUrl || "https://aistudio.google.com"
      }.`,
    };
  }

  try {
    // 1. Ollama specific check
    if (config.provider === "ollama") {
      const baseUrl = config.baseUrl.replace(/\/+$/, "");
      try {
        const tagsRes = await fetch(`${baseUrl}/api/tags`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          const models: string[] = (data.models || []).map(
            (m: any) => m.name || m.model,
          );
          return {
            success: true,
            message: `Conexão bem-sucedida com Ollama! ${
              models.length
            } modelo(s) disponível(is): ${models.slice(0, 5).join(", ")}${
              models.length > 5 ? "..." : ""
            }`,
            availableModels: models,
          };
        }
      } catch (e: any) {
        return {
          success: false,
          message: `Não foi possível conectar ao Ollama em ${baseUrl}. Se estiver rodando localmente, inicie o Ollama com: OLLAMA_ORIGINS="*" ollama serve para permitir requisições do navegador. Detalhes: ${e.message}`,
        };
      }
    }

    // 2. Google Gemini / Antigravity direct native API check
    if (isGeminiProvider(config)) {
      const apiKey = config.apiKey.trim();
      const listEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        apiKey,
      )}`;

      const listResponse = await fetch(listEndpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        let errorMsg = `HTTP ${listResponse.status}: ${listResponse.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch {}

        if (listResponse.status === 400 || listResponse.status === 403) {
          return {
            success: false,
            message: `Chave de API inválida ou sem permissão para Google Gemini (${errorMsg}). Verifique sua chave no Google AI Studio.`,
          };
        }
        return {
          success: false,
          message: `Erro na autenticação com Google Gemini: ${errorMsg}`,
        };
      }

      const listData = await listResponse.json();
      const rawModels: Array<{
        name: string;
        supportedGenerationMethods?: string[];
      }> = listData.models || [];

      // Filter models that support generateContent
      const generateModels = rawModels
        .filter(
          (m) =>
            !m.supportedGenerationMethods ||
            m.supportedGenerationMethods.includes("generateContent"),
        )
        .map((m) => m.name.replace(/^models\//, ""));

      let selectedModel = config.model
        ? config.model.replace(/^models\//, "")
        : "";

      if (!selectedModel || !generateModels.includes(selectedModel)) {
        const preferred = [
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-2.5-flash",
          "gemini-1.5-pro",
          "gemini-2.0-flash-lite-preview-02-05",
        ];
        const found = preferred.find((p) => generateModels.includes(p));
        if (found) {
          selectedModel = found;
        } else if (generateModels.length > 0) {
          selectedModel = generateModels[0];
        }
      }

      return {
        success: true,
        message: `Conexão estabelecida com sucesso com Antigravity / Google Gemini! ${
          generateModels.length
        } modelo(s) disponível(is): ${generateModels.slice(0, 4).join(", ")}${
          generateModels.length > 4 ? "..." : ""
        }`,
        availableModels: generateModels,
      };
    }

    // 3. Standard OpenAI-compatible check for other providers
    const { endpoint, headers } = resolveEndpointAndHeaders(config);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        if (errorText) {
          errorMsg = errorText;
        }
      }

      if (response.status === 400) {
        return {
          success: false,
          message: `Erro 400: Requisição inválida ou chave de API ausente/incorreta no provedor. (${errorMsg})`,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Chave de API inválida ou sem permissão para o modelo "${config.model}". (${errorMsg})`,
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          message: `Erro 404: Endpoint ou modelo "${config.model}" não encontrado no servidor (${endpoint}). Verifique a URL Base nas configurações.`,
        };
      }

      return {
        success: false,
        message: `Erro na conexão: ${errorMsg}`,
      };
    }

    return {
      success: true,
      message: `Conexão estabelecida com sucesso com ${
        PROVIDERS_METADATA[config.provider]?.name || config.provider
      } (modelo: ${config.model})!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha ao conectar com ${config.baseUrl}: ${
        err.message || "Erro de rede/CORS"
      }.`,
    };
  }
}

// ============================================================================
// Text to Diagram Stream Execution
// ============================================================================

export async function streamTextToDiagram(props: {
  config?: LLMConfig;
  messages: readonly LLMMessage[];
  onChunk?: (chunk: string) => void;
  onStreamCreated?: () => void;
  signal?: AbortSignal;
}): Promise<TTTDDialog.OnTextSubmitRetValue> {
  const { messages, onChunk, onStreamCreated, signal } = props;
  const config = props.config || getStoredLLMConfig();

  // If using default backend fallback
  if (config.provider === "default") {
    return streamDefaultBackend(
      config.baseUrl,
      messages,
      onChunk,
      onStreamCreated,
      signal,
    );
  }

  // Check required API key
  if (
    PROVIDERS_METADATA[config.provider]?.requiresApiKey &&
    !config.apiKey?.trim()
  ) {
    return {
      error: new RequestError({
        message: `Chave de API necessária para ${
          PROVIDERS_METADATA[config.provider]?.name || config.provider
        }. Configure sua chave nas opções ou selecione Ollama para uso local.`,
        status: 400,
      }),
    };
  }

  // Format messages with Mermaid System Prompt augmented by RAG
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user" || !m.role)?.content ||
    "";
  const { augmentedSystemPrompt } = buildRAGAugmentedPrompt({
    prompt: lastUserMsg,
    messages: messages.map((m) => ({
      role: m.role || "user",
      content: m.content,
    })),
    systemPrompt: config.systemPrompt?.trim() || MERMAID_SYSTEM_PROMPT,
  });

  let endpoint = "";
  let headers: Record<string, string> = { Accept: "text/event-stream" };
  let bodyJson = "";

  if (isGeminiProvider(config)) {
    const model = config.model || "gemini-2.0-flash";
    const apiKey = config.apiKey?.trim() || "";
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    headers["Content-Type"] = "application/json";

    const contents = messages
      .filter((m) => m.content?.trim())
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: lastUserMsg || "Generate diagram" }],
      });
    }

    bodyJson = JSON.stringify({
      systemInstruction: {
        parts: [{ text: augmentedSystemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.2,
      },
    });
  } else {
    const resolved = resolveEndpointAndHeaders(config);
    endpoint = resolved.endpoint;
    headers = { ...resolved.headers, Accept: "text/event-stream" };
    const formattedMessages = [
      {
        role: "system",
        content: augmentedSystemPrompt,
      },
      ...messages.map((m) => ({
        role: m.role || "user",
        content: m.content,
      })),
    ];
    bodyJson = JSON.stringify({
      model: config.model,
      messages: formattedMessages,
      temperature: config.temperature ?? 0.2,
      stream: true,
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyJson,
      signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          error: new RequestError({
            message:
              "Limite de requisições excedido. Tente novamente mais tarde.",
            status: 429,
          }),
        };
      }

      const text = await response.text();
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        if (text) {
          errorMsg = text;
        }
      }

      throw new RequestError({
        message: errorMsg,
        status: response.status,
      });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new RequestError({
        message: "Não foi possível obter o stream de resposta do servidor",
        status: 500,
      });
    }

    onStreamCreated?.();

    let fullResponse = "";
    let streamError: RequestError | null = null;

    try {
      for await (const data of parseSSEStream(reader)) {
        if (data === "[DONE]") {
          break;
        }

        try {
          const chunk = safelyParseJSON(data);
          if (!chunk) {
            continue;
          }

          if (chunk.error) {
            streamError = new RequestError({
              message: chunk.error.message || "Erro durante streaming",
              status: 500,
            });
            break;
          }

          const deltaContent =
            chunk.choices?.[0]?.delta?.content ??
            chunk.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || "")
              .join("") ??
            "";
          if (deltaContent) {
            fullResponse += deltaContent;
            onChunk?.(deltaContent);
          }
        } catch (e) {
          console.warn("Falha ao analisar fragmento SSE:", data, e);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          error: new RequestError({
            message: "Requisição cancelada",
            status: 499,
          }),
        };
      }
      streamError = new RequestError({
        message: err.message || "Erro no fluxo de resposta",
        status: 500,
      });
    }

    if (streamError) {
      return { error: streamError };
    }

    if (!fullResponse.trim()) {
      return {
        error: new RequestError({
          message: "O modelo retornou uma resposta vazia",
          status: 500,
        }),
      };
    }

    const sanitizedDiagram = extractMermaidCode(fullResponse);

    return {
      generatedResponse: sanitizedDiagram,
      error: null,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return {
        error: new RequestError({
          message: "Requisição cancelada",
          status: 499,
        }),
      };
    }

    return {
      error: new RequestError({
        message:
          config.provider === "ollama" && err.message?.includes("fetch")
            ? `Erro ao conectar com Ollama em ${config.baseUrl}. Certifique-se de que o Ollama está rodando com OLLAMA_ORIGINS="*" ollama serve`
            : err.message || "Falha na conexão com o provedor de IA",
        status: 500,
      }),
    };
  }
}

// ============================================================================
// Conversational AI Agent Chat Streaming (Direct LLM Connection)
// ============================================================================

export async function streamAIChatMessage(props: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  systemPrompt?: string;
  config?: LLMConfig;
  canvasContext?: string;
  onChunk?: (chunk: string) => void;
  onStreamCreated?: () => void;
  signal?: AbortSignal;
}): Promise<{ content: string; error: Error | null }> {
  const {
    messages,
    systemPrompt,
    canvasContext,
    onChunk,
    onStreamCreated,
    signal,
  } = props;
  const config = props.config || getStoredLLMConfig();

  // Validate required API key
  if (
    PROVIDERS_METADATA[config.provider]?.requiresApiKey &&
    !config.apiKey?.trim()
  ) {
    return {
      content: "",
      error: new Error(
        `Chave de API necessária para ${
          PROVIDERS_METADATA[config.provider]?.name || config.provider
        }. Clique em "⚙️ Configurar Provedor" para inserir sua chave ou selecione Ollama para execução local sem chave.`,
      ),
    };
  }

  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user" || !m.role)?.content ||
    "";

  const { augmentedSystemPrompt } = buildRAGAugmentedPrompt({
    prompt: lastUserMsg,
    messages: messages.map((m) => ({
      role: m.role || "user",
      content: m.content,
    })),
    systemPrompt: systemPrompt || config.systemPrompt,
    canvasContext,
  });

  let endpoint = "";
  let headers: Record<string, string> = { Accept: "text/event-stream" };
  let bodyJson = "";

  if (isGeminiProvider(config)) {
    const model = config.model || "gemini-2.0-flash";
    const apiKey = config.apiKey?.trim() || "";
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    headers["Content-Type"] = "application/json";

    const contents = messages
      .filter((m) => m.role !== "system" && m.content?.trim())
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: lastUserMsg || "Hello" }],
      });
    }

    bodyJson = JSON.stringify({
      systemInstruction: {
        parts: [{ text: augmentedSystemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: config.temperature ?? 0.3,
      },
    });
  } else {
    const resolved = resolveEndpointAndHeaders(config);
    endpoint = resolved.endpoint;
    headers = { ...resolved.headers, Accept: "text/event-stream" };
    const formattedMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: augmentedSystemPrompt },
      ...messages.map((m) => ({
        role: m.role || "user",
        content: m.content,
      })),
    ];
    bodyJson = JSON.stringify({
      model: config.model,
      messages: formattedMessages,
      temperature: config.temperature ?? 0.3,
      stream: true,
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyJson,
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        if (text) {
          errorMsg = text;
        }
      }

      if (response.status === 400) {
        errorMsg = `Erro 400: Chave de API ausente ou inválida. (${errorMsg})`;
      } else if (response.status === 401 || response.status === 403) {
        errorMsg = `Chave de API inválida ou sem permissão para o modelo "${config.model}". (${errorMsg})`;
      }

      return {
        content: "",
        error: new Error(errorMsg),
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return {
        content: "",
        error: new Error("Não foi possível ler o stream da resposta"),
      };
    }

    onStreamCreated?.();

    let fullResponse = "";
    try {
      for await (const data of parseSSEStream(reader)) {
        if (data === "[DONE]") {
          break;
        }

        try {
          const chunk = safelyParseJSON(data);
          if (!chunk) {
            continue;
          }
          if (chunk.error) {
            return {
              content: fullResponse,
              error: new Error(chunk.error.message || "Erro no streaming"),
            };
          }
          const delta =
            chunk.choices?.[0]?.delta?.content ??
            chunk.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || "")
              .join("") ??
            "";
          if (delta) {
            fullResponse += delta;
            onChunk?.(delta);
          }
        } catch {}
      }
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        return {
          content: fullResponse,
          error: new Error("Geração cancelada pelo usuário"),
        };
      }
      return {
        content: fullResponse,
        error: err,
      };
    }

    return {
      content: fullResponse,
      error: null,
    };
  } catch (err: any) {
    if (err.name === "AbortError" || signal?.aborted) {
      return {
        content: "",
        error: new Error("Geração cancelada pelo usuário"),
      };
    }
    return {
      content: "",
      error: new Error(
        config.provider === "ollama" && err.message?.includes("fetch")
          ? `Erro ao conectar com Ollama em ${config.baseUrl}. Verifique se está executando: OLLAMA_ORIGINS="*" ollama serve`
          : err.message || "Falha na conexão com o modelo de IA",
      ),
    };
  }
}

// Fallback to default Excalidraw backend if selected
async function streamDefaultBackend(
  backendUrl: string,
  messages: readonly LLMMessage[],
  onChunk?: (chunk: string) => void,
  onStreamCreated?: () => void,
  signal?: AbortSignal,
): Promise<TTTDDialog.OnTextSubmitRetValue> {
  const url = `${backendUrl.replace(
    /\/+$/,
    "",
  )}/v1/ai/text-to-diagram/chat-streaming`;

  try {
    let fullResponse = "";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        error: new RequestError({
          message: text || `HTTP ${response.status}`,
          status: response.status,
        }),
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return {
        error: new RequestError({
          message: "Could not read response body",
          status: 500,
        }),
      };
    }

    onStreamCreated?.();

    for await (const data of parseSSEStream(reader)) {
      if (data === "[DONE]") {
        break;
      }
      const chunk = safelyParseJSON(data);
      if (chunk?.type === "content" && chunk.delta) {
        fullResponse += chunk.delta;
        onChunk?.(chunk.delta);
      }
    }

    return {
      generatedResponse: extractMermaidCode(fullResponse),
      error: null,
    };
  } catch (err: any) {
    return {
      error: new RequestError({
        message: err.message || "Falha no backend padrão",
        status: 500,
      }),
    };
  }
}

// ============================================================================
// Diagram to Code (Magic Frame) Generation
// ============================================================================

export async function generateDiagramToCode(props: {
  frame: NonDeleted<ExcalidrawMagicFrameElement>;
  children: readonly NonDeletedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  onPartial?: (html: string) => void;
  config?: LLMConfig;
  signal?: AbortSignal;
}): Promise<{ html: string }> {
  const { frame, children, appState, files, onPartial, signal } = props;
  const config = props.config || getStoredLLMConfig();

  // Export frame + elements to JPEG data URL
  const blob = await exportToBlob({
    elements: getNonDeletedElements(children),
    appState: {
      ...appState,
      exportBackground: true,
      viewBackgroundColor: appState.viewBackgroundColor,
    },
    exportingFrame: frame,
    files,
    mimeType: MIME_TYPES.jpg,
  });

  const dataURL = await getDataURL(blob);
  const textFromFrameChildren = getTextFromElements(children);

  // If using default backend fallback
  if (config.provider === "default") {
    return generateDiagramToCodeDefaultBackend(
      config.baseUrl,
      textFromFrameChildren,
      dataURL,
      appState.theme,
      onPartial,
    );
  }

  let endpoint = "";
  let headers: Record<string, string> = { Accept: "text/event-stream" };
  let bodyJson = "";

  if (isGeminiProvider(config)) {
    const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, "");
    const mimeType =
      dataURL.match(/^data:(image\/[a-z]+);base64,/)?.[1] || "image/jpeg";
    const modelToUse = config.visionModel || config.model || "gemini-2.0-flash";
    const apiKey = config.apiKey?.trim() || "";
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelToUse,
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
    headers["Content-Type"] = "application/json";

    const promptText = `Convert this hand-drawn Excalidraw wireframe/diagram into clean, modern, interactive, and responsive HTML/Tailwind CSS code.
Extracted text labels found in the drawing:
${
  textFromFrameChildren.trim()
    ? textFromFrameChildren
    : "(No raw text elements detected, follow the visual labels)"
}
Current theme: ${appState.theme}`;

    bodyJson = JSON.stringify({
      systemInstruction: {
        parts: [{ text: DIAGRAM_TO_CODE_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    });
  } else {
    const resolved = resolveEndpointAndHeaders(config);
    endpoint = resolved.endpoint;
    headers = { ...resolved.headers, Accept: "text/event-stream" };
    const modelToUse = config.visionModel || config.model;

    const userContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [
      {
        type: "text",
        text: `Convert this hand-drawn Excalidraw wireframe/diagram into clean, modern, interactive, and responsive HTML/Tailwind CSS code.
Extracted text labels found in the drawing:
${
  textFromFrameChildren.trim()
    ? textFromFrameChildren
    : "(No raw text elements detected, follow the visual labels)"
}
Current theme: ${appState.theme}`,
      },
      {
        type: "image_url",
        image_url: {
          url: dataURL,
        },
      },
    ];

    const messages = [
      {
        role: "system",
        content: DIAGRAM_TO_CODE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userContent,
      },
    ];

    bodyJson = JSON.stringify({
      model: modelToUse,
      messages,
      temperature: 0.2,
      stream: true,
    });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: bodyJson,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Erro ${response.status}: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      if (errorText) {
        errorMsg = errorText;
      }
    }
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(
      "Não foi possível inicializar o leitor de resposta do modelo",
    );
  }

  let accumulatedHtml = "";

  for await (const data of parseSSEStream(reader)) {
    if (data === "[DONE]") {
      break;
    }

    const chunk = safelyParseJSON(data);
    if (!chunk) {
      continue;
    }

    if (chunk.error) {
      throw new Error(chunk.error.message || "Erro na geração do código");
    }

    const deltaContent =
      chunk.choices?.[0]?.delta?.content ??
      chunk.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("") ??
      "";
    if (deltaContent) {
      accumulatedHtml += deltaContent;
      onPartial?.(accumulatedHtml);
    }
  }

  if (!accumulatedHtml.trim()) {
    throw new Error("O modelo não retornou código HTML válido");
  }

  const finalHtml = extractHtmlCode(accumulatedHtml);
  return { html: finalHtml };
}

async function generateDiagramToCodeDefaultBackend(
  backendUrl: string,
  texts: string,
  image: string,
  theme: string,
  onPartial?: (html: string) => void,
): Promise<{ html: string }> {
  const response = await fetch(
    `${backendUrl.replace(
      /\/+$/,
      "",
    )}/v1/ai/diagram-to-code/generate-streaming`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts,
        image,
        theme,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    const errorJSON = safelyParseJSON(text);
    throw new Error(errorJSON?.message || text || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Generation failed (invalid response body)");
  }

  let html = "";
  for await (const data of parseSSEStream(reader)) {
    if (data === "[DONE]") {
      break;
    }
    const chunk = safelyParseJSON(data);
    if (chunk?.type === "content" && chunk.delta) {
      html += chunk.delta;
      onPartial?.(html);
    }
  }

  return { html: extractHtmlCode(html) };
}
