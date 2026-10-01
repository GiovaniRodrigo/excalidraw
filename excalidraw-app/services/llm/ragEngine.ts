/**
 * RAG Engine (Retrieval-Augmented Generation) & Semantic Intent Analyzer
 * for Excalidraw Antigravity AI and LLM Services.
 */

export type PromptIntent =
  | "DECOMPOSE_REFINE"
  | "CREATE_DIAGRAM"
  | "EXPLANATION_QA"
  | "CANVAS_ANALYSIS"
  | "GENERAL_CHAT";

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
    end

    subgraph Card_Arquitetura ["⚙️ Card: Design & Arquitetura"]
        direction TB
        F2_1["🍃 Folha 2.1: Modelagem ERD & Schemas"]
        F2_2["🍃 Folha 2.2: Definição de Contratos de API (OpenAPI)"]
        F2_3["🍃 Folha 2.3: Topologia de Mensageria & Cache"]
    end

    subgraph Card_Execucao ["💻 Card: Desenvolvimento & Testes"]
        direction TB
        F3_1["🍃 Folha 3.1: Implementação de Core Domain (TDD)"]
        F3_2["🍃 Folha 3.2: Integração com Gateways & Repositories"]
        F3_3["🍃 Folha 3.3: Testes de Carga e Seams de Integração"]
    end

    subgraph Card_Entrega ["🚀 Card: Deploy & Observabilidade"]
        direction TB
        F4_1["🍃 Folha 4.1: Pipeline CI/CD Automatizada"]
        F4_2["🍃 Folha 4.2: Dashboards de Métricas & Tracing (OpenTelemetry)"]
        F4_3["🍃 Folha 4.3: Rollout Progressivo (Canary / Blue-Green)"]
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
    "mais detalhes",
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

  // 2. Check for Canvas Analysis / Review
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

  // 3. Check for Explicit Diagram Generation Request
  const createDiagramKeywords = [
    "crie um diagrama",
    "faça um diagrama",
    "desenhe um diagrama",
    "desenhe o fluxo",
    "gere um fluxograma",
    "crie um fluxograma",
    "monte um fluxograma",
    "desenhe um fluxograma",
    "faça um fluxo",
    "diagrama de sequência",
    "diagrama de sequencia",
    "sequence diagram",
    "diagrama de classes",
    "class diagram",
    "modelo erd",
    "diagrama erd",
    "diagrama de entidade",
    "fluxo de arquitetura",
    "arquitetura de",
    "desenhe a arquitetura",
  ];
  const matchedCreate = createDiagramKeywords.filter((kw) => lower.includes(kw));
  if (matchedCreate.length > 0) {
    return {
      intent: "CREATE_DIAGRAM",
      confidence: 0.92,
      matchedKeywords: matchedCreate,
    };
  }

  // 4. Check for Pure Q&A / Conceptual / Textual Explanation
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
  if (matchedQuestion.length > 0 && !lower.includes("diagrama") && !lower.includes("desenhe")) {
    return {
      intent: "EXPLANATION_QA",
      confidence: 0.88,
      matchedKeywords: matchedQuestion,
    };
  }

  // 5. Default heuristic based on keywords or length
  const matchedGeneral = KNOWLEDGE_BASE.flatMap((k) => k.keywords).filter((kw) =>
    lower.includes(kw),
  );

  if (matchedGeneral.length > 0) {
    return {
      intent: "CREATE_DIAGRAM",
      confidence: 0.75,
      matchedKeywords: matchedGeneral,
    };
  }

  return {
    intent: "GENERAL_CHAT",
    confidence: 0.6,
    matchedKeywords: [],
  };
}

// ============================================================================
// Card Extractor from Canvas / History
// ============================================================================

