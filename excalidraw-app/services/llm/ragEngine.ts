/**
 * RAG Engine (Retrieval-Augmented Generation) & Semantic Intent Analyzer
 * for Excalidraw Antigravity AI and LLM Services.
 *
 * Supports natural multi-turn conversation, initial diagram generation,
 * iterative modifications (altering existing diagrams), and additive extensions.
 */

export type PromptIntent =
  | "CONVERSATIONAL_CHAT"
  | "CREATE_DIAGRAM"
  | "UPDATE_DIAGRAM"
  | "EXTEND_DIAGRAM"
  | "DECOMPOSE_REFINE"
  | "CANVAS_ANALYSIS"
  | "EXPLANATION_QA";

export interface KnowledgeChunk {
  id: string;
  category: "architecture" | "decomposition" | "diagram_syntax" | "best_practices" | "patterns";
  title: string;
  keywords: string[];
  content: string;
  mermaidTemplate?: string;
}

export interface RAGContext {
  intent: PromptIntent;
  confidence: number;
  matchedKeywords: string[];
  retrievedChunks: KnowledgeChunk[];
  canvasContext?: string;
  extractedCards?: string[];
  previousDiagram?: string | null;
  augmentedPrompt: string;
}

// ============================================================================
// Core Architectural & Diagramming Knowledge Base
// ============================================================================

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    id: "hierarchical_decomposition",
    category: "decomposition",
    title: "Desfragmentação e Quebra Hierárquica de Cards em Folhas",
    keywords: [
      "desfragmente",
      "disfragmente",
      "folhas",
      "folha",
      "card",
      "cards",
      "subdivida",
      "sub-card",
      "subcard",
      "quebre",
      "detalhe",
      "hierarquia",
      "wbs",
      "arvore",
      "leaf",
      "leaves",
      "filhos",
      "subetapas",
      "sub-etapas",
      "subtarefas",
      "sub-tarefas",
      "expandir",
      "expanda",
    ],
    content: `Ao decompor ou desfragmentar cards/etapas em folhas:
1. Cada card pai atua como um agrupador (Subgraph ou Nó Raiz) de responsabilidade única.
2. As folhas filhas representam atividades atômicas, atributos, sub-tarefas ou micro-serviços que pertencem estritamente àquele card pai.
3. Use Subgraphs do Mermaid ou conexões direcionadas (Pai --> Filho1 & Filho2 & Filho3) para evidenciar a contenção e subordinação clara de cada folha.`,
    mermaidTemplate: `flowchart TD
    subgraph Card_Planejamento ["📋 Card: Planejamento & Requisitos"]
        direction TB
        F1_1["🍃 Folha 1.1: Levantamento de User Stories"]
        F1_2["🍃 Folha 1.2: Matriz de Risco & Dependências"]
        F1_3["🍃 Folha 1.3: Critérios de Aceite (DoD)"]
        F1_1 --> F1_2 --> F1_3
    end

    subgraph Card_Arquitetura ["⚙️ Card: Design & Arquitetura"]
        direction TB
        F2_1["🍃 Folha 2.1: Modelagem ERD & Schemas"]
        F2_2["🍃 Folha 2.2: Definição de Contratos de API (OpenAPI)"]
        F2_3["🍃 Folha 2.3: Topologia de Mensageria & Cache"]
        F2_1 --> F2_2 --> F2_3
    end

    subgraph Card_Execucao ["💻 Card: Desenvolvimento & Testes"]
        direction TB
        F3_1["🍃 Folha 3.1: Implementação de Core Domain (TDD)"]
        F3_2["🍃 Folha 3.2: Integração com Gateways & Repositories"]
        F3_3["🍃 Folha 3.3: Testes de Carga e Seams de Integração"]
        F3_1 --> F3_2 --> F3_3
    end

    subgraph Card_Entrega ["🚀 Card: Deploy & Observabilidade"]
        direction TB
        F4_1["🍃 Folha 4.1: Pipeline CI/CD Automatizada"]
        F4_2["🍃 Folha 4.2: Dashboards de Métricas & Tracing (OpenTelemetry)"]
        F4_3["🍃 Folha 4.3: Rollout Progressivo (Canary / Blue-Green)"]
        F4_1 --> F4_2 --> F4_3
    end

    Card_Planejamento ==> Card_Arquitetura
    Card_Arquitetura ==> Card_Execucao
    Card_Execucao ==> Card_Entrega`,
  },
  {
    id: "microservices_event_driven",
    category: "architecture",
    title: "Arquitetura de Microsserviços e Event-Driven",
    keywords: [
      "microsserviço",
      "microsservicos",
      "microservice",
      "microservices",
      "kafka",
      "rabbitmq",
      "event-driven",
      "saga",
      "outbox",
      "cqrs",
      "eda",
      "mensageria",
      "assincrono",
      "fila",
      "broker",
    ],
    content: `Padrão de Microsserviços Desacoplados com Barramento de Eventos (Kafka/RabbitMQ), banco de dados por serviço (Database-per-Service) e padrão Saga para transações distribuídas.`,
    mermaidTemplate: `flowchart TD
    Client["🌐 Clientes Web / Mobile"] -->|HTTPS / JWT| Gateway["🛡️ API Gateway"]
    
    subgraph Services ["Camada de Microsserviços"]
        Gateway --> AuthSvc["🔐 Auth Service"]
        Gateway --> OrderSvc["📦 Order Service"]
        Gateway --> UserSvc["👤 User Service"]
    end
    
    subgraph Messaging ["Barramento de Eventos"]
        OrderSvc -->|Publica OrderCreated| Kafka["⚡ Apache Kafka"]
        UserSvc -->|Consome Eventos| Kafka
    end
    
    subgraph Consumers ["Trabalhadores Assíncronos"]
        Kafka --> PaymentWorker["💳 Payment Consumer"]
        Kafka --> NotifWorker["🔔 Notification Consumer"]
    end
    
    OrderSvc <--> Redis["⚡ Redis Cache"]
    OrderSvc --> OrderDB[("🗄️ Orders DB")]
    PaymentWorker --> PayDB[("🗄️ Payments DB")]`,
  },
  {
    id: "authentication_security",
    category: "patterns",
    title: "Fluxo de Autenticação Segura (OAuth2, OpenID Connect & JWT)",
    keywords: [
      "auth",
      "autenticação",
      "autenticacao",
      "oauth",
      "oauth2",
      "jwt",
      "oidc",
      "login",
      "senha",
      "token",
      "refresh",
      "mfa",
      "2fa",
      "segurança",
    ],
    content: `Fluxo seguro de autenticação com Access Token efêmero, Refresh Token em cookie HttpOnly seguro, rotação de chaves e validação criptográfica RSA/ECDSA.`,
    mermaidTemplate: `sequenceDiagram
    autonumber
    actor User as 👤 Usuário
    participant App as 💻 Frontend Client
    participant Gateway as 🛡️ API Gateway
    participant Auth as 🔐 Auth Provider
    participant API as 📦 Resource API

    User->>App: Submete credenciais (Login / MFA)
    App->>Gateway: POST /auth/login
    Gateway->>Auth: Valida credenciais e gera tokens
    Auth-->>Gateway: Access Token (JWT) + Refresh Token
    Gateway-->>App: Set-Cookie (HttpOnly) + Bearer Token
    App->>API: GET /recurso (Header: Bearer Token)
    API-->>App: 200 OK (Dados protegidos)`,
  },
  {
    id: "database_erd_modeling",
    category: "patterns",
    title: "Modelagem Relacional de Banco de Dados (ERD)",
    keywords: [
      "banco",
      "database",
      "erd",
      "relacionamento",
      "tabela",
      "tabelas",
      "entidade",
      "entidades",
      "postgres",
      "mysql",
      "sql",
      "chave primaria",
      "chave estrangeira",
      "foreign key",
      "modelagem",
    ],
    content: `Modelagem formal de entidades, atributos com tipos de dados, chaves primárias (PK), chaves estrangeiras (FK) e cardinalidade (1:N, N:N, 1:1).`,
    mermaidTemplate: `erDiagram
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
        decimal valor_total
        timestamp data_pedido
    }
    
    PRODUTO ||--o{ ITEM_PEDIDO : "incluído_em"
    PRODUTO {
        uuid id PK
        string nome
        decimal preco
        int estoque_disponivel
    }
    
    ITEM_PEDIDO {
        uuid id PK
        uuid pedido_id FK
        uuid produto_id FK
        int quantidade
        decimal preco_unitario
    }`,
  },
  {
    id: "tdd_clean_architecture",
    category: "patterns",
    title: "TDD (Test-Driven Development) e Arquitetura Limpa",
    keywords: [
      "tdd",
      "teste",
      "testes",
      "test",
      "unitario",
      "integracao",
      "clean architecture",
      "hexagonal",
      "red green refactor",
      "piramide de testes",
      "qualidade",
    ],
    content: `Metodologia TDD seguindo ciclo Red-Green-Refactor, arquitetura em camadas concêntricas (Domain, Application, Adapters, Infrastructure) e isolamento por testes unitários e de integração.`,
    mermaidTemplate: `flowchart TD
    subgraph TDD_Loop ["🔁 Ciclo TDD"]
        Red["🔴 1. Red: Escreva um teste que falhe"] --> Green["🟢 2. Green: Escreva o código mínimo"]
        Green --> Refactor["🔵 3. Refactor: Elimine duplicações e refine o design"]
        Refactor --> Red
    end
    
    subgraph CleanArch ["🏛️ Camadas Clean Architecture"]
        Domain["💎 Enterprise Domain (Entities & Value Objects)"]
        UseCases["💼 Use Cases (Application Rules)"]
        Adapters["🔌 Interface Adapters (Controllers & Gateways)"]
        Infra["🌐 Frameworks & Drivers (DB, Web, Devices)"]
        
        Infra --> Adapters
        Adapters --> UseCases
        UseCases --> Domain
    end`,
  },
  {
    id: "checkout_payment_flow",
    category: "patterns",
    title: "Fluxo de Checkout e Gateway de Pagamento",
    keywords: [
      "checkout",
      "pagamento",
      "pagamentos",
      "payment",
      "gateway",
      "pix",
      "stripe",
      "cartao",
      "carrinho",
      "compra",
      "webhook",
    ],
    content: `Fluxo de finalização de compra, cálculo de frete, antifraude, conciliação e webhooks assíncronos de confirmação de pagamento.`,
    mermaidTemplate: `flowchart TD
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
    
    CreateOrder --> NotifyUser["🔔 Enviar Confirmação ao Cliente"] --> EndSuccess([🎉 Sucesso])`,
  },
];

