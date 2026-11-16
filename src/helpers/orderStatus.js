/**
 * Order status normalization, tab categorization, and search matching helpers.
 */
import {
  getFallbackTitleFromUrl,
  getStoreNameFromUrl,
  cleanProductTitle,
} from './storeHelper';

export const FILTER_TABS = [
  { id: 'all', label: 'All', durums: 0, filter: 'all' },
  { id: 'pending', label: 'Pending', durums: [1, 14, 15, 16, 19], filter: 'pending' },
  { id: 'confirmed', label: 'Confirmed', durums: [18], filter: 'confirmed' },
  { id: 'in_progress', label: 'In Progress', durums: [2, 3, 4, 5, 11], filter: 'in_progress' },
  { id: 'delivered', label: 'Delivered', durums: [6], filter: 'delivered' },
  { id: 'cancelled', label: 'Cancelled', durums: [7, 8, 9, 10, 12, 13, 17], filter: 'cancelled' },
];

/**
 * Normalize text for case-insensitive and locale-safe comparison (including Turkish chars)
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/\u0307/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Categorize any order item or order group into one of the standard tab IDs:
 * 'pending' | 'confirmed' | 'in_progress' | 'delivered' | 'cancelled'
 *
 * Checks in priority order:
 * 1. Definitive status codes (durum 6 = delivered, durum 18 = confirmed) & explicit Turkish/English text
 * 2. Explicit numeric durum standard mapping
 * 3. Explicit canonical app_status (when no contradictory statusNum exists)
 * 4. Text keywords in app_status_text or durum_text (multilingual: TR/EN)
 * 5. Visual badge color app_badge_color
 */
export const getOrderStatusCategory = (item) => {
  if (!item) return 'pending';
  const orders = item.orders || [item];
  const firstOrder = orders[0] || {};
  const hasDurum =
    (item.durum !== undefined && item.durum !== null) ||
    (firstOrder.durum !== undefined && firstOrder.durum !== null);
  const statusNum = hasDurum
    ? parseInt(item.durum !== undefined && item.durum !== null ? item.durum : firstOrder.durum, 10)
    : null;
  const statusText = normalizeText(
    item.app_status_text || item.durum_text || firstOrder.durum_text || firstOrder.app_status_text
  );

  // 1. Direct Delivered identification (durum 6, "Delivered", "Teslim Edildi")
  if (
    statusNum === 6 ||
    statusText.includes('deliver') ||
    statusText.includes('teslim')
  ) {
    return 'delivered';
  }

  // 2. Direct Confirmed identification (durum 18, "Confirmed", "Müşteri Ödedi", "odendi")
  if (
    statusNum === 18 ||
    statusText.includes('confirm') ||
    statusText.includes('ödedi') ||
    statusText.includes('odedi')
  ) {
    return 'confirmed';
  }

  // 3. Direct Cancelled identification (durum in cancelled set, "Cancelled", "İptal Edildi", "İade")
  if (
    (statusNum !== null && [7, 8, 9, 10, 12, 13, 17].includes(statusNum)) ||
    statusText.includes('cancel') ||
    statusText.includes('iptal') ||
    statusText.includes('iade')
  ) {
    return 'cancelled';
  }

  // 4. Numeric durum standard mapping (when explicit durum exists)
  if (statusNum !== null) {
    if ([1, 14, 15, 16, 19].includes(statusNum)) return 'pending';
    if ([2, 3, 4, 5, 11].includes(statusNum)) return 'in_progress';
  }

  // 5. Explicit canonical app_status if supplied (when no contradictory statusNum)
  if (item.app_status) {
    const s = normalizeText(item.app_status);
    if (s === 'delivered') return 'delivered';
    if (s === 'in_progress' || s === 'progress') return 'in_progress';
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'confirmed') return 'confirmed';
    if (s === 'pending') return 'pending';
  }

  // 6. Status text inspection (multilingual: English & Turkish)
  if (statusText) {
    if (
      statusText.includes('progress') ||
      statusText.includes('dağıtım') ||
      statusText.includes('taşıma') ||
      statusText.includes('transit') ||
      statusText.includes('verildi') ||
      statusText.includes('hazırlanıyor') ||
      statusText.includes('kargo')
    ) {
      return 'in_progress';
    }
    if (
      statusText.includes('pend') ||
      statusText.includes('bekle') ||
      statusText.includes('onay')
    ) {
      return 'pending';
    }
  }

  // 7. Visual badge color matching GroupItem's exact visual colors
  if (item.app_badge_color) {
    const c = normalizeText(item.app_badge_color);
    if (c === 'green') return 'delivered';
    if (c === 'blue') return 'in_progress';
    if (c === 'red') return 'cancelled';
    if (c === 'orange' || c === 'yellow') return 'pending';
  }

  return 'pending';
};

/**
 * Robustly normalizes an order card or order group from the server:
 * - Fixes status and badge color mismatches (e.g. durum 6 Delivered with blue badge)
 * - Rounds floating-point prices (e.g. 20.839999999999996 -> 20.84)
 * - Auto-detects store/marketplace from item links when backend returns empty string
 * - Derives readable product titles from links when `ad` is null/empty
 */
