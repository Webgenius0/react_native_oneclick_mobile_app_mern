
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

const useGeneralStore = create(
  persist(
    set => ({
      isDark: false,
      setDark: isDark => set({isDark}),
      color: '#000',
      setColor: color => set({color}),
      bgColor: '#FFF',
      setBgColor: bgColor => set({bgColor}),

      teslimatSehirID: null,
      setTeslimatSehirID: teslimatSehirID => set({teslimatSehirID}),
      translateActive: false,
      setTranslateActive: translateActive => set({translateActive}),
    }),
    {
      name: 'general-storage',
    },
  ),
);

export {useGeneralStore};