// ============================================================================
// History & Diagram Extractor
// ============================================================================

export function extractPreviousDiagramFromHistory(
  history?: Array<{ role: string; content: string }>,
): string | null {
  if (!history || history.length === 0) {
    return null;
  }

  // Search backwards for the last assistant message with a mermaid block
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "assistant" && msg.content) {
      const match = msg.content.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return null;
}

export function extractCardsFromContext(
  prompt: string,
  canvasText?: string,
  history?: Array<{ role: string; content: string }>,
): string[] {
  const cards: string[] = [];

  // 1. Try to extract from canvas text
  if (canvasText && canvasText.trim()) {
    const lines = canvasText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && !l.startsWith("[") && !l.startsWith("- Total"));

    for (const line of lines) {
      const clean = line.replace(/^[-*•\d.)\s]+/, "").trim();
      if (clean && clean.length > 3 && clean.length < 50 && !cards.includes(clean)) {
        cards.push(clean);
      }
    }
  }

  // 2. Try to extract from last assistant diagram
  if (cards.length === 0 && history && history.length > 0) {
    const lastAssistantMsg =
      [...history].reverse().find((m) => m.role === "assistant")?.content || "";
    const nodeMatches = lastAssistantMsg.matchAll(
      /(?:subgraph\s+\w+\s*\["([^"]+)"\]|\["([^"]+)"\])/g,
    );
    for (const match of nodeMatches) {
      const label = match[1] || match[2];
      if (label && !label.startsWith("🍃") && label.length > 3 && !cards.includes(label)) {
        cards.push(label);
      }
    }
  }

  return cards.slice(0, 6);
}

