import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

const devCart = [
  {
    url: 'https://www.trendyol.com/skechers/track-new-staple-kadin-gunluk-ayakkabi-150141tk-bbk-p-780698674?boutiqueId=61&merchantId=110337&sav=true',
    image:
      'https://cdn.dsmcdn.com/mnresize/1200/1800/ty1512/product/media/images/prod/QC/20240725/20/f6bdaf8e-c6b9-3b17-93e0-40a26d7477dc/1_org_zoom.jpg',
    count: 1,
    size: '',
    desc: '',
    title: 'Skechers Track New Staple Kadın Günlük Ayakkabı 150141TK-BBK',
  },
];

import { generateItemKey, isAgeOrMeasurement } from '../helpers/variantUtils';
import { cleanProductTitle } from '../helpers/storeHelper';
import { parsePrice, calculateConvertedPrice } from '../helpers/currencyHelper';

export const normalizeCartItem = item => {
  if (!item) {
    return null;
  }

  const cleanTitle = cleanProductTitle(item.title, item.url);

  // Clean and preserve options array (restricted to Size, Color, Storage, Weight/Volume)
  const ALLOWED_OPTION_NAMES = ['size', 'color', 'storage', 'weight', 'volume'];
  let options = Array.isArray(item.options) ? [...item.options] : [];
  options = options.filter(
    opt =>
      opt &&
      opt.name &&
      ALLOWED_OPTION_NAMES.includes(opt.name.trim().toLowerCase()) &&
      Array.isArray(opt.values) &&
      opt.values.length > 0,
  );

  let size = item.size ? String(item.size).trim() : '';
  let sizes = Array.isArray(item.sizes) ? item.sizes.map(s => String(s).trim()) : [];
  let color = item.color ? String(item.color).trim() : '';
  let colors = Array.isArray(item.colors) ? item.colors.map(c => String(c).trim()) : [];

  const isPureMeasurement = val => /^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(String(val).trim());

  // Separate combined color and size (e.g. "Blue and White / Size: M" or "Blue and White / Beden: M")
  const colorSizeMatch = color.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
  if (colorSizeMatch) {
    color = colorSizeMatch[1].trim();
    const embeddedSize = colorSizeMatch[2].trim();
    if (!size || isPureMeasurement(size)) {
      size = embeddedSize;
    }
  }

  // Also clean Color option within options array
  const rawColorOpt = options.find(o => o.name && o.name.toLowerCase() === 'color');
  if (rawColorOpt) {
    if (rawColorOpt.selected) {
      const optMatch = rawColorOpt.selected.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
      if (optMatch) {
        rawColorOpt.selected = optMatch[1].trim();
        if (!size || isPureMeasurement(size)) {
          size = optMatch[2].trim();
        }
      }
    }
    if (Array.isArray(rawColorOpt.values)) {
      rawColorOpt.values = rawColorOpt.values.map(v => {
        const m = String(v).match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
        return m ? m[1].trim() : String(v).trim();
      });
    }
    if (!color && rawColorOpt.selected) {
      color = rawColorOpt.selected;
    }
  }

  // If size is a pure measurement (e.g. "83 cm") but clothing sizes (e.g. "M") exist in sizes, prefer the clothing size
  if (isPureMeasurement(size)) {
    const validClothingSize = sizes.find(s => !isPureMeasurement(s));
    if (validClothingSize) {
      size = validClothingSize;
    }
  }

  let newPrice = item.price ?? '';

  // Bidirectional sync: if options has Size, sync size & sizes
  const sizeOpt = options.find(
    o => o.name && o.name.toLowerCase() === 'size',
  );
  if (sizeOpt) {
    if (size) {
      sizeOpt.selected = size;
    } else if (sizeOpt.selected) {
      size = String(sizeOpt.selected).trim();
    }
    if (sizes.length === 0 && Array.isArray(sizeOpt.values)) {
      sizes = sizeOpt.values.map(s => String(s).trim());
    }
    if (size && sizeOpt.prices && sizeOpt.prices[size] && !isAgeOrMeasurement(size)) {
      newPrice = sizeOpt.prices[size];
    }
  } else if (size || sizes.length > 0) {
    // If top level size is present but not in options, push into options
    options.push({
      name: 'Size',
      values: sizes.length > 0 ? sizes : [size],
      selected: size || '',
      prices: {},
    });
  }

  // Bidirectional sync: if options has Color, sync color & colors
  const colorOpt = options.find(
    o => o.name && o.name.toLowerCase() === 'color',
  );
  if (colorOpt) {
    if (color) {
      colorOpt.selected = color;
    } else if (colorOpt.selected) {
      color = String(colorOpt.selected).trim();
    }
    if (colors.length === 0 && Array.isArray(colorOpt.values)) {
      colors = colorOpt.values.map(c => String(c).trim());
    }
    if (color && colorOpt.prices && colorOpt.prices[color]) {
      newPrice = colorOpt.prices[color];
    }
  } else if (color || colors.length > 0) {
    options.push({
      name: 'Color',
      values: colors.length > 0 ? colors : [color],
      selected: color || '',
      prices: {},
    });
  }

  // Check any selected generic option (e.g. Storage, Volume) with an explicit price
  for (const opt of options) {
    if (opt && opt.selected && opt.prices && opt.prices[opt.selected] && !isAgeOrMeasurement(opt.selected)) {
      newPrice = opt.prices[opt.selected];
    }
  }

  // Keep selected value clean and ensure values only contains selected value if selected
  options = options.map(opt => {
    const sel = opt.selected ? String(opt.selected).trim() : '';
    const cleanPrices = {};
    if (opt.prices && typeof opt.prices === 'object') {
      Object.keys(opt.prices).forEach(k => {
        if (!isAgeOrMeasurement(k)) {
          cleanPrices[k] = opt.prices[k];
        }
      });
    }
    return {
      ...opt,
      selected: sel,
      values: sel ? [sel] : (Array.isArray(opt.values) ? opt.values : []),
      prices: cleanPrices,
    };
  });

  if (sizes.length === 0 && size) {
    sizes = [size];
  }
  if (colors.length === 0 && color) {
    colors = [color];
  }

  const itemKey = item.id || generateItemKey({ ...item, size, color, options });

  // If price is missing but size/color has price, recover it
  if (!newPrice) {
    if (sizeOpt && size && sizeOpt.prices && sizeOpt.prices[size] && !isAgeOrMeasurement(size)) {
      newPrice = sizeOpt.prices[size];
    } else if (colorOpt && color && colorOpt.prices && colorOpt.prices[color] && !isAgeOrMeasurement(color)) {
      newPrice = colorOpt.prices[color];
    }
  }

  let currency = item.currency ?? '';
  const itemUrl = item.url ? String(item.url) : '';
  const isShein = Boolean(
    (item?.store && String(item.store).toLowerCase().includes('shein')) ||
    (itemUrl && itemUrl.includes('shein.com')) ||
    (item?.marketplace && String(item.marketplace).toLowerCase().includes('shein')),
  );

  const isSheinArabic = isShein && (
    itemUrl.includes('/ar-en/') ||
    itemUrl.includes('/ar/') ||
    itemUrl.includes('/sa/') ||
    itemUrl.includes('shein.sa')
  );

  const hasSarPriceSymbol =
    String(newPrice).includes('⃁') ||
    String(newPrice).includes('\u20C1') ||
    String(newPrice).includes('ر.س') ||
    String(newPrice).includes('﷼') ||
    String(newPrice).includes('\uFDFC') ||
    /\b(?:SAR|SR|RIYAL)\b/i.test(String(newPrice));

  const hasExplicitAed =
    currency === 'AED' ||
    item?.currency === 'AED' ||
    String(newPrice).includes('د.إ') ||
    String(newPrice).includes('د.ا') ||
    String(newPrice).includes('درهم') ||
    String(newPrice).includes('\u20C3') ||
    /\bAED\b/i.test(String(newPrice)) ||
    /\bAED\b/i.test(String(item?.price));

  const hasExplicitSar =
    currency === 'SAR' ||
    item?.currency === 'SAR' ||
    hasSarPriceSymbol ||
    /\b(?:SAR|SR)\b/i.test(String(item?.price));

  const isUsd =
    !hasExplicitAed &&
    !hasExplicitSar &&
    (
      currency === '$' ||
      currency === 'USD' ||
      item?.currency === '$' ||
      item?.currency === 'USD' ||
      String(newPrice).includes('$') ||
      /\bUSD\b/i.test(String(newPrice))
    );

  const isAed = !isUsd && hasExplicitAed;

  const isSar =
    !isUsd && !isAed && (
      hasExplicitSar ||
      isSheinArabic ||
      itemUrl.includes('amazon.sa') ||
      itemUrl.includes('shein.sa')
    );

  if (isUsd) {
    currency = '$';
    const rawNum = parsePrice(newPrice);
    if (rawNum && rawNum > 0) {
      newPrice = String(newPrice).includes('$') ? '$' + rawNum.toFixed(2) : rawNum.toFixed(2);
    }
  } else if (isAed) {
    currency = 'AED';
    const rawNum = parsePrice(newPrice);
    if (rawNum && rawNum > 0) {
      newPrice = rawNum.toFixed(2);
    }
  } else if (isSar) {
    currency = 'SAR';
    const rawNum = parsePrice(newPrice);
    if (rawNum && rawNum > 0) {
      newPrice = rawNum.toFixed(2);
    }
  } else if (!currency || currency === 'TL') {
    if (itemUrl.includes('amazon.ae') || itemUrl.includes('noon.com') || itemUrl.includes('shein.ae')) {
      currency = 'AED';
    } else if (itemUrl.includes('amazon.sa') || itemUrl.includes('shein.sa') || isSheinArabic) {
      currency = 'SAR';
    } else if (itemUrl.includes('amazon.com') || isShein) {
      currency = 'USD';
    }
  }

  return {
    ...item,
    id: itemKey,
    title: cleanTitle,
    checked: Object.prototype.hasOwnProperty.call(item, 'checked')
      ? item.checked
      : true,
    size: size,
    hasSize: item.hasSize ?? (sizes.length > 0 || !!size),
    sizes: sizes,
    color: color,
    hasColor: item.hasColor ?? (colors.length > 0 || !!color),
    colors: colors,
    options: options,
    store: item.store ?? item.storeName ?? '',
    desc: item.desc ?? item.description ?? '',
    description: item.description ?? item.desc ?? '',
    custom_size: item.custom_size ?? item.customSize ?? '',
    price: newPrice,
    currency: currency,
  };
};

