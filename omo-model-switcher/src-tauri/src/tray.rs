use crate::services::{config_service, model_service};
use serde_json::Value;
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

const TRAY_ID: &str = "omo-tray";
const ACTION_PREFIX: &str = "set_model";
const ACTION_OPEN: &str = "open_omo_switch";
const ACTION_QUIT: &str = "quit_omo_switch";

const AGENT_NAME_ZH_CN: [(&str, &str); 17] = [
    ("sisyphus", "西西弗斯"),
    ("hephaestus", "赫菲斯托斯"),
    ("oracle", "神谕者"),
    ("librarian", "图书管理员"),
    ("explore", "探索者"),
    ("multimodal-looker", "多模态观察者"),
    ("prometheus", "普罗米修斯"),
    ("metis", "墨提斯"),
    ("momus", "摩摩斯"),
    ("atlas", "阿特拉斯"),
    ("build", "构建者"),
    ("plan", "规划者"),
    ("sisyphus-junior", "小西西弗斯"),
    ("OpenCode-Builder", "OpenCode构建器"),
    ("general", "通用代理"),
    ("frontend-ui-ux-engineer", "前端工程师"),
    ("document-writer", "文档撰写者"),
];

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray_menu(app)?;

    let mut tray_builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| {
            let id = event.id().0.as_str();

            if id == ACTION_OPEN {
                open_main_window(app_handle);
                return;
            }

            if id == ACTION_QUIT {
                app_handle.exit(0);
                return;
            }

            let Some((agent, model)) = parse_action_id(id) else {
                return;
            };

            if let Err(err) = update_agent_model(&agent, &model) {
                eprintln!("托盘切换模型失败: {}", err);
                return;
            }

            if let Err(err) = rebuild_tray_menu(app_handle) {
                eprintln!("托盘菜单刷新失败: {}", err);
            }
        });

    let icon_bytes = include_bytes!("../icons/32x32.png");
    let icon = Image::new_owned(icon_bytes.to_vec(), 32, 32);
    tray_builder = tray_builder.icon(icon);

    let _tray = tray_builder.build(app)?;
    Ok(())
}

fn build_tray_menu<R: Runtime, M: Manager<R>>(
    manager: &M,
) -> Result<tauri::menu::Menu<R>, Box<dyn std::error::Error>> {
    let config = config_service::read_omo_config()?;
    let connected_providers = model_service::get_connected_providers()?;
    let provider_models = model_service::get_available_models()?;

    let agents = config
        .get("agents")
        .and_then(|v| v.as_object())
        .ok_or("配置缺少 agents 字段")?;

    let locale = detect_locale();
    let mut menu_builder = MenuBuilder::new(manager);

    for (agent_name, agent_config) in agents {
        let current_model = agent_config
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("未配置");

        let agent_title = format!(
            "{} [{}]",
            build_agent_display_name(agent_name, locale),
            short_model_label(current_model)
        );
        let mut agent_submenu = SubmenuBuilder::new(manager, agent_title);

        for provider in &connected_providers {
            let Some(models) = provider_models.get(provider) else {
                continue;
            };

            let mut provider_submenu = SubmenuBuilder::new(manager, provider);
            for model in models {
                let item_id = build_action_id(agent_name, provider, model);
                let is_current = model == current_model;

                let model_item = CheckMenuItemBuilder::with_id(item_id, model)
                    .checked(is_current)
                    .build(manager)?;
                provider_submenu = provider_submenu.item(&model_item);
            }

            let provider_menu = provider_submenu.build()?;
            agent_submenu = agent_submenu.item(&provider_menu);
        }

        let agent_menu = agent_submenu.build()?;
        menu_builder = menu_builder.item(&agent_menu);
    }

    menu_builder = menu_builder.separator();

    let app_name = manager
        .config()
        .product_name
        .clone()
        .unwrap_or_else(|| "OMO Switch".to_string());
    let open_label = format!("Open {}", app_name);
    let open_item = MenuItemBuilder::with_id(ACTION_OPEN, &open_label).build(manager)?;
    let quit_item = MenuItemBuilder::with_id(ACTION_QUIT, "Quit").build(manager)?;

    menu_builder = menu_builder.item(&open_item);
    menu_builder = menu_builder.item(&quit_item);

    Ok(menu_builder.build()?)
}

