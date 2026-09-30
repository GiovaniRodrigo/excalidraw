export type LLMProviderType =
  | "antigravity"
  | "ollama"
  | "lmstudio"
  | "openai"
  | "gemini"
  | "groq"
  | "openrouter"
  | "custom"
  | "default";

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
  visionModel: string;
  temperature: number;
  systemPrompt?: string;
  customHeaders?: Record<string, string>;
}

export interface ProviderMetadata {
  id: LLMProviderType;
  name: string;
  description: string;
  category: "local" | "web";
  defaultBaseUrl: string;
  defaultModel: string;
  defaultVisionModel: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder: string;
  docUrl?: string;
  popularModels: string[];
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  availableModels?: string[];
}
