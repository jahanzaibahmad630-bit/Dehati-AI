import { createContext } from 'react';
export const LanguageContext = createContext(null);

export const LANGUAGES = {
  ur: { label: 'اردو', dir: 'rtl' },
  pj: { label: 'پنجابی', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' }
};
