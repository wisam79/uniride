import { describe, it, expect } from 'vitest';
import { formatIQD, BAGHDAD_AREAS, IRAQI_UNIVERSITIES } from '../../artifacts/mobile/lib/utils';

describe('Mobile Utility Functions', () => {
  describe('formatIQD', () => {
    it('should correctly append the Iraqi Dinar currency symbol', () => {
      const formatted = formatIQD(15000);
      expect(formatted).toContain('د.ع');
    });

    it('should handle string number inputs', () => {
      const formatted = formatIQD("50000");
      expect(formatted).toContain('د.ع');
      // Depending on Node locale, 50000 could be formatted with Arabic or Latin numerals
      // Just verifying it handles strings gracefully
    });

    it('should handle zero', () => {
      const formatted = formatIQD(0);
      expect(formatted).toContain('د.ع');
    });
  });

  describe('Constants Verification', () => {
    it('should contain expected major areas in BAGHDAD_AREAS', () => {
      expect(BAGHDAD_AREAS).toContain('المنصور');
      expect(BAGHDAD_AREAS).toContain('الكرادة');
      expect(BAGHDAD_AREAS.length).toBeGreaterThan(10);
    });

    it('should contain major universities in IRAQI_UNIVERSITIES', () => {
      const uob = IRAQI_UNIVERSITIES.find(u => u.id === 'uob');
      expect(uob).toBeDefined();
      expect(uob?.name).toBe('جامعة بغداد');

      expect(IRAQI_UNIVERSITIES.length).toBeGreaterThan(5);
    });
  });
});
