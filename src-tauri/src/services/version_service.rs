use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const OMO_PLUGIN_NAMES: [&str; 2] = ["oh-my-openagent", "oh-my-opencode"];
const OMO_PACKAGE_NAMES: [&str; 2] = ["oh-my-openagent", "oh-my-opencode"];
const OMO_UPDATE_PACKAGE_NAME: &str = "oh-my-opencode";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionInfo {
    pub name: String,
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub has_update: bool,
    pub update_command: String,
    pub update_hint: String,
    pub installed: bool,
    pub install_source: Option<String>,
    pub install_path: Option<String>,
    pub detected_from: Option<String>,
}

#[derive(Debug, Clone)]
struct InstallDetection {
    version: Option<String>,
    install_source: String,
    install_path: String,
    detected_from: String,
}

/// Get opencode current version by executing ~/.opencode/bin/opencode --version
/// 添加 3 秒超时机制，防止命令卡住阻塞 UI
pub fn get_opencode_version() -> Option<String> {
    let home = std::env::var("HOME").ok()?;
    let bin_path = format!("{}/.opencode/bin/opencode", home);

    let mut child = Command::new(&bin_path)
        .arg("--version")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;

    let timeout = Duration::from_secs(3);
    let start = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) if status.success() => {
                let output = child.wait_with_output().ok()?;
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return if !version.is_empty() {
                    Some(version)
                } else {
                    None
                };
            }
            Ok(Some(_)) => return None, // 命令执行失败
            Ok(None) => {
                // 还在运行，检查超时
                if start.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
                // 短暂休眠避免忙等待
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(_) => return None,
        }
    }
}

fn detect_omo_install() -> Option<InstallDetection> {
    let home = std::env::var("HOME").ok()?;

    // 1. 当前实际 opencode 运行目录: ~/.opencode/node_modules/<omo-package>/
    for package_name in OMO_PACKAGE_NAMES {
        let runtime_pkg = format!(
            "{}/.opencode/node_modules/{}/package.json",
            home, package_name
        );
        if let Some(version) = read_pkg_version(&runtime_pkg) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "opencode_runtime".to_string(),
                install_path: format!("{}/.opencode", home),
                detected_from: runtime_pkg,
            });
        }
    }

    // 2. 当前实际 opencode 运行目录依赖声明: ~/.opencode/package.json
    let runtime_dep_pkg = format!("{}/.opencode/package.json", home);
    for package_name in OMO_PACKAGE_NAMES {
        if let Some(version) = read_dependency_version(&runtime_dep_pkg, package_name) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "opencode_runtime".to_string(),
                install_path: format!("{}/.opencode", home),
                detected_from: runtime_dep_pkg.clone(),
            });
        }
    }

    // 3. 本地安装: ~/.config/opencode/node_modules/<omo-package>/
    for package_name in OMO_PACKAGE_NAMES {
        let local_pkg = format!(
            "{}/.config/opencode/node_modules/{}/package.json",
            home, package_name
        );
        if let Some(version) = read_pkg_version(&local_pkg) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "config_local".to_string(),
                install_path: format!("{}/.config/opencode", home),
                detected_from: local_pkg,
            });
        }
    }

    // 4. 配置文件: opencode.json/jsonc 的 plugin 字段（兼容 openagent/opencode 插件名）
    for config_path in get_opencode_config_candidates(&home) {
        if let Some(version) = read_plugin_version_from_config(&config_path, &OMO_PLUGIN_NAMES) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "config_declared".to_string(),
                install_path: config_path.clone(),
                detected_from: config_path,
            });
        }
    }

    // 5. npm 全局安装
    if let Some(global_root) = get_npm_global_root() {
        for package_name in OMO_PACKAGE_NAMES {
            let npm_global_pkg = format!("{}/{}/package.json", global_root, package_name);
            if let Some(version) = read_pkg_version(&npm_global_pkg) {
                return Some(InstallDetection {
                    version: Some(version),
                    install_source: "npm_global".to_string(),
                    install_path: global_root.clone(),
                    detected_from: npm_global_pkg,
                });
            }
        }
    }

    // 6. bun 全局安装: ~/.bun/install/global/node_modules/<omo-package>/
    for package_name in OMO_PACKAGE_NAMES {
        let bun_global = format!(
            "{}/.bun/install/global/node_modules/{}/package.json",
            home, package_name
        );
        if let Some(version) = read_pkg_version(&bun_global) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "bun_global".to_string(),
                install_path: format!("{}/.bun/install/global/node_modules", home),
                detected_from: bun_global,
            });
        }
    }

    // 7. opencode 缓存安装/依赖，作为最后回退
    for package_name in OMO_PACKAGE_NAMES {
        let cache_pkg = format!(
            "{}/.cache/opencode/node_modules/{}/package.json",
            home, package_name
        );
        if let Some(version) = read_pkg_version(&cache_pkg) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "opencode_cache".to_string(),
                install_path: format!("{}/.cache/opencode", home),
                detected_from: cache_pkg,
            });
        }
    }

    let cache_dep_pkg = format!("{}/.cache/opencode/package.json", home);
    for package_name in OMO_PACKAGE_NAMES {
        if let Some(version) = read_dependency_version(&cache_dep_pkg, package_name) {
            return Some(InstallDetection {
                version: Some(version),
                install_source: "opencode_cache".to_string(),
                install_path: format!("{}/.cache/opencode", home),
                detected_from: cache_dep_pkg.clone(),
            });
        }
    }

    None
}

