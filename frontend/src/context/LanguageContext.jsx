import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const LANGUAGES = {
  ur: { label: 'اردو', dir: 'rtl' },
  pj: { label: 'پنجابی', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem('dehati_lang') || 'ur'
  );
  const [largeText, setLargeText] = useState(() =>
    localStorage.getItem('dehati_large_text') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('dehati_lang', language);
    document.documentElement.lang = language === 'en' ? 'en' : 'ur';
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }, [language]);

  useEffect(() => {
    localStorage.setItem('dehati_large_text', largeText);
    document.body.classList.toggle('large-text', largeText);
  }, [largeText]);

  const changeLanguage = (lang) => {
    if (LANGUAGES[lang]) setLanguage(lang);
  };

  const toggleLargeText = () => setLargeText(prev => !prev);

  return (
    <LanguageContext.Provider value={{
      language, changeLanguage, largeText, toggleLargeText,
      isRTL: language !== 'en'
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
};
