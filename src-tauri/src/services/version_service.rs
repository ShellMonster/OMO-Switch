use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionInfo {
    pub name: String,
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub has_update: bool,
    pub update_command: String,
    pub update_hint: String,
    pub installed: bool,
}

/// Get opencode current version by executing ~/.opencode/bin/opencode --version
pub fn get_opencode_version() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let bin_path = format!("{}/.opencode/bin/opencode", home);
    let output = Command::new(&bin_path).arg("--version").output().ok()?;
    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !version.is_empty() {
            Some(version)
        } else {
            None
        }
    } else {
        None
    }
}

/// Get oh-my-opencode current version from ~/.config/opencode/opencode.json
pub fn get_omo_current_version() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let config_path = format!("{}/.config/opencode/opencode.json", home);
    let content = std::fs::read_to_string(&config_path).ok()?;
    let config: serde_json::Value = serde_json::from_str(&content).ok()?;
    let plugins = config.get("plugin")?.as_array()?;
    for plugin in plugins {
        if let Some(s) = plugin.as_str() {
            if s.starts_with("oh-my-opencode@") {
                return Some(s.trim_start_matches("oh-my-opencode@").to_string());
            }
        }
    }
    None
}

/// Get oh-my-opencode latest version from npm registry
pub fn get_omo_latest_version() -> Option<String> {
    let resp = ureq::get("https://registry.npmjs.org/oh-my-opencode/latest")
        .timeout(std::time::Duration::from_secs(2))
        .call()
        .ok()?;
    let json: serde_json::Value = resp.into_json().ok()?;
    json.get("version")?.as_str().map(|s| s.to_string())
}

/// Get OpenCode latest version from GitHub Releases
pub fn get_opencode_latest_version() -> Option<String> {
    let resp = ureq::get("https://api.github.com/repos/opencode-ai/opencode/releases/latest")
        .set("User-Agent", "OMO-Switch")
        .timeout(std::time::Duration::from_secs(3))
        .call()
        .ok()?;
    let json: serde_json::Value = resp.into_json().ok()?;
    json.get("tag_name")?
        .as_str()
        .map(|s| s.trim_start_matches('v').to_string())
}

/// Simple semver comparison: returns true if latest > current
pub fn has_newer_version(current: &str, latest: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> { v.split('.').filter_map(|s| s.parse().ok()).collect() };
    let c = parse(current);
    let l = parse(latest);
    l > c
}

/// Check all versions
pub fn check_all_versions() -> Vec<VersionInfo> {
    let mut results = Vec::new();

    // OpenCode
    let oc_current = get_opencode_version();
    let oc_latest = get_opencode_latest_version();
    results.push(VersionInfo {
        name: "OpenCode".to_string(),
        installed: oc_current.is_some(),
        current_version: oc_current.clone(),
        latest_version: oc_latest.clone(),
        has_update: match (&oc_current, &oc_latest) {
            (Some(c), Some(l)) => has_newer_version(c, l),
            _ => false,
        },
        update_command: "opencode upgrade".to_string(),
        update_hint: "Run 'opencode upgrade' in terminal".to_string(),
    });

    // Oh My OpenCode
    let omo_current = get_omo_current_version();
    let omo_latest = get_omo_latest_version();
    let has_update = match (&omo_current, &omo_latest) {
        (Some(c), Some(l)) => has_newer_version(c, l),
        _ => false,
    };
    results.push(VersionInfo {
        name: "Oh My OpenCode".to_string(),
        installed: omo_current.is_some(),
        current_version: omo_current.clone(),
        latest_version: omo_latest.clone(),
        has_update,
        update_command: "bunx oh-my-opencode install".to_string(),
        update_hint: "Run in terminal:".to_string(),
    });

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_has_newer_version() {
        assert!(has_newer_version("3.5.2", "3.5.3"));
        assert!(!has_newer_version("3.5.3", "3.5.3"));
        assert!(!has_newer_version("3.5.3", "3.5.2"));
        assert!(has_newer_version("3.4.0", "3.5.0"));
    }
}
