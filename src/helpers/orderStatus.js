/**
 * Order status normalization, tab categorization, and search matching helpers.
 */

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
 * Checks in order:
 * 1. Explicit canonical `app_status_text` or `durum_text` for Confirmed
 * 2. Explicit canonical `app_status`
 * 3. Status numeric codes (`durum`)
 * 4. Visual badge color `app_badge_color`
 * 5. Text keywords in `app_status_text` or `durum_text` (multilingual: TR/EN)
 */
export const getOrderStatusCategory = (item) => {
  if (!item) return 'pending';
  const orders = item.orders || [item];
  const firstOrder = orders[0] || {};
  const hasDurum = item.durum !== undefined || firstOrder.durum !== undefined;
  const statusNum = hasDurum ? parseInt(item.durum !== undefined ? item.durum : firstOrder.durum, 10) : null;
  const statusText = normalizeText(item.app_status_text || item.durum_text);

  // 1. Direct Confirmed identification (durum 18, "Confirmed", "Müşteri Ödedi", "odendi")
  if (
    statusNum === 18 ||
    statusText.includes('confirm') ||
    statusText.includes('ödedi') ||
    statusText.includes('odedi')
  ) {
    return 'confirmed';
  }

  // 2. Explicit canonical app_status if supplied
  if (item.app_status) {
    const s = normalizeText(item.app_status);
    if (s === 'delivered') return 'delivered';
    if (s === 'in_progress' || s === 'progress') return 'in_progress';
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'confirmed') return 'confirmed';
    if (s === 'pending' && statusNum === 18) return 'confirmed';
    if (s === 'pending') return 'pending';
  }

  // 3. Numeric durum standard mapping (when explicit durum exists)
  if (statusNum !== null) {
    if ([6].includes(statusNum)) return 'delivered';
    if ([2, 3, 4, 5, 11].includes(statusNum)) return 'in_progress';
    if ([7, 8, 9, 10, 12, 13, 17].includes(statusNum)) return 'cancelled';
    if ([1, 14, 15, 16, 19].includes(statusNum)) return 'pending';
  }

  // 4. Status text inspection (multilingual: English & Turkish)
  if (statusText) {
    if (statusText.includes('deliver') || statusText.includes('teslim')) {
      return 'delivered';
    }
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
      statusText.includes('cancel') ||
      statusText.includes('iptal') ||
      statusText.includes('iade')
    ) {
      return 'cancelled';
    }
    if (
      statusText.includes('pend') ||
      statusText.includes('bekle') ||
      statusText.includes('onay')
    ) {
      return 'pending';
    }
  }

  // 5. Visual badge color matching GroupItem's exact visual colors
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
    const store = normalizeText(o.magaza || o.store);
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
