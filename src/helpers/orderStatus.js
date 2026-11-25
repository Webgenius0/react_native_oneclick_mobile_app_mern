/**
 * Order status normalization, tab categorization, and search matching helpers.
 */
import {
  getFallbackTitleFromUrl,
  getStoreNameFromUrl,
  cleanProductTitle,
} from './storeHelper';

/**
 * Order filter tabs. `filter` is sent to GET /orders?filter=..., `durums` is the
 * backend status codes that belong to the tab, `appStatuses` are the canonical
 * `app_status` values the backend may return for the tab.
 */
export const FILTER_TABS = [
  { id: 'all', label: 'All', durums: 0, filter: 'all' },
  {
    id: 'pending',
    label: 'Pending',
    durums: [1, 14, 15, 16, 19],
    filter: 'pending',
    appStatuses: ['pending'],
    statusText: 'Pending',
    badgeColor: 'orange',
    canTrack: true,
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    durums: [18],
    filter: 'confirmed',
    appStatuses: ['confirmed'],
    statusText: 'Confirmed',
    badgeColor: 'orange',
    canTrack: true,
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    durums: [2],
    filter: 'in_progress',
    appStatuses: ['in_progress', 'progress'],
    statusText: 'In Progress',
    badgeColor: 'blue',
    canTrack: true,
  },
  {
    id: 'dubai_warehouse',
    label: 'Dubai Warehouse',
    durums: [3, 4],
    filter: 'dubai_warehouse',
    appStatuses: ['dubai_warehouse', 'in_transit'],
    statusText: 'Dubai Warehouse',
    badgeColor: 'blue',
    canTrack: true,
  },
  {
    id: 'delivery_warehouse',
    label: 'Delivery Warehouse',
    durums: [5],
    filter: 'delivery_warehouse',
    appStatuses: ['in_delivery_warehouse', 'delivery_warehouse'],
    statusText: 'In Delivery Warehouse',
    badgeColor: 'blue',
    canTrack: true,
  },
  {
    id: 'out_for_delivery',
    label: 'Out for Delivery',
    durums: [11],
    filter: 'out_for_delivery',
    appStatuses: ['out_for_delivery'],
    statusText: 'Out For Delivery',
    badgeColor: 'blue',
    canTrack: true,
  },
  {
    id: 'delivered',
    label: 'Delivered',
    durums: [6],
    filter: 'delivered',
    appStatuses: ['delivered'],
    statusText: 'Delivered',
    badgeColor: 'green',
    canTrack: false,
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    durums: [7, 8, 9, 10, 12, 13, 17],
    filter: 'cancelled',
    appStatuses: ['cancelled', 'canceled'],
    statusText: 'Canceled',
    badgeColor: 'red',
    canTrack: false,
  },
];

/** Tab IDs excluding 'all' (one per status category). */
export const STATUS_TAB_IDS = FILTER_TABS.filter(t => t.id !== 'all').map(t => t.id);