export const normalizeOrderRecord = (rawItem) => {
  if (!rawItem || typeof rawItem !== 'object') return rawItem;
  const item = { ...rawItem };

  const subOrders = Array.isArray(item.orders) && item.orders.length > 0
    ? item.orders.map(o => ({ ...o }))
    : null;
  const firstSub = subOrders ? subOrders[0] : null;

  // 1. Resolve numeric durum
  const statusNum = item.durum !== undefined && item.durum !== null
    ? parseInt(item.durum, 10)
    : (firstSub && firstSub.durum !== undefined && firstSub.durum !== null
        ? parseInt(firstSub.durum, 10)
        : null);

  // 2. Resolve true category using getOrderStatusCategory
  const category = getOrderStatusCategory(item);

  // 3. Normalise canonical status fields based on category & statusNum
  if (category === 'delivered' || statusNum === 6) {
    item.app_status = 'delivered';
    item.app_status_text = 'Delivered';
    item.app_badge_color = 'green';
    item.can_track = false;
  } else if (category === 'confirmed' || statusNum === 18) {
    item.app_status = 'confirmed';
    item.app_status_text = 'Confirmed';
    item.app_badge_color = 'orange';
    item.can_track = true;
  } else if (category === 'cancelled' || (statusNum !== null && [7, 8, 9, 10, 12, 13, 17].includes(statusNum))) {
    item.app_status = 'cancelled';
    item.app_status_text = 'Canceled';
    item.app_badge_color = 'red';
    item.can_track = false;
  } else if (category === 'in_progress' || (statusNum !== null && [2, 3, 4, 5, 11].includes(statusNum))) {
    item.app_status = 'in_progress';
    item.app_status_text = 'In Progress';
    item.app_badge_color = 'blue';
    item.can_track = true;
  } else {
    item.app_status = 'pending';
    item.app_status_text = 'Pending';
    item.app_badge_color = 'orange';
    item.can_track = true;
  }

  // 4. Floating point and currency formatting normalization
  if (item.urun_tutar_usd != null) {
    item.urun_tutar_usd = Math.round(Number(item.urun_tutar_usd) * 100) / 100;
  }
  if (item.nakliye_usd != null) {
    item.nakliye_usd = Math.round(Number(item.nakliye_usd) * 100) / 100;
  }
  if (item.total_usd != null) {
    item.total_usd = Math.round(Number(item.total_usd) * 100) / 100;
  } else if (item.urun_tutar_usd != null) {
    item.total_usd = Math.round(((item.urun_tutar_usd || 0) + (item.nakliye_usd || 0)) * 100) / 100;
  }

  if (item.total_usd != null && !isNaN(item.total_usd)) {
    item.total_formatted = `$${Number(item.total_usd).toFixed(2)}`;
  }

  // 5. Normalise sub-orders (marketplace, product title, prices)
  if (subOrders) {
    item.orders = subOrders.map(sub => {
      const link = sub.link || sub.url || item.link || item.url || '';

      // Auto-detect store / marketplace if missing
      const storeName = getStoreNameFromUrl(link);
      const marketplace = sub.marketplace || sub.magaza || sub.store || storeName || item.marketplace || '';

      // Auto-derive fallback title if ad is null/empty
      let title = sub.ad || sub.name || sub.title || sub.product_name || '';
      if (!title || title.trim() === '' || title === '-') {
        title = getFallbackTitleFromUrl(link) || sub.acik || '';
      }
      title = cleanProductTitle(title, link);

      // Clean suborder price
      const fiyatUsd = sub.fiyat_usd != null
        ? Math.round(Number(sub.fiyat_usd) * 100) / 100
        : (sub.fiyat != null ? Math.round(Number(sub.fiyat) * 100) / 100 : null);
      const tutarUsd = sub.tutar_usd != null
        ? Math.round(Number(sub.tutar_usd) * 100) / 100
        : (sub.tutar != null ? Math.round(Number(sub.tutar) * 100) / 100 : null);

      return {
        ...sub,
        marketplace,
        magaza: marketplace,
        ad: title || sub.ad || 'Product Item',
        title: title || sub.title || 'Product Item',
        product_name: title || sub.product_name || 'Product Item',
        fiyat_usd: fiyatUsd ?? sub.fiyat_usd,
        tutar_usd: tutarUsd ?? sub.tutar_usd,
      };
    });

    // Also populate top-level marketplace if missing
    if (!item.marketplace && item.orders[0]?.marketplace) {
      item.marketplace = item.orders[0].marketplace;
    }
  }

  return item;
};

/**
 * Filter an order by search query (order ID, item title, store name, etc.)
 */
export const matchesOrderSearch = (item, query) => {
  if (!query) return true;
  const q = normalizeText(query);
  if (!q) return true;

  const orders = item.orders || [item];
  const firstOrder = orders[0] || {};
  const orderId = normalizeText(item.id || firstOrder.id || item.order_number);
  if (orderId.includes(q)) return true;

  return orders.some((o) => {
    const name = normalizeText(o.ad || o.product_name || o.title);
    const store = normalizeText(o.magaza || o.store || o.marketplace);
    const subId = normalizeText(o.id);
    return name.includes(q) || store.includes(q) || subId.includes(q);
  });
};

/**
 * Filter an array of orders by tab ID and optional search query
 */
export const filterOrdersByTabAndSearch = (orders, tabId = 'all', searchQuery = '') => {
  if (!Array.isArray(orders)) return [];
  return orders.filter((item) => {
    if (tabId && tabId !== 'all') {
      const category = getOrderStatusCategory(item);
      if (category !== tabId) return false;
    }
    if (searchQuery) {
      if (!matchesOrderSearch(item, searchQuery)) return false;
    }
    return true;
  });
};
