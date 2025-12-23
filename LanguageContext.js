import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [rtl, setRtl] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize language
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
    setLanguage(savedLanguage);
    fetchSupportedLanguages();
    loadTranslations('common', savedLanguage);
  }, []);

  // Update document direction when RTL changes
  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [rtl, language]);

  const fetchSupportedLanguages = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/language/supported');
      setSupportedLanguages(response.data.languages);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    }
  };

  const loadTranslations = async (namespace, lang = language) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/language/translations/${namespace}`,
        { params: { lng: lang } }
      );

      if (response.data.success) {
        setTranslations(prev => ({
          ...prev,
          [namespace]: response.data.translations
        }));
        setRtl(response.data.rtl || false);
      }
    } catch (error) {
      console.error(`Failed to load ${namespace} translations:`, error);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    if (!supportedLanguages.find(lang => lang.code === newLanguage)) {
      toast.error('Language not supported');
      return;
    }

    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
    
    // Clear existing translations and reload
    setTranslations({});
    await Promise.all([
      loadTranslations('common', newLanguage),
      loadTranslations('restaurant', newLanguage),
      loadTranslations('order', newLanguage),
      loadTranslations('payment', newLanguage)
    ]);

    // Save user preference if logged in
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (token && userId) {
      try {
        await axios.post('http://localhost:5000/api/language/set-preference', {
          userId,
          language: newLanguage
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }

    toast.success(`Language changed to ${newLanguage}`);
  };

  const t = (key, namespace = 'common', options = {}) => {
    if (!translations[namespace]) {
      loadTranslations(namespace);
      return key;
    }

    const keys = key.split('.');
    let value = translations[namespace];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    if (value === undefined || typeof value === 'object') {
      return key; // Return key if translation not found
    }

    // Replace variables in translation string
    if (options && typeof value === 'string') {
      Object.keys(options).forEach(optKey => {
        value = value.replace(`{{${optKey}}}`, options[optKey]);
      });
    }

    return value || key;
  };

  const getCurrentLanguageInfo = () => {
    return supportedLanguages.find(lang => lang.code === language) || {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      rtl: false
    };
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        translations,
        supportedLanguages,
        rtl,
        loading,
        changeLanguage,
        t,
        loadTranslations,
        getCurrentLanguageInfo
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};