export function extractCardsFromContext(
  prompt: string,
  canvasText?: string,
  history?: Array<{ role: string; content: string }>,
): string[] {
  const cards: string[] = [];

  // 1. Try to extract from canvas text (lines or bullet points)
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

  // 2. Try to extract from last assistant diagram in history
  if (cards.length === 0 && history && history.length > 0) {
    const lastAssistantMsg = [...history].reverse().find((m) => m.role === "assistant")?.content || "";
    // Match node labels like id["Title"] or subgraph Name ["Title"]
    const nodeMatches = lastAssistantMsg.matchAll(/(?:subgraph\s+\w+\s*\["([^"]+)"\]|\["([^"]+)"\])/g);
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
// RAG Context Retriever
// ============================================================================

export function retrieveRAGContext(
  prompt: string,
  options?: {
    canvasContext?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  },
): RAGContext {
  const classification = classifyPromptIntent(prompt, {
    conversationHistory: options?.conversationHistory,
    canvasText: options?.canvasContext,
  });

  const lowerPrompt = prompt.toLowerCase();

  // Score knowledge chunks
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

  const extractedCards = extractCardsFromContext(
    prompt,
    options?.canvasContext,
    options?.conversationHistory,
  );

  let augmentedPrompt = `[Contexto RAG - Intenção Detectada: ${classification.intent}]\n`;
  if (retrievedChunks.length > 0) {
    augmentedPrompt += `Conhecimento Relevante:\n${retrievedChunks
      .slice(0, 2)
      .map((c) => `- ${c.title}: ${c.content}`)
      .join("\n")}\n`;
  }
  if (extractedCards.length > 0) {
    augmentedPrompt += `Cards Identificados no Contexto: ${extractedCards.join(", ")}\n`;
  }

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    matchedKeywords: classification.matchedKeywords,
    retrievedChunks,
    canvasContext: options?.canvasContext,
    extractedCards,
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
  const { intent, extractedCards } = ragContext;

  // --------------------------------------------------------------------------
  // 1. DECOMPOSE_REFINE Intent (Breaking cards down into leaf nodes/subtasks)
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

      // Generate realistic leaf nodes for this card
      const leaf1 = `F${cardNum}_1["🍃 Folha ${cardNum}.1: Validação e Pré-condições"]`;
      const leaf2 = `F${cardNum}_2["🍃 Folha ${cardNum}.2: Execução de Tarefa Atômica"]`;
      const leaf3 = `F${cardNum}_3["🍃 Folha ${cardNum}.3: Logs e Tratamento de Exceções"]`;

      subgraphsList.push(
        `    subgraph ${subId} ["📦 ${cleanTitle}"]\n        direction TB\n        ${leaf1}\n        ${leaf2}\n        ${leaf3}\n        ${leaf1} --> ${leaf2} --> ${leaf3}\n    end`,
      );
    });

    mermaidDiagram += subgraphsList.join("\n\n");

    // Connect the cards sequentially
    mermaidDiagram += "\n\n";
    for (let i = 0; i < defaultCards.length - 1; i++) {
      mermaidDiagram += `    Card_${i + 1} ==> Card_${i + 2}\n`;
    }

    return `### 🌿 Desfragmentação Hierárquica de Cards em Folhas

O **Antigravity AI** analisou a solicitação de decomposição e estruturou cada card pai em suas respectivas **folhas atômicas de execução**:

1. **Estrutura de Contenção**: Cada card principal opera como um contêiner (Subgraph) com escopo fechado.
2. **Folhas Especializadas (Leaves)**: Subdivididas em **Validação**, **Execução do Núcleo** e **Tratamento de Saída/Logs**.
3. **Fluxo Ordenado**: As dependências entre os cards são mantidas pelas conexões mestras (\`==>\`), enquanto o fluxo interno é resolvido dentro de cada folha.

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para renderizar o diagrama com todos os cards e folhas diretamente no seu canvas!*`;
  }

  // --------------------------------------------------------------------------
  // 2. EXPLANATION_QA Intent (Technical Q&A - Clear text without unwanted flowcharts)
  // --------------------------------------------------------------------------
  if (intent === "EXPLANATION_QA") {
    const matched = ragContext.retrievedChunks[0];
    const subject = prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt;

    return `### 💡 Análise Técnica & Conceitual

**Pergunta / Tópico**: *"${subject}"*

#### 📌 Conceitos Fundamentais & Boas Práticas:
- **Separação de Responsabilidades**: Garanta que cada componente, módulo ou serviço tenha um único motivo para mudar (SRP).
- **Desacoplamento e Resiliência**: Utilize contratos bem definidos (interfaces, schemas OpenAPI/Protobuf) para permitir evolução independente.
- **Observabilidade Integrada**: Monitore logs estruturados, métricas de taxa/erros/duração (RED) e rastreamento distribuído.

${
  matched
    ? `#### 🏛️ Padrão Recomendado (${matched.title}):\n${matched.content}\n`
    : ""
}
#### 🚀 Recomendações de Ação no Excalidraw:
1. Se desejar desenhar a arquitetura deste conceito, solicite: *"Desenhe o diagrama de ${subject}"*.
2. Se quiser anexar elementos existentes do canvas para análise, clique no botão **📎 Anexar Canvas Atual** abaixo.`;
  }

  // --------------------------------------------------------------------------
  // 3. CANVAS_ANALYSIS Intent (Reviewing canvas contents)
  // --------------------------------------------------------------------------
  if (intent === "CANVAS_ANALYSIS") {
    const canvasInfo = ragContext.canvasContext || "Elementos do canvas";

    return `### 🔍 Diagnóstico e Análise do Canvas