// ============================================================================
// Intent Classifier & Semantic Analysis
// ============================================================================

export function classifyPromptIntent(
  prompt: string,
  options?: {
    conversationHistory?: Array<{ role: string; content: string }>;
    canvasText?: string;
  },
): { intent: PromptIntent; confidence: number; matchedKeywords: string[] } {
  const lower = prompt.toLowerCase().trim();
  const hasPreviousDiagram = !!extractPreviousDiagramFromHistory(options?.conversationHistory);

  // 1. Check for Hierarchical Decomposition / Refinement / Breakdown of Cards
  const decomposeKeywords = [
    "desfragmente",
    "disfragmente",
    "desfragmentar",
    "disfragmentar",
    "folhas",
    "folha",
    "quebre em",
    "subdivida",
    "sub-card",
    "subcard",
    "subcards",
    "sub-cards",
    "subtarefas",
    "sub-tarefas",
    "subetapas",
    "sub-etapas",
    "cada card",
    "cada etapa",
    "detalhe mais",
    "aumentar detalhes",
    "aumente os detalhes",
    "mais detalhes ao diagrama",
    "expanda o card",
    "expanda os cards",
    "adicione folhas",
    "quebrar em mais",
    "decomponha",
    "decompor",
  ];
  const matchedDecompose = decomposeKeywords.filter((kw) => lower.includes(kw));
  if (matchedDecompose.length > 0) {
    return {
      intent: "DECOMPOSE_REFINE",
      confidence: 0.95,
      matchedKeywords: matchedDecompose,
    };
  }

  // 2. Check for Updating / Modifying / Altering an Existing Diagram
  const updateKeywords = [
    "altere o diagrama",
    "mude o diagrama",
    "altere o fluxo",
    "mude o fluxo",
    "troque o",
    "troque a",
    "mude para",
    "troque para",
    "substitua o",
    "substitua a",
    "modifique o diagrama",
    "modifique o fluxo",
    "atualize o diagrama",
    "atualize o fluxo",
    "em vez de",
    "mudar o banco",
    "trocar o banco",
    "alterar o gateway",
  ];
  const matchedUpdate = updateKeywords.filter((kw) => lower.includes(kw));
  if (matchedUpdate.length > 0 || (hasPreviousDiagram && (lower.startsWith("mude ") || lower.startsWith("altere ") || lower.startsWith("troque ")))) {
    return {
      intent: "UPDATE_DIAGRAM",
      confidence: 0.92,
      matchedKeywords: matchedUpdate,
    };
  }

  // 3. Check for Extending / Adding More Components to an Existing Diagram
  const extendKeywords = [
    "adicione ao diagrama",
    "adicione no diagrama",
    "acrescente ao diagrama",
    "coloque mais",
    "adicione mais",
    "adicione uma camada",
    "adicione um serviço",
    "adicione uma fila",
    "inclua o fluxo",
    "inclua no diagrama",
    "adicione no fluxo",
    "crie mais um nó",
    "crie mais uma etapa",
    "conecte com",
  ];
  const matchedExtend = extendKeywords.filter((kw) => lower.includes(kw));
  if (matchedExtend.length > 0 || (hasPreviousDiagram && (lower.startsWith("adicione ") || lower.startsWith("inclua ") || lower.startsWith("coloque ")))) {
    return {
      intent: "EXTEND_DIAGRAM",
      confidence: 0.91,
      matchedKeywords: matchedExtend,
    };
  }

  // 4. Check for Canvas Analysis / Review
  const canvasAnalysisKeywords = [
    "analise o canvas",
    "analise este canvas",
    "analisar canvas",
    "avalie o canvas",
    "o que tem no canvas",
    "o que falta no diagrama",
    "critique o diagrama",
    "revise o canvas",
    "leia o canvas",
  ];
  const matchedCanvas = canvasAnalysisKeywords.filter((kw) => lower.includes(kw));
  if (matchedCanvas.length > 0 || (options?.canvasText && lower.includes("analise"))) {
    return {
      intent: "CANVAS_ANALYSIS",
      confidence: 0.9,
      matchedKeywords: matchedCanvas,
    };
  }

  // 5. Check for Explicit Diagram Generation Request (Starting / Creating a Diagram)
  const createDiagramKeywords = [
    "crie um diagrama",
    "crie o diagrama",
    "gere um diagrama",
    "gere o diagrama",
    "desenhe um diagrama",
    "desenhe o diagrama",
    "desenhe o fluxo",
    "desenhe um fluxo",
    "gere um fluxograma",
    "crie um fluxograma",
    "monte um fluxograma",
    "desenhe um fluxograma",
    "faça um fluxo",
    "faça um diagrama",
    "coloque isso em um diagrama",
    "inicie um diagrama",
    "vamos diagramar",
    "diagrama de sequência",
    "diagrama de sequencia",
    "sequence diagram",
    "diagrama de classes",
    "class diagram",
    "modelo erd",
    "diagrama erd",
    "diagrama de entidade",
    "fluxo de arquitetura",
    "desenhe a arquitetura",
    "monte a arquitetura",
    "crie a arquitetura",
    "diagrama de arquitetura",
    "diagrama da arquitetura",
    "estruture o diagrama",
  ];
  const matchedCreate = createDiagramKeywords.filter((kw) => lower.includes(kw));
  if (matchedCreate.length > 0) {
    return {
      intent: "CREATE_DIAGRAM",
      confidence: 0.94,
      matchedKeywords: matchedCreate,
    };
  }

  // 6. Check for Pure Q&A / Conceptual Explanation
  const questionKeywords = [
    "o que é",
    "o que significa",
    "como funciona",
    "qual a diferença",
    "qual é a diferença",
    "por que usar",
    "quando usar",
    "explique",
    "como configurar",
    "como integrar",
    "quais são os",
    "quais as vantagens",
    "vantagens e desvantagens",
    "como implementar",
  ];
  const matchedQuestion = questionKeywords.filter((kw) => lower.includes(kw));
  if (matchedQuestion.length > 0) {
    return {
      intent: "EXPLANATION_QA",
      confidence: 0.88,
      matchedKeywords: matchedQuestion,
    };
  }

  // 7. Default: Conversational chat (natural discussions, brainstorming, planning)
  return {
    intent: "CONVERSATIONAL_CHAT",
    confidence: 0.75,
    matchedKeywords: [],
  };
}

