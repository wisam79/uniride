import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTranslation } from './useTranslation';
import { Translations } from '@uniride/core';

let currentLanguage = 'en';

vi.mock('./useStore', () => ({
  useI18nStore: Object.assign(() => ({ language: currentLanguage }), {
    getState: () => ({
      language: currentLanguage,
      setLanguage: (lang: string) => {
        currentLanguage = lang;
      },
    }),
  }),
}));

describe('useTranslation', () => {
  beforeEach(() => {
    currentLanguage = 'en';
  });

  it('translates existing key to English', () => {
    const { t, language, isRTL } = useTranslation();
    expect(language).toBe('en');
    expect(isRTL).toBe(false);
    expect(t('login')).toBe(Translations['en']['login']);
  });

  it('translates existing key to Arabic', () => {
    currentLanguage = 'ar';
    const { t, language, isRTL } = useTranslation();
    expect(language).toBe('ar');
    expect(isRTL).toBe(true);
    expect(t('login')).toBe(Translations['ar']['login']);
  });

  it('falls back to key if neither found', () => {
    const { t } = useTranslation();
    expect(t('non_existent_key')).toBe('non_existent_key');
  });
});
