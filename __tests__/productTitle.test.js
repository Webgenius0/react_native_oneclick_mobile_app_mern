jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { cleanProductTitle, getFallbackTitleFromUrl } from '../src/helpers/storeHelper';
import { normalizeCartItem } from '../src/store/useCartStore';

describe('Product Title Extraction & Cleaning Tests', () => {
  describe('Amazon Product Titles', () => {
    test('cleans Amazon US document.title with store prefix and category suffix', () => {
      const raw = 'Amazon.com: Apple iPhone 15 Pro, 128GB, Natural Titanium - Unlocked (Renewed) : Cell Phones & Accessories';
      expect(cleanProductTitle(raw)).toBe('Apple iPhone 15 Pro, 128GB, Natural Titanium - Unlocked (Renewed)');
    });

    test('cleans Amazon Turkey document.title with prefix and category', () => {
      const raw = 'Amazon.com.tr : Kadın Spor Ayakkabı : Moda';
      expect(cleanProductTitle(raw)).toBe('Kadın Spor Ayakkabı');
    });

    test('cleans Amazon UAE document.title with category suffix', () => {
      const raw = 'Amazon.ae: Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black : Electronics';
      expect(cleanProductTitle(raw)).toBe('Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black');
    });

    test('cleans Amazon title with store suffix at the end', () => {
      const raw = 'Anker Magnetic Wireless Power Bank - Amazon.com';
      expect(cleanProductTitle(raw)).toBe('Anker Magnetic Wireless Power Bank');
    });

    test('cleans Amazon title with "Visit the ... Store" prefix', () => {
      const raw = 'Visit the Apple Store Apple iPhone 15 Pro (128 GB) - Natural Titanium';
      expect(cleanProductTitle(raw)).toBe('Apple iPhone 15 Pro (128 GB) - Natural Titanium');
    });

    test('cleans Amazon title with "Brand: ..." prefix', () => {
      const raw = 'Brand: Sony Sony WH-1000XM5 Wireless Noise Cancelling Headphones';
      expect(cleanProductTitle(raw)).toBe('Sony WH-1000XM5 Wireless Noise Cancelling Headphones');
    });

    test('cleans Amazon title with trailing ratings text', () => {
      const raw = 'Apple AirPods Pro (2nd Generation) 4.7 out of 5 stars (12,450 ratings)';
      expect(cleanProductTitle(raw)).toBe('Apple AirPods Pro (2nd Generation)');
    });
  });

  describe('Trendyol Product Titles', () => {
    test('cleans Trendyol "Fiyatı, Yorumları - Trendyol" suffix', () => {
      const raw = 'Skechers Track New Staple Kadın Günlük Ayakkabı 150141TK-BBK Fiyatı, Yorumları - Trendyol';
      expect(cleanProductTitle(raw)).toBe('Skechers Track New Staple Kadın Günlük Ayakkabı 150141TK-BBK');
    });

    test('cleans Trendyol "Fiyatı - Trendyol" suffix', () => {
      const raw = 'Puma Smash V2 Unisex Spor Ayakkabı Fiyatı - Trendyol';
      expect(cleanProductTitle(raw)).toBe('Puma Smash V2 Unisex Spor Ayakkabı');
    });

    test('cleans Trendyol prefix', () => {
      const raw = 'Trendyol: Mavi Erkek Slim Fit Jean Pantolon';
      expect(cleanProductTitle(raw)).toBe('Mavi Erkek Slim Fit Jean Pantolon');
    });
  });

  describe('Other Global Stores', () => {
    test('cleans Zara title suffix and prefix', () => {
      const raw = 'OVERSIZED BOMBER JACKET - Black | ZARA United States';
      expect(cleanProductTitle(raw)).toBe('OVERSIZED BOMBER JACKET - Black');
    });

    test('cleans Shein title suffix and prefix', () => {
      const raw = 'SHEIN BAE Solid Split Thigh Tube Dress | SHEIN USA';
      expect(cleanProductTitle(raw)).toBe('SHEIN BAE Solid Split Thigh Tube Dress');
    });

    test('cleans Hepsiburada title suffix and prefix', () => {
      const raw = 'Samsung Galaxy S24 Ultra 256 GB Fiyatı - Hepsiburada';
      expect(cleanProductTitle(raw)).toBe('Samsung Galaxy S24 Ultra 256 GB');
    });

    test('cleans Noon title suffix', () => {
      const raw = 'Sony PlayStation 5 Slim Console Disc Edition White | noon';
      expect(cleanProductTitle(raw)).toBe('Sony PlayStation 5 Slim Console Disc Edition White');
    });

    test('cleans AliExpress title suffix', () => {
      const raw = 'Original Apple 20W USB-C Power Adapter - AliExpress 44';
      expect(cleanProductTitle(raw)).toBe('Original Apple 20W USB-C Power Adapter');
    });

    test('cleans eBay title suffix', () => {
      const raw = 'Apple iPhone 15 Pro Max - 256GB - Natural Titanium (Unlocked) | eBay';
      expect(cleanProductTitle(raw)).toBe('Apple iPhone 15 Pro Max - 256GB - Natural Titanium (Unlocked)');
    });

    test('cleans Nike title suffix', () => {
      const raw = "Nike Air Force 1 '07 Men's Shoes. Nike.com";
      expect(cleanProductTitle(raw)).toBe("Nike Air Force 1 '07 Men's Shoes");
    });

    test('cleans H&M title suffix', () => {
      const raw = 'Regular Fit Linen-blend Shirt - White - Men | H&M US';
      expect(cleanProductTitle(raw)).toBe('Regular Fit Linen-blend Shirt - White - Men');
    });
  });

  describe('HTML Entities & Punctuation Formatting', () => {
    test('decodes HTML entities properly', () => {
      const raw = 'Men&#39;s Slim &amp; Fit &quot;Classics&quot; T-Shirt';
      expect(cleanProductTitle(raw)).toBe('Men\'s Slim & Fit "Classics" T-Shirt');
    });

    test('collapses multiple whitespace, tabs, and newlines', () => {
      const raw = '  \n\t Apple   iPhone 15   Pro \n (128 GB)   \t ';
      expect(cleanProductTitle(raw)).toBe('Apple iPhone 15 Pro (128 GB)');
    });

    test('strips leading and trailing punctuation', () => {
      const raw = ' - : | Apple iPhone 15 Pro | - : ';
      expect(cleanProductTitle(raw)).toBe('Apple iPhone 15 Pro');
    });
  });

  describe('URL Fallback Extraction', () => {
    test('extracts title from Amazon URL slug when title is missing or generic', () => {
      const url = 'https://www.amazon.com/Apple-iPhone-15-Pro-Titanium/dp/B0BDHB9Y8H';
      expect(cleanProductTitle('', url)).toBe('Apple iPhone 15 Pro Titanium');
      expect(cleanProductTitle('Product', url)).toBe('Apple iPhone 15 Pro Titanium');
      expect(cleanProductTitle('-', url)).toBe('Apple iPhone 15 Pro Titanium');
      expect(cleanProductTitle('OneClick', url)).toBe('Apple iPhone 15 Pro Titanium');
    });

    test('extracts title from Trendyol URL slug', () => {
      const url = 'https://www.trendyol.com/skechers/track-new-staple-kadin-gunluk-ayakkabi-p-780698674';
      expect(cleanProductTitle('', url)).toBe('Track New Staple Kadin Gunluk Ayakkabi');
    });

    test('extracts title from Zara URL slug', () => {
      const url = 'https://www.zara.com/us/en/oversized-bomber-jacket-p00706400.html';
      expect(cleanProductTitle('', url)).toBe('Oversized Bomber Jacket');
    });

    test('converts raw URL passed as title into clean product name', () => {
      const rawUrlAsTitle = 'https://www.amazon.com/Apple-iPhone-15-Pro-Titanium/dp/B0BDHB9Y8H';
      expect(cleanProductTitle(rawUrlAsTitle)).toBe('Apple iPhone 15 Pro Titanium');
    });

    test('ignores Amazon ref= tracking parameter in URL and extracts real product title (user screenshot case)', () => {
      const url =
        'https://www.amazon.com/Samsung-Galaxy-S25-Ultra-Smartphone/dp/B0DXR5XYZ/ref=mh_s9_acsd_al_cv2_3_t';
      expect(cleanProductTitle('', url)).toBe('Samsung Galaxy S25 Ultra Smartphone');
      // If the broken tracking title was stored in cart, cleanProductTitle rejects it and resolves from url:
      expect(cleanProductTitle('Ref=mh S9 Acsd Al Cv2 3 T', url)).toBe('Samsung Galaxy S25 Ultra Smartphone');
    });

    test('ignores ref= segment and returns ASIN when Amazon URL has no product slug before /dp/', () => {
      const url = 'https://www.amazon.com/dp/B0DXR5XYZ/ref=mh_s9_acsd_al_cv2_3_t';
      expect(getFallbackTitleFromUrl(url)).toBe('B0DXR5XYZ');
      expect(cleanProductTitle('', url)).toBe('B0DXR5XYZ');
    });

    test('rejects junk heading "Product summary presents key product information" and extracts Soundcore title from URL', () => {
      const url = 'https://www.amazon.ae/Soundcore-AeroClip-Open-Ear-Earbuds-Headphones/dp/B0FQFHZF6L';
      const junkTitle = 'Product summary presents key product information';
      expect(cleanProductTitle(junkTitle, url)).toBe('Soundcore AeroClip Open Ear Earbuds Headphones');
      expect(cleanProductTitle(junkTitle, 'https://www.amazon.ae/dp/B0FQFHZF6L')).toBe('B0FQFHZF6L');
    });
  });

  describe('Cart Normalization Integration', () => {
    test('normalizeCartItem automatically cleans title of items in cart', () => {
      const dirtyItem = {
        id: 'test-item-1',
        url: 'https://www.amazon.com/dp/B0BDHB9Y8H',
        title: 'Amazon.com: Apple iPhone 15 Pro, 128GB, Natural Titanium - Unlocked : Cell Phones & Accessories',
        price: '999.00',
        currency: 'USD',
      };

      const normalized = normalizeCartItem(dirtyItem);
      expect(normalized.title).toBe('Apple iPhone 15 Pro, 128GB, Natural Titanium - Unlocked');
    });

    test('normalizeCartItem derives title from URL if item has placeholder title', () => {
      const fallbackItem = {
        id: 'test-item-2',
        url: 'https://www.amazon.com/Sony-WH-1000XM5-Headphones/dp/B0BDHB9Y8H',
        title: 'Product',
        price: '349.00',
        currency: 'USD',
      };

      const normalized = normalizeCartItem(fallbackItem);
      expect(normalized.title).toBe('Sony WH 1000XM5 Headphones');
    });

    test('normalizeCartItem separates combined color "Blue and White / Size: M" and recovers size M', () => {
      const sheinItem = {
        id: 'shein-item-1',
        url: 'https://m.shein.com/SHEIN-Franclia-Set-p-507928574.html',
        title: 'SHEIN Franclia Casual Commuter Versatile Set',
        color: 'Blue and White / Size: M',
        size: '83 cm',
        sizes: ['83 cm'],
        options: [
          { name: 'Color', values: ['Blue and White / Size: M'], selected: 'Blue and White / Size: M' },
          { name: 'Size', values: ['83 cm'], selected: '83 cm' }
        ],
        price: '45.00',
        currency: 'SAR',
      };

      const normalized = normalizeCartItem(sheinItem);
      expect(normalized.color).toBe('Blue and White');
      expect(normalized.size).toBe('M');
      expect(normalized.options.find(o => o.name === 'Color').selected).toBe('Blue and White');
      expect(normalized.options.find(o => o.name === 'Size').selected).toBe('M');
    });

    test('normalizeCartItem prefers clothing size over pure measurement like 83 cm when sizes has clothing size', () => {
      const itemWithMeasurement = {
        id: 'shein-item-2',
        url: 'https://m.shein.com/item-p-123.html',
        title: 'Casual Dress',
        size: '83 cm',
        sizes: ['S', 'M', 'L'],
        price: '25.00',
        currency: 'USD',
      };

      const normalized = normalizeCartItem(itemWithMeasurement);
      expect(normalized.size).toBe('S');
    });

    test('normalizeCartItem ensures Shein items default to USD currency and recover price', () => {
      const sheinItem = {
        id: 'shein-item-3',
        url: 'https://m.shein.com/Franclia-Spring-Summer-Women-s-2-Piece-Set-p-488479963.html',
        title: 'Franclia 2-Piece Set',
        size: 'M',
        sizes: ['M'],
        color: 'Apricot',
        colors: ['Apricot'],
        options: [
          { name: 'Color', values: ['Apricot'], selected: 'Apricot', prices: {} },
          { name: 'Size', values: ['M'], selected: 'M', prices: { 'M': '13.04' } }
        ],
        price: '',
        currency: 'TL',
      };

      const normalized = normalizeCartItem(sheinItem);
      expect(normalized.currency).toBe('USD');
      expect(normalized.price).toBe('13.04');
    });
  });
});

