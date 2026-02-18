use std::collections::HashMap;
use std::sync::Mutex;

// 全局语言设置（使用 Mutex 保证线程安全）
lazy_static::lazy_static! {
    static ref CURRENT_LOCALE: Mutex<String> = Mutex::new("zh-CN".to_string());
}

/// 获取当前语言设置
pub fn get_locale() -> String {
    CURRENT_LOCALE
        .lock()
        .unwrap_or_else(|e| {
            eprintln!("获取语言设置时 Mutex 中毒，使用默认值: {}", e);
            e.into_inner()
        })
        .clone()
}

/// 设置当前语言设置
pub fn set_locale(locale: &str) {
    let mut guard = CURRENT_LOCALE.lock().unwrap_or_else(|e| {
        eprintln!("设置语言时 Mutex 中毒，恢复默认值: {}", e);
        e.into_inner()
    });
    *guard = locale.to_string();
}

/// 翻译错误消息
///
/// # 参数
/// - `key`: 错误消息的键（如 "config_file_not_found"）
/// - `locale`: 语言代码（如 "zh-CN", "en", "ja", "ko", "zh-TW"）
///
/// # 返回
/// 翻译后的错误消息，如果键不存在则返回键本身
pub fn tr(key: &str, locale: &str) -> String {
    let translations = get_translations();

    if let Some(locale_map) = translations.get(locale) {
        locale_map
            .get(key)
            .cloned()
            .unwrap_or_else(|| key.to_string())
    } else {
        // 如果指定的语言不存在，回退到英文
        if let Some(en_map) = translations.get("en") {
            en_map.get(key).cloned().unwrap_or_else(|| key.to_string())
        } else {
            key.to_string()
        }
    }
}

/// 使用当前全局语言设置翻译错误消息
pub fn tr_current(key: &str) -> String {
    let locale = get_locale();
    tr(key, &locale)
}

