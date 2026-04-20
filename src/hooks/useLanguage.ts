import { useState, useEffect } from 'react';
import { translations, Language } from '../lib/translations';

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('language') as Language) || 'en'
  );

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return { language, setLanguage, t };
};
