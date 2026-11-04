/**
 * Helper to identify store name based on URL host or route params.
 */
import { getReceivedCurrencyInfo } from './currencyHelper';
import { useSheinPriceStore } from '../store/useSheinPriceStore';

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
      return (
        /\/(?:dp|gp\/product|gp\/aw\/d|d)\/[a-z0-9]{8,12}/i.test(path) ||
        /\/dp\/[a-z0-9]{8,12}/i.test(cleanUrl) ||
        /\/gp\/product\/[a-z0-9]{8,12}/i.test(cleanUrl)
      );
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

    if (host.includes('iherb.')) {
      return /\/pr\/[a-z0-9_-]+/i.test(path) || path.includes('/pr/');
    }

    if (host.includes('yesstyle.')) {
      return /\/pid\.[a-z0-9]+/i.test(path) || path.includes('/info.html/pid.') || path.includes('/pid.');
    }

    if (host.includes('zara.')) {
      return /-p\d+\.html/i.test(path) || /\/p\d+\.html/i.test(path) || /-p0[0-9a-z]+/i.test(path);
    }

    if (host.includes('hm.com')) {
      return /productpage/i.test(path);
    }

    if (host.includes('ebay.')) {
      return /\/itm\/[0-9]+/i.test(path);
    }

    if (host.includes('aliexpress.')) {
      return (
        /\/item\/[0-9]+/i.test(cleanUrl) ||
        /\/i\/[0-9]+/i.test(cleanUrl) ||
        /\/p\/[0-9]+/i.test(cleanUrl) ||
        /[?&](?:productId|itemId)=[0-9]+/i.test(cleanUrl)
      );
    }

    if (host.includes('carrefour')) {
      return (
        /\/p\/[0-9]+/i.test(cleanUrl) ||
        /\/product\/[a-z0-9_-]+/i.test(cleanUrl)
      );
    }

    // Generic e-commerce indicators
    if (
      /\/(products?|items?|goods|p|pr|detail|product-detail)\/[^/?#]+/i.test(path) ||
      /-p-\d+/i.test(path) ||
      /\/pid\.[a-z0-9]+/i.test(path)
    ) {
      return true;
    }
  } catch (_e) { }

  return false;
};

export const getFallbackTitleFromUrl = (url, fallback = '') => {
  if (fallback && typeof fallback === 'string') {
    const cleanFallback = fallback.trim();
    if (
      cleanFallback &&
      cleanFallback !== '-' &&
      cleanFallback.toLowerCase() !== 'product' &&
      cleanFallback.toLowerCase() !== 'oneclick'
    ) {
      return cleanFallback;
    }
  }
  if (!url || typeof url !== 'string') {
    return '';
  }
  try {
    const pathOnly = url
      .split('?')[0]
      .split('#')[0]
      .replace(/^[a-z]+:\/\/[^/]+/i, '');
    const segments = pathOnly.split('/').filter(Boolean);
    let asinCandidate = '';
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i] || '';
      const slug = seg
        .replace(/\.(html?|php|asp)$/i, '')
        .replace(/-p-?\d+.*$/i, '')
        .replace(/-p0*[0-9a-z]{6,}.*$/i, '');

      // Skip empty, tiny, routing, domain, or tracking parameters (e.g. ref=mh_s9_acsd_al_cv2_3_t)
      if (
        !slug ||
        slug.length <= 3 ||
        /^(dp|gp|product|products|d|item|items|goods|p|category|categories|collection|collections|brand|brands|search|filter)$/i.test(slug) ||
        /^ref[=_\s0-9a-z-]/i.test(slug) ||
        slug.toLowerCase().includes('ref=') ||
        /^(ref|refid|session-id|keywords|qid|sr|sprefix|crid|tag)$/i.test(slug) ||
        /\.(com|net|org|tr|ae|sa|co|de|fr|uk|es|it|ru|cn)$/i.test(slug)
      ) {
        continue;
      }

      if (/^[a-z0-9]{8,12}$/i.test(slug)) {
        if (!asinCandidate) asinCandidate = slug;
        continue;
      }
      const decoded = decodeURIComponent(slug)
        .replace(/[-_+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (decoded.length > 3 && !/^\d+$/.test(decoded)) {
        // Skip tracking artifacts in decoded text
        if (/^ref[=_\s-]/i.test(decoded)) {
          continue;
        }
        const hasMixedCase = /[a-z]/.test(decoded) && /[A-Z]/.test(decoded);
        if (hasMixedCase) {
          return decoded;
        }
        return decoded
          .split(' ')
          .map(w => {
            if (/^iphone$/i.test(w)) return 'iPhone';
            if (/^ipad$/i.test(w)) return 'iPad';
            if (/^ipod$/i.test(w)) return 'iPod';
            return w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : '';
          })
          .join(' ');
      }
    }
    if (asinCandidate) {
      return asinCandidate;
    }
  } catch (_e) { }
  return '';
};