export const isCartItemComplete = item => {
  if (!item) return false;
  // A valid product item must have an image and title
  if (!item.image || !item.title) return false;
  const lowerTitle = String(item.title).trim().toLowerCase();
  if (lowerTitle === 'product' || lowerTitle === 'trendyol tr' || lowerTitle.includes('fashion, electronics')) {
    return false;
  }

  // If user provided a custom description, it satisfies missing details
  if (item.desc && String(item.desc).trim()) return true;

  // Check Size requirement if size choices exist
  if (item.hasSize && Array.isArray(item.sizes) && item.sizes.length > 1 && !item.size) {
    return false;
  }

  // Check Color requirement if color choices exist
  if (item.hasColor && Array.isArray(item.colors) && item.colors.length > 1 && !item.color) {
    return false;
  }

  // Check generic options (e.g. Weight/Volume)
  if (Array.isArray(item.options)) {
    for (const opt of item.options) {
      if (opt && Array.isArray(opt.values) && opt.values.length > 1 && (!opt.selected || !String(opt.selected).trim())) {
        return false;
      }
    }
  }

  return true;
};

const matchesItem = (item, idOrUrl) => {
  if (!item || !idOrUrl) {
    return false;
  }
  return item.id === idOrUrl || item.url === idOrUrl;
};

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: item =>
        set(state => {
          const currentItems = state.items || [];
          const normalizedItem = normalizeCartItem(item);
          if (!normalizedItem) {
            return { items: currentItems };
          }

          console.log('Adding item:', normalizedItem);
          const existingIndex = currentItems.findIndex(
            i => (i.id || generateItemKey(i)) === normalizedItem.id,
          );

          if (existingIndex > -1) {
            const nextItems = [...currentItems];
            const existingItem = nextItems[existingIndex];
            nextItems[existingIndex] = {
              ...existingItem,
              count: (existingItem.count || 1) + 1,
              image: normalizedItem.image || existingItem.image,
              price: normalizedItem.price || existingItem.price,
              title: normalizedItem.title || existingItem.title,
              currency: normalizedItem.currency || existingItem.currency,
              store: normalizedItem.store || existingItem.store,
              size: normalizedItem.size || existingItem.size,
              hasSize: normalizedItem.hasSize ?? existingItem.hasSize,
              sizes: normalizedItem.sizes?.length ? normalizedItem.sizes : existingItem.sizes,
              color: normalizedItem.color || existingItem.color,
              hasColor: normalizedItem.hasColor ?? existingItem.hasColor,
              colors: normalizedItem.colors?.length ? normalizedItem.colors : existingItem.colors,
              options: normalizedItem.options?.length ? normalizedItem.options : existingItem.options,
            };
            return { items: nextItems };
          }

          return { items: [{ ...normalizedItem, count: 1 }, ...currentItems] };
        }),
      removeItem: idOrUrl =>
        set(state => ({
          items: state.items.filter(i => !matchesItem(i, idOrUrl)),
        })),
      increaseCount: idOrUrl =>
        set(state => ({
          items: state.items.map(i =>
            matchesItem(i, idOrUrl) ? { ...i, count: i.count + 1 } : i,
          ),
        })),
      decreaseCount: idOrUrl =>
        set(state => ({
          items: state.items
            .map(i =>
              matchesItem(i, idOrUrl) && i.count > 1 ? { ...i, count: i.count - 1 } : i,
            )
            .filter(i => i.count > 0),
        })),
      updateItem: (idOrUrl, itemData) =>
        set(state => ({
          items: state.items.map(i =>
            matchesItem(i, idOrUrl) ? normalizeCartItem({ ...i, ...itemData }) : i,
          ),
        })),
      updateOption: (idOrUrl, optionName, selectedValue) =>
        set(state => ({
          items: state.items.map(i => {
            if (!matchesItem(i, idOrUrl)) {
              return i;
            }
            const currentOptions = Array.isArray(i.options) ? i.options : [];
            const targetOpt = currentOptions.find(
              opt => opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase(),
            );
            const updatedOptions = currentOptions.map(opt =>
              opt && opt.name && opt.name.toLowerCase() === optionName.toLowerCase()
                ? { ...opt, selected: selectedValue }
                : opt,
            );
            const isSize =
              optionName.toLowerCase().includes('size') ||
              optionName.toLowerCase().includes('beden');
            const isColor =
              optionName.toLowerCase().includes('color') ||
              optionName.toLowerCase().includes('renk');

            let newPrice = i.price;
            if (targetOpt && targetOpt.prices && targetOpt.prices[selectedValue] && !isAgeOrMeasurement(selectedValue)) {
              newPrice = targetOpt.prices[selectedValue];
            }

            const updatedItem = {
              ...i,
              price: newPrice,
              options: updatedOptions,
              ...(isSize ? { size: selectedValue } : {}),
              ...(isColor ? { color: selectedValue } : {}),
            };
            return normalizeCartItem(updatedItem);
          }),
        })),
      updateField: (idOrUrl, field, value) =>
        set(state => ({
          items: state.items.map(i => {
            if (!matchesItem(i, idOrUrl)) {
              return i;
            }
            const updated = {
              ...i,
              [field]: value,
              ...(field === 'desc' ? { description: value, desc: value } : {}),
              ...(field === 'description' ? { desc: value, description: value } : {}),
            };
            if (field === 'size' || field === 'color') {
              return normalizeCartItem(updated);
            }
            return updated;
          }),
        })),
      checkItem: item => {
        const targetId = item?.id || item?.url;
        console.log('Checking item:', targetId);
        set(state => ({
          items: state.items.map(i =>
            matchesItem(i, targetId) ? { ...i, checked: !i.checked } : i,
          ),
        }));
      },
      updateAll: items =>
        set(() => ({
          items: Array.isArray(items) ? items.map(normalizeCartItem) : [],
        })),

      clearCart: () => set({ items: [] }),
      dumpItems: () => console.log('items', get().items),

      translateActive: false,
      setTranslateActive: translateActive => set({ translateActive }),
    }),
    {
      name: 'cart-storage', // Unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // console.log('Rehydrating state:', state);
        console.log('Dumping rehydrated items');
        console.log(state.items);
      },
    },
  ),
);

export { useCartStore, devCart };
