import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import type {
  MachineStatusMode,
  RuntimeDiagnosticsSnapshot,
} from "@/types/runtimeObservability";

const MODE_STYLES: Record<MachineStatusMode, string> = {
  optimal:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  battery:
    "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  saver:
    "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  thermal:
    "border-red-500/25 bg-red-500/10 text-red-950 dark:text-red-100",
  memory_limited:
    "border-orange-500/25 bg-orange-500/10 text-orange-950 dark:text-orange-100",
  fallback:
    "border-sky-500/25 bg-sky-500/10 text-sky-950 dark:text-sky-100",
  calibrating:
    "border-violet-500/25 bg-violet-500/10 text-violet-950 dark:text-violet-100",
};

async function fetchDiagnostics(): Promise<RuntimeDiagnosticsSnapshot | null> {
  const result = await commands.getRuntimeDiagnostics();
  if (result.status === "ok") {
    return result.data as RuntimeDiagnosticsSnapshot;
  }
  return null;
}

export const MachineStatusBar: React.FC = () => {
  const [snapshot, setSnapshot] = useState<RuntimeDiagnosticsSnapshot | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const next = await fetchDiagnostics();
      if (active) {
        setSnapshot(next);
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);

    const unlistenAdaptive = listen("adaptive-profile-updated", () => {
      void refresh();
    });
    const unlistenLifecycle = listen("transcription-lifecycle", () => {
      void refresh();
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      void unlistenAdaptive.then((fn) => fn());
      void unlistenLifecycle.then((fn) => fn());
    };
  }, []);

  const status = snapshot?.machine_status;
  if (!status) {
    return null;
  }

  return (
    <div className="w-full px-4 pt-4">
      <div
        className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${MODE_STYLES[status.mode]}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold">{status.headline}</span>
          {status.active_model_id && (
            <span className="text-current/80">
              {status.active_model_id}
              {status.active_backend ? ` · ${status.active_backend}` : ""}
            </span>
          )}
        </div>
        <p className="mt-1 text-current/80">{status.detail}</p>
      </div>
    </div>
  );
};