fn read_pkg_version(path: &str) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    let pkg: serde_json::Value = serde_json::from_str(&content).ok()?;
    pkg.get("version")?.as_str().map(|s| s.to_string())
}

fn read_dependency_version(path: &str, dep_name: &str) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    let pkg: Value = serde_json::from_str(&content).ok()?;
    pkg.get("dependencies")?
        .get(dep_name)?
        .as_str()
        .map(|s| s.to_string())
}

fn get_opencode_config_candidates(home: &str) -> Vec<String> {
    vec![
        format!("{}/.config/opencode/opencode.json", home),
        format!("{}/.config/opencode/opencode.jsonc", home),
    ]
}

fn parse_json_or_json5(content: &str) -> Option<Value> {
    serde_json::from_str::<Value>(content)
        .or_else(|_| json5::from_str::<Value>(content))
        .ok()
}

fn read_plugin_version_from_config(path: &str, plugin_names: &[&str]) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    let config = parse_json_or_json5(&content)?;
    let plugins = config.get("plugin")?.as_array()?;

    for plugin in plugins {
        if let Some(raw) = plugin.as_str() {
            for plugin_name in plugin_names {
                if let Some(version) = raw.strip_prefix(&format!("{}@", plugin_name)) {
                    return Some(version.to_string());
                }
            }
        }
    }
    None
}

