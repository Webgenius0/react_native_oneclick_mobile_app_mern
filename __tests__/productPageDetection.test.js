/* eslint-disable no-new-func */
/**
 * Test suite for WebView single product and Add to Cart / Buy Now button detection.
 */

import { checkProductPageBridge } from '../src/helpers/webview1';

describe('Product Page & Add to Cart Detection Bridge', () => {
  let mockWindow;
  let postedMessages;

  beforeEach(() => {
    postedMessages = [];

    // Setup mock browser window & document
    mockWindow = {
      location: {
        href: 'https://www.example.com/',
        pathname: '/',
      },
      ReactNativeWebView: {
        postMessage: (msg) => {
          postedMessages.push(JSON.parse(msg));
        },
      },
      getComputedStyle: (el) => ({
        display: el.style?.display || 'block',
        visibility: el.style?.visibility || 'visible',
        opacity: el.style?.opacity || '1',
      }),
      setInterval: (fn, ms) => {
        // Execute once immediately or store
        return 123;
      },
      clearInterval: () => {},
      MutationObserver: null,
    };
  });

  const runBridgeInContext = (customWindow, customDocument) => {
    const bridgeScript = checkProductPageBridge();
    const fn = new Function('window', 'document', bridgeScript);
    fn(customWindow, customDocument);
  };

  test('generates a non-empty bridge script', () => {
    const script = checkProductPageBridge();
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(100);
    expect(script).toContain('hasActiveCartOrBuyButton');
    expect(script).toContain('isSingleProductPage');
  });

  test('Scenario 1: Home page -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/';
    mockWindow.location.pathname = '/';

    const mockDocument = {
      querySelectorAll: () => [],
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 2: Category / listing page -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.trendyol.com/en/men-shirts-x-g2-c75';
    mockWindow.location.pathname = '/en/men-shirts-x-g2-c75';

    // Multiple product cards on listing
    const productCards = [{}, {}, {}, {}, {}];
    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.product-card') || selector.includes('.p-card-wrppr')) {
          return productCards;
        }
        return [];
      },
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 3: Single product page with Add to Cart button -> button visible (isProduct: true)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/dp/B0FQFHZF6L';
    mockWindow.location.pathname = '/dp/B0FQFHZF6L';

    const cartBtn = {
      innerText: 'Add to Cart',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 120, height: 40 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('#add-to-cart-button')) {
          return [cartBtn];
        }
        if (selector.includes('.product-card')) {
          return [];
        }
        return [];
      },
      querySelector: (selector) => {
        if (selector.includes('#buybox') || selector.includes('#productTitle')) {
          return {};
        }
        return null;
      },
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
    expect(lastMsg.data.url).toBe('https://www.amazon.ae/dp/B0FQFHZF6L');
  });

  test('Scenario 4: Single product page with Buy Now button -> button visible (isProduct: true)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/dp/B0FQFHZF6L';
    mockWindow.location.pathname = '/dp/B0FQFHZF6L';

    const buyNowBtn = {
      innerText: 'Buy Now',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 120, height: 40 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('#buy-now-button')) {
          return [buyNowBtn];
        }
        return [];
      },
      querySelector: (selector) => {
        if (selector.includes('#productTitle')) {
          return {};
        }
        return null;
      },
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
  });

  test('Scenario 5: Single product page with Turkish "Sepete Ekle" -> button visible (isProduct: true)', () => {
    mockWindow.location.href = 'https://www.trendyol.com/brand/product-name-p-123456';
    mockWindow.location.pathname = '/brand/product-name-p-123456';

    const sepeteEkleBtn = {
      innerText: 'Sepete Ekle',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 150, height: 45 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.add-to-basket')) {
          return [sepeteEkleBtn];
        }
        return [];
      },
      querySelector: (selector) => {
        if (selector.includes('.product-detail-container')) {
          return {};
        }
        return null;
      },
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
  });

  test('Scenario 6: Single product page with out-of-stock / Tükendi button -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.trendyol.com/brand/product-name-p-123456';
    mockWindow.location.pathname = '/brand/product-name-p-123456';

    const outOfStockBtn = {
      innerText: 'Tükendi - Gelince Haber Ver',
      disabled: true,
      getAttribute: () => 'true',
      getBoundingClientRect: () => ({ width: 150, height: 45 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.add-to-basket') || selector.includes('button')) {
          return [outOfStockBtn];
        }
        return [];
      },
      querySelector: (selector) => {
        if (selector.includes('.product-detail-container')) {
          return {};
        }
        return null;
      },
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 7: Product page where button is hidden (display: none) -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/dp/B0FQFHZF6L';
    mockWindow.location.pathname = '/dp/B0FQFHZF6L';

    const hiddenBtn = {
      innerText: 'Add to Cart',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 0, height: 0 }),
      style: { display: 'none', visibility: 'hidden', opacity: '0' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('#add-to-cart-button')) {
          return [hiddenBtn];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 8: Product page without either Add to Cart or Buy Now button -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/dp/B0FQFHZF6L';
    mockWindow.location.pathname = '/dp/B0FQFHZF6L';

    const otherBtn = {
      innerText: 'View Details',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 100, height: 35 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.startsWith('button, input[type="button"]')) {
          return [otherBtn];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 9: Listing page with multiple cards having quick-add buttons -> button hidden (isProduct: false)', () => {
    mockWindow.location.href = 'https://www.amazon.ae/s?k=laptop';
    mockWindow.location.pathname = '/s';

    const quickAddBtn = {
      innerText: 'Add to Cart',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 80, height: 30 }),
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    // 10 search result cards
    const searchCards = Array(10).fill({});

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('s-search-result') || selector.includes('.product-card')) {
          return searchCards;
        }
        if (selector.includes('button')) {
          return [quickAddBtn];
        }
        return [];
      },
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
  });

  test('Scenario 10: Trendyol single product page with recommendation cards (.p-card-wrppr) -> button visible (isProduct: true)', () => {
    mockWindow.location.href = 'https://www.trendyol.com/mavi/erkek-tisort-p-12345678?boutiqueId=61';
    mockWindow.location.pathname = '/mavi/erkek-tisort-p-12345678';

    const sepeteEkleBtn = {
      innerText: 'Sepete Ekle',
      disabled: false,
      getAttribute: (attr) => (attr === 'class' ? 'add-to-basket-button' : null),
      getBoundingClientRect: () => ({ width: 140, height: 44 }),
      offsetWidth: 140,
      offsetHeight: 44,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    // 15 recommendation cards in the bottom carousel
    const recommendationCards = Array(15).fill({});

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.p-card-wrppr')) {
          return recommendationCards;
        }
        if (selector.includes('.add-to-basket') || selector.includes('add-to-basket-button') || selector.includes('button')) {
          return [sepeteEkleBtn];
        }
        return [];
      },
      querySelector: (selector) => {
        if (selector.includes('product-detail') || selector.includes('pr-in-w')) {
          return {};
        }
        return null;
      },
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
  });

  test('Scenario 11: Shein product page with "Sold Out" button -> button hidden (isProduct: false, isSoldOut: true)', () => {
    mockWindow.location.href = 'https://m.shein.com/ar-en/item-p-100188201.html';
    mockWindow.location.pathname = '/ar-en/item-p-100188201.html';

    const soldOutBtn = {
      innerText: 'Sold Out',
      disabled: true,
      getAttribute: () => 'true',
      getBoundingClientRect: () => ({ width: 160, height: 48 }),
      offsetWidth: 160,
      offsetHeight: 48,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('she-btn') || selector.includes('button')) {
          return [soldOutBtn];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });

  test('Scenario 12: Shein product page with Arabic "نفدت الكمية" -> button hidden (isProduct: false, isSoldOut: true)', () => {
    mockWindow.location.href = 'https://m.shein.com/ar/item-p-100188201.html';
    mockWindow.location.pathname = '/ar/item-p-100188201.html';

    const soldOutArabicBtn = {
      innerText: 'نفدت الكمية',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 160, height: 48 }),
      offsetWidth: 160,
      offsetHeight: 48,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('button') || selector.includes('.she-btn-black')) {
          return [soldOutArabicBtn];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });

  test('Scenario 13: Shein product page with "Remind Me" -> isSoldOut: true', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';

    const restockBtn = {
      innerText: 'Remind Me',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 160, height: 48 }),
      offsetWidth: 160,
      offsetHeight: 48,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('button')) {
          return [restockBtn];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });

  test('Scenario 14: Shein product with goodsInfo.stock === 0 in runtime JS -> isSoldOut: true', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';
    mockWindow.goodsInfo = {
      goods_id: 100188201,
      stock: 0,
      is_on_sale: 0,
    };

    const mockDocument = {
      querySelectorAll: () => [],
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });

  test('Scenario 15: Shein product page with .bsc-sold-out badge -> isSoldOut: true', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';

    const soldOutBadge = {
      innerText: 'Sold Out',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 80, height: 24 }),
      offsetWidth: 80,
      offsetHeight: 24,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.bsc-sold-out')) {
          return [soldOutBadge];
        }
        return [];
      },
      querySelector: () => ({}),
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });

  test('Scenario 16: Shein shoes with out-of-stock size chip (Remind Me) but active Add to Cart bottom button -> isProduct: true, isSoldOut: false', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';

    const remindMeSizeChip = {
      innerText: 'Remind Me',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 60, height: 30 }),
      offsetWidth: 60,
      offsetHeight: 30,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
      closest: (sel) => (sel.includes('size') ? {} : null),
    };

    const mainAddToCartBtn = {
      innerText: '~3% OFF! Add to Cart',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 280, height: 48 }),
      offsetWidth: 280,
      offsetHeight: 48,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
      closest: () => null,
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('.she-btn-black') || selector.includes('[class*="she-btn"]') || selector.includes('button, input[type="button"]')) {
          return [mainAddToCartBtn, remindMeSizeChip];
        }
        if (selector.includes('button')) {
          return [mainAddToCartBtn, remindMeSizeChip];
        }
        return [];
      },
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
    expect(lastMsg.data.isSoldOut).toBe(false);
  });

  test('Scenario 17: Shein product where sku_list has available sizes (some stock: 0, some stock: 10) -> isProduct: true, isSoldOut: false', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';
    mockWindow.productIntroData = {
      detail: {
        is_on_sale: 1,
        currentSku: { sku_id: 1, stock: 0 }, // default SKU out of stock
        sku_list: [
          { sku_id: 1, stock: 0 },
          { sku_id: 2, stock: 8 },
        ],
      },
    };

    const mainAddToCartBtn = {
      innerText: '5% OFF Final 6h! Add to Cart',
      disabled: false,
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 280, height: 48 }),
      offsetWidth: 280,
      offsetHeight: 48,
      style: { display: 'block', visibility: 'visible', opacity: '1' },
      closest: () => null,
    };

    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector.includes('button')) {
          return [mainAddToCartBtn];
        }
        return [];
      },
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(true);
    expect(lastMsg.data.isSoldOut).toBe(false);
  });

  test('Scenario 18: Shein product where ALL skus in sku_list have stock: 0 -> isProduct: false, isSoldOut: true', () => {
    mockWindow.location.href = 'https://m.shein.com/item-p-100188201.html';
    mockWindow.location.pathname = '/item-p-100188201.html';
    mockWindow.productIntroData = {
      detail: {
        is_on_sale: 1,
        currentSku: { sku_id: 1, stock: 0 },
        sku_list: [
          { sku_id: 1, stock: 0 },
          { sku_id: 2, stock: 0 },
        ],
      },
    };

    const mockDocument = {
      querySelectorAll: () => [],
      querySelector: () => null,
      body: {},
    };

    runBridgeInContext(mockWindow, mockDocument);

    expect(postedMessages.length).toBeGreaterThan(0);
    const lastMsg = postedMessages[postedMessages.length - 1];
    expect(lastMsg.type).toBe('isProductPage');
    expect(lastMsg.data.isProduct).toBe(false);
    expect(lastMsg.data.isSoldOut).toBe(true);
  });
});

