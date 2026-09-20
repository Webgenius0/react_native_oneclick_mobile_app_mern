import {
  normalizeDimName,
  cleanOptionValue,
  generateItemKey,
} from '../src/helpers/variantUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {normalizeCartItem} from '../src/store/useCartStore';

describe('Variant Extraction & Normalization Utilities', () => {
  describe('normalizeDimName', () => {
    it('normalizes Size aliases across multiple languages', () => {
      expect(normalizeDimName('Size')).toBe('Size');
      expect(normalizeDimName('size')).toBe('Size');
      expect(normalizeDimName('Beden')).toBe('Size');
      expect(normalizeDimName('beden seçimi')).toBe('Size');
      expect(normalizeDimName('Numara')).toBe('Size');
      expect(normalizeDimName('Ölçü')).toBe('Size');
      expect(normalizeDimName('Dimension')).toBe('Size');
    });

    it('normalizes Color aliases across multiple languages', () => {
      expect(normalizeDimName('Color')).toBe('Color');
      expect(normalizeDimName('Colour')).toBe('Color');
      expect(normalizeDimName('Renk')).toBe('Color');
      expect(normalizeDimName('Renk seçiniz')).toBe('Color');
    });

    it('normalizes Weight, Volume, Capacity, Style, Model, Material, Pack', () => {
      expect(normalizeDimName('Weight')).toBe('Weight');
      expect(normalizeDimName('Ağırlık')).toBe('Weight');
      expect(normalizeDimName('Gramaj (g/kg)')).toBe('Weight');

      expect(normalizeDimName('Volume')).toBe('Volume');
      expect(normalizeDimName('Hacim')).toBe('Volume');
      expect(normalizeDimName('Capacity')).toBe('Volume');
      expect(normalizeDimName('Kapasite')).toBe('Volume');
      expect(normalizeDimName('Storage')).toBe('Volume');

      expect(normalizeDimName('Style')).toBe('Style');
      expect(normalizeDimName('Stil')).toBe('Style');

      expect(normalizeDimName('Model')).toBe('Model');
      expect(normalizeDimName('Tip')).toBe('Model');
      expect(normalizeDimName('type')).toBe('Model');

      expect(normalizeDimName('Material')).toBe('Material');
      expect(normalizeDimName('Materyal')).toBe('Material');

      expect(normalizeDimName('Pack')).toBe('Pack');
      expect(normalizeDimName('Paket')).toBe('Pack');
      expect(normalizeDimName('Set')).toBe('Pack');
    });

    it('gracefully converts custom shop attributes to Title Case', () => {
      expect(normalizeDimName('Frame Material')).toBe('Material');
      expect(normalizeDimName('frame color')).toBe('Color');
      expect(normalizeDimName('shoe width')).toBe('Width');
      expect(normalizeDimName('Custom Scent')).toBe('Custom Scent');
    });

    it('filters out junk non-variant dimensions', () => {
      expect(normalizeDimName('Quantity')).toBeNull();
      expect(normalizeDimName('Adet')).toBeNull();
      expect(normalizeDimName('Seller')).toBeNull();
      expect(normalizeDimName('Satıcı')).toBeNull();
      expect(normalizeDimName('Kargo')).toBeNull();
      expect(normalizeDimName('Fiyat')).toBeNull();
      expect(normalizeDimName('Cart')).toBeNull();
      expect(normalizeDimName('Taksit')).toBeNull();
      expect(normalizeDimName('Size Guide')).toBeNull();
    });
  });

  describe('cleanOptionValue', () => {
    it('cleans currency and price diff markers', () => {
      expect(cleanOptionValue('37 (179.10 AED)')).toBe('37');
      expect(cleanOptionValue('M (+200 TL)')).toBe('M');
      expect(cleanOptionValue('Red - $15.00')).toBe('Red');
      expect(cleanOptionValue('Black 179.1 AED')).toBe('Black');
      expect(cleanOptionValue('500g (+5 ₺)')).toBe('500g');
    });

    it('discards junk options', () => {
      expect(cleanOptionValue('Select Size')).toBe('');
      expect(cleanOptionValue('Lütfen Beden Seçiniz')).toBe('');
      expect(cleanOptionValue('Beden Tablosu')).toBe('');
      expect(cleanOptionValue('Tükendi')).toBe('');
      expect(cleanOptionValue('Out of stock')).toBe('');
      expect(cleanOptionValue('Sepete Ekle')).toBe('');
      expect(cleanOptionValue('1234567890123')).toBe(''); // Barcode
    });

    it('preserves valid variant values', () => {
      expect(cleanOptionValue('37')).toBe('37');
      expect(cleanOptionValue('38.5')).toBe('38.5');
      expect(cleanOptionValue('XL')).toBe('XL');
      expect(cleanOptionValue('Midnight Black')).toBe('Midnight Black');
      expect(cleanOptionValue('500g')).toBe('500g');
      expect(cleanOptionValue('1.5 kg')).toBe('1.5 kg');
    });
  });

  describe('generateItemKey & Cart De-duplication', () => {
    it('generates consistent keys for identical variants', () => {
      const item1 = {
        url: 'https://www.trendyol.com/p-123',
        options: [{name: 'Size', selected: '37'}],
        size: '37',
      };
      const item2 = {
        url: 'https://www.trendyol.com/p-123',
        options: [{name: 'Size', selected: '37'}],
        size: '37',
      };
      expect(generateItemKey(item1)).toBe(generateItemKey(item2));
    });

    it('generates distinct keys for different variants of same product', () => {
      const itemSize37 = {
        url: 'https://www.trendyol.com/p-123',
        options: [{name: 'Size', selected: '37'}],
        size: '37',
      };
      const itemSize38 = {
        url: 'https://www.trendyol.com/p-123',
        options: [{name: 'Size', selected: '38'}],
        size: '38',
      };
      expect(generateItemKey(itemSize37)).not.toBe(generateItemKey(itemSize38));
    });

    it('supports multiple simultaneous option groups (Color + Size + Weight)', () => {
      const item = {
        url: 'https://www.trendyol.com/p-123',
        options: [
          {name: 'Color', selected: 'Black'},
          {name: 'Size', selected: 'L'},
          {name: 'Weight', selected: '500g'},
        ],
        size: 'L',
        color: 'Black',
      };
      const key = generateItemKey(item);
      expect(key).toContain('color:black');
      expect(key).toContain('size:l');
      expect(key).toContain('weight:500g');
    });
  });

  describe('normalizeCartItem bidirectional synchronization', () => {
    it('syncs size from options into top-level size field and vice versa', () => {
      const rawItemWithSizeOption = {
        url: 'https://www.trendyol.com/p-123',
        options: [{name: 'Size', values: ['36', '37', '38'], selected: '37'}],
      };
      const normalized = normalizeCartItem(rawItemWithSizeOption);
      expect(normalized.size).toBe('37');
      expect(normalized.hasSize).toBe(true);
      expect(normalized.sizes).toEqual(['36', '37', '38']);
    });

    it('syncs top-level size into options if options was missing', () => {
      const rawItemWithTopSize = {
        url: 'https://www.trendyol.com/p-123',
        size: '37',
        sizes: ['36', '37'],
      };
      const normalized = normalizeCartItem(rawItemWithTopSize);
      expect(normalized.options.length).toBe(1);
      expect(normalized.options[0].name).toBe('Size');
      expect(normalized.options[0].selected).toBe('37');
    });

    it('handles product with no variants gracefully with zero errors', () => {
      const rawItemNoVariants = {
        url: 'https://www.trendyol.com/p-999',
        title: 'Simple Product Without Variants',
        price: '100 TL',
      };
      const normalized = normalizeCartItem(rawItemNoVariants);
      expect(normalized.options).toEqual([]);
      expect(normalized.hasSize).toBe(false);
      expect(normalized.hasColor).toBe(false);
      expect(normalized.size).toBe('');
      expect(normalized.color).toBe('');
      expect(normalized.id).toBe('https://www.trendyol.com/p-999::');
    });
  });
});
