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

const devFill = false; // Set to false as per your preference

const normalizeCartItem = item => ({
  ...item,
  checked: Object.prototype.hasOwnProperty.call(item, 'checked')
    ? item.checked
    : true,
  size: item.size ?? '',
  desc: item.desc ?? item.description ?? '',
  description: item.description ?? item.desc ?? '',
});

const useCartStore = create(
  persist(
    set => ({
      //items: __DEV__ && devFill ? devCart : [],
      items: [],
      addItem: item =>
        set(state => {
          const currentItems = state.items || [];
          const normalizedItem = normalizeCartItem(item);
          console.log('Adding item:', normalizedItem);
          const existingItem = currentItems.find(
            i => i.url === normalizedItem.url,
          );
          if (existingItem) {
            return {
              items: currentItems.map(i =>
                i.url === normalizedItem.url ? {...i, count: i.count + 1} : i,
              ),
            };
          } else {
            if (currentItems.length === 0) {
              return {items: [{...normalizedItem, count: 1}]};
            } else {
              // add prepend
              return {items: [{...normalizedItem, count: 1}, ...currentItems]};
            }
          }
        }),
      removeItem: url =>
        set(state => ({
          items: state.items.filter(i => i.url !== url),
        })),
      increaseCount: url =>
        set(state => ({
          items: state.items.map(i =>
            i.url === url ? {...i, count: i.count + 1} : i,
          ),
        })),
      decreaseCount: url =>
        set(state => ({
          items: state.items
            .map(i =>
              i.url === url && i.count > 1 ? {...i, count: i.count - 1} : i,
            )
            .filter(i => i.count > 0),
        })),
      updateItem: (url, item) =>
        set(state => ({
          items: state.items.map(i => (i.url === url ? {...i, ...item} : i)),
        })),
      updateField: (url, field, value) =>
        set(state => ({
          items: state.items.map(i =>
            i.url === url
              ? {
                  ...i,
                  [field]: value,
                  ...(field === 'desc' ? {description: value} : {}),
                }
              : i,
          ),
        })),
      checkItem: item => {
        console.log('Checking item:', item.url);
        set(state => ({
          items: state.items.map(i =>
            i.url === item.url ? {...i, checked: !i.checked} : i,
          ),
        }));
      },
      updateAll: items =>
        set(() => ({
          items,
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
