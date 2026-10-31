import {
  getDomainParts,
  findMarketplaceForItem,
  calculateMarketplacePrice,
} from '../src/helpers/storeHelper';

describe('Marketplace Price and Dynamic Matching Tests', () => {
  const mockMarketplaces = [
    {
      id: 1,
      marketplace: 'shein',
      name: 'SHEIN',
      percent: 10,
      price: 10,
      currency: 'USD',
      updated_at: '2026-10-08 07:04:43',
    },
    {
      id: 3,
      marketplace: 'amazon',
      name: 'AMAZON',
      percent: 10,
      price: 10,
      currency: 'USD',
      updated_at: '2026-10-31 12:49:21',
    },
  ];

  describe('getDomainParts', () => {
    it('extracts domain parts correctly for global and regional URLs', () => {
      expect(getDomainParts('https://www.amazon.ae/dp/B08N5WRWNW')).toEqual([
        'amazon',
        'ae',
      ]);
      expect(getDomainParts('https://www.amazon.com/dp/B08N5WRWNW')).toEqual([
        'amazon',
        'com',
      ]);
      expect(getDomainParts('https://www.amazon.sa/dp/B08N5WRWNW')).toEqual([
        'amazon',
        'sa',
      ]);
      expect(getDomainParts('https://www.amazon.co.uk/dp/B08N5WRWNW')).toEqual([
        'amazon',
        'co',
        'uk',
      ]);
      expect(getDomainParts('https://m.shein.com/ar-en/goods-p-123.html')).toEqual([
        'shein',
        'com',
      ]);
      expect(getDomainParts('https://shein.sa/goods-p-123.html')).toEqual([
        'shein',
        'sa',
      ]);
      expect(getDomainParts('https://www.trendyol.com/brand/product-p-1')).toEqual([
        'trendyol',
        'com',
      ]);
    });

    it('handles empty or malformed inputs gracefully', () => {
      expect(getDomainParts('')).toEqual([]);
      expect(getDomainParts(null)).toEqual([]);
      expect(getDomainParts(undefined)).toEqual([]);
      expect(getDomainParts('invalid-url')).toEqual(['invalid-url']);
    });
  });

  describe('findMarketplaceForItem', () => {
    it('matches Amazon item across different regional domains', () => {
      const itemAe = { url: 'https://www.amazon.ae/dp/B08123', store: 'Amazon' };
      const itemSa = { url: 'https://www.amazon.sa/dp/B08123', store: 'Amazon' };
      const itemUs = { url: 'https://www.amazon.com/dp/B08123', store: 'Amazon' };

      expect(findMarketplaceForItem(itemAe, mockMarketplaces)?.marketplace).toBe('amazon');
      expect(findMarketplaceForItem(itemSa, mockMarketplaces)?.marketplace).toBe('amazon');
      expect(findMarketplaceForItem(itemUs, mockMarketplaces)?.marketplace).toBe('amazon');
    });

    it('matches Shein item across subdomains and country domains', () => {
      const itemMobile = { url: 'https://m.shein.com/ar/item.html', store: 'SHEIN' };
      const itemSa = { url: 'https://shein.sa/item.html', store: 'SHEIN' };
      const itemAe = { url: 'https://shein.ae/item.html', store: 'SHEIN' };

      expect(findMarketplaceForItem(itemMobile, mockMarketplaces)?.marketplace).toBe('shein');
      expect(findMarketplaceForItem(itemSa, mockMarketplaces)?.marketplace).toBe('shein');
      expect(findMarketplaceForItem(itemAe, mockMarketplaces)?.marketplace).toBe('shein');
    });

    it('matches by store name even if url domain is non-standard', () => {
      const item = { url: 'https://amzn.to/3xyz', store: 'AMAZON' };
      expect(findMarketplaceForItem(item, mockMarketplaces)?.marketplace).toBe('amazon');
    });

    it('returns null for unlisted stores', () => {
      const item = { url: 'https://www.zara.com/tr/en/coat-p123.html', store: 'Zara' };
      expect(findMarketplaceForItem(item, mockMarketplaces)).toBeNull();
    });
  });

  describe('calculateMarketplacePrice', () => {
    it('calculates 10% markup for Shein items', () => {
      const item = { url: 'https://m.shein.com/ar/goods-p-123.html', store: 'SHEIN' };
      const result = calculateMarketplacePrice(100, item, mockMarketplaces);

      expect(result.percent).toBe(10);
      expect(result.percentAmount).toBe(10);
      expect(result.finalPrice).toBe(110);
      expect(result.matchedMarketplace?.name).toBe('SHEIN');
    });

    it('calculates 10% markup for Amazon items', () => {
      const item = { url: 'https://www.amazon.ae/dp/B08N5WRWNW', store: 'Amazon' };
      const result = calculateMarketplacePrice(50, item, mockMarketplaces);

      expect(result.percent).toBe(10);
      expect(result.percentAmount).toBe(5);
      expect(result.finalPrice).toBe(55);
      expect(result.matchedMarketplace?.name).toBe('AMAZON');
    });

    it('returns base price with 0% markup for unlisted marketplace', () => {
      const item = { url: 'https://www.trendyol.com/p/123', store: 'Trendyol' };
      const result = calculateMarketplacePrice(80, item, mockMarketplaces);

      expect(result.percent).toBe(0);
      expect(result.percentAmount).toBe(0);
      expect(result.finalPrice).toBe(80);
      expect(result.matchedMarketplace).toBeNull();
    });

    it('does NOT add any markup if marketplaces list is empty []', () => {
      const itemShein = { url: 'https://m.shein.com/ar/goods-p-123.html', store: 'SHEIN' };
      const itemAmazon = { url: 'https://www.amazon.ae/dp/B08123', store: 'Amazon' };

      expect(calculateMarketplacePrice(100, itemShein, []).finalPrice).toBe(100);
      expect(calculateMarketplacePrice(100, itemShein, []).percent).toBe(0);
      expect(calculateMarketplacePrice(50, itemAmazon, []).finalPrice).toBe(50);
      expect(calculateMarketplacePrice(50, itemAmazon, []).percent).toBe(0);
    });

    it('does NOT add any markup if marketplace exists but percent is 0', () => {
      const zeroMarketplaces = [
        { marketplace: 'amazon', percent: 0 },
        { marketplace: 'shein', percent: 0 },
      ];
      const item = { url: 'https://www.amazon.ae/dp/123', store: 'Amazon' };
      const result = calculateMarketplacePrice(50, item, zeroMarketplaces);

      expect(result.percent).toBe(0);
      expect(result.percentAmount).toBe(0);
      expect(result.finalPrice).toBe(50);
    });

    it('automatically applies markup when a new marketplace is dynamically added', () => {
      // Simulating a future API response that includes Trendyol with 8%
      const updatedMarketplaces = [
        ...mockMarketplaces,
        {
          id: 5,
          marketplace: 'trendyol',
          name: 'Trendyol',
          percent: 8,
          price: 8,
          currency: 'TRY',
        },
      ];

      const item = { url: 'https://www.trendyol.com/ayakkabi-p-123', store: 'Trendyol' };
      const result = calculateMarketplacePrice(200, item, updatedMarketplaces);

      expect(result.percent).toBe(8);
      expect(result.percentAmount).toBe(16);
      expect(result.finalPrice).toBe(216);
      expect(result.matchedMarketplace?.name).toBe('Trendyol');
    });

    it('handles decimal prices correctly', () => {
      const item = { url: 'https://www.amazon.ae/dp/123', store: 'Amazon' };
      const result = calculateMarketplacePrice(19.99, item, mockMarketplaces);

      // 19.99 + 10% (1.999) = 21.989 -> 21.99
      expect(result.percent).toBe(10);
      expect(result.finalPrice).toBe(21.99);
    });

    it('handles invalid or zero prices safely', () => {
      const item = { url: 'https://www.amazon.ae/dp/123', store: 'Amazon' };
      expect(calculateMarketplacePrice(0, item, mockMarketplaces).finalPrice).toBe(0);
      expect(calculateMarketplacePrice(null, item, mockMarketplaces).finalPrice).toBe(0);
      expect(calculateMarketplacePrice('invalid', item, mockMarketplaces).finalPrice).toBe(0);
    });
  });
});
