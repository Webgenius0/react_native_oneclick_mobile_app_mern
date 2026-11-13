import {
  FILTER_TABS,
  getOrderStatusCategory,
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
      expect(getOrderStatusCategory({ durum: 4 })).toBe('in_progress');
      expect(getOrderStatusCategory({ durum: 11 })).toBe('in_progress');
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
      expect(getOrderStatusCategory({ durum_text: 'Dağıtımda' })).toBe('in_progress');
      expect(getOrderStatusCategory({ durum_text: 'Beklemede' })).toBe('pending');
      expect(getOrderStatusCategory({ durum_text: 'Müşteri Onayladı' })).toBe('pending');
      expect(getOrderStatusCategory({ durum_text: 'Müşteri Ödedi' })).toBe('confirmed');
      expect(getOrderStatusCategory({ durum_text: 'İptal Edildi' })).toBe('cancelled');
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
});
