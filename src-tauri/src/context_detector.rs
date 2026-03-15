use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum AppContextCategory {
    Code,
    Email,
    Chat,
    Document,
    Browser,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct AppTranscriptionContext {
    pub process_name: Option<String>,
    pub window_title: Option<String>,
    pub category: AppContextCategory,
    pub detected_at_ms: u64,
}

#[derive(Debug, Default)]
pub struct ActiveAppContextSnapshot {
    active_by_binding: HashMap<String, AppTranscriptionContext>,
    last_transcription_app_context: Option<AppTranscriptionContext>,
}

impl ActiveAppContextSnapshot {
    pub fn set_active_context(&mut self, binding_id: &str, context: AppTranscriptionContext) {
        self.active_by_binding.insert(binding_id.to_string(), context);
    }

    pub fn clear_active_context(&mut self, binding_id: &str) {
        self.active_by_binding.remove(binding_id);
    }

    pub fn active_context_for_binding(&self, binding_id: &str) -> Option<AppTranscriptionContext> {
        self.active_by_binding.get(binding_id).cloned()
    }

    pub fn set_last_transcription_context(&mut self, context: AppTranscriptionContext) {
        self.last_transcription_app_context = Some(context);
    }

    pub fn last_transcription_context(&self) -> Option<AppTranscriptionContext> {
        self.last_transcription_app_context.clone()
    }
}

pub struct ActiveAppContextState(pub Mutex<ActiveAppContextSnapshot>);

impl AppTranscriptionContext {
    pub fn unknown(process_name: Option<String>, window_title: Option<String>) -> Self {
        Self {
            category: AppContextCategory::Unknown,
            process_name,
            window_title,
            detected_at_ms: crate::runtime_observability::now_ms(),
        }
    }
}

pub fn classify_process_name(process_name: &str) -> AppContextCategory {
    match process_name.trim().to_ascii_lowercase().as_str() {
        "code.exe" | "cursor.exe" | "windsurf.exe" | "codium.exe" | "devenv.exe" => {
            AppContextCategory::Code
        }
        "outlook.exe" | "thunderbird.exe" => AppContextCategory::Email,
        "slack.exe" | "discord.exe" | "teams.exe" | "telegram.exe" => AppContextCategory::Chat,
        "winword.exe" | "notion.exe" | "obsidian.exe" => AppContextCategory::Document,
        "chrome.exe" | "msedge.exe" | "firefox.exe" => AppContextCategory::Browser,
        _ => AppContextCategory::Unknown,
    }
}

#[cfg(target_os = "windows")]
pub fn detect_current_app_context() -> AppTranscriptionContext {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows::Win32::Foundation::{CloseHandle, HWND};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_NATIVE, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
    };

    fn get_window_title(hwnd: HWND) -> Option<String> {
        unsafe {
            let len = GetWindowTextLengthW(hwnd);
            if len <= 0 {
                return None;
            }

            let mut buffer = vec![0u16; len as usize + 1];
            let copied = GetWindowTextW(hwnd, &mut buffer);
            if copied <= 0 {
                return None;
            }

            Some(String::from_utf16_lossy(&buffer[..copied as usize]))
        }
    }

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() {
            return AppTranscriptionContext::unknown(None, None);
        }

        let window_title = get_window_title(hwnd);
        let mut process_id = 0u32;
        let _thread_id = GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        if process_id == 0 {
            return AppTranscriptionContext::unknown(None, window_title);
        }

        let process_handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id)
        {
            Ok(handle) => handle,
            Err(_) => return AppTranscriptionContext::unknown(None, window_title),
        };

        let mut buffer = vec![0u16; 1024];
        let mut len = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(
            process_handle,
            PROCESS_NAME_NATIVE,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut len,
        );
        let _ = CloseHandle(process_handle);

        if result.is_err() || len == 0 {
            return AppTranscriptionContext::unknown(None, window_title);
        }

        let path = OsString::from_wide(&buffer[..len as usize]);
        let process_name = Path::new(&path)
            .file_name()
            .map(|name| name.to_string_lossy().to_ascii_lowercase());

        let category = process_name
            .as_deref()
            .map(classify_process_name)
            .unwrap_or(AppContextCategory::Unknown);

        AppTranscriptionContext {
            process_name,
            window_title,
            category,
            detected_at_ms: crate::runtime_observability::now_ms(),
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn detect_current_app_context() -> AppTranscriptionContext {
    AppTranscriptionContext::unknown(None, None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_known_process_names() {
        assert_eq!(classify_process_name("code.exe"), AppContextCategory::Code);
        assert_eq!(
            classify_process_name("outlook.exe"),
            AppContextCategory::Email
        );
        assert_eq!(classify_process_name("slack.exe"), AppContextCategory::Chat);
        assert_eq!(
            classify_process_name("winword.exe"),
            AppContextCategory::Document
        );
        assert_eq!(
            classify_process_name("firefox.exe"),
            AppContextCategory::Browser
        );
    }

    #[test]
    fn unknown_process_names_fall_back_to_unknown() {
        assert_eq!(
            classify_process_name("totally-unknown.exe"),
            AppContextCategory::Unknown
        );
    }

    #[test]
    fn unknown_context_builder_preserves_optional_fields() {
        let ctx = AppTranscriptionContext::unknown(None, None);
        assert_eq!(ctx.category, AppContextCategory::Unknown);
        assert!(ctx.process_name.is_none());
        assert!(ctx.window_title.is_none());
    }
}
