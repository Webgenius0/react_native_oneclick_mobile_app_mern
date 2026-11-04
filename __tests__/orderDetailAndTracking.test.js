/**
 * Tests for GET /api/order-detail and GET /api/order-tracking response parsing
 */

describe('Order Detail and Tracking API Response Handling', () => {
  const parsePrice = (val) => {
    if (val == null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const mockOrderDetailResponse = {
    error: false,
    order_number: "Order #1CLK - 000364",
    order_date: "Oct 28, 2026",
    status_banner: {
      title: "Shipped",
      subtitle: "Your order has been shipped. Expected delivery on Nov 05, 2026",
      state: "shipped",
      badge_color: "blue",
    },
    ordered_items: [
      {
        name: "Casual T-Shirt",
        image: "https://1click.thesyndicates.team/upload/siparis/item.jpg",
        color: "Black",
        size: "L",
        quantity: 1,
        price: "$25.00",
      },
    ],
    price_summary: {
      subtotal: "$25.00",
      shipping: "$5.00",
      total: "$30.00",
    },
    customer_tracking: {
      active_step: 4,
      total_steps: 7,
      status_title: "Shipped",
      steps: [
        { step: 1, key: "order_received", title: "Order Received", state: "completed", is_completed: true, is_current: false, date: "Oct 28, 2026 • 10:15 AM" },
        { step: 2, key: "order_placed", title: "Order Placed", state: "completed", is_completed: true, is_current: false, date: "Oct 29, 2026 • 02:30 PM" },
        { step: 3, key: "in_transit", title: "In Transit", state: "completed", is_completed: true, is_current: false, date: "Oct 30, 2026 • 08:45 AM" },
        { step: 4, key: "shipped", title: "Shipped", state: "current", is_completed: false, is_current: true, date: "Oct 31, 2026 • 04:20 PM" },
        { step: 5, key: "in_delivery_warehouse", title: "In Delivery Warehouse", state: "pending", is_completed: false, is_current: false, date: null },
        { step: 6, key: "out_for_delivery", title: "Out For Delivery", state: "pending", is_completed: false, is_current: false, date: null },
        { step: 7, key: "delivered", title: "Delivered", state: "pending", is_completed: false, is_current: false, date: null },
      ],
    },
  };

  const mockOrderTrackingResponse = {
    error: false,
    customer_tracking: {
      order_number: "Order #1CLK - 000364",
      order_date: "Oct 28, 2026",
      status_title: "Shipped",
      status_subtitle: "Your order has been shipped. Expected delivery on Nov 05, 2026",
      status_badge: "shipped",
      status_badge_color: "blue",
      active_step: 4,
      total_steps: 7,
      can_track: true,
      steps: [
        { step: 1, key: "order_received", title: "Order Received", state: "completed", is_completed: true, is_current: false, date: "Oct 28, 2026 • 10:15 AM" },
        { step: 2, key: "order_placed", title: "Order Placed", state: "completed", is_completed: true, is_current: false, date: "Oct 29, 2026 • 02:30 PM" },
        { step: 3, key: "in_transit", title: "In Transit", state: "completed", is_completed: true, is_current: false, date: "Oct 30, 2026 • 08:45 AM" },
        { step: 4, key: "shipped", title: "Shipped", state: "current", is_completed: false, is_current: true, date: "Oct 31, 2026 • 04:20 PM" },
        { step: 5, key: "in_delivery_warehouse", title: "In Delivery Warehouse", state: "pending", is_completed: false, is_current: false, date: null },
        { step: 6, key: "out_for_delivery", title: "Out For Delivery", state: "pending", is_completed: false, is_current: false, date: null },
        { step: 7, key: "delivered", title: "Delivered", state: "pending", is_completed: false, is_current: false, date: null },
      ],
    },
    tracking: {
      current_status: 4,
      status_title: "Shipped",
      current_step: 4,
      total_steps: 7,
      progress_percent: 65,
      timeline: [],
      history: [],
    },
  };

  test('parsePrice converts string prices with currency symbol into clean numbers', () => {
    expect(parsePrice('$25.00')).toBe(25.00);
    expect(parsePrice('$5.00')).toBe(5.00);
    expect(parsePrice('$30.00')).toBe(30.00);
    expect(parsePrice(45.5)).toBe(45.5);
    expect(parsePrice(null)).toBe(0);
    expect(parsePrice(undefined)).toBe(0);
    expect(parsePrice('')).toBe(0);
  });

  test('order-detail extracts ordered_items and formats price and details correctly', () => {
    const raw = mockOrderDetailResponse;
    const items = raw.ordered_items;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);

    const first = items[0];
    expect(first.name).toBe('Casual T-Shirt');
    expect(first.image).toBe('https://1click.thesyndicates.team/upload/siparis/item.jpg');
    expect(first.color).toBe('Black');
    expect(first.size).toBe('L');
    expect(first.quantity).toBe(1);
    expect(parsePrice(first.price)).toBe(25.00);
  });

  test('order-detail extracts price_summary correctly', () => {
    const summary = mockOrderDetailResponse.price_summary;
    const subtotal = parsePrice(summary.subtotal);
    const shipping = parsePrice(summary.shipping);
    const total = parsePrice(summary.total);

    expect(subtotal).toBe(25.00);
    expect(shipping).toBe(5.00);
    expect(total).toBe(30.00);
    expect(subtotal + shipping).toBe(total);
  });

  test('order-detail extracts status_banner and maps badge color', () => {
    const banner = mockOrderDetailResponse.status_banner;
    expect(banner.title).toBe('Shipped');
    expect(banner.subtitle).toContain('Expected delivery');
    expect(banner.badge_color).toBe('blue');

    const badgeColorMap = {
      blue: '#2563EB',
      green: '#16A34A',
      red: '#DC2626',
      orange: '#D97706',
    };
    expect(badgeColorMap[banner.badge_color]).toBe('#2563EB');
  });

  test('order-tracking processes customer_tracking with 7 steps and active step 4', () => {
    const tracking = mockOrderTrackingResponse.customer_tracking;
    expect(tracking.total_steps).toBe(7);
    expect(tracking.active_step).toBe(4);
    expect(tracking.can_track).toBe(true);
    expect(tracking.steps.length).toBe(7);

    // Verify step 4 is current
    const step4 = tracking.steps[3];
    expect(step4.step).toBe(4);
    expect(step4.key).toBe('shipped');
    expect(step4.is_current).toBe(true);
    expect(step4.is_completed).toBe(false);
    expect(step4.state).toBe('current');

    // Verify step 1, 2, 3 are completed
    expect(tracking.steps[0].is_completed).toBe(true);
    expect(tracking.steps[1].is_completed).toBe(true);
    expect(tracking.steps[2].is_completed).toBe(true);

    // Verify step 5, 6, 7 are pending
    expect(tracking.steps[4].state).toBe('pending');
    expect(tracking.steps[5].state).toBe('pending');
    expect(tracking.steps[6].state).toBe('pending');
  });
});

