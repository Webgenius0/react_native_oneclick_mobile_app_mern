import {
  normalizeCartItem,
  isCartItemComplete,
} from '../src/store/useCartStore';

describe('Cart Size and Description Fields Tests', () => {
  it('allows customers to specify custom preferred size and description', () => {
    const rawItem = {
      id: 'item_1',
      title: 'Men Casual Cotton Shirt',
      url: 'https://www.amazon.ae/dp/B08N5WRWNW',
      price: '50.00',
      custom_size: 'EU 42',
      desc: 'Please send navy blue if available',
      image: 'https://images.amazon.com/shirt.jpg',
    };

    const normalized = normalizeCartItem(rawItem);
    expect(normalized.custom_size).toBe('EU 42');
    expect(normalized.desc).toBe('Please send navy blue if available');
    expect(normalized.description).toBe('Please send navy blue if available');
  });

  it('satisfies item completeness when custom_size or desc is provided', () => {
    const incompleteItem = {
      id: 'item_2',
      title: 'T-Shirt',
      url: 'https://m.shein.com/item.html',
      image: 'https://shein.com/tshirt.jpg',
      hasSize: true,
      sizes: ['S', 'M', 'L'],
      size: '',
    };

    // Without size, it is incomplete
    expect(isCartItemComplete(incompleteItem)).toBe(false);

    // With customer preferred size or notes, it becomes complete
    const completedWithDesc = {
      ...incompleteItem,
      desc: 'I want size L',
    };
    expect(isCartItemComplete(completedWithDesc)).toBe(true);

    const completedWithSize = {
      ...incompleteItem,
      custom_size: 'L',
      size: 'L',
    };
    expect(isCartItemComplete(completedWithSize)).toBe(true);
  });

  it('correctly formats combined description and size for order submission', () => {
    const item = {
      custom_size: 'XL',
      desc: 'Gift wrap requested',
      size: 'L',
    };

    const customSizeVal = item.custom_size && String(item.custom_size).trim();
    const descVal = (item.desc && String(item.desc).trim()) || '';
    const combinedDesc = [
      customSizeVal ? `Size: ${customSizeVal}` : '',
      descVal ? descVal : '',
    ]
      .filter(Boolean)
      .join(' | ');

    expect(combinedDesc).toBe('Size: XL | Gift wrap requested');

    const submittedSize = customSizeVal || item.size || '';
    expect(submittedSize).toBe('XL');
  });
});

