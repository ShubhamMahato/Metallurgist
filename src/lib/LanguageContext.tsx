import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, TranslationKey } from './translations';
import { getLanguage, saveLanguage } from './settingsStore';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('app-language') as Language;
      if (stored === 'en' || stored === 'hi' || stored === 'mr') return stored;
    } catch {}
    return 'en';
  });

  useEffect(() => {
    const loadLang = async () => {
      try {
        const savedLang = await getLanguage();
        if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'mr')) {
          setLanguageState(savedLang);
        }
      } catch {}
    };
    loadLang();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app-language', lang);
    } catch {}
    saveLanguage(lang).catch(() => {});
  };

  const t = (key: TranslationKey): string => {
    const langObj = translations[language] as Record<string, string>;
    const defaultObj = translations['en'] as Record<string, string>;
    return langObj?.[key] || defaultObj?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
