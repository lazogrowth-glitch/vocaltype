use crate::managers::meetings::{MeetingEntry, MeetingManager};
use crate::platform::process_monitor::detect_meeting_app;
use std::sync::Arc;
use tauri::{AppHandle, State};

// Re-export so frontend can close the active meeting (start a fresh one next time).
use crate::actions::meeting::close_active_meeting;

#[tauri::command]
#[specta::specta]
pub fn get_meetings(
    meeting_manager: State<Arc<MeetingManager>>,
) -> Result<Vec<MeetingEntry>, String> {
    meeting_manager.get_meetings().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_meeting(
    meeting_manager: State<Arc<MeetingManager>>,
    title: String,
    app_name: String,
) -> Result<MeetingEntry, String> {
    meeting_manager
        .create_meeting(&title, &app_name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_meeting(
    meeting_manager: State<Arc<MeetingManager>>,
    id: i64,
    title: String,
    transcript: String,
) -> Result<(), String> {
    meeting_manager
        .update_meeting(id, &title, &transcript)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_meeting(meeting_manager: State<Arc<MeetingManager>>, id: i64) -> Result<(), String> {
    meeting_manager
        .delete_meeting(id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn search_meetings(
    meeting_manager: State<Arc<MeetingManager>>,
    query: String,
) -> Result<Vec<MeetingEntry>, String> {
    meeting_manager
        .search_meetings(&query)
        .map_err(|e| e.to_string())
}

/// Returns the name of the currently running meeting app, or `null` if none detected.
#[tauri::command]
#[specta::specta]
pub fn detect_active_meeting_app(_app: AppHandle) -> Option<String> {
    detect_meeting_app()
}

/// Close the active meeting so the next `meeting_key` press starts a fresh one.
#[tauri::command]
#[specta::specta]
pub fn close_meeting(_app: AppHandle) {
    close_active_meeting();
}
