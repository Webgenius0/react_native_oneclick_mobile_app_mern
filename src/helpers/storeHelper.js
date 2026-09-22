/**
 * Helper to identify store name based on URL host or route params.
 */

export const getStoreNameFromUrl = url => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const cleanUrl = url.trim().toLowerCase();

  // Amazon (global and regional domains)
  if (
    cleanUrl.includes('amazon.') ||
    cleanUrl.includes('amzn.to') ||
    cleanUrl.includes('amzn.eu')
  ) {
    return 'Amazon';
  }

  // Trendyol
  if (cleanUrl.includes('trendyol.') || cleanUrl.includes('trendyol.com')) {
    return 'Trendyol';
  }

  // Shein
  if (cleanUrl.includes('shein.com')) {
    return 'Shein';
  }

  // Hepsiburada
  if (cleanUrl.includes('hepsiburada.com')) {
    return 'Hepsiburada';
  }

  // Zara
  if (cleanUrl.includes('zara.com')) {
    return 'Zara';
  }

  // Noon
  if (cleanUrl.includes('noon.com')) {
    return 'Noon';
  }

  // AliExpress
  if (cleanUrl.includes('aliexpress.com')) {
    return 'AliExpress';
  }

  // eBay
  if (cleanUrl.includes('ebay.') || cleanUrl.includes('ebay.com')) {
    return 'eBay';
  }

  // Walmart
  if (cleanUrl.includes('walmart.com')) {
    return 'Walmart';
  }

  // Nike
  if (cleanUrl.includes('nike.com')) {
    return 'Nike';
  }

  // Apple
  if (cleanUrl.includes('apple.com')) {
    return 'Apple';
  }

  // ASOS
  if (cleanUrl.includes('asos.com')) {
    return 'ASOS';
  }

  // H&M
  if (cleanUrl.includes('hm.com')) {
    return 'H&M';
  }

  // Mango
  if (cleanUrl.includes('mango.com')) {
    return 'Mango';
  }

  // Generic domain name extraction fallback
  try {
    const match = cleanUrl.match(/^(?:https?:\/\/)?(?:www\.|m\.)?([^/?#:]+)/i);
    if (match && match[1]) {
      const parts = match[1].split('.');
      if (parts.length >= 2) {
        // e.g., 'somestore.com' -> 'Somestore', 'm.shein.com' -> 'Shein'
        const domainName = parts[parts.length - 2];
        if (domainName && domainName.length > 1) {
          return domainName.charAt(0).toUpperCase() + domainName.slice(1);
        }
      }
    }
  } catch (_e) {
    // Fallback ignored
  }

  return '';
};

export const getStoreName = (url, fallbackName = '') => {
  const detected = getStoreNameFromUrl(url);
  if (detected) {
    return detected;
  }

  if (fallbackName && typeof fallbackName === 'string') {
    return fallbackName.trim();
  }

  return '';
};

export const isProductUrl = url => {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  const withoutQuery = cleanUrl.split('?')[0].split('#')[0];

  try {
    const match = withoutQuery.match(/^(?:https?:\/\/)?(?:www\.|m\.)?([^/?#:]+)(\/.*)?$/i);
    const host = match && match[1] ? match[1].toLowerCase() : '';
    const path = (match && match[2] ? match[2].toLowerCase() : '').replace(/\/+$/, '');

    // Homepage checks
    if (!path || path === '' || path === '/en' || path === '/tr' || path === '/ar' || path === '/som') {
      return false;
    }

    // Category / Search / Cart / Account pages
    if (
      path.includes('/search') ||
      path.includes('/category') ||
      path.includes('/categories') ||
      path.includes('/collections') ||
      path.includes('/basket') ||
      path.includes('/cart') ||
      path.includes('/checkout') ||
      path.includes('/account') ||
      path.includes('/login') ||
      path.includes('/register') ||
      path.includes('/butik') ||
      path.includes('/butikler') ||
      path.endsWith('/sr') ||
      path.endsWith('/s')
    ) {
      return false;
    }

    // Store-specific product patterns
    if (host.includes('trendyol.')) {
      return path.includes('-p-') || path.includes('/p/');
    }

    if (host.includes('amazon.')) {
      return /\/(dp|gp\/product|d)\/[a-z0-9]{8,12}/i.test(path);
    }

    if (host.includes('shein.')) {
      return /-p-\d+\.html/i.test(path) || path.includes('/goods-p-') || path.includes('/item/');
    }

    if (host.includes('hepsiburada.')) {
      return /-p-[a-z0-9]+/i.test(path) || /-pm-[a-z0-9]+/i.test(path);
    }

    if (host.includes('noon.')) {
      return /\/p\/[a-z0-9]+/i.test(path);
    }

    // Generic e-commerce indicators
    if (
      /\/(products?|items?|goods|p)\/[^/?#]+/i.test(path) ||
      /-p-\d+/i.test(path)
    ) {
      return true;
    }
  } catch (_e) {}

  return false;
};