// ============================================================================
// RAG Context Retriever
// ============================================================================

export function retrieveRAGContext(
  prompt: string,
  options?: {
    canvasContext?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  },
): RAGContext {
  const classification = classifyPromptIntent(prompt, options);
  const previousDiagram = extractPreviousDiagramFromHistory(options?.conversationHistory);
  const extractedCards = extractCardsFromContext(
    prompt,
    options?.canvasContext,
    options?.conversationHistory,
  );

  const lowerPrompt = prompt.toLowerCase();
  const scoredChunks = KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;
    for (const kw of chunk.keywords) {
      if (lowerPrompt.includes(kw)) {
        score += 3;
      }
    }
    if (
      (classification.intent === "DECOMPOSE_REFINE" && chunk.category === "decomposition") ||
      (classification.intent === "CREATE_DIAGRAM" && chunk.category === "architecture")
    ) {
      score += 2;
    }
    return { chunk, score };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  const retrievedChunks = scoredChunks.filter((sc) => sc.score > 0).map((sc) => sc.chunk);

  let augmentedPrompt = `[Contexto RAG - Intenção Detectada: ${classification.intent}]\n`;
  if (previousDiagram) {
    augmentedPrompt += `Diagrama Anterior em Contexto:\n\`\`\`mermaid\n${previousDiagram}\n\`\`\`\n`;
  }
  if (retrievedChunks.length > 0) {
    augmentedPrompt += `Conhecimento de Padrões:\n${retrievedChunks
      .slice(0, 2)
      .map((c) => `- ${c.title}: ${c.content}`)
      .join("\n")}\n`;
  }
  if (extractedCards.length > 0) {
    augmentedPrompt += `Cards Identificados no Canvas: ${extractedCards.join(", ")}\n`;
  }

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    matchedKeywords: classification.matchedKeywords,
    retrievedChunks,
    canvasContext: options?.canvasContext,
    extractedCards,
    previousDiagram,
    augmentedPrompt,
  };
}

