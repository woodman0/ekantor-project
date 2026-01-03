import { describe, it, expect } from 'vitest';
import { calculateExchange } from './utils';

describe('Utility: calculateExchange', () => {
  it('should correctly calculate exchange rate', () => {
    // 100 PLN to USD (assume 1 PLN = 1 rate base, 1 USD = 0.25 rate base? No, rates are usually base=1)
    // Formula: (amount / rateFrom) * rateTo
    // Let's say Base is EUR.
    // PLN rate = 4.0
    // USD rate = 1.1
    // 100 PLN -> ? USD
    // (100 / 4.0) * 1.1 = 25 * 1.1 = 27.5
    
    const amount = 100;
    const rateFrom = 4.0;
    const rateTo = 1.1;
    
    const result = calculateExchange(amount, rateFrom, rateTo);
    expect(result).toBe(27.50);
  });

  it('should return 0 for invalid inputs', () => {
    expect(calculateExchange(0, 1, 1)).toBe(0);
    expect(calculateExchange(-100, 1, 1)).toBe(0);
    expect(calculateExchange(100, 0, 1)).toBe(0); // division by zero protection if logic handled it, or just rate check
  });
});
