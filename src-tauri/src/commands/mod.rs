pub mod audio;
pub mod gemini;
pub mod history;
pub mod models;
pub mod transcription;

use crate::adaptive_runtime::{
    get_calibration_states, recalibrate_whisper_model, CalibrationStatusSnapshot,
};
use crate::context_detector::{detect_current_app_context, AppTranscriptionContext};
use crate::runtime_observability::{collect_runtime_diagnostics, RuntimeDiagnostics};
use crate::settings::{get_settings, write_settings, AppSettings, CalibrationPhase, LogLevel};
use crate::utils::cancel_current_operation;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub fn cancel_operation(app: AppHandle) {
    cancel_current_operation(&app);
}

#[tauri::command]
#[specta::specta]
pub fn toggle_pause(app: AppHandle) -> bool {
    let audio_manager =
        app.state::<std::sync::Arc<crate::managers::audio::AudioRecordingManager>>();
    if !audio_manager.is_recording() {
        return false;
    }
    let paused = audio_manager.toggle_pause();
    crate::overlay::emit_recording_paused(&app, paused);
    paused
}

#[tauri::command]
#[specta::specta]
pub fn get_app_dir_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(get_settings(&app))
}

#[tauri::command]
#[specta::specta]
pub fn get_default_settings() -> Result<AppSettings, String> {
    Ok(crate::settings::get_default_settings())
}

#[tauri::command]
#[specta::specta]
pub fn get_log_dir_path(app: AppHandle) -> Result<String, String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    Ok(log_dir.to_string_lossy().to_string())
}

#[specta::specta]
#[tauri::command]
pub fn set_log_level(app: AppHandle, level: LogLevel) -> Result<(), String> {
    let tauri_log_level: tauri_plugin_log::LogLevel = level.into();
    let log_level: log::Level = tauri_log_level.into();
    // Update the file log level atomic so the filter picks up the new level
    crate::FILE_LOG_LEVEL.store(
        log_level.to_level_filter() as u8,
        std::sync::atomic::Ordering::Relaxed,
    );

    let mut settings = get_settings(&app);
    settings.log_level = level;
    write_settings(&app, settings);

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_recordings_folder(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let recordings_dir = app_data_dir.join("recordings");

    let path = recordings_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open recordings folder: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> Result<(), String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    let path = log_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open log directory: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_app_data_dir(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let path = app_data_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open app data directory: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn export_settings(app: AppHandle, path: String) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.gemini_api_key = None;
    settings.external_script_path = None;
    settings.post_process_api_keys.values_mut().for_each(String::clear);
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write file: {}", e))?;
    log::info!("Settings exported to {}", path);
    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn import_settings(app: AppHandle, path: String) -> Result<(), String> {
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let mut settings: AppSettings =
        serde_json::from_str(&json).map_err(|e| format!("Invalid settings file: {}", e))?;
    settings.gemini_api_key = None;
    settings.external_script_path = None;
    settings.post_process_api_keys.values_mut().for_each(String::clear);
    write_settings(&app, settings);
    log::info!("Settings imported from {}", path);
    Ok(())
}

/// Check if Apple Intelligence is available on this device.
/// Called by the frontend when the user selects Apple Intelligence provider.
#[specta::specta]
#[tauri::command]
pub fn check_apple_intelligence_available() -> bool {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        crate::apple_intelligence::check_apple_intelligence_availability()
    }
    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        false
    }
}

/// Try to initialize Enigo (keyboard/mouse simulation).
/// On macOS, this will return an error if accessibility permissions are not granted.
#[specta::specta]
#[tauri::command]
pub fn initialize_enigo(app: AppHandle) -> Result<(), String> {
    use crate::input::EnigoState;

    // Check if already initialized
    if app.try_state::<EnigoState>().is_some() {
        log::debug!("Enigo already initialized");
        return Ok(());
    }

    // Try to initialize
    match EnigoState::new() {
        Ok(enigo_state) => {
            app.manage(enigo_state);
            log::info!("Enigo initialized successfully after permission grant");
            Ok(())
        }
        Err(e) => {
            if cfg!(target_os = "macos") {
                log::warn!(
                    "Failed to initialize Enigo: {} (accessibility permissions may not be granted)",
                    e
                );
            } else {
                log::warn!("Failed to initialize Enigo: {}", e);
            }
            Err(format!("Failed to initialize input system: {}", e))
        }
    }
}

/// Marker state to track if shortcuts have been initialized.
pub struct ShortcutsInitialized;

/// Initialize keyboard shortcuts.
/// On macOS, this should be called after accessibility permissions are granted.
/// This is idempotent - calling it multiple times is safe.
#[specta::specta]
#[tauri::command]
pub fn initialize_shortcuts(app: AppHandle) -> Result<(), String> {
    // Check if already initialized
    if app.try_state::<ShortcutsInitialized>().is_some() {
        log::debug!("Shortcuts already initialized");
        return Ok(());
    }

    // Initialize shortcuts
    crate::shortcut::init_shortcuts(&app);

    // Mark as initialized
    app.manage(ShortcutsInitialized);

    log::info!("Shortcuts initialized successfully");
    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn get_runtime_diagnostics(app: AppHandle) -> Result<RuntimeDiagnostics, String> {
    Ok(collect_runtime_diagnostics(&app))
}

#[specta::specta]
#[tauri::command]
pub fn export_runtime_diagnostics(app: AppHandle, path: String) -> Result<(), String> {
    let diagnostics = collect_runtime_diagnostics(&app);
    let json = serde_json::to_string_pretty(&diagnostics)
        .map_err(|e| format!("Failed to serialize runtime diagnostics: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write diagnostics file: {}", e))?;
    log::info!("Runtime diagnostics exported to {}", path);
    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn get_current_app_context() -> Result<AppTranscriptionContext, String> {
    Ok(detect_current_app_context())
}

#[specta::specta]
#[tauri::command]
pub fn get_adaptive_runtime_profile(
    app: AppHandle,
) -> Result<Option<crate::settings::AdaptiveMachineProfile>, String> {
    Ok(get_settings(&app).adaptive_machine_profile)
}

#[specta::specta]
#[tauri::command]
pub fn get_adaptive_calibration_state() -> Result<Vec<CalibrationStatusSnapshot>, String> {
    Ok(get_calibration_states())
}

#[specta::specta]
#[tauri::command]
pub fn recalibrate_whisper_model_command(
    app: AppHandle,
    model_id: String,
    phase: Option<CalibrationPhase>,
) -> Result<(), String> {
    let model_manager = app.state::<std::sync::Arc<crate::managers::model::ModelManager>>();
    recalibrate_whisper_model(&app, model_manager.inner().clone(), &model_id, phase);
    Ok(())
}
