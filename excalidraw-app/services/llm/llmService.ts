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
// Built-in Antigravity Local Generator (Standalone & Offline Fallback)
// ============================================================================

export function generateAntigravityLocalResponse(
  prompt: string,
  agentId?: string,
): string {
  const lower = prompt.toLowerCase();

  if (
    lower.includes("microsservi") ||
    lower.includes("microservice") ||
    lower.includes("kafka") ||
    lower.includes("redis") ||
    lower.includes("escala")
  ) {
    return `### Arquitetura de Microsserviços de Alta Escala (Event-Driven)

Modelagem técnica projetada pelo **Antigravity AI**:

1. **API Gateway & Load Balancer**: Ponto de entrada único com autenticação JWT, rate limiting e terminação SSL.
2. **Microsserviços Desacoplados**: Serviços de Autenticação, Pedidos e Usuários operando de forma independente.
3. **Barramento Kafka**: Stream de eventos assíncrono para garantir resiliência e processamento em lote.
4. **Cache & Persistência Isolada**: Redis para cache in-memory e bancos de dados isolados por serviço.

\`\`\`mermaid
flowchart TD
    Client["🌐 Clientes (Web / Mobile)"] -->|HTTPS| Gateway["🛡️ API Gateway & Load Balancer"]
    
    subgraph CoreServices ["⚙️ Camada de Microsserviços"]
        Gateway --> AuthSvc["🔐 Auth Service"]
        Gateway --> OrderSvc["📦 Order Service"]
        Gateway --> UserSvc["👤 User Service"]
    end
    
    subgraph DataCache ["💾 Cache & Mensageria"]
        OrderSvc -->|Eventos| Kafka["⚡ Apache Kafka Cluster"]
        OrderSvc <-->|Cache| Redis["⚡ Redis In-Memory Cache"]
        UserSvc <-->|Cache| Redis
    end
    
    subgraph Workers ["🔄 Processamento Assíncrono"]
        Kafka --> PaymentWorker["💳 Payment Consumer"]
        Kafka --> NotifWorker["🔔 Notification Consumer"]
    end
    
    subgraph Storage ["🗄️ Persistência Distribuída"]
        AuthSvc --> AuthDB[("🗄️ Auth DB - PostgreSQL")]
        OrderSvc --> OrderDB[("🗄️ Orders DB - PostgreSQL")]
        PaymentWorker --> PayDB[("🗄️ Payments DB")]
        NotifWorker --> NotifDB[("🗄️ Notifications Log")]
    end
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para renderizar e posicionar este diagrama na sua tela!*`;
  }

  if (
    lower.includes("auth") ||
    lower.includes("oauth") ||
    lower.includes("jwt") ||
    lower.includes("login")
  ) {
    return `### Fluxo de Autenticação Segura (OAuth2 + JWT Refresh Token)

Modelagem de autenticação projetada pelo **Antigravity AI**:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Usuário
    participant App as 💻 Frontend (Excalidraw)
    participant Gateway as 🛡️ API Gateway
    participant Auth as 🔐 Auth Provider
    participant Resource as 📦 API de Recursos

    User->>App: Submete credenciais (Login / Senha)
    App->>Gateway: POST /auth/login
    Gateway->>Auth: Valida credenciais e MFA
    Auth-->>Gateway: Retorna Access Token (JWT) + Refresh Token
    Gateway-->>App: Set-Cookie (HttpOnly Refresh) + Bearer Token
    App->>Resource: Requisição autenticada (Header: Bearer JWT)
    Resource-->>App: 200 OK (Dados protegidos)
\`\`\`

> 💡 *Clique no botão abaixo para adicionar este diagrama de sequência diretamente ao seu canvas!*`;
  }

  if (
    lower.includes("checkout") ||
    lower.includes("pagamento") ||
    lower.includes("payment")
  ) {
    return `### Fluxo de Checkout e Gateway de Pagamento

Fluxograma de processamento e liquidação desenhado pelo **Antigravity AI**:

\`\`\`mermaid
flowchart TD
    Start([🛒 Início: Carrinho Finalizado]) --> ValidCart{"Validar Estoque & Cupom?"}
    ValidCart -- Não --> ErrorStock["❌ Erro: Item Esgotado"] --> EndFail([Fim])
    ValidCart -- Sim --> CalcFreight["🚚 Calcular Frete e Prazos"]
    
    CalcFreight --> SelectPay["💳 Escolher Meio de Pagamento"]
    SelectPay --> ProcessPay["⚡ Enviar para Gateway (Stripe/Pix)"]
    
    ProcessPay --> StatusPay{"Status do Pagamento?"}
    StatusPay -- Aprovado --> CreateOrder["✅ Criar Pedido & Reservar Itens"]
    StatusPay -- Recusado --> Retry["⚠️ Tentar outro meio"] --> SelectPay
    StatusPay -- Pendente --> WaitWebhook["⏳ Aguardar Notificação Webhook"]
    
    WaitWebhook --> WebhookCheck{"Webhook Confirmado?"}
    WebhookCheck -- Sim --> CreateOrder
    WebhookCheck -- Não --> CancelOrder["❌ Cancelar Pedido"] --> EndFail
    
    CreateOrder --> NotifyUser["🔔 Enviar Confirmação ao Cliente"] --> EndSuccess([🎉 Sucesso])
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** para desenhar este fluxo no canvas!*`;
  }

  if (
    lower.includes("tdd") ||
    lower.includes("teste") ||
    lower.includes("test")
  ) {
    return `### Ciclo TDD (Test-Driven Development) & Pirâmide de Qualidade

Arquitetura de desenvolvimento orientada a testes pelo **Antigravity AI**:

\`\`\`mermaid
flowchart TD
    subgraph TDD_Cycle ["🔁 Loop TDD (Red-Green-Refactor)"]
        Red["🔴 1. RED: Escreva um teste que falha"] --> Green["🟢 2. GREEN: Escreva o código mínimo para passar"]
        Green --> Refactor["🔵 3. REFACTOR: Melhore o código e design"]
        Refactor --> Red
    end
    
    subgraph Pyramid ["🔺 Pirâmide de Testes"]
        E2E["🏆 E2E Tests (Playwright / Cypress)"]
        Integration["📦 Integration Tests (Seams & APIs)"]
        Unit["⚡ Unit Tests (Rápidos & Isolados)"]
        
        E2E --> Integration
        Integration --> Unit
    end
\`\`\`

> 💡 *Clique no botão abaixo para transferir o diagrama ao canvas!*`;
  }

  if (
    lower.includes("banco") ||
    lower.includes("erd") ||
    lower.includes("database") ||
    lower.includes("tabela") ||
    lower.includes("entidade")
  ) {
    return `### Diagrama Entidade-Relacionamento (ERD)

Modelagem de dados estruturada pelo **Antigravity AI**:

\`\`\`mermaid
erDiagram
    USUARIO ||--o{ PEDIDO : "realiza"
    USUARIO {
        uuid id PK
        string nome
        string email UK
        string senha_hash
        timestamp criado_em
    }
    
    PEDIDO ||--|{ ITEM_PEDIDO : "contém"
    PEDIDO {
        uuid id PK
        uuid usuario_id FK
        string status
        decimal total
        timestamp data_pedido
    }
    
    PRODUTO ||--o{ ITEM_PEDIDO : "pertence_a"
    PRODUTO {
        uuid id PK
        string nome
        decimal preco
        int estoque
    }
    
    ITEM_PEDIDO {
        uuid id PK
        uuid pedido_id FK
        uuid produto_id FK
        int quantidade
        decimal preco_unitario
    }
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** para adicionar o diagrama ERD na sua tela!*`;
  }

  const title = prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
  return `### Análise Técnica & Diagrama de Sistema

Resposta estruturada pelo **Antigravity AI** para: *"${title}"*

\`\`\`mermaid
flowchart TD
    Start["🚀 Início: ${title.replace(/"/g, "'")}"] --> Step1["⚙️ Etapa 1: Análise e Processamento"]
    Step1 --> Decision{"Condição Satisfeita?"}
    
    Decision -- Sim --> Success["✅ Sucesso: Resultado Gerado"]
    Decision -- Não --> Handler["⚠️ Tratamento Alternativo"]
    
    Success --> Storage[("💾 Persistência de Dados")]
    Handler --> Retry["🔄 Reavaliação do Fluxo"]
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para adicionar este diagrama à tela!*`;
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
    // 1. Ollama specific check (can also query /api/tags to list installed models)
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

    // 2. Standard OpenAI-compatible check or other providers
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.customHeaders || {}),
    };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
      headers["x-goog-api-key"] = config.apiKey;
    }

    // Attempt a lightweight test completion
    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl}/chat/completions`;

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

  // Antigravity standalone offline/zero-config fallback
  if (config.provider === "antigravity" && !config.apiKey?.trim()) {
    onStreamCreated?.();
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const generated = generateAntigravityLocalResponse(lastUserMsg);
    const diagram = extractMermaidCode(generated);
    onChunk?.(diagram);
    return {
      generatedResponse: diagram,
      error: null,
    };
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    ...(config.customHeaders || {}),
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers["x-goog-api-key"] = config.apiKey;
  }

  // Format messages with Mermaid System Prompt
  const formattedMessages = [
    {
      role: "system",
      content: config.systemPrompt?.trim() || MERMAID_SYSTEM_PROMPT,
    },
    ...messages.map((m) => ({
      role: m.role || "user",
      content: m.content,
    })),
  ];

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: formattedMessages,
        temperature: config.temperature ?? 0.2,
        stream: true,
      }),
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

          const deltaContent = chunk.choices?.[0]?.delta?.content;
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
// Conversational AI Agent Chat Streaming
// ============================================================================

export async function streamAIChatMessage(props: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  systemPrompt?: string;
  config?: LLMConfig;
  onChunk?: (chunk: string) => void;
  onStreamCreated?: () => void;
  signal?: AbortSignal;
}): Promise<{ content: string; error: Error | null }> {
  const { messages, systemPrompt, onChunk, onStreamCreated, signal } = props;
  const config = props.config || getStoredLLMConfig();

  // If Antigravity provider is active without an API key, use the built-in intelligent generator seamlessly
  if (config.provider === "antigravity" && !config.apiKey?.trim()) {
    onStreamCreated?.();
    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const generated = generateAntigravityLocalResponse(lastUserMsg);

    const chunkSize = 28;
    for (let i = 0; i < generated.length; i += chunkSize) {
      if (signal?.aborted) {
        return {
          content: generated.slice(0, i),
          error: new Error("Geração cancelada pelo usuário"),
        };
      }
      const chunk = generated.slice(i, i + chunkSize);
      onChunk?.(chunk);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    return { content: generated, error: null };
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    ...(config.customHeaders || {}),
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers["x-goog-api-key"] = config.apiKey;
  }

  const formattedMessages: Array<{ role: string; content: string }> = [];
  if (systemPrompt?.trim()) {
    formattedMessages.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const msg of messages) {
    formattedMessages.push({
      role: msg.role || "user",
      content: msg.content,
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: formattedMessages,
        temperature: config.temperature ?? 0.3,
        stream: true,
      }),
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
        errorMsg = `Erro 400: Chave de API ausente ou inválida. Configure sua chave no painel de configurações. (${errorMsg})`;
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
          const delta = chunk.choices?.[0]?.delta?.content;
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

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    ...(config.customHeaders || {}),
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  // Choose appropriate vision model (or fallback to general model)
  const modelToUse = config.visionModel || config.model;

  // Build multimodal prompt
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelToUse,
      messages,
      temperature: 0.2,
      stream: true,
    }),
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

    const deltaContent = chunk.choices?.[0]?.delta?.content;
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
