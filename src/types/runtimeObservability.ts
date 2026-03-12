export type TranscriptionLifecycleState =
  | "idle"
  | "recording"
  | "transcribing"
  | "processing"
  | "pasting"
  | "error";

export type RuntimeErrorStage =
  | "capture"
  | "vad"
  | "transcription"
  | "post_process"
  | "paste"
  | "shortcut"
  | "model"
  | "system"
  | "unknown";

export interface LifecycleStateEvent {
  state: TranscriptionLifecycleState;
  binding_id?: string | null;
  detail?: string | null;
  timestamp_ms: number;
}

export interface RuntimeErrorEvent {
  code: string;
  stage: RuntimeErrorStage;
  message: string;
  recoverable: boolean;
  timestamp_ms: number;
}

export interface RuntimeDiagnosticsSnapshot {
  captured_at_ms: number;
  app_version: string;
  lifecycle_state: TranscriptionLifecycleState;
  last_lifecycle_event: LifecycleStateEvent;
  recent_errors: RuntimeErrorEvent[];
  selected_model: string;
  loaded_model_id?: string | null;
  loaded_model_name?: string | null;
  model_loaded: boolean;
  paste_method: string;
  clipboard_handling: string;
  selected_language: string;
  selected_microphone?: string | null;
  selected_output_device?: string | null;
  is_recording: boolean;
  is_paused: boolean;
}
