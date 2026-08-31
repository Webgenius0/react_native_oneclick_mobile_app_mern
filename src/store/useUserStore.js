// user info store

import {useContext} from 'react';
import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {persist} from 'zustand/middleware';

const useUserStore = create(
  persist(
    set => ({
      user: null,
      setUser: user => set({user}),
      clearUser: () => set({user: null}),
      teslimatSehirID: null,
      setTeslimatSehirID: teslimatSehirID => set({teslimatSehirID}),
    }),
    {
      name: 'user-storage',
      getStorage: () => AsyncStorage,
    },
  ),
);

export {useUserStore};