/// 获取所有翻译映射
fn get_translations() -> HashMap<&'static str, HashMap<&'static str, String>> {
    let mut translations: HashMap<&'static str, HashMap<&'static str, String>> = HashMap::new();

    // 中文简体 (zh-CN)
    let mut zh_cn = HashMap::new();
    zh_cn.insert("home_env_var_error", "无法获取 HOME 环境变量".to_string());
    zh_cn.insert("config_file_not_found", "配置文件不存在".to_string());
    zh_cn.insert("read_config_failed", "读取配置文件失败".to_string());
    zh_cn.insert("parse_json_failed", "解析 JSON 失败".to_string());
    zh_cn.insert("create_backup_failed", "创建备份文件失败".to_string());
    zh_cn.insert("create_config_dir_failed", "创建配置目录失败".to_string());
    zh_cn.insert("serialize_json_failed", "序列化 JSON 失败".to_string());
    zh_cn.insert("write_config_failed", "写入配置文件失败".to_string());
    zh_cn.insert(
        "config_root_must_be_object",
        "配置文件根节点必须是对象".to_string(),
    );
    zh_cn.insert(
        "config_missing_agents",
        "配置文件缺少 'agents' 字段".to_string(),
    );
    zh_cn.insert(
        "config_missing_categories",
        "配置文件缺少 'categories' 字段".to_string(),
    );
    zh_cn.insert(
        "read_model_cache_failed",
        "无法读取模型缓存文件".to_string(),
    );
    zh_cn.insert(
        "parse_model_cache_failed",
        "解析模型缓存文件失败".to_string(),
    );
    zh_cn.insert("create_target_dir_failed", "创建目标目录失败".to_string());
    zh_cn.insert("write_export_file_failed", "写入导出文件失败".to_string());
    zh_cn.insert("import_file_not_found", "导入文件不存在".to_string());
    zh_cn.insert("read_import_file_failed", "读取导入文件失败".to_string());
    zh_cn.insert("parse_import_file_failed", "解析导入文件失败".to_string());
    zh_cn.insert("preset_name_empty", "预设名称不能为空".to_string());
    zh_cn.insert(
        "preset_name_invalid_path",
        "预设名称不能包含路径分隔符".to_string(),
    );
    zh_cn.insert("create_preset_dir_failed", "创建预设目录失败".to_string());
    zh_cn.insert("write_preset_file_failed", "写入预设文件失败".to_string());
    zh_cn.insert("preset_not_found", "预设不存在".to_string());
    zh_cn.insert("preset_official_default", "官方默认".to_string());
    zh_cn.insert("preset_economy", "经济模式".to_string());
    zh_cn.insert("preset_high_performance", "高性能模式".to_string());
    zh_cn.insert("tray_presets", "💾 预设".to_string());
    zh_cn.insert("tray_current_preset", "当前预设".to_string());


    zh_cn.insert("read_preset_file_failed", "读取预设文件失败".to_string());
    zh_cn.insert("parse_preset_file_failed", "解析预设文件失败".to_string());
    zh_cn.insert("delete_preset_failed", "删除预设失败".to_string());
    zh_cn.insert("backup_config_failed", "备份配置失败".to_string());
    zh_cn.insert("json_format_error", "JSON 格式错误".to_string());
    translations.insert("zh-CN", zh_cn);

    // 中文繁体 (zh-TW)
    let mut zh_tw = HashMap::new();
    zh_tw.insert("home_env_var_error", "無法取得 HOME 環境變數".to_string());
    zh_tw.insert("config_file_not_found", "設定檔不存在".to_string());
    zh_tw.insert("read_config_failed", "讀取設定檔失敗".to_string());
    zh_tw.insert("parse_json_failed", "解析 JSON 失敗".to_string());
    zh_tw.insert("create_backup_failed", "建立備份檔案失敗".to_string());
    zh_tw.insert("create_config_dir_failed", "建立設定目錄失敗".to_string());
    zh_tw.insert("serialize_json_failed", "序列化 JSON 失敗".to_string());
    zh_tw.insert("write_config_failed", "寫入設定檔失敗".to_string());
    zh_tw.insert(
        "config_root_must_be_object",
        "設定檔根節點必須是物件".to_string(),
    );
    zh_tw.insert(
        "config_missing_agents",
        "設定檔缺少 'agents' 欄位".to_string(),
    );
    zh_tw.insert(
        "config_missing_categories",
        "設定檔缺少 'categories' 欄位".to_string(),
    );
    zh_tw.insert(
        "read_model_cache_failed",
        "無法讀取模型快取檔案".to_string(),
    );
    zh_tw.insert(
        "parse_model_cache_failed",
        "解析模型快取檔案失敗".to_string(),
    );
    zh_tw.insert("create_target_dir_failed", "建立目標目錄失敗".to_string());
    zh_tw.insert("write_export_file_failed", "寫入匯出檔案失敗".to_string());
    zh_tw.insert("import_file_not_found", "匯入檔案不存在".to_string());
    zh_tw.insert("read_import_file_failed", "讀取匯入檔案失敗".to_string());
    zh_tw.insert("parse_import_file_failed", "解析匯入檔案失敗".to_string());
    zh_tw.insert("preset_name_empty", "預設名稱不能為空".to_string());
    zh_tw.insert(
        "preset_name_invalid_path",
        "預設名稱不能包含路徑分隔符".to_string(),
    );
    zh_tw.insert("create_preset_dir_failed", "建立預設目錄失敗".to_string());
    zh_tw.insert("write_preset_file_failed", "寫入預設檔案失敗".to_string());
    zh_tw.insert("preset_not_found", "預設不存在".to_string());
    zh_tw.insert("preset_official_default", "官方預設".to_string());
    zh_tw.insert("preset_economy", "經濟模式".to_string());
    zh_tw.insert("preset_high_performance", "高效能模式".to_string());
    zh_tw.insert("tray_presets", "💾 預設".to_string());
    zh_tw.insert("tray_current_preset", "目前".to_string());


    zh_tw.insert("read_preset_file_failed", "讀取預設檔案失敗".to_string());
    zh_tw.insert("parse_preset_file_failed", "解析預設檔案失敗".to_string());
    zh_tw.insert("delete_preset_failed", "刪除預設失敗".to_string());
    zh_tw.insert("backup_config_failed", "備份設定失敗".to_string());
    zh_tw.insert("json_format_error", "JSON 格式錯誤".to_string());
    translations.insert("zh-TW", zh_tw);

    // English (en)
    let mut en = HashMap::new();
    en.insert(
        "home_env_var_error",
        "Failed to get HOME environment variable".to_string(),
    );
    en.insert(
        "config_file_not_found",
        "Configuration file not found".to_string(),
    );
    en.insert(
        "read_config_failed",
        "Failed to read configuration file".to_string(),
    );
    en.insert("parse_json_failed", "Failed to parse JSON".to_string());
    en.insert(
        "create_backup_failed",
        "Failed to create backup file".to_string(),
    );
    en.insert(
        "create_config_dir_failed",
        "Failed to create configuration directory".to_string(),
    );
    en.insert(
        "serialize_json_failed",
        "Failed to serialize JSON".to_string(),
    );
    en.insert(
        "write_config_failed",
        "Failed to write configuration file".to_string(),
    );
    en.insert(
        "config_root_must_be_object",
        "Configuration root must be an object".to_string(),
    );
    en.insert(
        "config_missing_agents",
        "Configuration missing 'agents' field".to_string(),
    );
    en.insert(
        "config_missing_categories",
        "Configuration missing 'categories' field".to_string(),
    );
    en.insert(
        "read_model_cache_failed",
        "Failed to read model cache file".to_string(),
    );
    en.insert(
        "parse_model_cache_failed",
        "Failed to parse model cache file".to_string(),
    );
    en.insert(
        "create_target_dir_failed",
        "Failed to create target directory".to_string(),
    );
    en.insert(
        "write_export_file_failed",
        "Failed to write export file".to_string(),
    );
    en.insert("import_file_not_found", "Import file not found".to_string());
    en.insert(
        "read_import_file_failed",
        "Failed to read import file".to_string(),
    );
    en.insert(
        "parse_import_file_failed",
        "Failed to parse import file".to_string(),
    );
    en.insert(
        "preset_name_empty",
        "Preset name cannot be empty".to_string(),
    );
    en.insert(
        "preset_name_invalid_path",
        "Preset name cannot contain path separators".to_string(),
    );
    en.insert(
        "create_preset_dir_failed",
        "Failed to create preset directory".to_string(),
    );
    en.insert(
        "write_preset_file_failed",
        "Failed to write preset file".to_string(),
    );
    en.insert("preset_not_found", "Preset not found".to_string());
    en.insert("preset_official_default", "Official Default".to_string());
    en.insert("preset_economy", "Economy".to_string());
    en.insert("preset_high_performance", "High Performance".to_string());
    en.insert("tray_presets", "💾 Presets".to_string());
    en.insert("tray_current_preset", "Current".to_string());


    en.insert(
        "read_preset_file_failed",
        "Failed to read preset file".to_string(),
    );
    en.insert(
        "parse_preset_file_failed",
        "Failed to parse preset file".to_string(),
    );
    en.insert(
        "delete_preset_failed",
        "Failed to delete preset".to_string(),
    );
    en.insert(
        "backup_config_failed",
        "Failed to backup configuration".to_string(),
    );
    en.insert("json_format_error", "JSON format error".to_string());
    translations.insert("en", en);

    // Japanese (ja)
    let mut ja = HashMap::new();
    ja.insert(
        "home_env_var_error",
        "HOME環境変数を取得できません".to_string(),
    );
    ja.insert(
        "config_file_not_found",
        "設定ファイルが見つかりません".to_string(),
    );
    ja.insert(
        "read_config_failed",
        "設定ファイルの読み込みに失敗しました".to_string(),
    );
    ja.insert("parse_json_failed", "JSONの解析に失敗しました".to_string());
    ja.insert(
        "create_backup_failed",
        "バックアップファイルの作成に失敗しました".to_string(),
    );
    ja.insert(
        "create_config_dir_failed",
        "設定ディレクトリの作成に失敗しました".to_string(),
    );
    ja.insert(
        "serialize_json_failed",
        "JSONのシリアル化に失敗しました".to_string(),
    );
    ja.insert(
        "write_config_failed",
        "設定ファイルの書き込みに失敗しました".to_string(),
    );
    ja.insert(
        "config_root_must_be_object",
        "設定ファイルのルートはオブジェクトである必要があります".to_string(),
    );
    ja.insert(
        "config_missing_agents",
        "設定ファイルに'agents'フィールドがありません".to_string(),
    );
    ja.insert(
        "config_missing_categories",
        "設定ファイルに'categories'フィールドがありません".to_string(),
    );
    ja.insert(
        "read_model_cache_failed",
        "モデルキャッシュファイルの読み込みに失敗しました".to_string(),
    );
    ja.insert(
        "parse_model_cache_failed",
        "モデルキャッシュファイルの解析に失敗しました".to_string(),
    );
    ja.insert(
        "create_target_dir_failed",
        "ターゲットディレクトリの作成に失敗しました".to_string(),
    );
    ja.insert(
        "write_export_file_failed",
        "エクスポートファイルの書き込みに失敗しました".to_string(),
    );
    ja.insert(
        "import_file_not_found",
        "インポートファイルが見つかりません".to_string(),
    );
    ja.insert(
        "read_import_file_failed",
        "インポートファイルの読み込みに失敗しました".to_string(),
    );
    ja.insert(
        "parse_import_file_failed",
        "インポートファイルの解析に失敗しました".to_string(),
    );
    ja.insert(
        "preset_name_empty",
        "プリセット名は空にできません".to_string(),
    );
    ja.insert(
        "preset_name_invalid_path",
        "プリセット名にパス区切り文字を含めることはできません".to_string(),
    );
    ja.insert(
        "create_preset_dir_failed",
        "プリセットディレクトリの作成に失敗しました".to_string(),
    );
    ja.insert(
        "write_preset_file_failed",
        "プリセットファイルの書き込みに失敗しました".to_string(),
    );
    ja.insert("preset_not_found", "プリセットが見つかりません".to_string());
    ja.insert("preset_official_default", "公式デフォルト".to_string());
    ja.insert("preset_economy", "エコノミー".to_string());
    ja.insert("preset_high_performance", "ハイパフォーマンス".to_string());
    ja.insert("tray_presets", "💾 プリセット".to_string());
    ja.insert("tray_current_preset", "現在".to_string());


    ja.insert(
        "read_preset_file_failed",
        "プリセットファイルの読み込みに失敗しました".to_string(),
    );
    ja.insert(
        "parse_preset_file_failed",
        "プリセットファイルの解析に失敗しました".to_string(),
    );
    ja.insert(
        "delete_preset_failed",
        "プリセットの削除に失敗しました".to_string(),
    );
    ja.insert(
        "backup_config_failed",
        "設定のバックアップに失敗しました".to_string(),
    );
    ja.insert("json_format_error", "JSON形式エラー".to_string());
    translations.insert("ja", ja);

    // Korean (ko)
    let mut ko = HashMap::new();
    ko.insert(
        "home_env_var_error",
        "HOME 환경 변수를 가져올 수 없습니다".to_string(),
    );
    ko.insert(
        "config_file_not_found",
        "구성 파일을 찾을 수 없습니다".to_string(),
    );
    ko.insert(
        "read_config_failed",
        "구성 파일을 읽지 못했습니다".to_string(),
    );
    ko.insert(
        "parse_json_failed",
        "JSON을 구문 분석하지 못했습니다".to_string(),
    );
    ko.insert(
        "create_backup_failed",
        "백업 파일을 만들지 못했습니다".to_string(),
    );
    ko.insert(
        "create_config_dir_failed",
        "구성 디렉토리를 만들지 못했습니다".to_string(),
    );
    ko.insert(
        "serialize_json_failed",
        "JSON을 직렬화하지 못했습니다".to_string(),
    );
    ko.insert(
        "write_config_failed",
        "구성 파일을 쓰지 못했습니다".to_string(),
    );
    ko.insert(
        "config_root_must_be_object",
        "구성 파일 루트는 객체여야 합니다".to_string(),
    );
    ko.insert(
        "config_missing_agents",
        "구성 파일에 'agents' 필드가 없습니다".to_string(),
    );
    ko.insert(
        "config_missing_categories",
        "구성 파일에 'categories' 필드가 없습니다".to_string(),
    );
    ko.insert(
        "read_model_cache_failed",
        "모델 캐시 파일을 읽지 못했습니다".to_string(),
    );
    ko.insert(
        "parse_model_cache_failed",
        "모델 캐시 파일을 구문 분석하지 못했습니다".to_string(),
    );
    ko.insert(
        "create_target_dir_failed",
        "대상 디렉토리를 만들지 못했습니다".to_string(),
    );
    ko.insert(
        "write_export_file_failed",
        "내보내기 파일을 쓰지 못했습니다".to_string(),
    );
    ko.insert(
        "import_file_not_found",
        "가져오기 파일을 찾을 수 없습니다".to_string(),
    );
    ko.insert(
        "read_import_file_failed",
        "가져오기 파일을 읽지 못했습니다".to_string(),
    );
    ko.insert(
        "parse_import_file_failed",
        "가져오기 파일을 구문 분석하지 못했습니다".to_string(),
    );
    ko.insert(
        "preset_name_empty",
        "사전 설정 이름은 비워둘 수 없습니다".to_string(),
    );
    ko.insert(
        "preset_name_invalid_path",
        "사전 설정 이름에 경로 구분 기호를 포함할 수 없습니다".to_string(),
    );
    ko.insert(
        "create_preset_dir_failed",
        "사전 설정 디렉토리를 만들지 못했습니다".to_string(),
    );
    ko.insert(
        "write_preset_file_failed",
        "사전 설정 파일을 쓰지 못했습니다".to_string(),
    );
    ko.insert(
        "preset_not_found",
        "사전 설정을 찾을 수 없습니다".to_string(),
    );
    ko.insert(
        "read_preset_file_failed",
        "사전 설정 파일을 읽지 못했습니다".to_string(),
    );
    ko.insert(
        "parse_preset_file_failed",
        "사전 설정 파일을 구문 분석하지 못했습니다".to_string(),
    );
    ko.insert(
        "delete_preset_failed",
        "사전 설정을 삭제하지 못했습니다".to_string(),
    );
    ko.insert(
        "backup_config_failed",
        "구성을 백업하지 못했습니다".to_string(),
    );
    ko.insert("json_format_error", "JSON 형식 오류".to_string());
    translations.insert("ko", ko);

    translations
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tr_zh_cn() {
        let result = tr("config_file_not_found", "zh-CN");
        assert_eq!(result, "配置文件不存在");
    }

    #[test]
    fn test_tr_en() {
        let result = tr("config_file_not_found", "en");
        assert_eq!(result, "Configuration file not found");
    }

    #[test]
    fn test_tr_ja() {
        let result = tr("config_file_not_found", "ja");
        assert_eq!(result, "設定ファイルが見つかりません");
    }

    #[test]
    fn test_tr_ko() {
        let result = tr("config_file_not_found", "ko");
        assert_eq!(result, "구성 파일을 찾을 수 없습니다");
    }

    #[test]
    fn test_tr_zh_tw() {
        let result = tr("config_file_not_found", "zh-TW");
        assert_eq!(result, "設定檔不存在");
    }

    #[test]
    fn test_tr_fallback_to_en() {
        // 测试不存在的语言时是否回退到英文
        let result = tr("config_file_not_found", "fr");
        assert_eq!(result, "Configuration file not found");
    }

    #[test]
    fn test_tr_unknown_key() {
        // 测试不存在的键是否返回键本身
        let result = tr("unknown_key", "zh-CN");
        assert_eq!(result, "unknown_key");
    }

    #[test]
    fn test_get_set_locale() {
        // 测试获取和设置语言
        set_locale("en");
        assert_eq!(get_locale(), "en");

        set_locale("zh-CN");
        assert_eq!(get_locale(), "zh-CN");
    }

    #[test]
    fn test_tr_current() {
        // 测试使用当前语言设置的翻译
        set_locale("zh-CN");
        let result = tr_current("config_file_not_found");
        assert_eq!(result, "配置文件不存在");

        set_locale("en");
        let result = tr_current("config_file_not_found");
        assert_eq!(result, "Configuration file not found");
    }

    #[test]
    fn test_all_keys_have_translations() {
        // 测试所有关键错误消息都有翻译
        let keys = vec![
            "home_env_var_error",
            "config_file_not_found",
            "read_config_failed",
            "parse_json_failed",
            "create_backup_failed",
            "create_config_dir_failed",
            "serialize_json_failed",
            "write_config_failed",
            "config_root_must_be_object",
            "config_missing_agents",
            "config_missing_categories",
            "read_model_cache_failed",
            "parse_model_cache_failed",
            "create_target_dir_failed",
            "write_export_file_failed",
            "import_file_not_found",
            "read_import_file_failed",
            "parse_import_file_failed",
            "preset_name_empty",
            "preset_name_invalid_path",
            "create_preset_dir_failed",
            "write_preset_file_failed",
            "preset_not_found",
            "read_preset_file_failed",
            "parse_preset_file_failed",
            "delete_preset_failed",
            "backup_config_failed",
            "json_format_error",
        ];

        let locales = vec!["zh-CN", "zh-TW", "en", "ja", "ko"];

        for key in &keys {
            for locale in &locales {
                let result = tr(key, locale);
                assert_ne!(
                    result, *key,
                    "Key {} should have translation in {}",
                    key, locale
                );
            }
        }
    }
}
