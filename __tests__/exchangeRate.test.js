import {
  normalizeCurrency,
  parsePrice,
  calculateConvertedPrice,
  formatUsd,
  detectItemCurrency,
  getReceivedCurrencyInfo,
  DEFAULT_RATES,
  DEFAULT_INVERSE_RATES,
} from '../src/helpers/currencyHelper';
import { parseExchangeRateData, useExchangeRateStore } from '../src/store/useExchangeRateStore';

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

    it('normalizes EUR, GBP, SAR, USD with special symbols', () => {
      expect(normalizeCurrency('EUR')).toBe('EUR');
      expect(normalizeCurrency('€')).toBe('EUR');
      expect(normalizeCurrency('GBP')).toBe('GBP');
      expect(normalizeCurrency('£')).toBe('GBP');
      expect(normalizeCurrency('SAR')).toBe('SAR');
      expect(normalizeCurrency('SR')).toBe('SAR');
      expect(normalizeCurrency('﷼')).toBe('SAR');
      expect(normalizeCurrency('\uFDFC')).toBe('SAR');
      expect(normalizeCurrency('ر.س')).toBe('SAR');
      expect(normalizeCurrency('ريال')).toBe('SAR');
      expect(normalizeCurrency('', '150 ﷼')).toBe('SAR');
      expect(normalizeCurrency('', '200 ر.س')).toBe('SAR');
      expect(normalizeCurrency('USD')).toBe('USD');
      expect(normalizeCurrency('$')).toBe('USD');
    });

    it('falls back to TRY if unspecified', () => {
      expect(normalizeCurrency('', '')).toBe('TRY');
    });
  });

  describe('detectItemCurrency', () => {
    it('detects USD items without converting them', () => {
      expect(detectItemCurrency({ currency: 'USD' })).toBe('USD');
      expect(detectItemCurrency({ price: '$49.99' })).toBe('USD');
      expect(detectItemCurrency({ url: 'https://amazon.com/dp/B08N5WRWNW' })).toBe('USD');
      expect(detectItemCurrency({ store: 'Shein', price: '$12.00' })).toBe('USD');
      expect(detectItemCurrency({ url: 'https://shein.com/item-p-123' })).toBe('USD');
    });

    it('detects AED items from store, url, or currency', () => {
      expect(detectItemCurrency({ store: 'Shein', currency: 'AED' })).toBe('AED');
      expect(detectItemCurrency({ url: 'https://shein.ae/item-p-123' })).toBe('AED');
      expect(detectItemCurrency({ url: 'https://amazon.ae/dp/B08N5WRWNW' })).toBe('AED');
      expect(detectItemCurrency({ url: 'https://noon.com/uae-en/p-123' })).toBe('AED');
      expect(detectItemCurrency({ currency: 'AED' })).toBe('AED');
      expect(detectItemCurrency({ price: '120.00 د.إ' })).toBe('AED');
    });

    it('detects SAR items from url, currency, or symbols (﷼, ر.س, SAR, SR)', () => {
      expect(detectItemCurrency({ url: 'https://amazon.sa/dp/B08N5WRWNW' })).toBe('SAR');
      expect(detectItemCurrency({ url: 'https://shein.sa/item-p-123' })).toBe('SAR');
      expect(detectItemCurrency({ currency: 'SAR' })).toBe('SAR');
      expect(detectItemCurrency({ price: '150 SR' })).toBe('SAR');
      expect(detectItemCurrency({ price: '150 ﷼' })).toBe('SAR');
      expect(detectItemCurrency({ price: '150 ر.س' })).toBe('SAR');
      expect(detectItemCurrency({ currency: '﷼' })).toBe('SAR');
    });

    it('detects TRY items from url or currency', () => {
      expect(detectItemCurrency({ url: 'https://www.trendyol.com/brand/p-123' })).toBe('TRY');
      expect(detectItemCurrency({ currency: 'TRY' })).toBe('TRY');
      expect(detectItemCurrency({ price: '250 TL' })).toBe('TRY');
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

  describe('Dynamic API response ingestion (parseExchangeRateData)', () => {
    const apiResponse = {
      error: false,
      default_currency: 'AED',
      default_target: 'USD',
      default_from: 'AED',
      default_to: 'USD',
      default_rate: 0.3125,
      default_inverse_rate: 3.2,
      rate: 3.2,
      rateAed: 3.2,
      rateUsd: 33.9997,
      rateTry: 33.9997,
      rates: {
        AED: 0.3125,
        EUR: 1.08,
        GBP: 1.28,
        SAR: 0.266667,
        TRY: 0.029412,
      },
      inverseRates: {
        AED: 3.2,
        EUR: 0.9259,
        GBP: 0.7813,
        SAR: 3.75,
        TRY: 33.9997,
      },
      pairs: [
        {
          from: 'AED',
          to: 'USD',
          rate: 0.3125,
          inverseRate: 3.2,
        },
        {
          from: 'EUR',
          to: 'USD',
          rate: 1.08,
          inverseRate: 0.9259,
        },
      ],
    };

    it('correctly ingests rates, inverseRates, and sets USD to 1.0', () => {
      const parsed = parseExchangeRateData(apiResponse);
      expect(parsed.rates.AED).toBe(0.3125);
      expect(parsed.rates.TRY).toBe(0.029412);
      expect(parsed.rates.SAR).toBe(0.266667);
      expect(parsed.rates.EUR).toBe(1.08);
      expect(parsed.rates.GBP).toBe(1.28);
      expect(parsed.rates.USD).toBe(1.0);

      expect(parsed.inverseRates.AED).toBe(3.2);
      expect(parsed.inverseRates.TRY).toBe(33.9997);
      expect(parsed.inverseRates.SAR).toBe(3.75);
      expect(parsed.inverseRates.USD).toBe(1.0);
    });

    it('keeps USD prices unconverted and converts AED, TRY, SAR dynamically', () => {
      const parsed = parseExchangeRateData(apiResponse);

      // USD: stays untouched
      const usdPrice = calculateConvertedPrice('50.00', 'USD', parsed.rates, parsed.inverseRates);
      expect(usdPrice).toBe(50.0);

      // AED: converts via rate 0.3125 (100 AED -> $31.25 USD)
      const aedPrice = calculateConvertedPrice('100.00', 'AED', parsed.rates, parsed.inverseRates);
      expect(aedPrice).toBe(31.25);

      // TRY: converts via rate 0.029412 (450 TRY -> $13.24 USD)
      const tryPrice = calculateConvertedPrice('450.00', 'TRY', parsed.rates, parsed.inverseRates);
      expect(tryPrice).toBe(13.24);

      // SAR: converts via rate 0.266667 (150 SAR -> $40.00 USD)
      const sarPrice = calculateConvertedPrice('150.00', 'SAR', parsed.rates, parsed.inverseRates);
      expect(sarPrice).toBe(40.0);

      // EUR: converts via rate 1.08 (100 EUR -> $108.00 USD)
      const eurPrice = calculateConvertedPrice('100.00', 'EUR', parsed.rates, parsed.inverseRates);
      expect(eurPrice).toBe(108.0);
    });
  });

  describe('calculateConvertedPrice', () => {
    const liveRates = {
      AED: 0.3125,
      EUR: 1.08,
      GBP: 1.28,
      SAR: 0.266667,
      TRY: 0.029412,
      USD: 1.0,
    };

    it('matches the API response: 100 AED -> $31.25 USD (rate 0.3125)', () => {
      const converted = calculateConvertedPrice(100, 'AED', liveRates);
      expect(converted).toBe(31.25);
    });

    it('converts TRY: 450.00 TRY -> $13.24 USD', () => {
      const converted = calculateConvertedPrice('450.00', 'TRY', liveRates);
      expect(converted).toBe(13.24);
    });

    it('converts SAR: 150.00 SAR -> $40.00 USD', () => {
      const converted = calculateConvertedPrice('150.00', 'SAR', liveRates);
      expect(converted).toBe(40.0);
    });

    it('returns exact amount for USD items without any conversion', () => {
      const converted = calculateConvertedPrice('50.00', 'USD', liveRates);
      expect(converted).toBe(50.0);
      const convertedUsdString = calculateConvertedPrice('$79.99', 'USD', liveRates);
      expect(convertedUsdString).toBe(79.99);
    });

    it('works with default fallback rates when dynamic rates are missing', () => {
      const converted = calculateConvertedPrice(100, 'AED', {});
      expect(converted).toBe(31.25);
      const convertedUsd = calculateConvertedPrice(100, 'USD', {});
      expect(convertedUsd).toBe(100.0);
    });
  });

  describe('formatUsd', () => {
    it('formats numbers into USD strings', () => {
      expect(formatUsd(31.25)).toBe('$31.25 USD');
      expect(formatUsd(10.29)).toBe('$10.29 USD');
    });
  });

  describe('Shein item price and fee calculation', () => {
    it('correctly calculates total USD for Shein USD item including base fee', () => {
      const unitUsd = calculateConvertedPrice('19.99', 'USD');
      const sheinFee = 0.3; // from useSheinPriceStore basePriceUsd
      expect(unitUsd).toBe(19.99);
      expect(unitUsd + sheinFee).toBe(20.29);
    });

    it('correctly calculates total USD for Shein AED item with API rate 0.3125', () => {
      const unitUsd = calculateConvertedPrice('50.00', 'AED', { AED: 0.3125 });
      const sheinFee = 0.3;
      expect(unitUsd).toBe(15.63);
      expect(Number((unitUsd + sheinFee).toFixed(2))).toBe(15.93);
    });

    it('correctly calculates Shein price with percentage markup in AED currency', () => {
      const basePrice = 33.00;
      const percent = 10; // 10%
      const finalPrice = basePrice + (basePrice * percent / 100);
      expect(finalPrice).toBe(36.30);
      expect(`${finalPrice.toFixed(2)} AED`).toBe('36.30 AED');
    });

    it('correctly formats cart display with USD primary and original on side', () => {
      // 100 AED -> $31.25 (100.00 AED)
      const aedAmount1 = 100;
      const convertedUsd1 = calculateConvertedPrice(aedAmount1, 'AED', { AED: 0.3125 });
      expect(convertedUsd1).toBe(31.25);
      const displayString1 = `$${convertedUsd1.toFixed(2)} (${aedAmount1.toFixed(2)} AED)`;
      expect(displayString1).toBe('$31.25 (100.00 AED)');
    });

    it('correctly converts prices using inverseRates formula (price / 3.2)', () => {
      // Formula: Local_Price / inverseRates[CURRENCY] (100 / 3.2 = 31.25)
      const priceAed = 100;
      const convertedWithInverseNumber = calculateConvertedPrice(priceAed, 'AED', {}, { AED: 3.2 });
      expect(convertedWithInverseNumber).toBe(31.25);

      const convertedWithInverseString = calculateConvertedPrice(priceAed, 'AED', {}, { AED: '3.2' });
      expect(convertedWithInverseString).toBe(31.25);
    });

    it('keeps Shein item in USD if price has $ or USD, adds percent, and displays received currency', () => {
      // Shein item with $ currency: $10.00 base + 10% percent adding = $11.00
      const itemWithDollar = { store: 'Shein', price: '$10.00' };
      const basePrice = parsePrice(itemWithDollar.price);
      expect(basePrice).toBe(10.0);

      const percent = 10;
      const finalPrice = basePrice + (basePrice * (percent / 100));
      expect(finalPrice).toBe(11.0);

      const infoDollar = getReceivedCurrencyInfo(itemWithDollar);
      expect(infoDollar.isUsd).toBe(true);
      expect(infoDollar.display).toBe('$');

      // Shows as received: $11.00 (not converted to AED or side text)
      const formattedDollar = infoDollar.display === '$' ? `$${finalPrice.toFixed(2)}` : `${finalPrice.toFixed(2)} USD`;
      expect(formattedDollar).toBe('$11.00');

      // Shein item with explicit USD text: 20.00 USD + 10% = 22.00 USD
      const itemWithUsd = { store: 'Shein', price: '20.00 USD' };
      const infoUsd = getReceivedCurrencyInfo(itemWithUsd);
      expect(infoUsd.isUsd).toBe(true);
      expect(infoUsd.display).toBe('USD');

      const finalPriceUsd = 20.0 + (20.0 * (percent / 100));
      const formattedUsd = infoUsd.display === '$' ? `$${finalPriceUsd.toFixed(2)}` : `${finalPriceUsd.toFixed(2)} USD`;
      expect(formattedUsd).toBe('22.00 USD');
    });
  });

  describe('getReceivedCurrencyInfo', () => {
    it('accurately identifies $ and USD from price string and currency code', () => {
      expect(getReceivedCurrencyInfo({ price: '$49.99' })).toEqual({ code: 'USD', display: '$', isUsd: true });
      expect(getReceivedCurrencyInfo({ price: '49.99 USD' })).toEqual({ code: 'USD', display: 'USD', isUsd: true });
      expect(getReceivedCurrencyInfo({ currency: '$' })).toEqual({ code: 'USD', display: '$', isUsd: true });
      expect(getReceivedCurrencyInfo({ currency: 'USD' })).toEqual({ code: 'USD', display: 'USD', isUsd: true });
    });

    it('identifies non-USD currencies like AED, TRY, SAR with their symbols', () => {
      expect(getReceivedCurrencyInfo({ price: '100 AED' })).toEqual({ code: 'AED', display: 'AED', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '100 د.إ' })).toEqual({ code: 'AED', display: 'د.إ', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '150 SR' })).toEqual({ code: 'SAR', display: 'SAR', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '150 ﷼' })).toEqual({ code: 'SAR', display: '﷼', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '150 ر.س' })).toEqual({ code: 'SAR', display: 'ر.س', isUsd: false });
      expect(getReceivedCurrencyInfo({ currency: '﷼' })).toEqual({ code: 'SAR', display: '﷼', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '250 TL' })).toEqual({ code: 'TRY', display: 'TRY', isUsd: false });
      expect(getReceivedCurrencyInfo({ price: '250 ₺' })).toEqual({ code: 'TRY', display: '₺', isUsd: false });
    });
  });

  describe('useExchangeRateStore.fetchRates USD suppression', () => {
    it('returns immediately without API hit when USD currency string, item, or item array is passed', async () => {
      const resultUsd = await useExchangeRateStore.getState().fetchRates('USD');
      expect(resultUsd).toBeUndefined();

      const resultDollar = await useExchangeRateStore.getState().fetchRates('$');
      expect(resultDollar).toBeUndefined();

      const resultItem = await useExchangeRateStore.getState().fetchRates({ currency: 'USD', price: '$25.00' });
      expect(resultItem).toBeUndefined();

      const resultItems = await useExchangeRateStore.getState().fetchRates([
        { currency: 'USD', price: '$10.00' },
        { currency: '$', price: '$15.00' },
      ]);
      expect(resultItems).toBeUndefined();

      const resultEmpty = await useExchangeRateStore.getState().fetchRates([]);
      expect(resultEmpty).toBeUndefined();
    });
  });
});
