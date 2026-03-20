use crate::dictionary::{DictionaryEntry, DictionaryManager};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub fn get_dictionary(
    dictionary: State<'_, Arc<DictionaryManager>>,
) -> Vec<DictionaryEntry> {
    dictionary.entries()
}

#[tauri::command]
#[specta::specta]
pub fn add_dictionary_entry(
    dictionary: State<'_, Arc<DictionaryManager>>,
    from: String,
    to: String,
) -> Result<(), String> {
    dictionary.add(from, to)
}

#[tauri::command]
#[specta::specta]
pub fn remove_dictionary_entry(
    dictionary: State<'_, Arc<DictionaryManager>>,
    from: String,
) -> Result<(), String> {
    dictionary.remove(&from)
}

#[tauri::command]
#[specta::specta]
pub fn update_dictionary_entry(
    dictionary: State<'_, Arc<DictionaryManager>>,
    from: String,
    to: String,
) -> Result<(), String> {
    dictionary.update(&from, to)
}

#[tauri::command]
#[specta::specta]
pub fn clear_dictionary(
    dictionary: State<'_, Arc<DictionaryManager>>,
) -> Result<(), String> {
    dictionary.clear()
}
