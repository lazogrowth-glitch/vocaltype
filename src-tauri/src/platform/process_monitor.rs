//! Detect running meeting applications.
//!
//! Checks whether a known conferencing app (Zoom, Teams, Google Meet browser,
//! FaceTime, Webex, etc.) is currently running, and returns its display name.

use sysinfo::System;

/// Display name of a detected meeting app, or `None` if none is running.
pub fn detect_meeting_app() -> Option<String> {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);

    for process in sys.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        if let Some(label) = match_meeting_process(&name) {
            return Some(label.to_string());
        }
    }

    None
}

fn match_meeting_process(name: &str) -> Option<&'static str> {
    // Match the most common conferencing apps by process name fragment.
    if name.contains("zoom") {
        return Some("Zoom");
    }
    if name.contains("teams") {
        return Some("Microsoft Teams");
    }
    if name.contains("webex") {
        return Some("Webex");
    }
    if name.contains("facetime") {
        return Some("FaceTime");
    }
    if name.contains("meet") && name.contains("google") {
        return Some("Google Meet");
    }
    if name.contains("slack") {
        return Some("Slack");
    }
    if name.contains("discord") {
        return Some("Discord");
    }
    if name.contains("skype") {
        return Some("Skype");
    }
    None
}