const getTabById = id => FILTER_TABS.find(t => t.id === id);

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
 * Categorize any order item or order group into one of the FILTER_TABS ids:
 * 'pending' | 'confirmed' | 'in_progress' | 'dubai_warehouse' |
 * 'delivery_warehouse' | 'out_for_delivery' | 'delivered' | 'cancelled'
 *
 * Checks in priority order:
 * 1. Numeric durum (definitive)
 * 2. Canonical app_status
 * 3. Text keywords in app_status_text or durum_text (multilingual: TR/EN)
 * 4. Visual badge color app_badge_color
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

  // 1. Numeric durum is the source of truth (backend app_status can be stale,
  //    e.g. a durum 3 group still reported as app_status "in_progress").
  if (statusNum !== null && !isNaN(statusNum)) {
    const byDurum = FILTER_TABS.find(
      t => Array.isArray(t.durums) && t.durums.includes(statusNum),
    );
    if (byDurum) return byDurum.id;
  }

  // 2. Canonical app_status from the backend
  if (item.app_status) {
    const s = normalizeText(item.app_status);
    const byAppStatus = FILTER_TABS.find(
      t => Array.isArray(t.appStatuses) && t.appStatuses.includes(s),
    );
    if (byAppStatus) return byAppStatus.id;
  }

  // 3. Status text inspection (multilingual: English & Turkish).
  //    Specific phrases are checked before generic ones ("Out For Delivery" and
  //    "In Delivery Warehouse" both contain "deliver").
  if (statusText) {
    if (statusText.includes('out for deliver') || statusText.includes('dağıtımda')) {
      return 'out_for_delivery';
    }
    if (
      statusText.includes('delivery warehouse') ||
      statusText.includes('local warehouse') ||
      statusText.includes('teslimat depo')
    ) {
      return 'delivery_warehouse';
    }
    if (
      statusText.includes('dubai') ||
      statusText.includes('warehouse') ||
      statusText.includes('depoda') ||
      statusText.includes('transit') ||
      statusText.includes('taşıma') ||
      statusText.includes('kargoya')
    ) {
      return 'dubai_warehouse';
    }
    if (statusText.includes('deliver') || statusText.includes('teslim edildi')) {
      return 'delivered';
    }
    if (
      statusText.includes('cancel') ||
      statusText.includes('iptal') ||
      statusText.includes('iade')
    ) {
      return 'cancelled';
    }
    if (
      statusText.includes('confirm') ||
      statusText.includes('ödedi') ||
      statusText.includes('odedi')
    ) {
      return 'confirmed';
    }
    if (
      statusText.includes('progress') ||
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
 * Returns the order's group id, or 0 when it is a standalone order.
 * Single orders come back with grupID 0; group cards carry grupID === id.
 */
export const getOrderGroupId = record => {
  if (!record || typeof record !== 'object') return 0;
  const grupID = Number(record.grupID);
  if (grupID > 0) return grupID;
  const isGroupCard = record.is_group === true || record.card_type === 'group';
  return isGroupCard && Number(record.id) > 0 ? Number(record.id) : 0;
};

/**
 * Query params for GET /api/order-tracking. The backend checks `id` first and
 * treats it strictly as an order id, so a group must be sent as grupID only.
 */
export const buildTrackingParams = (orderId, grupId) =>
  Number(grupId) > 0 ? { grupID: grupId } : { id: orderId };

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

  // 1-3. Resolve the category and normalise canonical status fields from it
  const category = getOrderStatusCategory(item);
  const tab = getTabById(category) || getTabById('pending');
  item.app_status = tab.appStatuses[0];
  item.app_status_text = tab.statusText;
  item.app_badge_color = tab.badgeColor;
  item.can_track = tab.canTrack;

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

const TIMELINE_STEP_DEFS = [
  { key: 'order_received', title: 'Order Received' },
  { key: 'order_placed', title: 'Order Placed' },
  { key: 'dubai_warehouse', title: 'Dubai Warehouse' },
  { key: 'shipped', title: 'Shipped' },
  { key: 'in_delivery_warehouse', title: 'In Delivery Warehouse' },
  { key: 'out_for_delivery', title: 'Out For Delivery' },
  { key: 'delivered', title: 'Delivered' },
];

/**
 * Index of the current timeline step for an order. -1 means nothing is
 * completed or current (cancelled); length means everything is completed.
 */
const getActiveStepIndex = (category, statusNum) => {
  switch (category) {
    case 'in_progress':
      return 1;
    case 'dubai_warehouse':
      return statusNum === 4 ? 3 : 2;
    case 'delivery_warehouse':
      return 4;
    case 'out_for_delivery':
      return 5;
    case 'delivered':
      return TIMELINE_STEP_DEFS.length;
    case 'cancelled':
      return -1;
    case 'pending':
    case 'confirmed':
    default:
      return 0;
  }
};

/**
 * Build a tracking timeline from the order's own status. Used only when the
 * order-tracking API returns nothing, so it never shows progress the order
 * hasn't actually reached.
 */
export const buildFallbackTimeline = order => {
  const category = getOrderStatusCategory(order || {});
  const rawDurum =
    order?.durum ?? (Array.isArray(order?.orders) ? order.orders[0]?.durum : undefined);
  const statusNum = rawDurum != null ? parseInt(rawDurum, 10) : null;
  const active = getActiveStepIndex(category, statusNum);
  return TIMELINE_STEP_DEFS.map((def, idx) => {
    let state = 'pending';
    if (active >= 0 && idx < active) state = 'completed';
    else if (idx === active) state = 'current';
    return {
      step: idx + 1,
      key: def.key,
      title: def.title,
      state,
      is_completed: state === 'completed',
      is_current: state === 'current',
      date: null,
    };
  });
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
