/**
 * Diagram RAG (Retrieval-Augmented Generation) & Prompt Augmentation Engine
 *
 * Enriches prompts sent to the LLM (Antigravity / Gemini / Ollama / OpenAI)
 * with defined architectural standards, Mermaid formatting rules, previous diagram states,
 * and canvas context for creating, updating, and extending diagrams.
 */

export type DiagramOperationType =
  | "CREATE_DIAGRAM"
  | "UPDATE_DIAGRAM"
  | "EXTEND_DIAGRAM"
  | "DECOMPOSE_CARDS"
  | "CONVERSATIONAL_CHAT";

export interface RAGAnalysisResult {
  operation: DiagramOperationType;
  confidence: number;
  detectedKeywords: string[];
  previousDiagram: string | null;
  canvasContext?: string;
  augmentedSystemPrompt: string;
}

// ============================================================================
// Defined Standards & Diagramming Schemas
// ============================================================================

export const MERMAID_DIAGRAM_STANDARD = `
### PADRÃO OBRIGATÓRIO DE FORMATAÇÃO DE DIAGRAMAS MERMAID:

1. **Sintaxe Válida e Compatível**:
   - Use apenas os tipos suportados: \`flowchart TD\`, \`flowchart LR\`, \`sequenceDiagram\`, \`classDiagram\`, \`erDiagram\`, \`stateDiagram-v2\`.
   - Sempre envolva textos de nós com caracteres especiais, acentos ou espaços entre aspas duplas:
     \`id["Nome do Nó (Detalhes)"]\` ou \`id("Texto com espaços")\`.
   - Utilize ícones/emojis no início dos rótulos para aumentar a legibilidade visual (ex: 🌐 Clientes, 🛡️ Gateway, ⚙️ Serviço, 💾 Banco, ⚡ Fila, 📦 Card, 🍃 Folha).

2. **Padrão de Decomposição Hierárquica (Cards em Folhas / Subtarefas)**:
   - Quando o usuário pedir para desfragmentar, decompor ou detalhar cards em folhas/subtarefas:
     - Estruture cada Card principal como um \`subgraph Nome_Card ["📦 Título do Card"] ... end\`.
     - Dentro do subgraph, crie as folhas filhas com o prefixo 🍃 (ex: \`F1_1["🍃 Folha 1.1: Validação de Dados"]\`).
     - Conecte as folhas internas sequencialmente com setas \`-->\`.
     - Interligue os subgraphs principais sequencialmente com setas duplas \`==>\` (ex: \`Card_1 ==> Card_2\`).

3. **Padrão de Alteração / Modificação de Diagramas**:
   - Ao receber uma instrução de alteração (ex: "mude o banco para PostgreSQL", "troque o gateway por Envoy", "remova o nó de cache"):
     - Incorpore as mudanças mantendo todos os outros nós e fluxos existentes no diagrama anterior.
     - Retorne o código Mermaid COMPLETO atualizado no bloco \`\`\`mermaid ... \`\`\`, não apenas o fragmento alterado.

4. **Padrão de Extensão / Adição de Novos Componentes**:
   - Ao adicionar novos serviços, filas ou camadas (ex: "adicione serviço de notificação com Kafka"):
     - Adicione os novos nós e estabeleça as conexões de entrada e saída com a arquitetura existente.
     - Retorne o diagrama Mermaid consolidado e completo.

5. **Regra de Apresentação**:
   - Responda primeiro com uma breve explicação técnica das decisões ou alterações em markdown.
   - Em seguida, inclua o bloco de código Mermaid padrão fechado entre \`\`\`mermaid e \`\`\`.
`;

// ============================================================================
// Semantic Extractor & Intent Classifier
// ============================================================================

export function extractPreviousDiagram(
  history?: Array<{ role: string; content: string }>,
): string | null {
  if (!history || history.length === 0) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "assistant" && msg.content) {
      const match = msg.content.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
      if (
        /^(?:flowchart|sequenceDiagram|classDiagram|erDiagram|stateDiagram-v2|stateDiagram|graph)\b/m.test(
          msg.content.trim(),
        )
      ) {
        return msg.content.trim();
      }
    }
  }

  return null;
}

