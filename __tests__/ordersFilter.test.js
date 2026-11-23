import {
  FILTER_TABS,
  getOrderStatusCategory,
  normalizeOrderRecord,
  matchesOrderSearch,
  filterOrdersByTabAndSearch,
} from '../src/helpers/orderStatus';

describe('Order Status Categorization & Tab Filtering', () => {
  const mockOrders = [
    {
      id: '210',
      order_number: 'Order #210',
      durum: 2,
      app_badge_color: 'blue',
      app_status_text: 'In Progress',
      orders: [{ id: '210', ad: 'Hydrating Face Cream', magaza: 'YESSTYLE', durum: 2 }],
    },
    {
      id: '209',
      order_number: 'Order #209',
      durum: 1,
      app_badge_color: 'orange',
      app_status_text: 'Pending',
      orders: [{ id: '209', ad: 'Slim Fit Denim Jeans', magaza: 'SHEIN', durum: 1 }],
    },
    {
      id: '348',
      order_number: 'Order #348',
      durum: 18,
      app_badge_color: 'orange',
      app_status_text: 'Confirmed',
      orders: [{ id: '348', ad: 'Acrylic Nails Gift', magaza: 'SHEIN', durum: 18 }],
    },
    {
      id: '208',
      order_number: 'Order #208',
      durum: 6,
      app_badge_color: 'green',
      app_status_text: 'Delivered',
      orders: [{ id: '208', ad: 'Pink Pajama Set', magaza: 'SHEIN', durum: 6 }],
    },
    {
      id: '207',
      order_number: 'Order #207',
      durum: 7,
      app_badge_color: 'red',
      app_status_text: 'Canceled',
      orders: [{ id: '207', ad: 'Wireless Headphones', magaza: 'Amazon', durum: 7 }],
    },
  ];

  describe('getOrderStatusCategory', () => {
    it('categorizes based on app_badge_color correctly', () => {
      expect(getOrderStatusCategory(mockOrders[0])).toBe('in_progress'); // blue
      expect(getOrderStatusCategory(mockOrders[1])).toBe('pending'); // orange durum 1
      expect(getOrderStatusCategory(mockOrders[2])).toBe('confirmed'); // durum 18 Confirmed
      expect(getOrderStatusCategory(mockOrders[3])).toBe('delivered'); // green
      expect(getOrderStatusCategory(mockOrders[4])).toBe('cancelled'); // red
    });

    it('categorizes based on numeric durum when badges are absent', () => {
      expect(getOrderStatusCategory({ durum: 6 })).toBe('delivered');
      expect(getOrderStatusCategory({ durum: 2 })).toBe('in_progress');
      expect(getOrderStatusCategory({ durum: 3 })).toBe('dubai_warehouse');
      expect(getOrderStatusCategory({ durum: 4 })).toBe('dubai_warehouse');
      expect(getOrderStatusCategory({ durum: 5 })).toBe('delivery_warehouse');
      expect(getOrderStatusCategory({ durum: 11 })).toBe('out_for_delivery');
      expect(getOrderStatusCategory({ durum: 1 })).toBe('pending');
      expect(getOrderStatusCategory({ durum: 14 })).toBe('pending');
      expect(getOrderStatusCategory({ durum: 16 })).toBe('pending');
      expect(getOrderStatusCategory({ durum: 18 })).toBe('confirmed');
      expect(getOrderStatusCategory({ durum: 7 })).toBe('cancelled');
      expect(getOrderStatusCategory({ durum: 10 })).toBe('cancelled');
    });

    it('categorizes based on Turkish durum_text', () => {
      expect(getOrderStatusCategory({ durum_text: 'Teslim Edildi' })).toBe('delivered');
      expect(getOrderStatusCategory({ durum_text: 'Sipariş Verildi' })).toBe('in_progress');
      expect(getOrderStatusCategory({ durum_text: 'Dağıtımda' })).toBe('out_for_delivery');
      expect(getOrderStatusCategory({ durum_text: 'Teslimat Deposunda' })).toBe('delivery_warehouse');
      expect(getOrderStatusCategory({ durum_text: 'İst Depoda' })).toBe('dubai_warehouse');
      expect(getOrderStatusCategory({ durum_text: 'Beklemede' })).toBe('pending');
      expect(getOrderStatusCategory({ durum_text: 'Müşteri Onayladı' })).toBe('pending');
      expect(getOrderStatusCategory({ durum_text: 'Müşteri Ödedi' })).toBe('confirmed');
      expect(getOrderStatusCategory({ durum_text: 'İptal Edildi' })).toBe('cancelled');
    });

    it('categorizes new backend app_status values when durum is absent', () => {
      expect(getOrderStatusCategory({ app_status: 'in_transit' })).toBe('dubai_warehouse');
      expect(getOrderStatusCategory({ app_status: 'dubai_warehouse' })).toBe('dubai_warehouse');
      expect(getOrderStatusCategory({ app_status: 'in_delivery_warehouse' })).toBe('delivery_warehouse');
      expect(getOrderStatusCategory({ app_status: 'out_for_delivery' })).toBe('out_for_delivery');
    });

    it('does not treat "Out For Delivery" / "In Delivery Warehouse" text as Delivered', () => {
      expect(getOrderStatusCategory({ app_status_text: 'Out For Delivery' })).toBe('out_for_delivery');
      expect(getOrderStatusCategory({ app_status_text: 'In Delivery Warehouse' })).toBe('delivery_warehouse');
      expect(getOrderStatusCategory({ app_status_text: 'In Transit' })).toBe('dubai_warehouse');
    });
  });

  describe('dubai_warehouse filter response', () => {
    // Shape returned by GET /orders?filter=dubai_warehouse
    const response = [
      {
        card_type: 'single',
        id: 169,
        durum: 3,
        durum_text: 'İst Depoda',
        app_status: 'in_transit',
        app_status_text: 'In Transit',
        app_badge_color: 'blue',
        total_usd: 37.84,
      },
      {
        card_type: 'group',
        is_group: true,
        id: 42,
        durum: 3,
        durum_text: 'İst Depoda',
        app_status: 'in_progress',
        app_status_text: 'In Progress',
        app_badge_color: 'blue',
        orders: [{ id: 170, durum: 3 }, { id: 171, durum: 3 }],
      },
    ];

    it('keeps every returned card on the Dubai Warehouse tab', () => {
      const normalized = response.map(normalizeOrderRecord);
      expect(filterOrdersByTabAndSearch(normalized, 'dubai_warehouse')).toHaveLength(2);
      normalized.forEach(item => {
        expect(item.app_status).toBe('dubai_warehouse');
        expect(item.app_status_text).toBe('Dubai Warehouse');
        expect(item.can_track).toBe(true);
      });
    });

    it('labels delivery warehouse and out for delivery cards', () => {
      const dw = normalizeOrderRecord({ durum: 5, app_status: 'in_delivery_warehouse' });
      expect(dw.app_status).toBe('in_delivery_warehouse');
      expect(dw.app_status_text).toBe('In Delivery Warehouse');
      const ofd = normalizeOrderRecord({ durum: 11, app_status: 'out_for_delivery' });
      expect(ofd.app_status).toBe('out_for_delivery');
      expect(ofd.app_status_text).toBe('Out For Delivery');
    });

    it('exposes all requested filter tabs in order', () => {
      expect(FILTER_TABS.map(t => t.filter)).toEqual([
        'all',
        'pending',
        'confirmed',
        'in_progress',
        'dubai_warehouse',
        'delivery_warehouse',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ]);
    });
  });

  describe('filterOrdersByTabAndSearch', () => {
    it('shows ALL orders when tab is "all"', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'all');
      expect(result).toHaveLength(5);
      expect(result.map(o => o.id)).toEqual(['210', '209', '348', '208', '207']);
    });

    it('shows ONLY Pending orders on "pending" tab (excludes Confirmed)', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'pending');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('209');
    });

    it('shows ONLY Confirmed orders on "confirmed" tab', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'confirmed');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('348');
    });

    it('shows ONLY In Progress orders on "in_progress" tab', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'in_progress');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('210');
    });

    it('shows ONLY Delivered orders on "delivered" tab', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'delivered');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('208');
    });

    it('shows ONLY Cancelled orders on "cancelled" tab', () => {
      const result = filterOrdersByTabAndSearch(mockOrders, 'cancelled');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('207');
    });

    it('filters within a tab when search query is entered', () => {
      // Searching '209' on all tab matches 209
      expect(filterOrdersByTabAndSearch(mockOrders, 'all', '209')).toHaveLength(1);

      // Searching '210' on pending tab returns 0 (210 is in progress, not pending)
      expect(filterOrdersByTabAndSearch(mockOrders, 'pending', '210')).toHaveLength(0);

      // Searching 'Pajama' on delivered tab returns 208
      const pajamaResult = filterOrdersByTabAndSearch(mockOrders, 'delivered', 'Pajama');
      expect(pajamaResult).toHaveLength(1);
      expect(pajamaResult[0].id).toBe('208');
    });
  });

  describe('normalizeOrderRecord (Healing Server Response Discrepancies)', () => {
    it('heals Delivered group with buggy backend app_status: in_progress and blue badge (Group 78)', () => {
      const buggyGroup78 = {
        id: 78,
        durum: 6,
        durum_text: 'Teslim Edildi',
        app_status: 'in_progress',
        app_status_text: 'In Progress',
        app_badge_color: 'blue',
        can_track: true,
        orders: [
          {
            id: 339,
            durum: 6,
            link: 'https://m.shein.com/ar-en/SHEIN-ChillGRL-Young-Girl-s-Casual-Cowgirl-Straight-Leg-Jeans-p-191301899.html',
            ad: null,
            marketplace: '',
          },
        ],
      };

      const normalized = normalizeOrderRecord(buggyGroup78);
      expect(normalized.app_status).toBe('delivered');
      expect(normalized.app_status_text).toBe('Delivered');
      expect(normalized.app_badge_color).toBe('green');
      expect(normalized.can_track).toBe(false);
      expect(getOrderStatusCategory(normalized)).toBe('delivered');

      // Sub-order checks
      expect(normalized.orders[0].marketplace).toBe('Shein');
      expect(normalized.marketplace).toBe('Shein');
      expect(normalized.orders[0].ad).toContain('Cowgirl');
    });

    it('heals Confirmed group with buggy backend app_status: in_progress and blue badge (Group 80)', () => {
      const buggyGroup80 = {
        id: 80,
        durum: 18,
        durum_text: 'Müşteri Ödedi',
        app_status: 'in_progress',
        app_status_text: 'In Progress',
        app_badge_color: 'blue',
        can_track: true,
        orders: [
          {
            id: 342,
            durum: 18,
            link: 'https://m.shein.com/ar-en/This-3-Piecesmen-s-Fashion-Jewelry-Set-Is-Perfect-p-49109017.html',
            ad: null,
            marketplace: '',
          },
        ],
      };

      const normalized = normalizeOrderRecord(buggyGroup80);
      expect(normalized.app_status).toBe('confirmed');
      expect(normalized.app_status_text).toBe('Confirmed');
      expect(normalized.app_badge_color).toBe('orange');
      expect(normalized.can_track).toBe(true);
      expect(getOrderStatusCategory(normalized)).toBe('confirmed');
      expect(normalized.orders[0].marketplace).toBe('Shein');
      expect(normalized.orders[0].ad).toContain('Jewelry');
    });

    it('heals Pending group (durum 16) and rounds floating-point price calculation (Group 81)', () => {
      const buggyGroup81 = {
        id: 81,
        durum: 16,
        durum_text: 'Müşteri Onayladı',
        app_status: 'in_progress',
        app_status_text: 'In Progress',
        app_badge_color: 'blue',
        urun_tutar_usd: 20.839999999999996,
        total_usd: 20.839999999999996,
        orders: [
          {
            id: 345,
            durum: 16,
            link: 'https://m.shein.com/ar-en/120pcs-Almond-Shaped-Pink-French-White-Wearable-Nail-Tips-p-44222879.html',
            ad: null,
            marketplace: '',
            fiyat_usd: 2.53,
          },
        ],
      };

      const normalized = normalizeOrderRecord(buggyGroup81);
      expect(normalized.app_status).toBe('pending');
      expect(normalized.app_status_text).toBe('Pending');
      expect(normalized.app_badge_color).toBe('orange');
      expect(normalized.urun_tutar_usd).toBe(20.84);
      expect(normalized.total_usd).toBe(20.84);
      expect(normalized.total_formatted).toBe('$20.84');
      expect(getOrderStatusCategory(normalized)).toBe('pending');
      expect(normalized.orders[0].marketplace).toBe('Shein');
      expect(normalized.orders[0].ad).toContain('Nail');
    });
  });
});