fn get_npm_global_root() -> Option<String> {
    let output = Command::new("npm")
        .args(["root", "-g"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if root.is_empty() {
        None
    } else {
        Some(root)
    }
}

fn is_omo_installed() -> bool {
    if detect_omo_install().is_some() {
        return true;
    }

    let home = match std::env::var("HOME") {
        Ok(home) => home,
        Err(_) => return false,
    };
    get_opencode_config_candidates(&home)
        .iter()
        .any(|path| is_plugin_declared_in_config(path, &OMO_PLUGIN_NAMES))
}

fn build_omo_update_command(install_source: Option<&str>) -> (String, String) {
    match install_source {
        Some("opencode_runtime") => (
            format!(
                "cd ~/.opencode && npm install {}@latest",
                OMO_UPDATE_PACKAGE_NAME
            ),
            "在当前 opencode 运行目录升级：".to_string(),
        ),
        Some("npm_global") => (
            format!("npm install -g {}@latest", OMO_UPDATE_PACKAGE_NAME),
            "通过 npm 全局升级：".to_string(),
        ),
        Some("bun_global") => (
            format!("bun add -g {}@latest", OMO_UPDATE_PACKAGE_NAME),
            "通过 bun 全局升级：".to_string(),
        ),
        Some("config_local") => (
            format!(
                "cd ~/.config/opencode && npm install {}@latest",
                OMO_UPDATE_PACKAGE_NAME
            ),
            "在本地 opencode 配置目录升级：".to_string(),
        ),
        Some("config_declared") => (
            format!(
                "cd ~/.opencode && npm install {}@latest",
                OMO_UPDATE_PACKAGE_NAME
            ),
            "配置中已声明插件，建议在实际运行目录安装/升级：".to_string(),
        ),
        Some("opencode_cache") => (
            format!(
                "cd ~/.opencode && npm install {}@latest",
                OMO_UPDATE_PACKAGE_NAME
            ),
            "检测到缓存版本，建议在实际运行目录重新安装：".to_string(),
        ),
        _ => (
            format!(
                "cd ~/.opencode && npm install {}@latest",
                OMO_UPDATE_PACKAGE_NAME
            ),
            "建议在 opencode 运行目录安装/升级：".to_string(),
        ),
    }
}

fn is_plugin_declared_in_config(path: &str, plugin_names: &[&str]) -> bool {
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => return false,
    };
    let config = match parse_json_or_json5(&content) {
        Some(config) => config,
        None => return false,
    };
    let plugins = match config.get("plugin").and_then(|v| v.as_array()) {
        Some(plugins) => plugins,
        None => return false,
    };

    plugins.iter().any(|plugin| {
        let Some(raw) = plugin.as_str() else {
            return false;
        };
        plugin_names
            .iter()
            .any(|name| raw == *name || raw.starts_with(&format!("{}@", name)))
    })
}

fn get_npm_latest_version(package_name: &str) -> Option<String> {
    let url = format!("https://registry.npmjs.org/{}/latest", package_name);
    let resp = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(4))
        .call()
        .ok()?;
    let json: serde_json::Value = resp.into_json().ok()?;
    json.get("version")?.as_str().map(|s| s.to_string())
}

/// Get Oh My OpenAgent latest version from npm registry (兼容旧包名)
pub fn get_omo_latest_version() -> Option<String> {
    get_npm_latest_version("oh-my-openagent").or_else(|| get_npm_latest_version("oh-my-opencode"))
}

/// Get OpenCode latest version from GitHub Releases
pub fn get_opencode_latest_version() -> Option<String> {
    let resp = ureq::get("https://api.github.com/repos/anomalyco/opencode/releases/latest")
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
        install_source: Some("opencode_runtime".to_string()),
        install_path: std::env::var("HOME")
            .ok()
            .map(|home| format!("{}/.opencode/bin/opencode", home)),
        detected_from: std::env::var("HOME")
            .ok()
            .map(|home| format!("{}/.opencode/bin/opencode", home)),
    });

    // Oh My OpenAgent
    let omo_detection = detect_omo_install();
    let omo_current = omo_detection.as_ref().and_then(|d| d.version.clone());
    let omo_latest = get_omo_latest_version();
    let has_update = match (&omo_current, &omo_latest) {
        (Some(c), Some(l)) => has_newer_version(c, l),
        _ => false,
    };
    let (update_command, update_hint) =
        build_omo_update_command(omo_detection.as_ref().map(|d| d.install_source.as_str()));
    results.push(VersionInfo {
        name: "Oh My OpenAgent".to_string(),
        installed: is_omo_installed(),
        current_version: omo_current.clone(),
        latest_version: omo_latest.clone(),
        has_update,
        update_command,
        update_hint,
        install_source: omo_detection.as_ref().map(|d| d.install_source.clone()),
        install_path: omo_detection.as_ref().map(|d| d.install_path.clone()),
        detected_from: omo_detection.as_ref().map(|d| d.detected_from.clone()),
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