export function detectDiagramOperation(
  prompt: string,
  history?: Array<{ role: string; content: string }>,
): {
  operation: DiagramOperationType;
  confidence: number;
  detectedKeywords: string[];
} {
  const lower = prompt.toLowerCase().trim();
  const previousDiagram = extractPreviousDiagram(history);

  // 1. Decomposição de Cards em Folhas / Subtarefas
  const decomposeTerms = [
    "desfragmente",
    "disfragmente",
    "desfragmentar",
    "disfragmentar",
    "desfragmentação",
    "disfragmentação",
    "folhas",
    "folha",
    "quebre em folhas",
    "subdivida em folhas",
    "divida em folhas",
    "sub-card",
    "subcard",
    "subcards",
    "subtarefas",
    "sub-tarefas",
    "subetapas",
    "sub-etapas",
    "cada card",
    "cada etapa",
    "expanda os cards",
    "adicione folhas",
    "decomponha os cards",
    "decompor cards",
    "detalhe os cards",
    "decompose cards",
    "break down into cards",
    "decompose into leaves",
    "leaf nodes",
  ];
  const matchedDecompose = decomposeTerms.filter((term) => lower.includes(term));
  if (matchedDecompose.length > 0) {
    return {
      operation: "DECOMPOSE_CARDS",
      confidence: 0.95,
      detectedKeywords: matchedDecompose,
    };
  }

  // 2. Alteração / Modificação de Diagrama Existente
  const updateTerms = [
    "altere o diagrama",
    "altere o fluxo",
    "mude o diagrama",
    "mude o fluxo",
    "mude o banco",
    "mude a base",
    "troque o banco",
    "troque a base",
    "troque o",
    "troque a",
    "mude para",
    "troque para",
    "substitua o",
    "substitua a",
    "substitua por",
    "modifique o diagrama",
    "modifique o fluxo",
    "atualize o diagrama",
    "atualize o fluxo",
    "em vez de",
    "ao invés de",
    "remova o nó",
    "remova o serviço",
    "remova a etapa",
    "update diagram",
    "change the diagram",
    "change database to",
    "replace the",
    "modify the flow",
  ];
  const matchedUpdate = updateTerms.filter((term) => lower.includes(term));
  if (
    matchedUpdate.length > 0 ||
    (previousDiagram &&
      (lower.startsWith("mude ") ||
        lower.startsWith("altere ") ||
        lower.startsWith("troque ") ||
        lower.startsWith("substitua ") ||
        lower.startsWith("remova ") ||
        lower.startsWith("atualize ")))
  ) {
    return {
      operation: "UPDATE_DIAGRAM",
      confidence: 0.92,
      detectedKeywords:
        matchedUpdate.length > 0
          ? matchedUpdate
          : [lower.split(" ")[0] || "update"],
    };
  }

  // 3. Extensão / Adição de Novos Componentes ao Diagrama Existente
  const extendTerms = [
    "adicione ao diagrama",
    "adicione no diagrama",
    "acrescente ao diagrama",
    "acrescente no diagrama",
    "coloque mais",
    "adicione mais",
    "adicione uma camada",
    "adicione um serviço",
    "adicione um servico",
    "adicione uma fila",
    "adicione um nó",
    "adicione uma etapa",
    "inclua no diagrama",
    "inclua no fluxo",
    "crie mais um nó",
    "crie mais uma etapa",
    "conecte com",
    "ligue com",
    "add to diagram",
    "add a service",
    "add a layer",
    "add queue",
    "include in diagram",
    "connect to",
  ];
  const matchedExtend = extendTerms.filter((term) => lower.includes(term));
  if (
    matchedExtend.length > 0 ||
    (previousDiagram &&
      (lower.startsWith("adicione ") ||
        lower.startsWith("inclua ") ||
        lower.startsWith("acrescente ") ||
        lower.startsWith("coloque ")))
  ) {
    return {
      operation: "EXTEND_DIAGRAM",
      confidence: 0.91,
      detectedKeywords:
        matchedExtend.length > 0
          ? matchedExtend
          : [lower.split(" ")[0] || "extend"],
    };
  }

  // 4. Criação Inicial de Diagrama
  const createTerms = [
    "crie um diagrama",
    "crie o diagrama",
    "gere um diagrama",
    "gere o diagrama",
    "desenhe um diagrama",
    "desenhe o diagrama",
    "desenhe o fluxo",
    "desenhe um fluxo",
    "desenhe isso",
    "desenhar o fluxo",
    "desenhe no canvas",
    "gere um fluxograma",
    "crie um fluxograma",
    "monte um fluxograma",
    "faça um fluxograma",
    "desenhe um fluxograma",
    "faça um fluxo",
    "faça um diagrama",
    "coloque isso em um diagrama",
    "coloque em um diagrama",
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
    "diagrama de arquitetura",
    "diagrama da arquitetura",
    "desenhe a arquitetura",
    "monte a arquitetura",
    "crie a arquitetura",
    "create diagram",
    "generate diagram",
    "draw flowchart",
    "make a diagram",
    "architecture diagram",
  ];
  const matchedCreate = createTerms.filter((term) => lower.includes(term));
  if (matchedCreate.length > 0) {
    return {
      operation: "CREATE_DIAGRAM",
      confidence: 0.94,
      detectedKeywords: matchedCreate,
    };
  }

  // 5. Conversação Normal
  return {
    operation: "CONVERSATIONAL_CHAT",
    confidence: 0.8,
    detectedKeywords: [],
  };
}

