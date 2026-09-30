import { DiagramToCodePlugin, TTDDialog } from "@excalidraw/excalidraw";
import { settingsIcon } from "@excalidraw/excalidraw/components/icons";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { TTDIndexedDBAdapter } from "../data/TTDStorage";
import { PROVIDERS_METADATA } from "../services/llm/config";
import {
  generateDiagramToCode,
  streamTextToDiagram,
} from "../services/llm/llmService";

import {
  llmConfigAtom,
  llmSettingsDialogStateAtom,
  LLMSettingsDialog,
} from "./LLMSettings/LLMSettingsDialog";
import { AIChatWidget } from "./AIChat/AIChatWidget";

export const AIComponents = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  const setLlmSettingsDialogState = useSetAtom(llmSettingsDialogStateAtom);
  const activeConfig = useAtomValue(llmConfigAtom);

  return (
    <>
      <DiagramToCodePlugin
        generate={async ({ frame, children, onPartial }) => {
          const appState = excalidrawAPI.getAppState();
          const files = excalidrawAPI.getFiles();

          return generateDiagramToCode({
            frame,
            children,
            appState,
            files,
            onPartial,
          });
        }}
      />

      <TTDDialog
        onTextSubmit={async (props) => {
          const { onChunk, onStreamCreated, signal, messages } = props;

          return streamTextToDiagram({
            messages,
            onChunk,
            onStreamCreated,
            signal,
          });
        }}
        renderWelcomeScreen={() => {
          const providerMeta =
            PROVIDERS_METADATA[activeConfig.provider] ||
            PROVIDERS_METADATA.ollama;

          return (
            <div className="chat-interface__welcome-screen__welcome-message">
              <TTDDialog.WelcomeMessage />
              <div
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.4rem 0.85rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--dialog-border-color, #d1d5db)",
                    background: "var(--color-surface-lowest, #ffffff)",
                    color: "var(--text-primary-color, #374151)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 500,
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                  }}
                  onClick={() => setLlmSettingsDialogState({ isOpen: true })}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {settingsIcon}
                  </span>
                  <span>
                    IA: <strong>{providerMeta.name.split(" ")[0]}</strong> (
                    {activeConfig.model})
                  </span>
                </button>
              </div>
            </div>
          );
        }}
        persistenceAdapter={TTDIndexedDBAdapter}
      />

      <LLMSettingsDialog />
      <AIChatWidget excalidrawAPI={excalidrawAPI} />
    </>
  );
};
