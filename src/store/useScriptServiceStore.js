import {create} from 'zustand';

const useScriptServiceStore = create((set) => ({
  scriptService: null,
  setScriptService: (scriptService) => set({scriptService}),

  injectScript: '',
  setInjectScript: (injectScript) => set({injectScript}),
}));


export {useScriptServiceStore};


