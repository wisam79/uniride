import { Translations, Language } from '../../../packages/core/index.ts';

export function getLanguage(req: Request): Language {
  const lang = req.headers.get('accept-language')?.split(',')[0] || 'ar';
  return lang.startsWith('en') ? 'en' : 'ar';
}

export function errorResponse(key: string, status = 400, lang: Language = 'ar', details?: any, headers: Record<string, string> = {}) {
  const message = Translations[lang]?.[key] || Translations['en']?.[key] || key;
  return new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
