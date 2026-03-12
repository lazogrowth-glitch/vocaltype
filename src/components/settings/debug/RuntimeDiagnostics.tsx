import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import type { RuntimeDiagnosticsSnapshot } from "../../../types/runtimeObservability";

export const RuntimeDiagnostics: React.FC<{ grouped?: boolean }> = ({
  grouped = true,
}) => {
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState<RuntimeDiagnosticsSnapshot | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const recentErrors = useMemo(
    () => (snapshot?.recent_errors ?? []).slice(-5).reverse(),
    [snapshot],
  );

  const handleCapture = async () => {
    setBusy(true);
    try {
      const data = await invoke<RuntimeDiagnosticsSnapshot>(
        "get_runtime_diagnostics",
      );
      setSnapshot(data);
      setStatus(
        t("settings.debug.runtimeDiagnostics.captured", {
          defaultValue: "Diagnostics captured",
        }),
      );
    } catch (error) {
      setStatus(
        t("settings.debug.runtimeDiagnostics.captureFailed", {
          defaultValue: "Capture failed: {{error}}",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const path = await save({
        defaultPath: "vocaltype-runtime-diagnostics.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) {
        setBusy(false);
        return;
      }
      await invoke("export_runtime_diagnostics", { path });
      setStatus(
        t("settings.debug.runtimeDiagnostics.exported", {
          defaultValue: "Diagnostics exported",
        }),
      );
    } catch (error) {
      setStatus(
        t("settings.debug.runtimeDiagnostics.exportFailed", {
          defaultValue: "Export failed: {{error}}",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <SettingContainer
      title={t("settings.debug.runtimeDiagnostics.title", {
        defaultValue: "Runtime Diagnostics",
      })}
      description={t("settings.debug.runtimeDiagnostics.description", {
        defaultValue:
          "Capture and export a runtime snapshot for troubleshooting transcription and paste issues.",
      })}
      grouped={grouped}
      layout="stacked"
    >
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCapture}
          disabled={busy}
        >
          {t("settings.debug.runtimeDiagnostics.capture", {
            defaultValue: "Capture",
          })}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExport}
          disabled={busy}
        >
          {t("settings.debug.runtimeDiagnostics.export", {
            defaultValue: "Export JSON",
          })}
        </Button>
        {status && <span className="text-xs text-mid-gray">{status}</span>}
      </div>

      {snapshot && (
        <div className="mt-2 text-xs text-text/80 space-y-1 border border-mid-gray/20 rounded-lg p-2">
          <p>
            {t("settings.debug.runtimeDiagnostics.lifecycle", {
              defaultValue: "Lifecycle",
            })}
            : <span className="font-semibold">{snapshot.lifecycle_state}</span>
          </p>
          <p>
            {t("settings.debug.runtimeDiagnostics.model", {
              defaultValue: "Model",
            })}
            :{" "}
            <span className="font-semibold">
              {snapshot.loaded_model_name ||
                snapshot.loaded_model_id ||
                snapshot.selected_model}
            </span>
          </p>
          <p>
            {t("settings.debug.runtimeDiagnostics.pasteMethod", {
              defaultValue: "Paste method",
            })}
            : <span className="font-semibold">{snapshot.paste_method}</span>
          </p>
          <p>
            {t("settings.debug.runtimeDiagnostics.updatedAt", {
              defaultValue: "Captured at",
            })}
            : {new Date(snapshot.captured_at_ms).toLocaleString(i18n.language)}
          </p>
          {recentErrors.length > 0 && (
            <div className="pt-1">
              <p className="font-semibold mb-1">
                {t("settings.debug.runtimeDiagnostics.recentErrors", {
                  defaultValue: "Recent runtime errors",
                })}
              </p>
              {recentErrors.map((err) => (
                <p key={`${err.code}-${err.timestamp_ms}`} className="truncate">
                  [{err.stage}] {err.code}: {err.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </SettingContainer>
  );
};
