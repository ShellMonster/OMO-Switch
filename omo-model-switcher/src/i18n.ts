import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

// 获取保存的语言偏好，默认为 zh-CN
const getSavedLanguage = (): string => {
  try {
    const saved = localStorage.getItem('omo-switch-language');
    return saved || 'zh-CN';
  } catch {
    return 'zh-CN';
  }
};

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const;

// i18next 配置
i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      en: { translation: en },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React 已经防止 XSS
    },
    react: {
      useSuspense: true, // 启用 Suspense 支持
    },
  });

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('omo-switch-language', lng);
  } catch {
    // localStorage 不可用时忽略
  }
});

export default i18n;
