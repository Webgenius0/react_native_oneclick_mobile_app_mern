import ai from './ai';
import { storageGet, storageSet } from './storage';

// In-memory cache for ultra-fast instant loads across the app session
const memoryCache = new Map();

export const clearLegalMemoryCache = () => {
  memoryCache.clear();
};

export const LEGAL_SLUGS = {
  TERMS: 'terms-of-service',
  PRIVACY: 'privacy-policy',
};

/**
 * Generates cache key for a given slug and language
 */
export const getLegalCacheKey = (slug, lang = 'en') =>
  `legal_cache_${slug}_${lang || 'en'}`;

/**
 * Retrieves cached legal document from memory or AsyncStorage
 */
export const getCachedLegalPage = async (slug, lang = 'en') => {
  const cacheKey = getLegalCacheKey(slug, lang);

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  try {
    const diskData = await storageGet(cacheKey);
    if (diskData && diskData.content) {
      memoryCache.set(cacheKey, diskData);
      return diskData;
    }
  } catch (_) {}

  return null;
};

/**
 * Fetches legal page from API with caching and error handling
 * Endpoint: {{baseUrl}}/{slug}?lang={lang}
 */
export const fetchLegalPage = async (slug, lang = 'en', forceRefresh = false) => {
  const normalizedLang = lang === 'som' ? 'som' : 'en';
  const cacheKey = getLegalCacheKey(slug, normalizedLang);

  if (!forceRefresh) {
    const cached = await getCachedLegalPage(slug, normalizedLang);
    if (cached) {
      return { data: cached, fromCache: true };
    }
  }

  const res = await ai.get(slug, {
    params: {
      lang: normalizedLang,
    },
    timeout: 15000,
  });

  const page = res?.data?.page;
  if (!page || !page.content) {
    throw new Error(res?.data?.message || `Failed to load ${slug}`);
  }

  // Update memory and disk cache
  memoryCache.set(cacheKey, page);
  try {
    await storageSet(cacheKey, page);
  } catch (_) {}

  return { data: page, fromCache: false };
};

/**
 * Prefetch both legal pages in the background so they are ready instantly
 */
export const prefetchLegalPages = (lang = 'en') => {
  const normalizedLang = lang === 'som' ? 'som' : 'en';
  [LEGAL_SLUGS.TERMS, LEGAL_SLUGS.PRIVACY].forEach(async slug => {
    try {
      const cached = await getCachedLegalPage(slug, normalizedLang);
      if (!cached) {
        await fetchLegalPage(slug, normalizedLang, true);
      }
    } catch (_) {}
  });
};

/**
 * Decodes HTML entities and normalizes whitespace
 */
export function decodeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\\r\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Parses bold tokens (<strong> or <b>) for inline styling
 */
export function parseInlineTokens(text) {
  if (!text) return [];
  const clean = decodeHtml(text);
  const tagRegex = /<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      const plain = clean.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
      if (plain) {
        tokens.push({ text: plain, bold: false });
      }
    }
    const boldText = match[2].replace(/<[^>]+>/g, '');
    if (boldText) {
      tokens.push({ text: boldText, bold: true });
    }
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < clean.length) {
    const remaining = clean.slice(lastIndex).replace(/<[^>]+>/g, '');
    if (remaining) {
      tokens.push({ text: remaining, bold: false });
    }
  }

  return tokens.length > 0
    ? tokens
    : [{ text: clean.replace(/<[^>]+>/g, ''), bold: false }];
}

/**
 * Parses HTML into semantic blocks (h1-h4, p, ul, ol)
 */
export function parseHtmlBlocks(html) {
  if (!html) return [];
  const clean = decodeHtml(html);
  const blockRegex = /<(h[1-4]|p|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks = [];
  let match;

  while ((match = blockRegex.exec(clean)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2].trim();

    if (tag === 'ul' || tag === 'ol') {
      const items = [];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRegex.exec(inner)) !== null) {
        const itemContent = liMatch[1].trim();
        if (itemContent) {
          items.push(itemContent);
        }
      }
      if (items.length > 0) {
        blocks.push({ type: tag, items });
      }
    } else {
      if (inner) {
        blocks.push({ type: tag, content: inner });
      }
    }
  }

  // Fallback for plain text without tags
  if (blocks.length === 0 && clean.trim()) {
    clean.split(/\n\n+/).forEach(para => {
      const trimmed = para.trim();
      if (trimmed) {
        blocks.push({ type: 'p', content: trimmed });
      }
    });
  }

  return blocks;
}

/**
 * Groups blocks by headings for clean card section rendering
 */
export function groupBlocksIntoSections(blocks) {
  const sections = [];
  let currentSection = null;

  for (const block of blocks) {
    if (block.type.startsWith('h')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: block.content.replace(/<[^>]+>/g, ''),
        items: [],
      };
    } else {
      if (!currentSection) {
        currentSection = {
          title: '',
          items: [],
        };
      }
      currentSection.items.push(block);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
