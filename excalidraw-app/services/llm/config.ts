import type { LLMConfig, LLMProviderType, ProviderMetadata } from "./types";

export const LLM_STORAGE_KEY = "excalidraw_llm_config";

export const PROVIDERS_METADATA: Record<LLMProviderType, ProviderMetadata> = {
  antigravity: {
    id: "antigravity",
    name: "Antigravity AI (DeepMind / Gemini)",
    description:
      "Motor inteligente Antigravity da Google DeepMind com suporte a raciocínio avançado, Gemini 2.0 Flash e agentes autônomos.",
    category: "web",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-1.5-flash",
    defaultVisionModel: "gemini-1.5-flash",
    requiresApiKey: true,
    apiKeyPlaceholder: "AIzaSy... (Chave Gemini / Google AI Studio)",
    docUrl: "https://aistudio.google.com/app/apikey",
    popularModels: [
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-lite-preview-02-05",
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    description:
      "Execute modelos localmente na sua máquina sem custos de API ou envio de dados à nuvem.",
    category: "local",
    defaultBaseUrl: "http://localhost:11434",
    defaultModel: "llama3.2",
    defaultVisionModel: "llama3.2-vision",
    requiresApiKey: false,
    apiKeyPlaceholder: "Opcional para Ollama local",
    docUrl: "https://ollama.com",
    popularModels: [
      "llama3.2",
      "llama3.1",
      "deepseek-r1:latest",
      "qwen2.5",
      "mistral",
      "gemma2",
      "phi3",
      "llama3.2-vision",
      "llava",
    ],
  },
  lmstudio: {
    id: "lmstudio",
    name: "LM Studio / LocalAI (Local)",
    description:
      "Servidor compatível com OpenAI rodando localmente no seu computador (LM Studio, LocalAI, Jan, vLLM).",
    category: "local",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    defaultVisionModel: "local-model",
    requiresApiKey: false,
    apiKeyPlaceholder: "Opcional (ex: not-needed)",
    docUrl: "https://lmstudio.ai",
    popularModels: ["local-model", "default"],
  },
  openai: {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    description:
      "Modelos GPT-4o, GPT-4o-mini e outros da OpenAI com alta precisão e suporte visual.",
    category: "web",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    defaultVisionModel: "gpt-4o-mini",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-...",
    docUrl: "https://platform.openai.com/api-keys",
    popularModels: [
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o1-mini",
      "o3-mini",
    ],
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description:
      "Modelos Gemini 1.5 Flash e Pro da Google com rapidez, precisão multimodal e cota gratuita generosa.",
    category: "web",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-1.5-flash",
    defaultVisionModel: "gemini-1.5-flash",
    requiresApiKey: true,
    apiKeyPlaceholder: "AIzaSy...",
    docUrl: "https://aistudio.google.com/app/apikey",
    popularModels: [
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-2.0-flash-lite-preview-02-05",
    ],
  },
  groq: {
    id: "groq",
    name: "Groq (Ultra Rápido)",
    description:
      "Inferência de altíssima velocidade em LPU para modelos open-source como Llama 3.3 e DeepSeek.",
    category: "web",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    defaultVisionModel: "llama-3.2-11b-vision-preview",
    requiresApiKey: true,
    apiKeyPlaceholder: "gsk_...",
    docUrl: "https://console.groq.com/keys",
    popularModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "deepseek-r1-distill-llama-70b",
      "llama-3.2-11b-vision-preview",
      "mixtral-8x7b-32768",
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description:
      "Acesso unificado a centenas de modelos (Claude 3.5 Sonnet, DeepSeek V3/R1, Llama 3, Gemini, etc.).",
    category: "web",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    defaultVisionModel: "openai/gpt-4o-mini",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-or-v1-...",
    docUrl: "https://openrouter.ai/keys",
    popularModels: [
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "openai/gpt-4o-mini",
      "google/gemini-flash-1.5",
    ],
  },
  custom: {
    id: "custom",
    name: "API OpenAI Personalizada",
    description:
      "Conecte qualquer gateway de IA, proxy corporativo ou servidor compatível com a API OpenAI.",
    category: "web",
    defaultBaseUrl: "https://api.example.com/v1",
    defaultModel: "gpt-4o-mini",
    defaultVisionModel: "gpt-4o-mini",
    requiresApiKey: false,
    apiKeyPlaceholder: "Chave de API (se exigida)",
    popularModels: ["gpt-4o-mini", "default"],
  },
  default: {
    id: "default",
    name: "Backend Padrão Excalidraw",
    description:
      "Usa o backend padrão configurado nas variáveis de ambiente do projeto.",
    category: "web",
    defaultBaseUrl:
      typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_AI_BACKEND
        ? import.meta.env.VITE_APP_AI_BACKEND
        : "http://localhost:3016",
    defaultModel: "default",
    defaultVisionModel: "default",
    requiresApiKey: false,
    apiKeyPlaceholder: "Não necessário",
    popularModels: ["default"],
  },
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "antigravity",
  apiKey: "",
  baseUrl: PROVIDERS_METADATA.antigravity.defaultBaseUrl,
  model: PROVIDERS_METADATA.antigravity.defaultModel,
  visionModel: PROVIDERS_METADATA.antigravity.defaultVisionModel,
  temperature: 0.2,
};

export const getStoredLLMConfig = (): LLMConfig => {
  try {
    const raw = localStorage.getItem(LLM_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LLM_CONFIG;
    }
    const parsed = JSON.parse(raw);
    const provider: LLMProviderType = parsed.provider || "antigravity";
    const meta =
      PROVIDERS_METADATA[provider] || PROVIDERS_METADATA.antigravity;

    let baseUrl = parsed.baseUrl || meta.defaultBaseUrl;
    if (
      (provider === "antigravity" || provider === "gemini") &&
      (!baseUrl || baseUrl.includes("generativelanguage.googleapis.com"))
    ) {
      baseUrl = meta.defaultBaseUrl;
    }

    return {
      provider,
      apiKey: parsed.apiKey ?? "",
      baseUrl,
      model: parsed.model || meta.defaultModel,
      visionModel: parsed.visionModel || meta.defaultVisionModel,
      temperature:
        typeof parsed.temperature === "number" ? parsed.temperature : 0.2,
      systemPrompt: parsed.systemPrompt,
      customHeaders: parsed.customHeaders,
    };
  } catch (e) {
    console.warn("Failed to load LLM config from localStorage:", e);
    return DEFAULT_LLM_CONFIG;
  }
};

export const saveStoredLLMConfig = (config: LLMConfig): void => {
  try {
    localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent("excalidraw_llm_config_changed", { detail: config }),
    );
  } catch (e) {
    console.error("Failed to save LLM config to localStorage:", e);
  }
};

export const resetStoredLLMConfig = (): LLMConfig => {
  try {
    localStorage.removeItem(LLM_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("excalidraw_llm_config_changed", {
        detail: DEFAULT_LLM_CONFIG,
      }),
    );
  } catch (e) {
    console.error("Failed to reset LLM config in localStorage:", e);
  }
  return DEFAULT_LLM_CONFIG;
};

export const getDefaultConfigForProvider = (
  provider: LLMProviderType,
): LLMConfig => {
  const meta = PROVIDERS_METADATA[provider] || PROVIDERS_METADATA.ollama;
  return {
    provider,
    apiKey: "",
    baseUrl: meta.defaultBaseUrl,
    model: meta.defaultModel,
    visionModel: meta.defaultVisionModel,
    temperature: 0.2,
  };
};
