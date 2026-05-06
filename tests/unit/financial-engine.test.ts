import { describe, it, expect } from 'vitest';
import { createMockAppSettings } from '../setup';

// Financial Engine Service (Mock Implementation)
// In a real scenario, this would be imported from the actual service module
class FinancialService {
  static calculateSubscription(monthlyFee: number, commissionRate: number) {
    if (monthlyFee < 0) throw new Error('Monthly fee cannot be negative');
    if (commissionRate < 0 || commissionRate > 100) throw new Error('Invalid commission rate');

    const commissionAmount = Math.round(monthlyFee * (commissionRate / 100));
    const driverPayout = monthlyFee - commissionAmount;

    return {
      monthlyFee,
      commissionRate,
      commissionAmount,
      driverPayout
    };
  }

  static applyReferralDiscount(monthlyFee: number, discountAmount: number) {
    if (discountAmount < 0) throw new Error('Discount cannot be negative');
    if (discountAmount > monthlyFee) throw new Error('Discount cannot exceed monthly fee');
    
    return monthlyFee - discountAmount;
  }
}

describe('Financial Engine Unit Tests', () => {
  const appSettings = createMockAppSettings();
  const defaultCommissionRate = parseFloat(appSettings.default_commission_rate); // 15%

  describe('Commission Calculations', () => {
    it('should correctly calculate commission and driver payout for base subscription', () => {
      const baseFee = 90000;
      
      const result = FinancialService.calculateSubscription(baseFee, defaultCommissionRate);
      
      expect(result.monthlyFee).toBe(90000);
      expect(result.commissionAmount).toBe(13500); // 15% of 90,000
      expect(result.driverPayout).toBe(76500); // 90,000 - 13,500
      
      // Total should always match
      expect(result.commissionAmount + result.driverPayout).toBe(baseFee);
    });

    it('should handle different commission rates accurately', () => {
      const result10Percent = FinancialService.calculateSubscription(100000, 10);
      expect(result10Percent.commissionAmount).toBe(10000);
      expect(result10Percent.driverPayout).toBe(90000);

      const result20Percent = FinancialService.calculateSubscription(80000, 20);
      expect(result20Percent.commissionAmount).toBe(16000);
      expect(result20Percent.driverPayout).toBe(64000);
    });

    it('should reject negative monthly fees', () => {
      expect(() => FinancialService.calculateSubscription(-50000, 15)).toThrow('Monthly fee cannot be negative');
    });

    it('should reject invalid commission rates', () => {
      expect(() => FinancialService.calculateSubscription(90000, -5)).toThrow('Invalid commission rate');
      expect(() => FinancialService.calculateSubscription(90000, 150)).toThrow('Invalid commission rate');
    });
  });

  describe('Referral & Discounts', () => {
    it('should accurately apply fixed referral discount', () => {
      const baseFee = 90000;
      const discount = 5000; // As per business rules
      
      const discountedFee = FinancialService.applyReferralDiscount(baseFee, discount);
      expect(discountedFee).toBe(85000);
    });

    it('should reject negative discounts', () => {
      expect(() => FinancialService.applyReferralDiscount(90000, -1000)).toThrow('Discount cannot be negative');
    });

    it('should prevent discounts larger than the base fee', () => {
      expect(() => FinancialService.applyReferralDiscount(90000, 100000)).toThrow('Discount cannot exceed monthly fee');
    });
  });
});
