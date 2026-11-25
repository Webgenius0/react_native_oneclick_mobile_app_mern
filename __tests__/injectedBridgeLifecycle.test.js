/* eslint-disable no-new-func */
/**
 * The WebView re-injects the product script several times per page and on
 * every SPA route change. Each injection must replace the previous bridges,
 * not add another set of intervals / observers / listeners on top of them.
 */
import { injectedJavascript } from '../src/helpers/webview1';

const createEnv = href => {
  let nextId = 1;
  const intervals = new Map();
  const timeouts = new Map();
  const listeners = [];
  const observers = new Set();
  const messages = [];

  class FakeMutationObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      observers.add(this);
    }
    disconnect() {
      observers.delete(this);
    }
  }

  const document = {
    title: 'Test product',
    cookie: '',
    readyState: 'complete',
    body: { innerText: '', textContent: '' },
    documentElement: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    getElementsByTagName: () => [],
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn, capture) => {
      const i = listeners.findIndex(
        l => l.type === type && l.fn === fn && l.capture === capture,
      );
      if (i > -1) listeners.splice(i, 1);
    },
  };

  const window = {
    location: { href, hostname: new URL(href).hostname, pathname: new URL(href).pathname },
    ReactNativeWebView: { postMessage: m => messages.push(JSON.parse(m)) },
    MutationObserver: FakeMutationObserver,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', position: 'static' }),
    setInterval: (fn, ms) => {
      const id = nextId++;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: id => intervals.delete(id),
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timeouts.set(id, fn);
      return id;
    },
    clearTimeout: id => timeouts.delete(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: { getItem: () => null },
  };
  window.document = document;

  const inject = script =>
    new Function(
      'window', 'document', 'setInterval', 'clearInterval', 'setTimeout',
      'clearTimeout', 'MutationObserver', 'navigator', script,
    )(
      window, document, window.setInterval, window.clearInterval, window.setTimeout,
      window.clearTimeout, FakeMutationObserver, { userAgent: 'test' },
    );

  // Run every active interval once (one "tick").
  const tick = () => [...intervals.values()].forEach(fn => fn());
  return { window, document, intervals, listeners, observers, messages, inject, tick };
};

const AMAZON_PRODUCT = 'https://www.amazon.ae/Some-Product/dp/B08N5WRWNW';
const CARREFOUR_PRODUCT =
  'https://www.carrefouruae.com/mafuae/en/dairy-eggs/kiri-fresh-cream-cheese/p/12345';

describe('injected bridges: re-injection does not pile up', () => {
  [AMAZON_PRODUCT, CARREFOUR_PRODUCT].forEach(href => {
    const script = injectedJavascript({
      page_url: href,
      getMetaTagImage: true,
      getMetaTitle: true,
      getMetaPrice: true,
    });

    it(`${new URL(href).hostname}: second and third injections replace the first`, () => {
      const env = createEnv(href);
      env.inject(script);
      const first = {
        intervals: env.intervals.size,
        observers: env.observers.size,
        listeners: env.listeners.length,
      };
      expect(first.intervals).toBeGreaterThan(0);
      expect(first.listeners).toBeGreaterThan(0);

      env.inject(script);
      env.inject(script);

      expect(env.intervals.size).toBe(first.intervals);
      expect(env.observers.size).toBe(first.observers);
      expect(env.listeners.length).toBe(first.listeners);
    });

    it(`${new URL(href).hostname}: polling stops instead of running forever`, () => {
      const env = createEnv(href);
      env.inject(script);
      for (let i = 0; i < 60; i++) {
        env.tick();
      }
      expect(env.intervals.size).toBe(0);
    });
  });
});
