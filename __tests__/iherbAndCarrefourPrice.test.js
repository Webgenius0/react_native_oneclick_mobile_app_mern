import {
  parsePrice,
  calculateConvertedPrice,
  detectItemCurrency,
  getReceivedCurrencyInfo,
  DEFAULT_RATES,
} from '../src/helpers/currencyHelper';
import { getStoreNameFromUrl } from '../src/helpers/storeHelper';
import { normalizeCartItem } from '../src/store/useCartStore';

describe('iHerb and Carrefour UAE Price & Currency Tests', () => {
  describe('1. Store & Currency Detection for Carrefour UAE', () => {
    it('detects Carrefour UAE store from URL', () => {
      const url =
        'https://www.carrefouruae.com/mafuae/en/dairy-eggs/frico-creamy-sliced-gouda-cheese/p/54321';
      expect(getStoreNameFromUrl(url).toLowerCase()).toContain('carrefour');
    });

    it('detects AED currency for Carrefour UAE product URLs', () => {
      const item = {
        url: 'https://www.carrefouruae.com/mafuae/en/dairy-eggs/kiri-fresh-cream-cheese/p/12345',
        price: '24.50',
      };
      expect(detectItemCurrency(item)).toBe('AED');
      const info = getReceivedCurrencyInfo(item);
      expect(info.code).toBe('AED');
      expect(info.isUsd).toBe(false);
    });

    it('detects AED currency when item store specifies Carrefour', () => {
      const item = {
        url: 'https://www.carrefouruae.com/mafuae/en/p/123',
        store: 'Carrefour UAE',
        price: '18.75',
      };
      expect(detectItemCurrency(item)).toBe('AED');
    });

    it('converts Carrefour AED price to USD correctly using exchange rate', () => {
      // 1. Using DEFAULT_RATES (multiplier: 0.3125) -> 24.50 * 0.3125 = 7.66
      const convertedDefault = calculateConvertedPrice(24.5, 'AED', DEFAULT_RATES);
      expect(convertedDefault).toBeCloseTo(7.66, 2);

      // 2. Using dynamic live API rate (e.g. 3.6725 AED per USD) -> 24.50 / 3.6725 = 6.67
      const convertedDynamic = calculateConvertedPrice(24.5, 'AED', { AED: 3.6725 });
      expect(convertedDynamic).toBeCloseTo(6.67, 2);
    });
  });

  describe('2. Store & Currency Detection for iHerb', () => {
    it('detects iHerb store from URL', () => {
      const url = 'https://www.iherb.com/pr/sport-pure-creatine-monohydrate/12345';
      expect(getStoreNameFromUrl(url).toLowerCase()).toContain('iherb');
    });

    it('defaults to USD currency for standard global iHerb URLs', () => {
      const item = {
        url: 'https://www.iherb.com/pr/sport-pure-creatine-monohydrate/12345',
        price: '29.99',
      };
      expect(detectItemCurrency(item)).toBe('USD');
      const info = getReceivedCurrencyInfo(item);
      expect(info.code).toBe('USD');
      expect(info.isUsd).toBe(true);
    });

    it('detects AED currency for ae.iherb.com regional domain', () => {
      const item = {
        url: 'https://ae.iherb.com/pr/sport-pure-creatine-monohydrate/12345',
        price: '110.00',
      };
      expect(detectItemCurrency(item)).toBe('AED');
    });

    it('detects SAR currency for sa.iherb.com regional domain', () => {
      const item = {
        url: 'https://sa.iherb.com/pr/sport-pure-creatine-monohydrate/12345',
        price: '112.50',
      };
      expect(detectItemCurrency(item)).toBe('SAR');
    });
  });

  describe('3. normalizeCartItem with Carrefour and iHerb', () => {
    it('normalizes Carrefour cart item with AED currency and non-zero price', () => {
      const rawItem = {
        title: 'Frico Creamy Sliced Gouda Cheese, 150g',
        price: '24.50',
        url: 'https://www.carrefouruae.com/mafuae/en/dairy/frico/p/123',
        image: 'https://images.carrefouruae.com/frico.jpg',
        store: 'Carrefour UAE',
      };

      const normalized = normalizeCartItem(rawItem);
      expect(normalized.price).toBe('24.50');
      expect(normalized.currency).toBe('AED');
      expect(normalized.store).toBe('Carrefour UAE');
    });

    it('normalizes iHerb cart item with USD currency and non-zero price', () => {
      const rawItem = {
        title: 'Sport, Pure Creatine Monohydrate, Unflavored',
        price: '29.99',
        url: 'https://www.iherb.com/pr/creatine/123',
        image: 'https://images.iherb.com/creatine.jpg',
        store: 'iHerb',
      };

      const normalized = normalizeCartItem(rawItem);
      expect(normalized.price).toBe('29.99');
      expect(['USD', '$']).toContain(normalized.currency);
      expect(normalized.store).toBe('iHerb');
    });
  });

  describe('4. Delivery time stamp and slot filtering in variant cleaning', () => {
    const cleanOptionValue = text => {
      if (!text || typeof text !== 'string') return '';
      let clean = text.replace(/\s+/g, ' ').trim();
      clean = clean.replace(
        /\s*[\(\[]\s*[+\-]?\s*[$€£₺]?\s*\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)?\s*[\)\]]/gi,
        ''
      );
      clean = clean.replace(
        /\s*[-–]\s*[$€£₺]?\s*\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)?$/gi,
        ''
      );
      clean = clean.replace(
        /\s+\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)\b.*$/gi,
        ''
      );
      clean = clean.replace(
        /\s*[-:]?\s*\b(tl|₺|\$|€|usd|eur|aed|sar|try)\b.*$/gi,
        ''
      );
      clean = clean.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
      if (clean.length === 0 || clean.length > 35) return '';
      const lower = clean.toLowerCase();
      const exactJunk = [
        'select',
        'choose',
        'out of stock',
        'add to cart',
        'delivery',
      ];
      for (let j = 0; j < exactJunk.length; j++) {
        if (
          lower === exactJunk[j] ||
          (lower.indexOf(exactJunk[j]) === 0 && exactJunk[j].indexOf(' ') > -1)
        )
          return '';
      }
      // Rejection rules added to Webview.js and webview1.js
      if (
        /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(clean) ||
        /^\d{1,2}\s*(?:am|pm)$/i.test(clean) ||
        /^(?:am|pm)$/i.test(clean)
      )
        return '';
      if (
        /\b(?:today|tomorrow|delivery|express|standard|slot|order within|min(?:utes)?|hrs?|hours?)\b/i.test(
          lower
        )
      )
        return '';
      if (/^\d{8,}$/.test(clean)) return '';
      return clean;
    };

    it('rejects "30 PM" leaked from Carrefour delivery time badge', () => {
      expect(cleanOptionValue('30 PM')).toBe('');
    });

    it('rejects full delivery time formats like "5:30 PM" and "11:00 AM"', () => {
      expect(cleanOptionValue('5:30 PM')).toBe('');
      expect(cleanOptionValue('11:00 AM')).toBe('');
      expect(cleanOptionValue('Earliest Delivery: 5:30 PM')).toBe('');
    });

    it('rejects delivery slot descriptions', () => {
      expect(cleanOptionValue('Express Delivery')).toBe('');
      expect(cleanOptionValue('Standard slot')).toBe('');
      expect(cleanOptionValue('Delivery Today')).toBe('');
    });

    it('preserves legitimate product variants like sizes and colors', () => {
      expect(cleanOptionValue('150g')).toBe('150g');
      expect(cleanOptionValue('500 mg')).toBe('500 mg');
      expect(cleanOptionValue('Medium')).toBe('Medium');
      expect(cleanOptionValue('XL')).toBe('XL');
      expect(cleanOptionValue('Blue')).toBe('Blue');
    });
  });

  describe('5. Split decimal price normalization', () => {
    const normalizeSplitPrice = text => {
      let t = text.replace(/[ \t\r\n\u00A0]+/g, ' ').trim();
      t = t.replace(/([0-9]+)\s*([.,])\s*([0-9]{1,2})\b/g, '$1$2$3');
      const matches = t.match(
        /([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g
      );
      return matches ? matches[0] : '';
    };

    it('joins split Carrefour decimals like "24 .50"', () => {
      expect(normalizeSplitPrice('AED 24 .50')).toBe('24.50');
      expect(normalizeSplitPrice('24 .50')).toBe('24.50');
    });

    it('handles standard prices cleanly', () => {
      expect(normalizeSplitPrice('AED 24.50')).toBe('24.50');
      expect(normalizeSplitPrice('$29.99')).toBe('29.99');
    });
  });
});
