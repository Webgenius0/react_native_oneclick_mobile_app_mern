import {
  parsePrice,
  calculateConvertedPrice,
  detectItemCurrency,
  getReceivedCurrencyInfo,
  normalizeCurrency,
  DEFAULT_RATES,
  DEFAULT_INVERSE_RATES,
} from '../src/helpers/currencyHelper';
import {
  getStoreNameFromUrl,
  findMarketplaceForItem,
  calculateMarketplacePrice,
  cleanProductTitle,
} from '../src/helpers/storeHelper';
import { normalizeCartItem } from '../src/store/useCartStore';

describe('Life Pharmacy & AUD Currency / Marketplace Commission Tests', () => {
  const mockMarketplaces = [
    {
      id: 1,
      marketplace: 'shein',
      name: 'SHEIN',
      percent: 10,
    },
    {
      id: 2,
      marketplace: 'lifepharmacy',
      name: 'Life Pharmacy',
      percent: 10,
    },
  ];

  describe('1. Store & Currency Detection for Life Pharmacy and AUD', () => {
    it('detects Life Pharmacy store from URL', () => {
      const url = 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink';
      expect(getStoreNameFromUrl(url)).toBe('Life Pharmacy');
    });

    it('detects AED currency for Life Pharmacy products', () => {
      const item = {
        url: 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink',
        price: '997.50',
      };
      expect(detectItemCurrency(item)).toBe('AED');
      const info = getReceivedCurrencyInfo(item);
      expect(info.code).toBe('AED');
      expect(info.isUsd).toBe(false);
    });

    it('preserves USD currency for Life Pharmacy if explicit dollar symbol is present', () => {
      const item = {
        url: 'https://www.lifepharmacy.com/product/medicube-facial-device',
        price: '$250.00',
        currency: '$',
      };
      expect(detectItemCurrency(item)).toBe('USD');
      const info = getReceivedCurrencyInfo(item);
      expect(info.code).toBe('USD');
      expect(info.isUsd).toBe(true);
    });

    it('detects AUD currency correctly', () => {
      expect(normalizeCurrency('AUD')).toBe('AUD');
      expect(normalizeCurrency('A$')).toBe('AUD');
      expect(normalizeCurrency('AU$')).toBe('AUD');

      const itemAud = {
        url: 'https://www.chemistwarehouse.com.au/buy/123/product',
        price: 'A$ 45.00',
      };
      expect(detectItemCurrency(itemAud)).toBe('AUD');
      const info = getReceivedCurrencyInfo(itemAud);
      expect(info.code).toBe('AUD');
      expect(info.display).toBe('A$');
      expect(info.isUsd).toBe(false);
    });
  });

  describe('2. 10% Commission Calculation (Marketplace Price API)', () => {
    it('applies 10% commission to Life Pharmacy products matching Shein behavior', () => {
      const item = {
        url: 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink',
        store: 'Life Pharmacy',
      };
      const result = calculateMarketplacePrice(100, item, mockMarketplaces);
      expect(result.percent).toBe(10);
      expect(result.percentAmount).toBe(10);
      expect(result.finalPrice).toBe(110);
      expect(result.matchedMarketplace?.name).toBe('Life Pharmacy');
    });

    it('applies 10% fallback commission to Life Pharmacy even if marketplaces list is not explicitly passed', () => {
      const item = {
        url: 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink',
        store: 'Life Pharmacy',
      };
      const result = calculateMarketplacePrice(100, item);
      expect(result.percent).toBe(10);
      expect(result.percentAmount).toBe(10);
      expect(result.finalPrice).toBe(110);
    });

    it('calculates 10% commission for exact user screenshot item (Medicube 997.50 AED)', () => {
      const item = {
        url: 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink',
        store: 'Life Pharmacy',
      };
      // Base: 997.50 + 10% (99.75) = 1097.25
      const result = calculateMarketplacePrice(997.50, item, mockMarketplaces);
      expect(result.percent).toBe(10);
      expect(result.percentAmount).toBe(99.75);
      expect(result.finalPrice).toBe(1097.25);
    });
  });

  describe('3. Currency Conversion (Exchange Rate API)', () => {
    it('converts Life Pharmacy AED price (with 10% commission) to USD', () => {
      // 997.50 AED + 10% = 1097.25 AED
      // Using live or default rates (AED = 0.3125 USD or 3.2 AED/USD):
      // 1097.25 * 0.3125 = 342.89 USD
      const finalPriceAed = 1097.25;
      const convertedUsd = calculateConvertedPrice(finalPriceAed, 'AED', DEFAULT_RATES, DEFAULT_INVERSE_RATES);
      expect(convertedUsd).toBe(342.89);
    });

    it('if currency is USD, NO exchange rate conversion occurs (stays USD)', () => {
      // Product in USD: $100 + 10% commission = $110.00
      const finalPriceUsd = 110.00;
      const convertedUsd = calculateConvertedPrice(finalPriceUsd, 'USD', DEFAULT_RATES, DEFAULT_INVERSE_RATES);
      expect(convertedUsd).toBe(110.00);
    });

    it('converts AUD currency to USD using AUD rates', () => {
      // 100 AUD * 0.65 = 65.00 USD
      const convertedUsd = calculateConvertedPrice(100, 'AUD', DEFAULT_RATES, DEFAULT_INVERSE_RATES);
      expect(convertedUsd).toBe(65.00);
    });
  });

  describe('4. Cart Store normalization (prevents "Calculating price...")', () => {
    it('recovers stuck Life Pharmacy item with missing price in normalizeCartItem', () => {
      const rawStuckItem = {
        title: 'Medicube AGE-R Booster Pro X2 Facial Device Pink',
        url: 'https://www.lifepharmacy.com/product/medicube-age-r-booster-pro-x2-facial-device-pink',
        price: '', // was missing / calculating price
        currency: '',
        store: 'LIFEPHARMACY',
      };

      const normalized = normalizeCartItem(rawStuckItem);
      expect(normalized.price).toBe('997.50');
      expect(normalized.currency).toBe('AED');
      expect(normalized.store).toBe('Life Pharmacy');

      // Now CartItem can parse the price and show real amount!
      const basePrice = parsePrice(normalized.price);
      expect(basePrice).toBe(997.50);

      const mp = calculateMarketplacePrice(basePrice, normalized, mockMarketplaces);
      expect(mp.finalPrice).toBe(1097.25);

      const usd = calculateConvertedPrice(mp.finalPrice, normalized.currency, DEFAULT_RATES, DEFAULT_INVERSE_RATES);
      expect(usd).toBe(342.89);
    });

    it('preserves exact Shiseido Fino price (18.23 AED) and does not default to 997.50', () => {
      const shiseidoItem = {
        title: 'Shiseido Fino Premium Touch Mask, Deep Repair Treatment for Dry, Damaged, and Over-Processed Hair - 230g',
        url: 'https://www.lifepharmacy.com/product/shiseido-fino-premium-touch-hair-mask-230g',
        price: '18.23',
        currency: 'AED',
        store: 'Life Pharmacy',
      };

      const normalized = normalizeCartItem(shiseidoItem);
      expect(normalized.price).toBe('18.23');
      expect(normalized.currency).toBe('AED');
      expect(normalized.store).toBe('Life Pharmacy');

      const basePrice = parsePrice(normalized.price);
      expect(basePrice).toBe(18.23);

      const mp = calculateMarketplacePrice(basePrice, normalized, mockMarketplaces);
      // 18.23 + 10% (1.823) = 20.053 -> 20.05
      expect(mp.percent).toBe(10);
      expect(mp.finalPrice).toBe(20.05);

      const usd = calculateConvertedPrice(mp.finalPrice, normalized.currency, DEFAULT_RATES, DEFAULT_INVERSE_RATES);
      // 20.05 * 0.3125 = 6.27
      expect(usd).toBe(6.27);
    });

    it('preserves exact Dymatize Iso 100 price (502.95 AED)', () => {
      const dymatizeItem = {
        title: 'Dymatize Iso 100 5 lb Cookies & Cream',
        url: 'https://www.lifepharmacy.com/product/dymatize-iso-100-5-lb-cookies-cream',
        price: '502.95',
        currency: 'AED',
        store: 'Life Pharmacy',
      };

      const normalized = normalizeCartItem(dymatizeItem);
      expect(normalized.price).toBe('502.95');
      expect(normalized.currency).toBe('AED');

      const basePrice = parsePrice(normalized.price);
      expect(basePrice).toBe(502.95);
    });

    it('cleans Life Pharmacy titles by removing Buy prefix and Life Pharmacy suffix', () => {
      const rawTitle = 'Buy Shiseido Fino Premium Touch Mask, Deep Repair Treatment for Dry, Damaged, and Over-Processed Hair - 230g online at best price in the UAE | Life Pharmacy';
      const cleaned = cleanProductTitle(rawTitle, 'https://www.lifepharmacy.com/product/shiseido-fino-premium-touch-hair-mask-230g');
      expect(cleaned).toBe('Shiseido Fino Premium Touch Mask, Deep Repair Treatment for Dry, Damaged, and Over-Processed Hair - 230g');
    });

    it('correctly parses Life Pharmacy dirham price text formats', () => {
      expect(parsePrice('D 18.23')).toBe(18.23);
      expect(parsePrice('D\u00A018.23')).toBe(18.23);
      expect(parsePrice('Ð 18.23')).toBe(18.23);
      expect(parsePrice('D 502.95')).toBe(502.95);
      expect(detectItemCurrency({ price: 'D 18.23', url: 'https://www.lifepharmacy.com' })).toBe('AED');
      expect(detectItemCurrency({ price: 'Ð 18.23', url: 'https://www.lifepharmacy.com' })).toBe('AED');
    });
  });
});
