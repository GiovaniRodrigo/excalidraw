import React, { useState, useEffect } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import {
  brainIcon,
  checkIcon,
  CloseIcon,
  ExternalLinkIcon,
} from "@excalidraw/excalidraw/components/icons";

import { atom, useAtom, useSetAtom } from "../../app-jotai";
import {
  getStoredLLMConfig,
  saveStoredLLMConfig,
  resetStoredLLMConfig,
  PROVIDERS_METADATA,
  getDefaultConfigForProvider,
} from "../../services/llm/config";
import { testLLMConnection } from "../../services/llm/llmService";

import "./LLMSettingsDialog.scss";

import type {
  LLMConfig,
  LLMProviderType,
  TestConnectionResult,
} from "../../services/llm/types";

export const llmSettingsDialogStateAtom = atom<{ isOpen: boolean }>({
  isOpen: false,
});

export const llmConfigAtom = atom<LLMConfig>(getStoredLLMConfig());

export const LLMSettingsDialog: React.FC = () => {
  const [dialogState, setDialogState] = useAtom(llmSettingsDialogStateAtom);
  const setGlobalConfig = useSetAtom(llmConfigAtom);

  const [formConfig, setFormConfig] = useState<LLMConfig>(() =>
    getStoredLLMConfig(),
  );
  const [categoryFilter, setCategoryFilter] = useState<"all" | "local" | "web">(
    "all",
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (dialogState.isOpen) {
      const current = getStoredLLMConfig();
      setFormConfig(current);
      setTestResult(null);
      setSaveSuccess(false);
      setDiscoveredModels([]);
    }
  }, [dialogState.isOpen]);

  if (!dialogState.isOpen) {
    return null;
  }

  const handleClose = () => {
    setDialogState({ isOpen: false });
  };

  const handleProviderChange = (provider: LLMProviderType) => {
    const defaultForProvider = getDefaultConfigForProvider(provider);
    setFormConfig((prev) => ({
      ...prev,
      provider,
      baseUrl: defaultForProvider.baseUrl,
      model: defaultForProvider.model,
      visionModel: defaultForProvider.visionModel,
      apiKey: provider === prev.provider ? prev.apiKey : "",
    }));
    setTestResult(null);
    setDiscoveredModels([]);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testLLMConnection(formConfig);
      setTestResult(res);
      if (res.availableModels && res.availableModels.length > 0) {
        setDiscoveredModels(res.availableModels);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Erro desconhecido ao testar conexão",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveStoredLLMConfig(formConfig);
    setGlobalConfig(formConfig);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      handleClose();
    }, 600);
  };

  const handleReset = () => {
    const defaultConfig = resetStoredLLMConfig();
    setFormConfig(defaultConfig);
    setGlobalConfig(defaultConfig);
    setTestResult(null);
    setDiscoveredModels([]);
  };

  const currentMeta =
    PROVIDERS_METADATA[formConfig.provider] || PROVIDERS_METADATA.ollama;
  const providersList = Object.values(PROVIDERS_METADATA).filter((meta) => {
    if (categoryFilter === "all") {
      return true;
    }
    return meta.category === categoryFilter;
  });

  const availableModelsList = Array.from(
    new Set([
      ...(discoveredModels.length > 0 ? discoveredModels : []),
      ...currentMeta.popularModels,
    ]),
  );

  return (
    <Dialog
      className="llm-settings-dialog"
      onCloseRequest={handleClose}
      title={false}
      size={720}
      autofocus={false}
    >
      <div className="llm-settings-header">
        <div className="llm-settings-header-icon">{brainIcon}</div>
        <div>
          <h2>Configurações de IA / LLM</h2>
          <p>
            Configure modelos locais (Ollama, LM Studio) ou provedores em nuvem
            (OpenAI, Gemini, Groq, OpenRouter) para Texto-para-Diagrama e
            Diagrama-para-Código.
          </p>
        </div>
      </div>

      <div className="llm-category-tabs">
        <button
          type="button"
          className={categoryFilter === "all" ? "active" : ""}
          onClick={() => setCategoryFilter("all")}
        >
          Todos os Provedores
        </button>
        <button
          type="button"
          className={categoryFilter === "local" ? "active" : ""}
          onClick={() => setCategoryFilter("local")}
        >
          Modelos Locais (Ollama / LM Studio)
        </button>
        <button
          type="button"
          className={categoryFilter === "web" ? "active" : ""}
          onClick={() => setCategoryFilter("web")}
        >
          Modelos em Nuvem (OpenAI / Gemini / Groq)
        </button>
      </div>

      <div className="llm-providers-grid">
        {providersList.map((meta) => (
          <button
            key={meta.id}
            type="button"
            className={`llm-provider-chip ${
              formConfig.provider === meta.id ? "active" : ""
            }`}
            onClick={() => handleProviderChange(meta.id)}
          >
            <span className="provider-name">{meta.name.split(" ")[0]}</span>
            <span
              className={`provider-tag ${
                meta.category === "local" ? "tag-local" : "tag-web"
              }`}
            >
              {meta.category === "local" ? "Local" : "Nuvem"}
            </span>
          </button>
        ))}
      </div>

      <div className="llm-provider-info-box">
        <div>
          <strong>{currentMeta.name}:</strong> {currentMeta.description}
        </div>
        {currentMeta.docUrl && (
          <a
            href={currentMeta.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="doclink doc-link"
          >
            Obter chave de API ou documentação
            <span style={{ width: 14, height: 14, display: "inline-flex" }}>
              {ExternalLinkIcon}
            </span>
          </a>
        )}
      </div>

      <div className="llm-form-section">
        {/* Base URL */}
        <div className="form-group">
          <label htmlFor="llm-base-url">
            URL Base do Servidor
            <span className="label-hint">Endpoint da API</span>
          </label>
          <div className="input-with-button">
            <input
              id="llm-base-url"
              type="text"
              value={formConfig.baseUrl}
              onChange={(e) =>
                setFormConfig({ ...formConfig, baseUrl: e.target.value })
              }
              placeholder={currentMeta.defaultBaseUrl}
            />
            {formConfig.baseUrl !== currentMeta.defaultBaseUrl && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "0 0.5rem" }}
                onClick={() =>
                  setFormConfig({
                    ...formConfig,
                    baseUrl: currentMeta.defaultBaseUrl,
                  })
                }
              >
                Padrão
              </button>
            )}
          </div>
        </div>

        {/* API Key if required/supported */}
        {formConfig.provider !== "default" && (
          <div className="form-group">
            <label htmlFor="llm-api-key">
              Chave de API (API Key)
              <span className="label-hint">
                {currentMeta.requiresApiKey ? "Obrigatória" : "Opcional"} •
                Salva apenas no seu navegador
              </span>
            </label>
            <div className="input-with-button">
              <input
                id="llm-api-key"
                type={showApiKey ? "text" : "password"}
                value={formConfig.apiKey}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, apiKey: e.target.value })
                }
                placeholder={currentMeta.apiKeyPlaceholder}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "0 0.5rem" }}
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        )}

        {/* Model Selection */}
        <div className="form-group">
          <label htmlFor="llm-model">
            Modelo Principal (Texto para Diagrama)
            <span className="label-hint">Nome do modelo</span>
          </label>
          <input
            id="llm-model"
            type="text"
            value={formConfig.model}
            onChange={(e) =>
              setFormConfig({ ...formConfig, model: e.target.value })
            }
            placeholder={currentMeta.defaultModel}
          />
          <div className="preset-models">
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary-color)",
                alignSelf: "center",
                marginRight: 4,
              }}
            >
              Sugestões:
            </span>
            {availableModelsList.map((m) => (
              <button
                key={m}
                type="button"
                className={formConfig.model === m ? "active" : ""}
                onClick={() => setFormConfig({ ...formConfig, model: m })}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <div>
          <button
            type="button"
            className="btn-secondary"
            style={{
              fontSize: "0.8rem",
              padding: "0.3rem 0.6rem",
              background: "transparent",
              border: "none",
              color: "var(--color-primary, #4f46e5)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced
              ? "▲ Ocultar Opções Avançadas"
              : "▼ Opções Avançadas (Modelo de Visão, Temperatura, System Prompt)"}
          </button>
        </div>

        {showAdvanced && (
          <>
            {/* Vision Model */}
            <div className="form-group">
              <label htmlFor="llm-vision-model">
                Modelo de Visão (Diagrama para Código / Wireframe)
                <span className="label-hint">Usado com imagens</span>
              </label>
              <input
                id="llm-vision-model"
                type="text"
                value={formConfig.visionModel}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, visionModel: e.target.value })
                }
                placeholder={currentMeta.defaultVisionModel}
              />
            </div>

            {/* Temperature */}
            <div className="form-group">
              <label htmlFor="llm-temperature">
                Temperatura: {formConfig.temperature}
                <span className="label-hint">
                  0 = mais determinístico / preciso
                </span>
              </label>
              <input
                id="llm-temperature"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formConfig.temperature}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>

            {/* System prompt override */}
            <div className="form-group">
              <label htmlFor="llm-system-prompt">
                System Prompt Personalizado
                <span className="label-hint">Opcional</span>
              </label>
              <textarea
                id="llm-system-prompt"
                rows={3}
                value={formConfig.systemPrompt || ""}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, systemPrompt: e.target.value })
                }
                placeholder="Deixe em branco para usar o prompt padrão otimizado para Mermaid"
              />
            </div>
          </>
        )}
      </div>

      {/* Test feedback */}
      {isTesting && (
        <div className="llm-test-result loading">
          Testando conexão com {currentMeta.name}...
        </div>
      )}

      {testResult && (
        <div
          className={`llm-test-result ${
            testResult.success ? "success" : "error"
          }`}
        >
          {testResult.success ? (
            <span style={{ width: 18, height: 18, display: "inline-flex" }}>
              {checkIcon}
            </span>
          ) : (
            <span style={{ width: 18, height: 18, display: "inline-flex" }}>
              {CloseIcon}
            </span>
          )}
          <div>{testResult.message}</div>
        </div>
      )}

      {/* Dialog Actions */}
      <div className="llm-dialog-actions">
        <div className="left-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            title="Restaurar padrões"
          >
            Restaurar Padrão
          </button>
        </div>

        <div className="right-actions">
          <button
            type="button"
            className="btn-test"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? "Testando..." : "Testar Conexão"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            {saveSuccess ? "Salvo com sucesso!" : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