fn rebuild_tray_menu<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<(), String> {
    let tray = app_handle
        .tray_by_id(TRAY_ID)
        .ok_or("未找到托盘图标".to_string())?;
    let new_menu = build_tray_menu(app_handle).map_err(|e| e.to_string())?;
    tray.set_menu(Some(new_menu)).map_err(|e| e.to_string())
}

fn open_main_window<R: Runtime>(app_handle: &tauri::AppHandle<R>) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn update_agent_model(agent_name: &str, model: &str) -> Result<(), String> {
    let mut config = config_service::read_omo_config()?;

    let agents = config
        .get_mut("agents")
        .and_then(|v| v.as_object_mut())
        .ok_or("配置缺少 agents 对象".to_string())?;

    let agent_obj = agents
        .get_mut(agent_name)
        .and_then(|v| v.as_object_mut())
        .ok_or(format!("未找到代理: {}", agent_name))?;

    agent_obj.insert("model".to_string(), Value::String(model.to_string()));
    config_service::write_omo_config(&config)
}

fn detect_locale() -> &'static str {
    let language = std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANG"))
        .unwrap_or_default()
        .to_lowercase();

    if language.starts_with("zh") {
        "zh-CN"
    } else if language.starts_with("ja") {
        "ja"
    } else if language.starts_with("ko") {
        "ko"
    } else {
        "en"
    }
}

fn build_agent_display_name(agent_name: &str, locale: &str) -> String {
    let english_name = format_agent_english_name(agent_name);

    if locale == "en" {
        return english_name;
    }

    let localized_name = AGENT_NAME_ZH_CN
        .iter()
        .find(|(name, _)| *name == agent_name)
        .map(|(_, localized)| *localized)
        .unwrap_or(agent_name);

    format!("{} · {}", english_name, localized_name)
}

fn format_agent_english_name(agent_name: &str) -> String {
    if agent_name == "OpenCode-Builder" {
        return "OpenCode Builder".to_string();
    }

    agent_name
        .split('-')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => {
                    let mut word = first.to_uppercase().to_string();
                    word.push_str(chars.as_str());
                    word
                }
                None => String::new(),
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}

fn short_model_label(model: &str) -> &str {
    model.rsplit('/').next().unwrap_or(model)
}

fn build_action_id(agent: &str, provider: &str, model: &str) -> String {
    format!(
        "{}:{}:{}:{}",
        ACTION_PREFIX,
        hex_encode(agent),
        hex_encode(provider),
        hex_encode(model)
    )
}

fn parse_action_id(id: &str) -> Option<(String, String)> {
    let mut parts = id.split(':');
    let prefix = parts.next()?;
    if prefix != ACTION_PREFIX {
        return None;
    }

    let agent = hex_decode(parts.next()?)?;
    let _provider = hex_decode(parts.next()?)?;
    let model = hex_decode(parts.next()?)?;

    Some((agent, model))
}

fn hex_encode(input: &str) -> String {
    input
        .as_bytes()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn hex_decode(input: &str) -> Option<String> {
    if input.len() % 2 != 0 {
        return None;
    }

    let bytes = (0..input.len())
        .step_by(2)
        .map(|idx| u8::from_str_radix(&input[idx..idx + 2], 16).ok())
        .collect::<Option<Vec<u8>>>()?;

    String::from_utf8(bytes).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_codec_roundtrip() {
        let original = "aicodewith/gpt-5.3-codex";
        let encoded = hex_encode(original);
        let decoded = hex_decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_action_id_roundtrip() {
        let id = build_action_id("sisyphus", "aicodewith", "aicodewith/gpt-5.3-codex");
        let parsed = parse_action_id(&id).unwrap();
        assert_eq!(parsed.0, "sisyphus");
        assert_eq!(parsed.1, "aicodewith/gpt-5.3-codex");
    }

    #[test]
    fn test_agent_display_name_in_non_english_locale() {
        let title = build_agent_display_name("sisyphus", "zh-CN");
        assert_eq!(title, "Sisyphus · 西西弗斯");
    }

    #[test]
    fn test_short_model_label() {
        assert_eq!(
            short_model_label("aicodewith/gpt-5.3-codex"),
            "gpt-5.3-codex"
        );
        assert_eq!(short_model_label("claude-opus-4-6"), "claude-opus-4-6");
    }
}
