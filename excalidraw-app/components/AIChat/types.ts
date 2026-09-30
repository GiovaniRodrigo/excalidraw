import type { ReactNode } from "react";

export type AgentPersonaId =
  | "antigravity"
  | "architect"
  | "flowchart"
  | "canvas_reviewer"
  | "frontend_coder"
  | "general_assistant";

export interface AgentPersona {
  id: AgentPersonaId;
  name: string;
  tagline: string;
  badge: string;
  avatar: string;
  description: string;
  systemPrompt: string;
  suggestedPrompts: Array<{
    title: string;
    prompt: string;
    icon?: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  agentId?: AgentPersonaId;
  isStreaming?: boolean;
  error?: string;
  hasMermaid?: boolean;
  mermaidCode?: string;
}

export interface AIChatWidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  activeAgentId: AgentPersonaId;
}
