const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'hi', 'es', 'fr', 'ar', 'zh'];
const DEFAULT_LANGUAGE = 'en';

// Initialize i18next
const initializeI18n = async () => {
  await i18next
    .use(Backend)
    .init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES,
      preload: SUPPORTED_LANGUAGES,
      ns: ['common', 'restaurant', 'order', 'payment', 'navigation'],
      defaultNS: 'common',
      backend: {
        loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      },
      interpolation: {
        escapeValue: false,
      },
      returnObjects: true,
      keySeparator: false,
      nsSeparator: false,
    });

  console.log('i18next initialized');
  return i18next;
};

// Language service class
class LanguageService {
  constructor() {
    this.i18n = null;
    this.userLanguages = new Map();
  }

  async initialize() {
    if (!this.i18n) {
      this.i18n = await initializeI18n();
    }
  }

  // Set user's preferred language
  setUserLanguage(userId, language) {
    if (SUPPORTED_LANGUAGES.includes(language)) {
      this.userLanguages.set(userId, language);
    } else {
      this.userLanguages.set(userId, DEFAULT_LANGUAGE);
    }
  }

  // Get user's language
  getUserLanguage(userId) {
    return this.userLanguages.get(userId) || DEFAULT_LANGUAGE;
  }

  // Translate text
  translate(key, userId = null, options = {}) {
    if (!this.i18n) {
      console.warn('i18n not initialized');
      return key;
    }

    const lng = userId ? this.getUserLanguage(userId) : DEFAULT_LANGUAGE;
    
    try {
      return this.i18n.t(key, { lng, ...options });
    } catch (error) {
      console.error('Translation error:', error);
      return key;
    }
  }

  // Get all translations for a namespace
  getTranslations(namespace, userId = null) {
    if (!this.i18n) return {};

    const lng = userId ? this.getUserLanguage(userId) : DEFAULT_LANGUAGE;
    return this.i18n.getDataByLanguage(lng)?.[namespace] || {};
  }

  // Detect language from request headers
  detectLanguage(req) {
    const acceptLanguage = req.headers['accept-language'];
    if (!acceptLanguage) return DEFAULT_LANGUAGE;

    // Parse Accept-Language header
    const languages = acceptLanguage.split(',');
    for (const lang of languages) {
      const [language] = lang.split(';');
      const code = language.split('-')[0].toLowerCase();
      
      if (SUPPORTED_LANGUAGES.includes(code)) {
        return code;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  // Get language metadata
  getLanguageInfo(languageCode) {
    const languages = {
      en: { name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
      hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
      es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
      fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
      ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
      zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', rtl: false }
    };

    return languages[languageCode] || languages[DEFAULT_LANGUAGE];
  }

  // Get all supported languages with info
  getAllLanguages() {
    return SUPPORTED_LANGUAGES.map(code => ({
      code,
      ...this.getLanguageInfo(code)
    }));
  }
}

// Create language files directory structure
const fs = require('fs');
const localesPath = path.join(__dirname, '../locales');

if (!fs.existsSync(localesPath)) {
  fs.mkdirSync(localesPath, { recursive: true });
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const langPath = path.join(localesPath, lang);
    if (!fs.existsSync(langPath)) {
      fs.mkdirSync(langPath, { recursive: true });
    }
  });
}

module.exports = new LanguageService();