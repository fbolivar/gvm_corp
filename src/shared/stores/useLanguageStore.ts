
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { es, Dictionary } from '../locales/es';
import { en } from '../locales/en';

type Language = 'es' | 'en';

interface LanguageState {
    language: Language;
    dictionary: Dictionary;
    setLanguage: (lang: Language) => void;
}

const dictionaries = {
    es,
    en
};

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set) => ({
            language: 'es',
            dictionary: es,
            setLanguage: (lang: Language) => set({
                language: lang,
                dictionary: dictionaries[lang]
            }),
        }),
        {
            name: 'gvm-language-storage',
        }
    )
);

// Helper hook for easy access to translations
export function useI18n() {
    const { language, dictionary, setLanguage } = useLanguageStore();

    return {
        t: dictionary,
        language,
        setLanguage
    };
}
