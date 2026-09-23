// Generic and robust variant extraction & normalization utilities

export const cleanText = text => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
};

export const cleanOptionValue = text => {
  if (!text || typeof text !== 'string') return '';
  let clean = text.replace(/\s+/g, ' ').trim();
  // Strip trailing price diffs in parens/brackets, e.g. (+200 TL), (+15,00 TL), (-$5.00), (350 TL), (+5 ₺), (179.10 AED)
  clean = clean.replace(/\s*[\(\[]\s*[+\-]?\s*[\$€£₺]?\s*\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)?\s*[\)\]]/gi, '');
  // Strip trailing price suffix separated by dash or space, e.g. " - $15.00", " 179.1 AED"
  clean = clean.replace(/\s*[-–]\s*[\$€£₺]?\s*\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)?$/gi, '');
  clean = clean.replace(/\s+\d+(?:[.,]\d+)?\s*(?:tl|₺|\$|€|usd|eur|aed|sar|try)\b.*$/gi, '');
  clean = clean.replace(/\s*[\-:]?\s*\b(tl|₺|\$|€|usd|eur|aed|sar|try)\b.*$/gi, '');
  clean = clean.replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim();
  if (clean.length === 0 || clean.length > 35) return '';

  const lower = clean.toLowerCase();
  const exactJunk = [
    'select', 'seçiniz', 'seç', 'choose', 'lütfen', 'beden tablosu', 'size guide',
    'size chart', 'beden rehberi', 'out of stock', 'tükendi', 'stokta yok',
    'gelince haber ver', 'sepete ekle', 'add to cart', 'buy now', 'hemen al',
    'kargo bedava', 'free delivery', 'kupon', 'coupon', 'indirim', 'discount',
    'taksit', 'installment', 'satıcı', 'seller', 'yorum', 'review', 'değerlendirme',
    'kargo', 'teslimat', 'iade', 'return', 'share', 'paylaş', 'fiyat', 'price',
    'hızlı teslimat', 'fast shipping',
  ];
  for (let j = 0; j < exactJunk.length; j++) {
    if (lower === exactJunk[j]) return '';
    // Only check prefix match if phrase has multiple words (e.g. "select size")
    if (exactJunk[j].indexOf(' ') > -1 && lower.indexOf(exactJunk[j]) === 0) return '';
    if (exactJunk[j].length >= 5 && new RegExp(`^${exactJunk[j]}\\b`, 'i').test(lower)) return '';
  }

  // Discard pure digits >= 8 chars (barcodes / internal skus)
  if (/^\d{8,}$/.test(clean)) return '';

  return clean;
};

/**
 * Returns true when the supplied text looks like a placeholder/prompt
 * rather than a genuine user selection (e.g. "Select", "Choose an option",
 * "Beden Seçiniz", "Please Select", etc.).
 */
export const isPlaceholderValue = text => {
  if (!text || typeof text !== 'string') return true;
  const val = text.replace(/[\s\-_]+/g, ' ').trim().toLowerCase();
  if (!val) return true;

  const placeholders = [
    'select', 'choose', 'pick', 'seçiniz', 'seç', 'seçin',
    'lütfen seçin', 'lütfen seçiniz', 'please select', 'please choose',
    'select size', 'select color', 'select colour', 'select option',
    'choose size', 'choose color', 'choose colour', 'choose option',
    'pick a size', 'pick a color', 'pick a colour',
    'beden seçiniz', 'renk seçiniz', 'boyut seçiniz',
    'beden seç', 'renk seç',
    'select a size', 'select a color', 'select a colour',
    'choose a size', 'choose a color', 'choose a colour',
    '-- please select --', '- please select -',
    '-- select --', '- select -',
  ];

  for (let i = 0; i < placeholders.length; i++) {
    if (val === placeholders[i]) return true;
  }

  // Catch patterns like "Select ___" or "Choose ___"
  if (/^(select|choose|pick|seç|seçiniz|lütfen)\b/i.test(val)) return true;

  return false;
};

export const normalizeDimName = rawName => {
  if (!rawName || typeof rawName !== 'string') return null;
  const n = cleanText(rawName);
  const lower = n.toLowerCase();

  // Junk dimensions to ignore (cart metadata, delivery, price, seller, etc.)
  const ignoreDims = [
    'quantity', 'adet', 'miktar', 'qty', 'seller', 'satıcı', 'kargo',
    'teslimat', 'garanti', 'warranty', 'sigorta', 'protection', 'fiyat',
    'price', 'sepet', 'basket', 'cart', 'taksit', 'adres', 'address',
    'rating', 'review', 'kupon', 'coupon', 'shipping', 'delivery', 'guide',
    'rehber', 'tablo'
  ];
  for (let i = 0; i < ignoreDims.length; i++) {
    if (lower === ignoreDims[i] || lower.indexOf(ignoreDims[i]) > -1) return null;
  }

  // Essential variant dimensions only (Size, Color, Weight/Volume)
  if (
    lower.indexOf('beden') > -1 ||
    lower.indexOf('size') > -1 ||
    lower.indexOf('numara') > -1 ||
    lower.indexOf('ölçü') > -1 ||
    lower.indexOf('boyut') > -1 ||
    lower.indexOf('dimension') > -1
  ) return 'Size';

  if (
    lower.indexOf('renk') > -1 ||
    lower.indexOf('color') > -1 ||
    lower.indexOf('colour') > -1
  ) return 'Color';

  if (
    lower.indexOf('hafıza') > -1 ||
    lower.indexOf('storage') > -1 ||
    lower.indexOf('dahili hafıza') > -1 ||
    lower.indexOf('kapasite') > -1 ||
    lower.indexOf('capacity') > -1
  ) return 'Storage';

  if (
    lower.indexOf('ağırlık') > -1 ||
    lower.indexOf('weight') > -1 ||
    lower.indexOf('gram') > -1 ||
    lower.indexOf('kg') > -1
  ) return 'Weight';

  if (
    lower.indexOf('hacim') > -1 ||
    lower.indexOf('volume') > -1 ||
    lower.indexOf('ml') > -1
  ) return 'Volume';

  return null;
};

// Generate composite key for cart items so different variants stay separate
export const generateItemKey = item => {
  if (!item || !item.url) return String(Date.now());
  const cleanUrl = String(item.url).split('#')[0].trim();
  const optionTokens = [];

  if (Array.isArray(item.options) && item.options.length > 0) {
    item.options.forEach(opt => {
      if (opt && opt.name) {
        const val = opt.selected || '';
        if (val) {
          optionTokens.push(`${opt.name.trim().toLowerCase()}:${val.trim().toLowerCase()}`);
        }
      }
    });
  }

  // Also include size/color if not captured in options
  if (item.size && !optionTokens.some(t => t.startsWith('size:'))) {
    optionTokens.push(`size:${String(item.size).trim().toLowerCase()}`);
  }
  if (item.color && !optionTokens.some(t => t.startsWith('color:'))) {
    optionTokens.push(`color:${String(item.color).trim().toLowerCase()}`);
  }

  optionTokens.sort();
  return `${cleanUrl}::${optionTokens.join('|')}`;
};
