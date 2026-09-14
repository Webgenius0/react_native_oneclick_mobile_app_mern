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
  if (cleanUrl.includes('trendyol.com')) {
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

  // Generic domain name extraction fallback
  try {
    const match = cleanUrl.match(/^(?:https?:\/\/)?(?:www\.)?([^/?#:]+)/i);
    if (match && match[1]) {
      const parts = match[1].split('.');
      if (parts.length >= 2) {
        // e.g., 'somestore.com' -> 'Somestore'
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

  return 'Unknown';
};
