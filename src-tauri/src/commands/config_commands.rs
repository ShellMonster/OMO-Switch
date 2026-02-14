use crate::services::config_service;
use serde_json::Value;

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    config_service::get_config_path().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_omo_config() -> Result<Value, String> {
    config_service::read_omo_config()
}

#[tauri::command]
pub fn write_omo_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)?;
    config_service::write_omo_config(&config)
}

#[tauri::command]
pub fn validate_config(config: Value) -> Result<(), String> {
    config_service::validate_config(&config)
}

#[tauri::command]
pub fn update_agent_model(
    agent_name: String,
    model: String,
    variant: Option<String>,
) -> Result<Value, String> {
    let mut config = config_service::read_omo_config()?;

    // 尝试在 agents 中更新
    if let Some(agents) = config.get_mut("agents").and_then(|a| a.as_object_mut()) {
        if let Some(agent) = agents.get_mut(&agent_name) {
            if let Some(obj) = agent.as_object_mut() {
                obj.insert("model".to_string(), Value::String(model.clone()));
                if let Some(v) = &variant {
                    if v != "none" {
                        obj.insert("variant".to_string(), Value::String(v.clone()));
                    } else {
                        obj.remove("variant");
                    }
                }
            }
        }
    }

    // 也尝试在 categories 中更新
    if let Some(categories) = config.get_mut("categories").and_then(|c| c.as_object_mut()) {
        if let Some(category) = categories.get_mut(&agent_name) {
            if let Some(obj) = category.as_object_mut() {
                obj.insert("model".to_string(), Value::String(model.clone()));
                if let Some(v) = &variant {
                    if v != "none" {
                        obj.insert("variant".to_string(), Value::String(v.clone()));
                    } else {
                        obj.remove("variant");
                    }
                }
            }
        }
    }

    config_service::write_omo_config(&config)?;
    Ok(config)
}