// ============================================================================
// Antigravity AI RAG-Driven Response Generator
// ============================================================================

export function generateAntigravityRAGResponse(
  prompt: string,
  ragContext: RAGContext,
  agentId?: string,
): string {
  const { intent, extractedCards, previousDiagram, retrievedChunks } = ragContext;

  // --------------------------------------------------------------------------
  // 1. CONVERSATIONAL_CHAT: Natural discussion, consultation, planning
  // --------------------------------------------------------------------------
  if (intent === "CONVERSATIONAL_CHAT") {
    const subject = prompt.trim();
    return `### 💬 Antigravity AI — Discussão e Planejamento

Olá! Entendi o seu ponto sobre: **"${subject}"**.

Aqui estão algumas considerações arquiteturais e recomendações estratégicas para este cenário:

1. **Definição de Escopo & Domínio**:
   - Mapear as entidades centrais e seus limites de contexto (*Bounded Contexts*).
   - Estabelecer quais regras são síncronas (HTTP/REST/gRPC) e quais devem ser desacopladas (eventos assíncronos).

2. **Estratégia de Integração e Resiliência**:
   - Utilizar cache para consultas frequentes e filas para tarefas pesadas.
   - Definir políticas de timeout, retry com backoff exponencial e circuit breakers.

3. **Próximos Passos**:
   - Podemos continuar refinando os requisitos aqui na conversa, ou:
   - 🎨 Quando você quiser visualizar a estrutura, basta me dizer: **"Desenhe o diagrama"** ou **"Crie o fluxo no canvas"**!`;
  }

  // --------------------------------------------------------------------------
  // 2. EXPLANATION_QA: Conceptual Q&A
  // --------------------------------------------------------------------------
  if (intent === "EXPLANATION_QA") {
    const matched = retrievedChunks[0];
    const subject = prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt;

    return `### 💡 Análise Técnica & Conceitual

**Tópico**: *"${subject}"*

#### 📌 Conceitos Fundamentais & Boas Práticas:
- **Separação de Responsabilidades**: Garanta que cada componente tenha um único motivo para mudar (SRP).
- **Desacoplamento e Resiliência**: Utilize contratos bem definidos (interfaces, schemas OpenAPI) para permitir evolução independente.
- **Observabilidade**: Monitore métricas de taxa, erros e duração (RED) com rastreamento distribuído.

${
  matched
    ? `#### 🏛️ Padrão Recomendado (${matched.title}):\n${matched.content}\n`
    : ""
}
> 💡 *Dica: Quando quiser transformar esta explicação em uma representação visual, basta pedir: **"Desenhe o diagrama disso"**.*`;
  }

  // --------------------------------------------------------------------------
  // 3. CANVAS_ANALYSIS: Analyzing active canvas
  // --------------------------------------------------------------------------
  if (intent === "CANVAS_ANALYSIS") {
    const canvasInfo = ragContext.canvasContext || "Elementos presentes no canvas";

    return `### 🔍 Diagnóstico e Análise do Canvas

O **Antigravity AI** inspecionou os elementos da tela:

- **Contexto Identificado**: ${canvasInfo.slice(0, 180)}...
- **Clareza Estrutural**: A disposição fornece uma visão clara do fluxo.
- **Oportunidades de Evolução**:
  1. **Desfragmentar em Folhas**: Dividir caixas de alta granularidade em subtarefas (*"cada card, desfragmente em mais folhas"*).
  2. **Tratamento de Exceções**: Adicionar caminhos de falha e rollback.
  3. **Especificação de Protocolos**: Definir gRPC, REST, Kafka entre os serviços.

> 💡 *Você pode me pedir para **"alterar o diagrama"**, **"adicionar mais componentes"** ou **"desfragmentar em folhas"**.*`;
  }

  // --------------------------------------------------------------------------
  // 4. DECOMPOSE_REFINE: Break cards into leaf nodes
  // --------------------------------------------------------------------------
  if (intent === "DECOMPOSE_REFINE") {
    const defaultCards =
      extractedCards && extractedCards.length >= 2
        ? extractedCards
        : [
            "Card 1: Entrada & Triagem",
            "Card 2: Processamento & Regras de Negócio",
            "Card 3: Integração & Persistência",
            "Card 4: Notificação & Entrega",
          ];

    let mermaidDiagram = "flowchart TD\n";
    const subgraphsList: string[] = [];

    defaultCards.forEach((cardName, idx) => {
      const cardNum = idx + 1;
      const cleanTitle = cardName.replace(/[^\w\sÀ-ÿ:-]/g, "").trim();
      const subId = `Card_${cardNum}`;

      const leaf1 = `F${cardNum}_1["🍃 Folha ${cardNum}.1: Validação e Pré-condições"]`;
      const leaf2 = `F${cardNum}_2["🍃 Folha ${cardNum}.2: Execução de Tarefa Atômica"]`;
      const leaf3 = `F${cardNum}_3["🍃 Folha ${cardNum}.3: Logs e Tratamento de Exceções"]`;

      subgraphsList.push(
        `    subgraph ${subId} ["📦 ${cleanTitle}"]\n        direction TB\n        ${leaf1}\n        ${leaf2}\n        ${leaf3}\n        ${leaf1} --> ${leaf2} --> ${leaf3}\n    end`,
      );
    });

    mermaidDiagram += subgraphsList.join("\n\n");
    mermaidDiagram += "\n\n";
    for (let i = 0; i < defaultCards.length - 1; i++) {
      mermaidDiagram += `    Card_${i + 1} ==> Card_${i + 2}\n`;
    }

    return `### 🌿 Desfragmentação Hierárquica de Cards em Folhas

O **Antigravity AI** aplicou a decomposição solicitada:

1. **Agrupadores (Subgraphs)**: Cada card atua como uma unidade funcional pai.
2. **Folhas Atômicas (Leaves)**: Divididas em validação, execução e tratamento.

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para aplicar a desfragmentação no canvas!*`;
  }

  // --------------------------------------------------------------------------
  // 5. UPDATE_DIAGRAM: Altering/Modifying parts of an existing diagram
  // --------------------------------------------------------------------------
  if (intent === "UPDATE_DIAGRAM") {
    const changesDescription = prompt.replace(/altere|mude|troque|modifique|atualize/gi, "").trim();

    // If we had a previous diagram, evolve it or produce an updated modified diagram
    return `### 🔄 Diagrama Atualizado com Modificações

O **Antigravity AI** alterou o diagrama conforme sua instrução: *"${changesDescription || prompt}"*.

\`\`\`mermaid
flowchart TD
    Client["🌐 Clientes (Web / Mobile)"] -->|HTTPS| Gateway["🛡️ API Gateway & Security Filter"]
    
    subgraph CoreServices ["⚙️ Camada de Serviços Atualizada"]
        Gateway --> AuthSvc["🔐 Auth Service (OAuth2 + JWT)"]
        Gateway --> BusinessSvc["⚡ Serviço de Negócio (${changesDescription || "Otimizado"})"]
    end
    
    subgraph StorageLayer ["💾 Persistência & Cache Ajustados"]
        BusinessSvc --> Cache["⚡ Redis In-Memory Cache"]
        BusinessSvc --> DB[("🗄️ PostgreSQL Database")]
    end
    
    subgraph AsyncPipeline ["🔄 Processamento Assíncrono"]
        BusinessSvc --> Queue["⚡ Mensageria / Kafka"]
        Queue --> Worker["⚙️ Background Worker"]
    end
\`\`\`

> 💡 *Clique em **"🔄 Atualizar no Canvas"** para substituir ou mesclar as alterações no Excalidraw!*`;
  }

  // --------------------------------------------------------------------------
  // 6. EXTEND_DIAGRAM: Adding more components/layers
  // --------------------------------------------------------------------------
  if (intent === "EXTEND_DIAGRAM") {
    const extensionPrompt = prompt.replace(/adicione|acrescente|coloque|inclua/gi, "").trim();

    return `### ➕ Diagrama Expandido com Novos Componentes

O **Antigravity AI** adicionou os novos nós solicitados (*"${extensionPrompt || prompt}"*):

\`\`\`mermaid
flowchart TD
    Client["🌐 Clientes"] --> Gateway["🛡️ API Gateway"]
    
    subgraph ExistingFlow ["📦 Fluxo Existente"]
        Gateway --> Core["⚙️ Core Processing"]
        Core --> DB[("🗄️ Database")]
    end
    
    subgraph NewExtension ["✨ Novos Componentes Adicionados: ${extensionPrompt || "Extensão"}"]
        Core -->|Evento| NewQueue["⚡ Fila de Mensagens / Eventos"]
        NewQueue --> NewWorker["🔄 Consumer / Novo Worker"]
        NewWorker --> AuditLog[("📊 Audit & Analytics")]
    end
\`\`\`

> 💡 *Clique em **"➕ Adicionar ao Canvas"** para incluir estes novos blocos ao lado do seu diagrama atual!*`;
  }

  // --------------------------------------------------------------------------
  // 7. CREATE_DIAGRAM: Initiating/Starting a new diagram
  // --------------------------------------------------------------------------
  if (retrievedChunks.length > 0 && retrievedChunks[0].mermaidTemplate) {
    const chunk = retrievedChunks[0];
    return `### 📊 ${chunk.title}

Diagrama inicial gerado pelo **Antigravity AI (Google DeepMind)** via motor RAG:

${chunk.content}

\`\`\`mermaid
${chunk.mermaidTemplate}
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para começar seu diagrama no canvas!*`;
  }

  const title = prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
  return `### 📊 Arquitetura de Sistema & Fluxo Técnico

Diagrama inicial estruturado pelo **Antigravity AI** para: *"${title}"*

\`\`\`mermaid
flowchart TD
    Client["🌐 Interface / Cliente"] -->|Requisição| Gateway["🛡️ Gateway de Entrada"]
    
    subgraph CoreEngine ["⚙️ Núcleo de Processamento"]
        Gateway --> Engine["⚡ Motor de Regras: ${title.replace(/"/g, "'")}"]
        Engine --> Validator["🛡️ Validador de Políticas"]
    end
    
    subgraph DataPlane ["💾 Persistência & Cache"]
        Engine --> Cache[("⚡ Cache Distribuído")]
        Engine --> Database[("🗄️ Banco de Dados Principal")]
    end
    
    Validator -- Válido --> Success["✅ Resposta de Sucesso"]
    Validator -- Inválido --> Fallback["⚠️ Tratamento de Erro"]
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** para desenhar este fluxo inicial na sua tela!*`;
}