// ============================================================================
// RAG Prompt Augmentation Builder
// ============================================================================

export function buildRAGAugmentedPrompt(params: {
  prompt: string;
  messages?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  canvasContext?: string;
}): { augmentedSystemPrompt: string; analysis: RAGAnalysisResult } {
  const { prompt, messages = [], systemPrompt = "", canvasContext } = params;
  const analysis = detectDiagramOperation(prompt, messages);
  const previousDiagram = extractPreviousDiagram(messages);

  let ragInstructions = `\n\n[DIAGRAM RAG CONTEXT & INSTRUCTIONS]:\n`;
  ragInstructions += `- Operação Detectada: ${analysis.operation}\n`;

  if (analysis.operation === "CREATE_DIAGRAM") {
    ragInstructions += `- O usuário está solicitando a CRIAÇÃO de um novo diagrama.\n`;
    ragInstructions += `- Forneça uma explicação técnica concisa e gere o diagrama Mermaid completo seguindo o padrão definido.\n`;
    ragInstructions += MERMAID_DIAGRAM_STANDARD;
  } else if (analysis.operation === "UPDATE_DIAGRAM") {
    ragInstructions += `- O usuário está solicitando uma ALTERAÇÃO / MODIFICAÇÃO no diagrama existente.\n`;
    if (previousDiagram) {
      ragInstructions += `- DIAGRAMA ANTERIOR PARA MODIFICAR:\n\`\`\`mermaid\n${previousDiagram}\n\`\`\`\n`;
      ragInstructions += `- Aplique as alterações solicitadas (substituições, alterações de nós ou conexões) e retorne o código Mermaid COMPLETO atualizado.\n`;
    } else {
      ragInstructions += `- Modifique o fluxo discutido na conversa e forneça o diagrama completo atualizado.\n`;
    }
    ragInstructions += MERMAID_DIAGRAM_STANDARD;
  } else if (analysis.operation === "EXTEND_DIAGRAM") {
    ragInstructions += `- O usuário está solicitando a ADIÇÃO / EXPANSÃO de novos nós ou camadas no diagrama.\n`;
    if (previousDiagram) {
      ragInstructions += `- DIAGRAMA ATUAL NA CONVERSA:\n\`\`\`mermaid\n${previousDiagram}\n\`\`\`\n`;
      ragInstructions += `- Incorpore os novos componentes ao diagrama anterior mantendo a estrutura existente.\n`;
    }
    ragInstructions += MERMAID_DIAGRAM_STANDARD;
  } else if (analysis.operation === "DECOMPOSE_CARDS") {
    ragInstructions += `- O usuário solicitou a DESFRAGMENTAÇÃO / DECOMPOSIÇÃO DE CARDS EM FOLHAS (LEAVES).\n`;
    ragInstructions += `- Estruture cada Card principal como um Subgraph contendo suas respectivas folhas atômicas com o prefixo 🍃 (ex: 🍃 Folha 1.1, 🍃 Folha 1.2).\n`;
    if (previousDiagram) {
      ragInstructions += `- BASEIE-SE NO DIAGRAMA/CARDS ANTERIORES:\n\`\`\`mermaid\n${previousDiagram}\n\`\`\`\n`;
    }
    ragInstructions += MERMAID_DIAGRAM_STANDARD;
  } else {
    // Conversational chat
    ragInstructions += `- O usuário está conversando, planejando ou tirando dúvidas conceituais.\n`;
    ragInstructions += `- Responda com clareza, autoridade técnica e formatação amigável em Markdown.\n`;
    ragInstructions += `- NÃO gere blocos de código Mermaid a menos que o usuário explicitamente peça para desenhar ou gerar o diagrama.\n`;
    ragInstructions += `- Você pode sugerir no final que, se o usuário desejar, você pode desenhar o diagrama no canvas.\n`;
  }

  if (canvasContext && canvasContext.trim()) {
    ragInstructions += `\n[ELEMENTOS ATUAIS NO CANVAS EXCALIDRAW]:\n${canvasContext}\n`;
  }

  const base = systemPrompt.trim();
  const augmentedSystemPrompt = `${base}${ragInstructions}`.trim();

  return {
    augmentedSystemPrompt,
    analysis: {
      operation: analysis.operation,
      confidence: analysis.confidence,
      detectedKeywords: analysis.detectedKeywords,
      previousDiagram,
      canvasContext,
      augmentedSystemPrompt,
    },
  };
}