describe('URL Comparison & Stale Message Prevention', () => {
  const { isSamePageUrl, isProductUrl } = require('../src/helpers/webviewUtils');

  test('isSamePageUrl returns true for identical URLs', () => {
    expect(isSamePageUrl('https://amazon.ae/dp/B0FQFHZF6L', 'https://amazon.ae/dp/B0FQFHZF6L')).toBe(true);
  });

  test('isSamePageUrl returns true when only hash differs', () => {
    expect(isSamePageUrl('https://amazon.ae/dp/B0FQFHZF6L#reviews', 'https://amazon.ae/dp/B0FQFHZF6L')).toBe(true);
    expect(isSamePageUrl('https://amazon.ae/dp/B0FQFHZF6L', 'https://amazon.ae/dp/B0FQFHZF6L#details')).toBe(true);
  });

  test('isSamePageUrl returns true for same product with tracking parameters', () => {
    const url1 = 'https://amazon.ae/dp/B0FQFHZF6L?ref=hp_1';
    const url2 = 'https://amazon.ae/dp/B0FQFHZF6L?ref=hp_2';
    expect(isSamePageUrl(url1, url2)).toBe(true);
  });

  test('isSamePageUrl returns false for different product pages', () => {
    const url1 = 'https://trendyol.com/brand/item-p-1001';
    const url2 = 'https://trendyol.com/brand/item-p-2002';
    expect(isSamePageUrl(url1, url2)).toBe(false);
  });

  test('isSamePageUrl returns false when navigating from product to category', () => {
    const productUrl = 'https://trendyol.com/brand/item-p-1001';
    const categoryUrl = 'https://trendyol.com/en/men-shirts-x-g2-c75';
    expect(isSamePageUrl(productUrl, categoryUrl)).toBe(false);
  });

  test('isProductUrl correctly identifies product vs non-product URLs', () => {
    const { isProductUrl: storeIsProductUrl } = require('../src/helpers/storeHelper');

    expect(isProductUrl('https://trendyol.com/brand/product-name-p-12345')).toBe(true);
    expect(isProductUrl('https://amazon.ae/dp/B0FQFHZF6L')).toBe(true);
    expect(isProductUrl('https://m.shein.com/ar-en/item-p-100188201.html')).toBe(true);
    expect(isProductUrl('https://www.iherb.com/pr/california-gold-nutrition-lactobif-30-probiotics-30-veggie-capsules/64009')).toBe(true);
    expect(isProductUrl('https://www.yesstyle.com/en/info.html/pid.1119058223')).toBe(true);
    expect(isProductUrl('https://www.yesstyle.com/en/beauty-of-joseon/info.html/pid.1119058223')).toBe(true);
    expect(isProductUrl('https://amazon.ae/')).toBe(false);
    expect(isProductUrl('https://trendyol.com/en/')).toBe(false);
    expect(isProductUrl('https://www.iherb.com/c/supplements')).toBe(false);
    expect(isProductUrl('https://www.yesstyle.com/en/women.html')).toBe(false);
    expect(isProductUrl('about:blank')).toBe(false);
    expect(isProductUrl('')).toBe(false);

    // Also verify storeHelper's isProductUrl handles iHerb and YesStyle
    expect(storeIsProductUrl('https://www.iherb.com/pr/california-gold-nutrition-lactobif-30-probiotics-30-veggie-capsules/64009')).toBe(true);
    expect(storeIsProductUrl('https://sa.iherb.com/pr/california-gold-nutrition-lactobif-30-probiotics-30-veggie-capsules/64009')).toBe(true);
    expect(storeIsProductUrl('https://www.yesstyle.com/en/info.html/pid.1119058223')).toBe(true);
    expect(storeIsProductUrl('https://www.yesstyle.com/en/beauty-of-joseon/info.html/pid.1119058223')).toBe(true);
    expect(storeIsProductUrl('https://www.iherb.com/c/supplements')).toBe(false);
    expect(storeIsProductUrl('https://www.yesstyle.com/en/women.html')).toBe(false);

    // Shein URL patterns
    expect(storeIsProductUrl('https://us.shein.com/pd/123456')).toBe(true);
    expect(storeIsProductUrl('https://m.shein.com/goods/123456')).toBe(true);
    expect(storeIsProductUrl('https://shein.com/product/123456')).toBe(true);
    expect(storeIsProductUrl('https://shein.com/goods-p-123456')).toBe(true);
    expect(storeIsProductUrl('https://shein.com/item?goods_id=123456')).toBe(true);
    expect(storeIsProductUrl('https://shein.com/women-clothing-c-2033.html')).toBe(false);
  });
});