export const cleanProductTitle = (rawTitle, url = '') => {
  let title = rawTitle && typeof rawTitle === 'string' ? rawTitle : '';

  // If title is an HTTP/HTTPS URL, derive product title from URL
  if (/^https?:\/\//i.test(title.trim())) {
    const fromUrl = getFallbackTitleFromUrl(title);
    if (fromUrl) {
      return fromUrl;
    }
    title = '';
  }

  // Reject tracking parameter artifacts disguised as titles (e.g. "Ref=mh S9 Acsd Al Cv2 3 T")
  if (
    /^ref[=_\s-]/i.test(title.trim()) ||
    title.trim().toLowerCase().startsWith('ref=') ||
    /product summary|key product information/i.test(title)
  ) {
    title = '';
  }

  if (title) {
    // 1. Normalize line breaks and tabs
    title = title.replace(/\r\n|\r|\n|\t/g, ' ').replace(/\s+/g, ' ').trim();

    // 2. Decode HTML entities
    title = title
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ');

    // 3. Remove store prefixes (e.g. "Amazon.com: ", "Amazon.com.tr : ", "Trendyol: ", "Hepsiburada: ")
    title = title.replace(
      /^(?:Amazon(?:\.[a-z.]+)?|Trendyol|Hepsiburada(?:\.com)?|Shein|Zara|Noon|AliExpress|eBay|Walmart(?:\.com)?|Nike(?:\.com)?|Apple|Asos|Mango|H&M)\s*[:|–—-]\s*/gi,
      '',
    );

    // 4. Remove Amazon byline / brand prefix if captured (e.g. "Visit the Apple Store", "Brand: Apple")
    title = title.replace(
      /^(?:Visit the\s+[^\n\r]+?\s+Store|Brand:\s*[^:\n\r]+?)\s+/gi,
      '',
    );

    // 5. Remove store and domain suffixes
    title = title
      // Trendyol suffixes
      .replace(/\s*Fiyatı,?\s*Yorumları\s*-\s*Trendyol.*$/gi, '')
      .replace(/\s*Fiyatı\s*-\s*Trendyol.*$/gi, '')
      .replace(/\s*-\s*Trendyol.*$/gi, '')
      .replace(/\s*\|\s*Trendyol.*$/gi, '')
      // Hepsiburada suffixes
      .replace(/\s*Fiyatı\s*-\s*Hepsiburada.*$/gi, '')
      .replace(/\s*-\s*Hepsiburada.*$/gi, '')
      .replace(/\s*\|\s*Hepsiburada.*$/gi, '')
      // Amazon domain suffixes
      .replace(/\s*[:|–—-]\s*Amazon\.[a-z.]+(\s*:.*)?$/gi, '')
      .replace(/\s*[:|–—-]\s*Amazon$/gi, '')
      .replace(/\s*\|\s*Amazon.*$/gi, '')
      // Shein suffixes
      .replace(/\s*\|\s*SHEIN(?:\s+[A-Z]{2,3})?.*$/gi, '')
      .replace(/\s*-\s*SHEIN(?:\s+[A-Z]{2,3})?.*$/gi, '')
      // Zara suffixes
      .replace(/\s*\|\s*ZARA(?:\s+[^|–—-]+)?$/gi, '')
      .replace(/\s*-\s*ZARA(?:\s+[^|–—-]+)?$/gi, '')
      // H&M suffixes
      .replace(/\s*\|\s*H&M(?:\s+[A-Z]{2,3})?.*$/gi, '')
      .replace(/\s*-\s*H&M(?:\s+[A-Z]{2,3})?.*$/gi, '')
      // Noon suffixes
      .replace(/\s*\|\s*noon.*$/gi, '')
      .replace(/\s*-\s*noon.*$/gi, '')
      // AliExpress suffixes
      .replace(/\s*-\s*AliExpress(?:\s+\d+)?.*$/gi, '')
      .replace(/\s*\|\s*AliExpress.*$/gi, '')
      // eBay suffixes
      .replace(/\s*\|\s*eBay.*$/gi, '')
      .replace(/\s*-\s*eBay.*$/gi, '')
      // Nike suffixes
      .replace(/\s*\.?\s*Nike\.com.*$/gi, '')
      .replace(/\s*\|\s*Nike.*$/gi, '')
      // Walmart suffixes
      .replace(/\s*-\s*Walmart\.com.*$/gi, '')
      .replace(/\s*\|\s*Walmart.*$/gi, '')
      // Generic domain suffixes like "| sitename.com" or "- sitename.com"
      .replace(
        /\s*[:|–—-]\s*[a-z0-9-]+\.(?:com|org|net|tr|ae|sa|co\.uk|de|fr|es|it|ru|cn)(?:\.[a-z]+)?\s*$/gi,
        '',
      );

    // 6. Remove Amazon category breadcrumbs from document.title
    title = title.replace(
      /\s*:\s*(?:Electronics|Cell Phones & Accessories|Clothing, Shoes & Jewelry|Home & Kitchen|Beauty & Personal Care|Health & Household|Sports & Outdoors|Toys & Games|Automotive|Tools & Home Improvement|Office Products|Pet Supplies|Baby Products|Grocery & Gourmet Food|Moda|Elektronik|Ev & Yaşam|Mutfak|Kişisel Bakım|Spor & Outdoor|Oto & Yapı Market|Kitap|Oyuncak|Bebek|Computers? & Accessories|Video Games|Musical Instruments|Books|Luggage & Travel Gear|Industrial & Scientific)\s*$/gi,
      '',
    );

    // 7. Remove trailing rating / review star text if captured from noisy container
    title = title.replace(/\s*\d+(?:\.\d+)?\s*(?:out of 5 stars|stars|yıldız).*$/gi, '');
    title = title.replace(
      /\s*\(\s*\d+(?:,\d+)*\s*(?:ratings?|reviews?|değerlendirme|yorum)\s*\).*$/gi,
      '',
    );

    // 8. Clean leading and trailing punctuation & quotes
    while (/^[\s:|–—•·"'/\-]+|[\s:|–—•·"'/\-]+$/.test(title)) {
      title = title.replace(/^[\s:|–—•·"'/\-]+|[\s:|–—•·"'/\-]+$/g, '').trim();
    }

    // 9. Normalize spaces again
    title = title.replace(/\s+/g, ' ').trim();
  }

  // If title is empty or generic placeholder, try URL fallback
  const isGeneric =
    !title ||
    title.toLowerCase() === 'product' ||
    title.toLowerCase() === 'oneclick' ||
    title === '-' ||
    title.toLowerCase() === 'undefined' ||
    title.toLowerCase() === 'null' ||
    /^ref[=_\s-]/i.test(title.trim()) ||
    title.trim().toLowerCase().startsWith('ref=') ||
    /product summary|key product information/i.test(title);

  if (isGeneric && url) {
    const fromUrl = getFallbackTitleFromUrl(url);
    if (fromUrl) {
      return fromUrl;
    }
  }

  return title;
};

/**
 * Splits hostname into clean domain tokens (handles regional TLDs, subdomains, etc.):
 * "https://m.shein.sa/product/123" -> ["m", "shein", "sa"]
 * "https://www.amazon.co.uk/dp/456" -> ["www", "amazon", "co", "uk"]
 */
export const getDomainParts = url => {
  if (!url || typeof url !== 'string') return [];
  try {
    const match = url.trim().toLowerCase().match(/^(?:https?:\/\/)?([^/?#:]+)/i);
    let host = match && match[1] ? match[1].toLowerCase() : '';
    // Strip common prefixes like www., m., mobile.
    host = host.replace(/^(?:www\.|m\.|mobile\.)+/i, '');
    return host ? host.split('.') : [];
  } catch (_) {
    return [];
  }
};

/**
 * Universal Marketplace Rule Finder:
 * Matches an item by URL domain or store name against the marketplaces list from /api/marketplace-price
 */
export const findMarketplaceForItem = (item, marketplaces) => {
  if (!item) return null;

  // If marketplaces is explicitly passed as an array, use it;
  // otherwise safely fall back to stored marketplaces
  const activeMarketplaces =
    Array.isArray(marketplaces)
      ? marketplaces
      : (typeof useSheinPriceStore?.getState === 'function'
          ? useSheinPriceStore.getState()?.marketplaces
          : []) || [];

  if (!Array.isArray(activeMarketplaces) || activeMarketplaces.length === 0) {
    return null;
  }

  const url = String(item.url || item.link || '').toLowerCase();
  const domainParts = getDomainParts(url);
  const rawStore = String(
    item.store || item.marketplace || item.store_name || item.magaza || '',
  ).toLowerCase();
  const cleanStore = rawStore.replace(/[^a-z0-9]/g, '');

  for (const m of activeMarketplaces) {
    if (!m) continue;
    const mpSlug = String(m.marketplace || '').toLowerCase().trim();
    const cleanMpSlug = mpSlug.replace(/[^a-z0-9]/g, '');
    const mpName = String(m.name || '').toLowerCase().trim();
    const cleanMpName = mpName.replace(/[^a-z0-9]/g, '');

    // 1. Direct domain segment match (e.g. domainParts has 'shein' or 'amazon')
    if (mpSlug && (domainParts.includes(mpSlug) || domainParts.includes(cleanMpSlug))) {
      return m;
    }

    // 2. Substring match in URL (e.g. url contains 'shein.' or '.shein' or 'amazon.' or '.amazon')
    if (
      mpSlug &&
      (url.includes(`${mpSlug}.`) || url.includes(`.${mpSlug}`) || url.includes(`/${mpSlug}`))
    ) {
      return m;
    }

    // 3. Store name matching (handles spaces, symbols, and casing)
    if (cleanStore && cleanMpSlug && (cleanStore === cleanMpSlug || cleanStore.includes(cleanMpSlug))) {
      return m;
    }
    if (cleanStore && cleanMpName && (cleanStore === cleanMpName || cleanStore.includes(cleanMpName))) {
      return m;
    }
    if (mpName && rawStore.includes(mpName)) {
      return m;
    }
  }

  // 4. Detected store name fallback from URL
  const detectedStore = getStoreNameFromUrl(url).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (detectedStore) {
    for (const m of activeMarketplaces) {
      if (!m) continue;
      const mpSlug = String(m.marketplace || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const mpName = String(m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (mpSlug && (detectedStore === mpSlug || detectedStore.includes(mpSlug))) {
        return m;
      }
      if (mpName && (detectedStore === mpName || detectedStore.includes(mpName))) {
        return m;
      }
    }
  }

  return null;
};

/**
 * Calculates marketplace fee and markup for an item
 */
export const calculateMarketplacePrice = (basePrice, item, marketplaces) => {
  const numericPrice = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return {
      percent: 0,
      percentAmount: 0,
      finalPrice: numericPrice || 0,
      matchedMarketplace: null,
    };
  }

  // If caller explicitly passed marketplaces (e.g. in tests or component props), respect it
  const isExplicitList = Array.isArray(marketplaces);
  const activeMarketplaces =
    isExplicitList
      ? marketplaces
      : (typeof useSheinPriceStore?.getState === 'function'
          ? useSheinPriceStore.getState()?.marketplaces
          : []) || [];

  const parsePercent = val => {
    if (val === null || val === undefined || val === '') return 0;
    const num =
      typeof val === 'number'
        ? val
        : parseFloat(String(val).replace(/%/g, '').trim());
    return isNaN(num) ? 0 : num;
  };

  const matched = findMarketplaceForItem(item, activeMarketplaces);

  let percent = 0;
  if (matched && matched.percent !== undefined && matched.percent !== null) {
    const p = parsePercent(matched.percent);
    if (p > 0) {
      percent = p;
    }
  }

  // If not matched directly and caller did not pass an explicit empty list, check rates dictionary
  if (percent === 0 && !isExplicitList) {
    try {
      const storeState = useSheinPriceStore?.getState?.();
      const rates = storeState?.marketplaceRates || {};
      const storeKey = String(
        item?.store ||
        getStoreName(item?.url, '') ||
        item?.marketplace ||
        ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');

      if (storeKey && rates[storeKey] !== undefined) {
        const p = parseFloat(String(rates[storeKey]));
        if (!isNaN(p) && p > 0) {
          percent = p;
        }
      }
    } catch (_) {}
  }

  // If commission is 0 or not configured, NO commission is added to product
  const percentAmount = percent > 0 ? numericPrice * (percent / 100) : 0;
  const finalPrice = parseFloat((numericPrice + percentAmount).toFixed(2));

  return {
    percent,
    percentAmount,
    finalPrice,
    matchedMarketplace: matched,
  };
};

