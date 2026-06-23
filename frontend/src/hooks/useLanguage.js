import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContextCore';

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
};
