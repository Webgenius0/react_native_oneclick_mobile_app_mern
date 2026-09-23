import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';

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

import {generateItemKey} from '../helpers/variantUtils';

export const normalizeCartItem = item => {
  if (!item) {
    return null;
  }

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
    if (size && sizeOpt.prices && sizeOpt.prices[size]) {
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
    if (opt && opt.selected && opt.prices && opt.prices[opt.selected]) {
      newPrice = opt.prices[opt.selected];
    }
  }

  // Keep selected value clean without blindly picking values[0]
  options = options.map(opt => ({
    ...opt,
    selected: opt.selected ? String(opt.selected).trim() : '',
    prices: opt.prices || {},
  }));

  const itemKey = item.id || generateItemKey({ ...item, size, color, options });

  return {
    ...item,
    id: itemKey,
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
    price: newPrice,
    currency: item.currency ?? '',
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
            if (targetOpt && targetOpt.prices && targetOpt.prices[selectedValue]) {
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
              ...(field === 'desc' ? { description: value } : {}),
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

      clearCart: () => set({items: []}),
      dumpItems: () => console.log('items', get().items),

      translateActive: false,
      setTranslateActive: translateActive => set({translateActive}),
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

export {useCartStore, devCart};
