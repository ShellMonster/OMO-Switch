use crate::i18n;
use tauri::command;

#[command]
pub fn get_locale() -> String {
    i18n::get_locale()
}

#[command]
pub fn set_locale(locale: String) -> Result<(), String> {
    i18n::set_locale(&locale);
    Ok(())
}
