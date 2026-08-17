// make store for webview and store translationStatus and translates
import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, persist} from 'zustand/middleware';


const useWebviewStore = create(
  persist(
    set => ({
      translateActive: true,
      setTranslateActive: translateActive => set({translateActive}),

      translateApiServiceEnabled: null,
      setTranslateApiServiceEnabled: translateApiServiceEnabled => set({translateApiServiceEnabled}),

      translateUrl: '',
      setTranslateUrl: translateUrl => set({translateUrl}),

      translates: {},
      setTranslates: translates => set({translates}),
    }),
    {
      name: 'webview-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('hyrate active', state.translateActive);
      },
    },
  ),
);

export {useWebviewStore};
