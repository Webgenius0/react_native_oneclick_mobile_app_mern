import {
  clearLegalMemoryCache,
  decodeHtml,
  fetchLegalPage,
  getCachedLegalPage,
  getLegalCacheKey,
  groupBlocksIntoSections,
  LEGAL_SLUGS,
  parseHtmlBlocks,
  parseInlineTokens,
} from '../src/helpers/legalHelper';
import ai from '../src/helpers/ai';
import { storageGet, storageSet } from '../src/helpers/storage';

jest.mock('../src/helpers/ai', () => ({
  get: jest.fn(),
}));

jest.mock('../src/helpers/storage', () => ({
  storageGet: jest.fn(),
  storageSet: jest.fn(),
}));

describe('Legal Helper & Document Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLegalMemoryCache();
  });

  describe('HTML Decoding & Token Parsing', () => {
    it('decodes HTML entities correctly', () => {
      const raw = '&quot;Terms &amp; Conditions&#39; &lt;1Click&gt;&nbsp;policy';
      expect(decodeHtml(raw)).toBe('"Terms & Conditions\' <1Click> policy');
    });

    it('parses inline bold tokens (strong and b tags)', () => {
      const text = 'Welcome to <strong>1Click</strong> ("we," "our," or <b>us</b>).';
      const tokens = parseInlineTokens(text);
      expect(tokens).toEqual([
        { text: 'Welcome to ', bold: false },
        { text: '1Click', bold: true },
        { text: ' ("we," "our," or ', bold: false },
        { text: 'us', bold: true },
        { text: ').', bold: false },
      ]);
    });

    it('handles plain text without bold tags in parseInlineTokens', () => {
      const text = 'Simple plain text statement.';
      const tokens = parseInlineTokens(text);
      expect(tokens).toEqual([
        { text: 'Simple plain text statement.', bold: false },
      ]);
    });
  });

  describe('parseHtmlBlocks', () => {
    it('parses headings, paragraphs, and list items into structured blocks', () => {
      const sampleHtml = `
        <h2>1. Agreement to Terms</h2>
        <p>By accessing our app, you agree to these terms.</p>
        <h2>2. Our Services</h2>
        <ul>
          <li><strong>Assisted purchasing:</strong> We buy on your behalf.</li>
          <li><strong>Freight & Delivery:</strong> Safe transit to your city.</li>
        </ul>
      `;

      const blocks = parseHtmlBlocks(sampleHtml);
      expect(blocks).toHaveLength(4);
      expect(blocks[0]).toEqual({
        type: 'h2',
        content: '1. Agreement to Terms',
      });
      expect(blocks[1]).toEqual({
        type: 'p',
        content: 'By accessing our app, you agree to these terms.',
      });
      expect(blocks[2]).toEqual({
        type: 'h2',
        content: '2. Our Services',
      });
      expect(blocks[3].type).toBe('ul');
      expect(blocks[3].items).toHaveLength(2);
      expect(blocks[3].items[0]).toContain('Assisted purchasing');
    });

    it('falls back to paragraphs when raw text has no HTML tags', () => {
      const rawText = 'Paragraph one text.\n\nParagraph two text.';
      const blocks = parseHtmlBlocks(rawText);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({ type: 'p', content: 'Paragraph one text.' });
      expect(blocks[1]).toEqual({ type: 'p', content: 'Paragraph two text.' });
    });
  });

  describe('groupBlocksIntoSections', () => {
    it('groups blocks under their respective headings', () => {
      const sampleHtml = `
        <h2>1. Intro</h2>
        <p>Intro paragraph</p>
        <h2>2. Rules</h2>
        <p>Rule paragraph 1</p>
        <ul><li>Item 1</li></ul>
      `;
      const blocks = parseHtmlBlocks(sampleHtml);
      const sections = groupBlocksIntoSections(blocks);

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('1. Intro');
      expect(sections[0].items).toHaveLength(1);
      expect(sections[1].title).toBe('2. Rules');
      expect(sections[1].items).toHaveLength(2);
    });
  });

  describe('fetchLegalPage & Caching', () => {
    it('generates consistent cache keys for slug and lang', () => {
      expect(getLegalCacheKey('terms-of-service', 'en')).toBe('legal_cache_terms-of-service_en');
      expect(getLegalCacheKey('privacy-policy', 'som')).toBe('legal_cache_privacy-policy_som');
    });

    it('fetches from API when no cache exists and writes to storage', async () => {
      ai.get.mockResolvedValueOnce({
        data: {
          error: false,
          page: {
            id: 1,
            slug: 'terms-of-service',
            title: 'Terms of Service',
            content: '<h2>1. Intro</h2><p>Welcome</p>',
            version: '1.0',
            updated_at: '2026-11-05 06:17:06',
          },
        },
      });

      const result = await fetchLegalPage('terms-of-service', 'en', true);
      expect(result.fromCache).toBe(false);
      expect(result.data.title).toBe('Terms of Service');
      expect(ai.get).toHaveBeenCalledWith('terms-of-service', {
        params: { lang: 'en' },
        timeout: 15000,
      });
      expect(storageSet).toHaveBeenCalledWith(
        'legal_cache_terms-of-service_en',
        expect.objectContaining({ slug: 'terms-of-service' }),
      );
    });

    it('loads from storage cache immediately without network call when not forcing refresh', async () => {
      const cachedDoc = {
        id: 2,
        slug: 'privacy-policy',
        title: 'Privacy Policy Cached',
        content: '<h2>1. Data</h2><p>Protected</p>',
      };
      storageGet.mockResolvedValueOnce(cachedDoc);

      const result = await fetchLegalPage('privacy-policy', 'en', false);
      expect(result.fromCache).toBe(true);
      expect(result.data.title).toBe('Privacy Policy Cached');
      expect(ai.get).not.toHaveBeenCalled();
    });

    it('throws error when API fails and no fallback is returned', async () => {
      storageGet.mockResolvedValueOnce(null);
      ai.get.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(fetchLegalPage('privacy-policy', 'som', true)).rejects.toThrow(
        'Network request failed',
      );
    });
  });
});
