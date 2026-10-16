/**
 * Utility functions for WebView navigation and product page detection.
 */

export const isProductUrl = url => {
  if (!url || url === 'about:blank') {
    return false;
  }
  const lowerUrl = String(url).toLowerCase();

  const patterns = [
    /-p-[a-z0-9_-]+/i,
    /-pm-[a-z0-9_-]+/i,
    /\/dp\/[a-z0-9]+/i,
    /\/gp\/aw\/d\/[a-z0-9]+/i,
    /\/gp\/product\/[a-z0-9]+/i,
    /\/d\/[a-z0-9]+/i,
    /\/pr\/[a-z0-9_-]+/i,
    /\/p\/[a-z0-9_-]+/i,
    /\/product\/[a-z0-9_-]+/i,
    /\/products\/[a-z0-9_-]+/i,
    /\/detail\/[a-z0-9_-]+/i,
    /\/item\/[a-z0-9_-]+/i,
    /\/items\/[a-z0-9_-]+/i,
    /\/itm\/[a-z0-9_-]+/i,
    /\/goods\/[a-z0-9_-]+/i,
    /\/pd\/[a-z0-9_-]+/i,
    /\/pid\.[a-z0-9]+/i,
    /[?&](product_id|goods_id|item_id|pid|sku|asin)=/i,
  ];

  return patterns.some(pattern => pattern.test(lowerUrl));
};

export const isSamePageUrl = (url1, url2) => {
  if (!url1 || !url2) {
    return false;
  }
  try {
    const clean1 = String(url1).split('#')[0].replace(/\/+$/, '').toLowerCase();
    const clean2 = String(url2).split('#')[0].replace(/\/+$/, '').toLowerCase();
    if (clean1 === clean2) {
      return true;
    }

    const match1 = clean1.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/i);
    const match2 = clean2.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/i);
    if (match1 && match2 && match1[0] === match2[0]) {
      const query1 = clean1.includes('?') ? clean1.slice(clean1.indexOf('?')) : '';
      const query2 = clean2.includes('?') ? clean2.slice(clean2.indexOf('?')) : '';
      if (query1 === query2) {
        return true;
      }
      const idMatch1 = query1.match(/[?&](product_id|goods_id|item_id|pid|sku|asin|id)=([^&]+)/i);
      const idMatch2 = query2.match(/[?&](product_id|goods_id|item_id|pid|sku|asin|id)=([^&]+)/i);
      if (idMatch1 && idMatch2) {
        return idMatch1[2] === idMatch2[2];
      }
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};
