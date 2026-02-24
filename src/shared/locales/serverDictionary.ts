
import { es } from './es';
import { en } from './en';

export function getServerDictionary(lang: 'es' | 'en' = 'es') {
    return lang === 'en' ? en : es;
}
