import {
  detectItemCurrency,
  getReceivedCurrencyInfo,
  calculateConvertedPrice,
  parsePrice,
} from '../src/helpers/currencyHelper';
import { normalizeCartItem } from '../src/store/useCartStore';

describe('Shein Dynamic Currency Selection & Conversion Tests', () => {
  const sampleRates = {
    SAR: 0.266667,
    AED: 0.3125,
    TRY: 0.029412,
    USD: 1.0,
  };

  const sampleInverseRates = {
    SAR: 3.75,
    AED: 3.2,
    TRY: 33.9997,
    USD: 1.0,
  };

  test('1. Shein with USD currency: NO dollar exchange rate conversion occurs, exact product price shown', () => {
    // When user selected USD or price is in USD on Shein
    const sheinUsdItem = {
      store: 'Shein',
      url: 'https://m.shein.com/item-123.html',
      price: '$25.00',
      currency: '$',
    };

    const info = getReceivedCurrencyInfo(sheinUsdItem);
    expect(info.isUsd).toBe(true);
    expect(info.code).toBe('USD');

    const isShein = true;
    const safePercent = 10;
    const basePrice = parsePrice(sheinUsdItem.price);
    const percentAmount = isShein && !info.isUsd && safePercent > 0 ? basePrice * (safePercent / 100) : 0;
    const finalPrice = basePrice + percentAmount;

    // Because isUsd is true, convertedPrice is directly finalPrice (NO exchange rate division)
    const convertedUsd = info.isUsd
      ? finalPrice
      : calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);

    expect(percentAmount).toBe(0);
    expect(finalPrice).toBe(25.00);
    expect(convertedUsd).toBe(25.00); // Unaltered USD amount
  });

  test('1b. Exact user scenario: $12.25 on Shein /ar-en/ URL stays USD $12.25 and does NOT become $3.59', () => {
    const userItem = {
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/item-789.html',
      price: '$12.25',
      currency: '$',
    };

    const info = getReceivedCurrencyInfo(userItem);
    expect(info.isUsd).toBe(true);
    expect(info.code).toBe('USD');
    expect(info.display).toBe('$');

    const basePrice = parsePrice(userItem.price);
    expect(basePrice).toBe(12.25);

    const isShein = true;
    const safePercent = 10;
    const percentAmount = isShein && !info.isUsd && safePercent > 0 ? basePrice * (safePercent / 100) : 0;
    const finalPrice = parseFloat((basePrice + percentAmount).toFixed(2));

    const convertedUsd = info.isUsd
      ? finalPrice
      : calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);

    // It must NOT divide by 3.75 (which would give $3.59)!
    expect(convertedUsd).not.toBe(3.59);
    expect(convertedUsd).toBe(12.25); // Exact $12.25 in USD!
  });

  test('2. Shein with SAR currency: Dollar conversion is ACTIVE via SAR rate', () => {
    // When user selected SAR or price is in SAR on Shein
    const sheinSarItem = {
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/item-456.html',
      price: '25.00',
      currency: 'SAR',
    };

    const info = getReceivedCurrencyInfo(sheinSarItem);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');

    // Commission 10% applied
    const basePrice = parsePrice(sheinSarItem.price);
    const finalPrice = basePrice + basePrice * 0.10; // 27.50 SAR

    // Because isUsd is false, convertedPrice is calculated via rates.SAR (27.50 / 3.75)
    const convertedUsd = info.isUsd
      ? finalPrice
      : calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);

    expect(convertedUsd).toBe(7.33); // 27.50 / 3.75 = $7.33 USD
  });

  test('3. Shein with AED currency: Dollar conversion is ACTIVE via AED rate', () => {
    // When user selected AED or price is in AED on Shein
    const sheinAedItem = {
      store: 'Shein',
      url: 'https://m.shein.com/item-789.html',
      price: '100.00',
      currency: 'AED',
    };

    const info = getReceivedCurrencyInfo(sheinAedItem);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');

    // Commission 10% applied
    const basePrice = parsePrice(sheinAedItem.price);
    const finalPrice = basePrice + basePrice * 0.10; // 110.00 AED

    // Because isUsd is false, convertedPrice is calculated via rates.AED (110.00 / 3.2)
    const convertedUsd = info.isUsd
      ? finalPrice
      : calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);

    expect(convertedUsd).toBe(34.38); // 110.00 / 3.2 = $34.38 USD
  });

  test('4. Shein with Arabic symbols (﷼ or ر.س) detects as SAR and converts', () => {
    const itemWithSymbol = {
      store: 'Shein',
      url: 'https://m.shein.com/goods-p-100.html',
      price: '50.00 ﷼',
    };

    const info = getReceivedCurrencyInfo(itemWithSymbol);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');
    expect(info.display).toBe('﷼');

    const basePrice = parsePrice(itemWithSymbol.price);
    const convertedUsd = calculateConvertedPrice(basePrice, info.code, sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(13.33); // 50 / 3.75 = $13.33 USD
  });

  test('5. Shein with Arabic AED symbol (د.إ) detects as AED and converts', () => {
    const itemWithAed = {
      store: 'Shein',
      url: 'https://m.shein.com/goods-p-200.html',
      price: '160.00 د.إ',
    };

    const info = getReceivedCurrencyInfo(itemWithAed);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');
    expect(info.display).toBe('د.إ');

    const basePrice = parsePrice(itemWithAed.price);
    const convertedUsd = calculateConvertedPrice(basePrice, info.code, sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(50.00); // 160 * 0.3125 = $50.00 USD
  });

  test('6. Shein with explicit $ symbol stays in USD without conversion', () => {
    const dollarItem = {
      store: 'Shein',
      url: 'https://m.shein.com/item-300.html',
      price: '$45.00',
    };

    const info = getReceivedCurrencyInfo(dollarItem);
    expect(info.isUsd).toBe(true);
    expect(info.code).toBe('USD');
    expect(info.display).toBe('$');

    const basePrice = parsePrice(dollarItem.price);
    const convertedUsd = info.isUsd
      ? basePrice
      : calculateConvertedPrice(basePrice, info.code, sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(45.00); // No conversion
  });

  test('7. Fallback regional domain detection when no currency or symbol is provided', () => {
    // Saudi / Arabic path -> SAR
    expect(detectItemCurrency({ url: 'https://m.shein.com/ar-en/p-1.html' })).toBe('SAR');
    expect(detectItemCurrency({ url: 'https://shein.sa/p-1.html' })).toBe('SAR');

    // UAE domain -> AED
    expect(detectItemCurrency({ url: 'https://shein.ae/p-1.html' })).toBe('AED');

    // US domain -> USD
    expect(detectItemCurrency({ url: 'https://us.shein.com/p-1.html' })).toBe('USD');
  });

  test('8. normalizeCartItem respects USD currency and does NOT force Shein /ar-en/ items to SAR', () => {
    const usdSheinItem = {
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/IslaSuriya-Womens-Lace-Patchwork-p-123.html',
      price: '$8.26',
      currency: '$',
      title: 'IslaSuriya Womens Lace Patchwork',
    };

    const normalized = normalizeCartItem(usdSheinItem);
    expect(normalized.currency).toBe('$');
    expect(normalized.price).toBe('$8.26');

    const info = getReceivedCurrencyInfo(normalized);
    expect(info.isUsd).toBe(true);
    expect(info.code).toBe('USD');
  });

  test('9. normalizeCartItem correctly handles SAR currency when user selects SAR', () => {
    const sarSheinItem = {
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/item-p-456.html',
      price: '31.00',
      currency: 'SAR',
      title: 'Sample Item',
    };

    const normalized = normalizeCartItem(sarSheinItem);
    expect(normalized.currency).toBe('SAR');
    expect(normalized.price).toBe('31.00');

    const info = getReceivedCurrencyInfo(normalized);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');
  });

  test('10. normalizeCartItem correctly handles AED currency when user selects AED', () => {
    const aedSheinItem = {
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/item-p-789.html',
      price: '31.00',
      currency: 'AED',
      title: 'Sample AED Item',
    };

    const normalized = normalizeCartItem(aedSheinItem);
    expect(normalized.currency).toBe('AED');
    expect(normalized.price).toBe('31.00');

    const info = getReceivedCurrencyInfo(normalized);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');
  });

  test('11. Exact user scenario: $8.26 product on Shein with USD selected preserves $8.26 without conversion or API hit', () => {
    const cartItems = [
      normalizeCartItem({
        store: 'Shein',
        url: 'https://m.shein.com/ar-en/IslaSuriya-Womens-Lace-Patchwork-Casual-Elegant-p-123.html',
        price: '$8.26',
        currency: '$',
        title: "IslaSuriya Women's Lace Patchwork",
      }),
    ];

    const hasNonUsdItems = cartItems.some(item => !getReceivedCurrencyInfo(item).isUsd);
    expect(hasNonUsdItems).toBe(false);

    // CartItem calculations for USD
    const item = cartItems[0];
    const info = getReceivedCurrencyInfo(item);
    const basePrice = parsePrice(item.price);
    const percentAmount = !info.isUsd ? basePrice * 0.10 : 0;
    const finalPrice = basePrice + percentAmount;

    expect(info.isUsd).toBe(true);
    expect(percentAmount).toBe(0);
    expect(finalPrice).toBe(8.26);

    // Converted USD price remains unchanged
    const convertedUsd = info.isUsd
      ? finalPrice
      : calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(8.26);
  });

  test('12. Shein with AED currency selected: triggers conversion API and converts AED to USD', () => {
    const cartItems = [
      normalizeCartItem({
        store: 'Shein',
        url: 'https://m.shein.com/ar-en/item-p-123.html',
        price: '31.00',
        currency: 'AED',
        title: "Shein AED Item",
      }),
    ];

    const hasNonUsdItems = cartItems.some(item => !getReceivedCurrencyInfo(item).isUsd);
    expect(hasNonUsdItems).toBe(true); // Triggers fetchRates()

    const item = cartItems[0];
    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(31.00);

    const percentAmount = !info.isUsd ? basePrice * 0.10 : 0;
    const finalPrice = basePrice + percentAmount; // 34.10 AED with commission

    const convertedUsd = calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);
    // 34.10 / 3.2 = 10.66 USD
    expect(convertedUsd).toBe(10.66);
  });

  test('13. Shein with SAR currency selected: triggers conversion API and converts SAR to USD', () => {
    const cartItems = [
      normalizeCartItem({
        store: 'Shein',
        url: 'https://m.shein.com/ar-en/item-p-456.html',
        price: '31.00',
        currency: 'SAR',
        title: "Shein SAR Item",
      }),
    ];

    const hasNonUsdItems = cartItems.some(item => !getReceivedCurrencyInfo(item).isUsd);
    expect(hasNonUsdItems).toBe(true); // Triggers fetchRates()

    const item = cartItems[0];
    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(31.00);

    const percentAmount = !info.isUsd ? basePrice * 0.10 : 0;
    const finalPrice = basePrice + percentAmount; // 34.10 SAR with commission

    const convertedUsd = calculateConvertedPrice(finalPrice, info.code, sampleRates, sampleInverseRates);
    // 34.10 / 3.75 = 9.09 USD
    expect(convertedUsd).toBe(9.09);
  });

  test('14. User screenshot case: Gerripuer Headphones with AED currency (27.40 AED)', () => {
    // When added to cart from Shein with AED selected:
    const item = normalizeCartItem({
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/goods-p-12345.html',
      price: '27.40',
      currency: 'AED',
      title: "Gerripuer New Foldable Wireless Headphones With Full Ear Coverage",
    });

    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(27.40);

    // 10% commission on non-USD Shein item: 27.40 * 1.10 = 30.14 AED
    const percentAmount = basePrice * 0.10;
    const finalPrice = parseFloat((basePrice + percentAmount).toFixed(2));
    expect(finalPrice).toBe(30.14);

    // Converted to USD via AED inverse rate (3.2): 30.14 / 3.2 = 9.42 USD
    const convertedUsd = calculateConvertedPrice(finalPrice, 'AED', sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(9.42);
    // Must NOT remain $27.40!
    expect(convertedUsd).not.toBe(27.40);
  });

  test('15. User screenshot case: Gerripuer Headphones with new UAE Dirham sign (\u20C3 27.40)', () => {
    const item = normalizeCartItem({
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/goods-p-12345.html',
      price: '\u20C3 27.40',
      currency: 'AED',
      title: "Gerripuer New Foldable Wireless Headphones With Full Ear Coverage",
    });

    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('AED');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(27.40);

    const finalPrice = parseFloat((basePrice * 1.10).toFixed(2));
    expect(finalPrice).toBe(30.14);

    const convertedUsd = calculateConvertedPrice(finalPrice, 'AED', sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(9.42);
  });

  test('16. Shein with SAR currency (27.40 SAR) converts to USD', () => {
    const item = normalizeCartItem({
      store: 'Shein',
      url: 'https://m.shein.com/ar-en/goods-p-12345.html',
      price: '27.40',
      currency: 'SAR',
      title: "Gerripuer New Foldable Wireless Headphones With Full Ear Coverage",
    });

    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(27.40);

    const finalPrice = parseFloat((basePrice * 1.10).toFixed(2));
    expect(finalPrice).toBe(30.14);

    // 30.14 / 3.75 = 8.04 USD
    const convertedUsd = calculateConvertedPrice(finalPrice, 'SAR', sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(8.04);
    expect(convertedUsd).not.toBe(27.40);
  });

  test('17. Shein DevTools screenshot test: SR8.63 with SR currency symbol correctly maps to SAR and converts to USD', () => {
    const rawPriceText = 'SR8.63';
    // Test regex: SR8.63 must match SAR detection
    const isSarDetected = /(?:^|[^a-zA-Z])(?:SAR|SR|RIYAL)(?:[^a-zA-Z]|$)/i.test(rawPriceText);
    expect(isSarDetected).toBe(true);

    const item = normalizeCartItem({
      store: 'Shein',
      url: 'https://m.shein.com/2pcs-1pc-Round-Glasses-Suitable-For-Men-And-Women-Perfect-For-Students-After-Returning-To-School-Can-Be-Used-For-Computer-Gaming-Watching-TV-Or-Using-Mobile-Phone-And-Other-Activities-p-441132028.html',
      price: '8.63',
      currency: 'SAR',
      title: '2pcs/1pc Round Glasses, Suitable For Men And Women',
    });

    const info = getReceivedCurrencyInfo(item);
    expect(info.isUsd).toBe(false);
    expect(info.code).toBe('SAR');

    const basePrice = parsePrice(item.price);
    expect(basePrice).toBe(8.63);

    const finalPrice = parseFloat((basePrice * 1.10).toFixed(2));
    expect(finalPrice).toBe(9.49);

    // 9.49 / 3.75 = 2.53 USD
    const convertedUsd = calculateConvertedPrice(finalPrice, 'SAR', sampleRates, sampleInverseRates);
    expect(convertedUsd).toBe(2.53);
    expect(convertedUsd).not.toBe(8.63);
  });
});