O **Antigravity AI** inspecionou os elementos presentes na tela:

- **Contexto Identificado**: ${canvasInfo.slice(0, 180)}...
- **Clareza Estrutural**: A disposição dos nós fornece uma visão geral clara das etapas.
- **Oportunidades de Refinamento**:
  1. **Decomposição em Sub-tarefas**: Você pode desfragmentar caixas de alta granularidade em folhas menores.
  2. **Tratamento de Fluxos de Exceção**: Incluir rotas de rollback ou mensagens de erro.
  3. **Identificação de Contratos**: Especificar os protocolos de comunicação entre os nós (gRPC, REST, Kafka).

> 💡 *Dica: Diga **"cada card, desfragmente em mais folhas"** para detalhar automaticamente os blocos identificados.*`;
  }

  // --------------------------------------------------------------------------
  // 4. CREATE_DIAGRAM Intent (Matches knowledge base or domain archetypes)
  // --------------------------------------------------------------------------
  if (intent === "CREATE_DIAGRAM") {
    // If we have a retrieved knowledge chunk with a diagram template, use it
    if (ragContext.retrievedChunks.length > 0 && ragContext.retrievedChunks[0].mermaidTemplate) {
      const chunk = ragContext.retrievedChunks[0];
      return `### ${chunk.title}

Modelagem técnica gerada pelo **Antigravity AI (Google DeepMind)** via motor RAG:

${chunk.content}

\`\`\`mermaid
${chunk.mermaidTemplate}
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** abaixo para adicionar este diagrama ao canvas!*`;
    }

    // Default intelligent system architecture diagram
    const title = prompt.length > 40 ? `${prompt.slice(0, 37)}...` : prompt;
    return `### Arquitetura de Sistema & Fluxo Técnico

Diagrama estruturado pelo **Antigravity AI** para: *"${title}"*

\`\`\`mermaid
flowchart TD
    Client["🌐 Interface / Cliente"] -->|Requisição| Gateway["🛡️ Gateway de Entrada"]
    
    subgraph CoreEngine ["⚙️ Núcleo de Processamento: ${title.replace(/"/g, "'")}"]
        Gateway --> Engine["⚡ Motor de Regras & Execução"]
        Engine --> Validator["🛡️ Validador de Políticas"]
    end
    
    subgraph DataPlane ["💾 Persistência & Cache"]
        Engine --> Cache[("⚡ Cache Distribuído")]
        Engine --> Database[("🗄️ Banco de Dados Principal")]
    end
    
    Validator -- Válido --> Success["✅ Resposta de Sucesso"]
    Validator -- Inválido --> Fallback["⚠️ Tratamento de Erro"]
\`\`\`

> 💡 *Clique em **"🎨 Inserir no Canvas Excalidraw"** para posicionar este diagrama na sua tela!*`;
  }

  // --------------------------------------------------------------------------
  // 5. GENERAL_CHAT Intent (Conversational response)
  // --------------------------------------------------------------------------
  return `### Olá! Sou o Antigravity AI 🚀

Estou conectado diretamente ao seu workspace do Excalidraw com capacidades de **RAG e IA Generativa**.

Como posso ajudar você agora?
- **Desenhar Diagramas**: Peça arquiteturas de microsserviços, fluxogramas, diagramas de sequência ou ERD.
- **Decomposição em Folhas**: Diga *"cada card, desfragmente em mais folhas"* para quebrar cards em subtarefas detalhadas.
- **Analisar Canvas**: Clique em **📎 Anexar Canvas Atual** para tirar dúvidas sobre o seu diagrama.`;
}
