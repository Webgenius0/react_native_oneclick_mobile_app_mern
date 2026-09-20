import {
  normalizeCurrency,
  parsePrice,
  calculateConvertedPrice,
  formatUsd,
  DEFAULT_RATES,
} from '../src/helpers/currencyHelper';

describe('Exchange Rate & Currency Helpers', () => {
  describe('normalizeCurrency', () => {
    it('normalizes Turkish Lira variations to TRY', () => {
      expect(normalizeCurrency('TL')).toBe('TRY');
      expect(normalizeCurrency('TRY')).toBe('TRY');
      expect(normalizeCurrency('₺')).toBe('TRY');
      expect(normalizeCurrency('', '150 ₺')).toBe('TRY');
      expect(normalizeCurrency('', '200 TL')).toBe('TRY');
    });

    it('normalizes UAE Dirham variations to AED', () => {
      expect(normalizeCurrency('AED')).toBe('AED');
      expect(normalizeCurrency('DHS')).toBe('AED');
      expect(normalizeCurrency('DH')).toBe('AED');
      expect(normalizeCurrency('', '120.00 AED')).toBe('AED');
    });

    it('normalizes EUR, GBP, SAR, USD', () => {
      expect(normalizeCurrency('EUR')).toBe('EUR');
      expect(normalizeCurrency('€')).toBe('EUR');
      expect(normalizeCurrency('GBP')).toBe('GBP');
      expect(normalizeCurrency('£')).toBe('GBP');
      expect(normalizeCurrency('SAR')).toBe('SAR');
      expect(normalizeCurrency('SR')).toBe('SAR');
      expect(normalizeCurrency('USD')).toBe('USD');
      expect(normalizeCurrency('$')).toBe('USD');
    });

    it('falls back to TRY if unspecified', () => {
      expect(normalizeCurrency('', '')).toBe('TRY');
    });
  });

  describe('parsePrice', () => {
    it('handles numbers directly', () => {
      expect(parsePrice(350)).toBe(350);
      expect(parsePrice(12.5)).toBe(12.5);
    });

    it('handles decimal formats with comma or dot', () => {
      expect(parsePrice('350.00')).toBe(350);
      expect(parsePrice('179,10')).toBe(179.1);
      expect(parsePrice('1.299,99')).toBe(1299.99);
      expect(parsePrice('1,299.99')).toBe(1299.99);
    });

    it('cleans out currency symbols and letters', () => {
      expect(parsePrice('₺450.00')).toBe(450);
      expect(parsePrice('120.00 AED')).toBe(120);
      expect(parsePrice('EUR 99,50')).toBe(99.5);
    });

    it('returns null for invalid inputs', () => {
      expect(parsePrice(null)).toBeNull();
      expect(parsePrice('')).toBeNull();
      expect(parsePrice('Free')).toBeNull();
      expect(parsePrice(-10)).toBeNull();
    });
  });

  describe('calculateConvertedPrice', () => {
    const liveRates = {
      AED: 0.272479,
      EUR: 1.08,
      GBP: 1.28,
      SAR: 0.266667,
      TRY: 0.029412,
      USD: 1.0,
    };

    it('matches the doc example: 100 AED -> $27.25 USD', () => {
      const converted = calculateConvertedPrice(100, 'AED', liveRates);
      expect(converted).toBe(27.25);
    });

    it('matches the doc example: 450.00 TRY -> $13.24 USD', () => {
      const converted = calculateConvertedPrice('450.00', 'TRY', liveRates);
      expect(converted).toBe(13.24);
    });

    it('matches the doc example: 120.00 AED -> $32.70 USD', () => {
      const converted = calculateConvertedPrice('120.00', 'AED', liveRates);
      expect(converted).toBe(32.7);
    });

    it('matches the doc example: 350.00 TRY -> $10.29 USD', () => {
      const converted = calculateConvertedPrice(350, 'TRY', liveRates);
      expect(converted).toBe(10.29);
    });

    it('returns exact amount for USD items', () => {
      const converted = calculateConvertedPrice('50.00', 'USD', liveRates);
      expect(converted).toBe(50.0);
    });

    it('works with default fallback rates when dynamic rates are missing', () => {
      const converted = calculateConvertedPrice(100, 'AED', {});
      expect(converted).toBe(27.25);
    });
  });

  describe('formatUsd', () => {
    it('formats numbers into USD strings', () => {
      expect(formatUsd(27.25)).toBe('$27.25 USD');
      expect(formatUsd(10.29)).toBe('$10.29 USD');
    });
  });
});
