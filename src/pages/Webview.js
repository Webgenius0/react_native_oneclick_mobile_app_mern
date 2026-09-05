import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import Clipboard from '@react-native-clipboard/clipboard';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import GlobalStyle from '../assets/GlobalStyle';
import Colors from '../assets/Colors';
import { useCartStore } from '../store/useCartStore';
import { delay } from '../helpers/common';
import AddToCart from '../components/webview/AddToCart';
import { useScriptServiceStore } from '../store/useScriptServiceStore';
import { useWebviewStore } from '../store/useWebviewStore';
import { userAgent } from '../helpers/webview';
import { injectedJavascript } from '../helpers/webview1';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

const SCRIPT_STATUS_TITLES = {
  idle: 'Script: Idle',
  waiting: 'Script: Waiting',
  pending: 'Script: Pending',
  injecting: 'Script: Injecting',
  injected: 'Script: Injected',
  error: 'Script: Error',
};

const ROUTE_CHANGE_MESSAGE_TYPE = '__rn_route_change__';
const INJECT_STATUS_MESSAGE_TYPE = '__rn_inject_status__';
const DEFAULT_INJECT_DELAYS = [140, 700, 1800];
const SPA_INJECT_DELAYS = [180, 900, 2200];
const SHEIN_INJECT_DELAYS = [2500, 5000, 9000, 14000, 22000, 32000, 45000];
const TRENDYOL_COOKIE_DOMAIN = '.trendyol.com';
const TRENDYOL_COOKIE_PARAM_ALIASES = {
  channelid: 'channelId',
  countrycode: 'countryCode',
  culture: 'culture',
  currency: 'currency',
  language: 'language',
  storefrontid: 'storefrontId',
};
const COOKIE_PARAM_NAMES = ['cookie', 'cookies'];
const COOKIE_PARAM_PREFIX = 'cookie_';
const COOKIE_ATTRIBUTE_NAMES = [
  'domain',
  'expires',
  'httponly',
  'max-age',
  'path',
  'samesite',
  'secure',
];
const SAFE_COOKIE_NAME_REGEX = /^[A-Za-z0-9_.-]+$/;
const BLANK_SOURCE_URL = 'about:blank';
const BLANK_WEBVIEW_SOURCE = {
  html: '',
  baseUrl: BLANK_SOURCE_URL,
};

const decodeQueryValue = value => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch (error) {
    return String(value || '');
  }
};

const getUrlHost = url => {
  const match = String(url || '').match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i);
  return match ? match[1].toLowerCase() : '';
};

const isTrendyolUrl = url => {
  const host = getUrlHost(url);
  return host === 'trendyol.com' || host.endsWith('.trendyol.com');
};

const isSheinUrl = url => {
  const host = getUrlHost(url);
  return host === 'shein.com' || host.endsWith('.shein.com');
};

const isProductUrl = url => {
  if (!url || url === BLANK_SOURCE_URL) {
    return false;
  }
  const lowerUrl = String(url).toLowerCase();

  const patterns = [
    /-p-\d+/i,
    /-pm-\d+/i,
    /\/dp\/[a-z0-9]+/i,
    /\/gp\/product\/[a-z0-9]+/i,
    /\/product\/[a-z0-9_-]+/i,
    /\/products\/[a-z0-9_-]+/i,
    /\/item\/[a-z0-9_-]+/i,
    /\/items\/[a-z0-9_-]+/i,
    /\/itm\/[a-z0-9_-]+/i,
    /\/goods\/[a-z0-9_-]+/i,
    /\/pd\/[a-z0-9_-]+/i,
    /[?&](product_id|goods_id|item_id|pid)=/i,
  ];

  return patterns.some(pattern => pattern.test(lowerUrl));
};

const shouldProbeBeforeInject = url =>
  Platform.OS === 'android' && isSheinUrl(url);

const buildInjectKey = (url, script) => `${String(url || '')}\n${String(script || '').length}`;

const buildSheinReadinessProbe = (targetUrl, attempt, total) => {
  const readyMessage = JSON.stringify({
    type: INJECT_STATUS_MESSAGE_TYPE,
    data: {
      phase: 'ready',
      url: targetUrl,
      attempt,
      total,
    },
  });

  const deferMessage = JSON.stringify({
    type: INJECT_STATUS_MESSAGE_TYPE,
    data: {
      phase: 'defer',
      url: targetUrl,
      attempt,
      total,
    },
  });

  return `
    ;(function() {
      var postStatus = function(message) {
        try {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(message);
          }
        } catch (_error) {}
      };

      try {
        var href = String(window.location.href || '').toLowerCase();
        var body = document.body;
        var text = body && body.innerText ? body.innerText.replace(/\\s+/g, ' ').trim() : '';
        var productLink = document.querySelector('a[href*="-p-"], a[href*="/product/"], a[href*="/item/"]');
        var productNode = document.querySelector('[data-goods-id], [data-product-id], [data-spu], [goods-id], [data-sku]');
        var productImage = document.querySelector('img[src*="ltwebstatic.com"], img[data-src*="ltwebstatic.com"], source[srcset*="ltwebstatic.com"]');
        var productPage = href.indexOf('-p-') > -1;
        var productPageReady = productPage && (text.length > 350 || !!document.querySelector('meta[property="og:title"]') || !!productImage);
        var listPageReady = !!productLink || !!productNode || (!!productImage && text.length > 500);
        var isReady = document.readyState === 'complete' && (productPageReady || listPageReady);

        postStatus(isReady ? ${JSON.stringify(readyMessage)} : ${JSON.stringify(
    deferMessage,
  )});
      } catch (_error) {
        postStatus(${JSON.stringify(deferMessage)});
      }

      true;
    })();
  `;
};

const getUrlQueryPairs = url => {
  const queryStart = String(url || '').indexOf('?');

  if (queryStart === -1) {
    return [];
  }

  const hashStart = String(url).indexOf('#', queryStart);
  const query = String(url).slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);

  if (!query) {
    return [];
  }

  return query.split('&').reduce((pairs, part) => {
    if (!part) {
      return pairs;
    }

    const separatorIndex = part.indexOf('=');
    const rawName = separatorIndex === -1 ? part : part.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : part.slice(separatorIndex + 1);

    pairs.push({
      name: decodeQueryValue(rawName),
      value: decodeQueryValue(rawValue),
    });

    return pairs;
  }, []);
};

const appendCookieEntry = (entries, name, value) => {
  const nextName = String(name || '').trim();
  const nextValue = String(value || '').trim();
  const normalizedName = nextName.toLowerCase();

  if (!nextName || !nextValue || COOKIE_ATTRIBUTE_NAMES.includes(normalizedName) || !SAFE_COOKIE_NAME_REGEX.test(nextName)) {
    return;
  }

  entries.set(nextName, nextValue);
};

const appendCookieParamValue = (entries, value) => {
  const nextValue = String(value || '').trim();

  if (!nextValue) {
    return;
  }

  if (nextValue.startsWith('{')) {
    try {
      const parsedValue = JSON.parse(nextValue);

      if (
        parsedValue &&
        typeof parsedValue === 'object' &&
        !Array.isArray(parsedValue)
      ) {
        Object.entries(parsedValue).forEach(([name, cookieValue]) => {
          appendCookieEntry(entries, name, cookieValue);
        });
        return;
      }
    } catch (error) { }
  }

  nextValue.split(/[;,]/).forEach(cookiePart => {
    const separatorIndex = cookiePart.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    appendCookieEntry(
      entries,
      cookiePart.slice(0, separatorIndex),
      cookiePart.slice(separatorIndex + 1),
    );
  });
};

const getTrendyolCookieEntries = url => {
  if (!isTrendyolUrl(url)) {
    return [];
  }

  const entries = new Map();

  getUrlQueryPairs(url).forEach(({ name, value }) => {
    const normalizedName = String(name || '').toLowerCase();
    const aliasName = TRENDYOL_COOKIE_PARAM_ALIASES[normalizedName];

    if (aliasName) {
      appendCookieEntry(entries, aliasName, value);
      return;
    }

    if (normalizedName.startsWith(COOKIE_PARAM_PREFIX)) {
      appendCookieEntry(entries, name.slice(COOKIE_PARAM_PREFIX.length), value);
      return;
    }

    if (COOKIE_PARAM_NAMES.includes(normalizedName)) {
      appendCookieParamValue(entries, value);
    }
  });

  return Array.from(entries, ([name, value]) => ({ name, value }));
};

const buildCookieValue = ({ name, value }) =>
  `${name}=${encodeURIComponent(value)}`;

const buildTrendyolCookieScript = url => {
  const cookies = getTrendyolCookieEntries(url);

  if (!cookies.length) {
    return '';
  }

  const cookieStatements = cookies
    .map(cookie =>
      JSON.stringify(
        `${buildCookieValue(cookie)}; path=/; domain=${TRENDYOL_COOKIE_DOMAIN}`,
      ),
    )
    .map(cookie => `document.cookie = ${cookie};`)
    .join('\n');

  return `
    ;(function() {
      try {
        ${cookieStatements}
      } catch (_error) {}
      true;
    })();
  `;
};

const TRENDYOL_COOKIE_SETUP_BRIDGE = `
  (function() {
    var aliases = ${JSON.stringify(TRENDYOL_COOKIE_PARAM_ALIASES)};
    var cookieParamNames = ${JSON.stringify(COOKIE_PARAM_NAMES)};
    var cookiePrefix = '${COOKIE_PARAM_PREFIX}';
    var cookieAttributeNames = ${JSON.stringify(COOKIE_ATTRIBUTE_NAMES)};
    var cookieDomain = '${TRENDYOL_COOKIE_DOMAIN}';
    var safeCookieNameRegex = ${SAFE_COOKIE_NAME_REGEX.toString()};

    var decodeValue = function(value) {
      try {
        return decodeURIComponent(String(value || '').replace(/\\+/g, ' '));
      } catch (error) {
        return String(value || '');
      }
    };

    var appendCookie = function(cookies, name, value) {
      var nextName = String(name || '').trim();
      var nextValue = String(value || '').trim();
      var normalizedName = nextName.toLowerCase();

      if (
        !nextName ||
        !nextValue ||
        cookieAttributeNames.indexOf(normalizedName) > -1 ||
        !safeCookieNameRegex.test(nextName)
      ) {
        return;
      }

      cookies[nextName] = nextValue;
    };

    var appendCookieParamValue = function(cookies, value) {
      var nextValue = String(value || '').trim();

      if (!nextValue) {
        return;
      }

      if (nextValue.charAt(0) === '{') {
        try {
          var parsedValue = JSON.parse(nextValue);
          if (
            parsedValue &&
            typeof parsedValue === 'object' &&
            !Array.isArray(parsedValue)
          ) {
            Object.keys(parsedValue).forEach(function(name) {
              appendCookie(cookies, name, parsedValue[name]);
            });
            return;
          }
        } catch (error) {}
      }

      nextValue.split(/[;,]/).forEach(function(cookiePart) {
        var separatorIndex = cookiePart.indexOf('=');

        if (separatorIndex === -1) {
          return;
        }

        appendCookie(
          cookies,
          cookiePart.slice(0, separatorIndex),
          cookiePart.slice(separatorIndex + 1)
        );
      });
    };

    try {
      var host = String(window.location.hostname || '').toLowerCase();

      if (host !== 'trendyol.com' && !host.endsWith('.trendyol.com')) {
        true;
        return;
      }

      var cookies = {};
      var query = String(window.location.search || '').replace(/^\\?/, '');

      if (!query) {
        true;
        return;
      }

      query.split('&').forEach(function(part) {
        if (!part) {
          return;
        }

        var separatorIndex = part.indexOf('=');
        var name = decodeValue(separatorIndex === -1 ? part : part.slice(0, separatorIndex));
        var value = decodeValue(separatorIndex === -1 ? '' : part.slice(separatorIndex + 1));
        var normalizedName = String(name || '').toLowerCase();
        var aliasName = aliases[normalizedName];

        if (aliasName) {
          appendCookie(cookies, aliasName, value);
          return;
        }

        if (normalizedName.indexOf(cookiePrefix) === 0) {
          appendCookie(cookies, name.slice(cookiePrefix.length), value);
          return;
        }

        if (cookieParamNames.indexOf(normalizedName) > -1) {
          appendCookieParamValue(cookies, value);
        }
      });

      Object.keys(cookies).forEach(function(name) {
        document.cookie = name + '=' + encodeURIComponent(cookies[name]) + '; path=/; domain=' + cookieDomain;
      });
    } catch (error) {}

    true;
  })();
`;

const ROUTE_CHANGE_BRIDGE = `
  (function() {
    if (window.__RN_ROUTE_BRIDGE_INSTALLED__) {
      true;
      return;
    }

    window.__RN_ROUTE_BRIDGE_INSTALLED__ = true;

    var postRouteChange = function(kind) {
      if (!window.ReactNativeWebView || typeof window.ReactNativeWebView.postMessage !== 'function') {
        return;
      }

      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: '${ROUTE_CHANGE_MESSAGE_TYPE}',
          data: {
            kind: kind || 'unknown',
            url: window.location.href,
          },
        }));
      } catch (error) {}
    };

    var wrapHistoryMethod = function(methodName) {
      if (!window.history || typeof window.history[methodName] !== 'function') {
        return;
      }

      var originalMethod = window.history[methodName];
      if (originalMethod.__RN_ROUTE_BRIDGE_WRAPPED__) {
        return;
      }

      var wrappedMethod = function() {
        var result = originalMethod.apply(window.history, arguments);
        setTimeout(function() {
          postRouteChange(methodName);
        }, 0);
        return result;
      };

      wrappedMethod.__RN_ROUTE_BRIDGE_WRAPPED__ = true;
      window.history[methodName] = wrappedMethod;
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');

    window.addEventListener('popstate', function() {
      postRouteChange('popstate');
    });

    window.addEventListener('hashchange', function() {
      postRouteChange('hashchange');
    });

    true;
  })();
`;

export default function Webview({ route, navigation }) {
  const { addItem } = useCartStore();
  const injectScript = useScriptServiceStore(state => state.injectScript);
  const setTranslateUrl = useWebviewStore(state => state.setTranslateUrl);

  const sourceUrl = useMemo(() => {
    const routeUrl = route?.params?.url || '';
    if (routeUrl) {
      return routeUrl;
    }

    if (__DEV__) {
      // return 'https://www.trendyol.com/en/men-shirts-x-g2-c75';
      // return 'https://m.shein.com/ar-en/DAZY-3-Pieces-Loose-Casual-Vacation-Style-Hollow-Out-Lace-Trim-Plaid-Camisole-Straight-Leg-Pants-And-Sheer-Cover-Up-T-Shirt-Outfit-For-Women-Fall-Clothes-Lounge-Sets-For-Women-p-100188201.html?attr_ids=&detailBusinessFrom=0-1_100188201%257C0-2&imgRatio=3-4&isAppointMall=&mallCode=1&pageListType=4&showFeedbackRec=1&src_identifier=on%253DCATEGORY_RECOMMEND_COMPONENT%2560cn%253Dsbc%2560hz%253D-%2560jc%253Dreal_2030%2560ps%253D3_1_1&src_module=all&src_tab_page_id=page_home1777062677652';
      // return 'https://www.trendyol.com/en/';
      return 'https://www.amazon.ae/dp/B0FQFHZF6L?_encoding=UTF8&ref_=cct_cg_atfwire_3a1&pf_rd_p=4daee1f2-9395-437b-8065-2dd6f83ab3ba&pf_rd_r=1XK14FMV7HW3Q96FK8SK';
      return 'https://www.amazon.ae/SKY-TOUCH-Portable-Shattaf-Bidet-Bottle/dp/B0C4TNZLSY/ref=mp_s_a_1_1_sspa?_encoding=UTF8&dib=eyJ2IjoiMSJ9.p0ov1f7M3pnaG6oDRM0QzlZVQalfzoqmcPcod2tkpzvKNrpqoR8ROjaCK7YzYfVm_c-QQb_rhqpT2Co2d2I2n5Gfhk1k-gGcwG7Hr2UxqrV_S78Lw9T6iC7iR2p9X7eshlP9tTGm4lTbdPlwpo6O84Pv0LrMirri2rRbFdahwEAZU1CWD5EnaT-Yhj_xqKRmE6ZkG87HYCNTz9YX2a75MQ.xwjagqifuNTU-OV7DbIj7N2F-NVEGp8-wED5GzjxKq8&dib_tag=se&qid=1777591427&refinements=p_36%3A-6900%2Cp_n_prime_domestic%3A20642115031%2Cp_72%3A12407972031&rnid=12407971031&s=health&sr=1-1-spons&aref=9mUJ1O0z3K&sp_csd=d2lkZ2V0TmFtZT1zcF9waG9uZV9icm93c2VfYXRm&psc=1';
      return 'https://www.amazon.ae/';
      // return 'https://www.amazon.ae/DJI-Lossless-Transmitter-Official-Warranty/dp/B0FKT9K6CB?_encoding=UTF8&content-id=amzn1.sym.fc30acf5-d509-4cd5-a780-14e9eeb0536e&dib=eyJ2IjoiMSJ9.hXptKqxyQPkfqldB0z_WEMqG3EzcTnGjJZB19V2yrwGHN8coLynDsd615wIYcefT3rTZuX3QXErf2yY04Lkd6lhJnMWjngAT20YZGrIBaqsmOowyu8_n_o17QsJv7tHOOg9MS6MkQ5Hs1GLIF4QKWlGxAVizeDQqaCUErQ8d96dSPW960C5ChwLYyzCALPMmBNG7f_kYdBpokq9rNLIwx781l_hs5snoLVNUowqjJSxNhpxB9Wy5d-eavMHqDKekx7pDreFD2XfUeNCyqT3QaJwH4c3rCP1PVSjXPShJiDI.2rT-_t05CpyWerbOFTmlXiksTXVPmwlUXvAe_Fx-N8w&dib_tag=se&pd_rd_r=f69bb5de-b3df-45a4-ab02-0a08be479045&pd_rd_w=H81LQ&pd_rd_wg=id50a&qid=1777590917&s=electronics&sr=1-1&th=1';
    }

    return BLANK_SOURCE_URL;
  }, [route?.params?.url]);

  const source = useMemo(() => {
    if (!sourceUrl || sourceUrl === BLANK_SOURCE_URL) {
      return BLANK_WEBVIEW_SOURCE;
    }

    const cookies = getTrendyolCookieEntries(sourceUrl);

    if (!cookies.length) {
      return { uri: sourceUrl };
    }

    return {
      uri: sourceUrl,
      headers: {
        Cookie: cookies.map(buildCookieValue).join('; '),
      },
    };
  }, [sourceUrl]);

  const useSheinCompatibilityMode = useMemo(
    () => shouldProbeBeforeInject(sourceUrl),
    [sourceUrl],
  );

  const webViewUserAgent = useMemo(
    () => (useSheinCompatibilityMode ? '' : userAgent()),
    [useSheinCompatibilityMode],
  );

  const injectedJavaScriptBeforeContentLoaded = useMemo(
    () =>
      useSheinCompatibilityMode
        ? TRENDYOL_COOKIE_SETUP_BRIDGE
        : `${TRENDYOL_COOKIE_SETUP_BRIDGE}\n${ROUTE_CHANGE_BRIDGE}`,
    [useSheinCompatibilityMode],
  );
  const injectedJavaScript = useMemo(
    () =>
      useSheinCompatibilityMode
        ? 'true;'
        : `
          ${ROUTE_CHANGE_BRIDGE}
          ;(function() {
            try {
              if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: '${ROUTE_CHANGE_MESSAGE_TYPE}',
                  data: {
                    kind: 'injectedJavaScript',
                    url: window.location.href,
                  },
                }));
              }
            } catch (_error) {}
            true;
          })();
        `,
    [useSheinCompatibilityMode],
  );
  const [injectStatus, setInjectStatus] = useState(
    injectScript ? 'pending' : 'waiting',
  );

  const webViewRef = useRef(null);
  const injectTimersRef = useRef([]);
  const injectWaveIdRef = useRef(0);
  const currentUrlRef = useRef(sourceUrl);
  const lastInjectedKeyRef = useRef('');
  const canGoBackRef = useRef(false);
  const loadingRef = useRef(true);
  const titleRef = useRef('');
  const imageRef = useRef('');
  const priceRef = useRef('');
  const currencyRef = useRef('');

  const [isProductPage, setIsProductPage] = useState(() =>
    isProductUrl(sourceUrl),
  );

  const updateProductPageStatus = useCallback((targetUrl, explicitStatus) => {
    if (typeof explicitStatus === 'boolean') {
      setIsProductPage(explicitStatus);
      return;
    }
    const isProd = isProductUrl(targetUrl || currentUrlRef.current);
    setIsProductPage(isProd);
  }, []);

  const setStatus = useCallback(nextStatus => {
    setInjectStatus(prevStatus =>
      prevStatus === nextStatus ? prevStatus : nextStatus,
    );
  }, []);

  const clearInjectTimers = useCallback(() => {
    injectTimersRef.current.forEach(timerId => clearTimeout(timerId));
    injectTimersRef.current = [];
  }, []);

  const injectTrendyolCookies = useCallback(targetUrl => {
    const cookieScript = buildTrendyolCookieScript(targetUrl);

    if (!cookieScript || !webViewRef.current) {
      return;
    }

    webViewRef.current.injectJavaScript(cookieScript);
  }, []);

  const buildInjectCommand = useCallback(
    (targetUrl, attempt, total) => {
      const startMessage = JSON.stringify({
        type: INJECT_STATUS_MESSAGE_TYPE,
        data: {
          phase: 'start',
          url: targetUrl,
          attempt,
          total,
        },
      });

      const doneMessage = JSON.stringify({
        type: INJECT_STATUS_MESSAGE_TYPE,
        data: {
          phase: 'done',
          url: targetUrl,
          attempt,
          total,
        },
      });

      const localScript = injectedJavascript({
        page_url: targetUrl,
        getMetaTagImage: true,
        getMetaTitle: true,
        getMetaPrice: true,
      });

      return `
        ;(function() {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(${JSON.stringify(
        startMessage,
      )});
            }
          } catch (_error) {}
        })();
        ;${injectScript || ''};
        ;${localScript || ''};
        ;(function() {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(${JSON.stringify(
        doneMessage,
      )});
            }
          } catch (_error) {}
          true;
        })();
      `;
    },
    [injectScript],
  );

  const injectNow = useCallback(
    (targetUrl, options = {}) => {
      const { attempt = 1, total = 1, force = false } = options;
      const nextUrl = targetUrl || currentUrlRef.current;

      if (!nextUrl || nextUrl === BLANK_SOURCE_URL) {
        setStatus('idle');
        return;
      }

      currentUrlRef.current = nextUrl;
      setTranslateUrl(nextUrl);

      if (!injectScript) {
        setStatus('waiting');
        return;
      }

      if (!webViewRef.current) {
        setStatus('pending');
        return;
      }

      const injectKey = buildInjectKey(nextUrl, injectScript);

      if (lastInjectedKeyRef.current === injectKey) {
        setStatus('injected');
        return;
      }

      try {
        if (shouldProbeBeforeInject(nextUrl) && !force) {
          setStatus('pending');
          webViewRef.current.injectJavaScript(
            buildSheinReadinessProbe(nextUrl, attempt, total),
          );
          return;
        }

        setStatus('injecting');
        webViewRef.current.injectJavaScript(
          buildInjectCommand(nextUrl, attempt, total),
        );
      } catch (error) {
        setStatus('error');
      }
    },
    [buildInjectCommand, injectScript, setStatus, setTranslateUrl],
  );

  const scheduleInject = useCallback(
    (targetUrl, options = {}) => {
      const nextUrl = targetUrl || currentUrlRef.current;
      const delays = shouldProbeBeforeInject(nextUrl)
        ? SHEIN_INJECT_DELAYS
        : options.delays || DEFAULT_INJECT_DELAYS;

      if (!nextUrl || nextUrl === BLANK_SOURCE_URL) {
        setStatus('idle');
        return;
      }

      currentUrlRef.current = nextUrl;
      setTranslateUrl(nextUrl);

      clearInjectTimers();
      injectWaveIdRef.current += 1;
      const waveId = injectWaveIdRef.current;

      setStatus(injectScript ? 'pending' : 'waiting');
      delays.forEach((delayMs, index) => {
        const timerId = setTimeout(() => {
          if (injectWaveIdRef.current !== waveId) {
            return;
          }

          injectNow(nextUrl, {
            attempt: index + 1,
            total: delays.length,
          });
        }, delayMs);

        injectTimersRef.current.push(timerId);
      });
    },
    [clearInjectTimers, injectNow, injectScript, setStatus, setTranslateUrl],
  );

  const copyCurrentUrl = useCallback(() => {
    const nextUrl = currentUrlRef.current || sourceUrl;
    if (!nextUrl) {
      return;
    }

    Clipboard.setString(nextUrl);
    Toast.show({
      type: 'success',
      text1: 'Link kopyalandi',
      position: 'bottom',
    });
  }, [sourceUrl]);

  const handleHeaderBack = useCallback(() => {
    if (canGoBackRef.current && webViewRef.current) {
      webViewRef.current.goBack();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleHardwareBack = useCallback(() => {
    if (canGoBackRef.current && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }

    return false;
  }, [navigation]);

  const renderHeaderLeft = useCallback(
    props => <HeaderBackButton {...props} onPress={handleHeaderBack} />,
    [handleHeaderBack],
  );

  const renderHeaderRight = useCallback(
    () => (
      <TouchableOpacity onPress={copyCurrentUrl} style={styles.headerButton}>
        <Text style={styles.headerButtonText}>Linki Kopyala</Text>
      </TouchableOpacity>
    ),
    [copyCurrentUrl],
  );

  const addChart = useCallback(async () => {
    addItem({
      title: titleRef.current,
      url: currentUrlRef.current,
      count: 1,
      checked: true,
      image: imageRef.current,
      price: priceRef.current,
      currency: currencyRef.current,
    });

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            if (typeof onUrlChange === 'function') {
              onUrlChange();
            }
          } catch (_e) {}
          true;
        })();
      `);
    }

    await delay(500);
    navigation.navigate('Cart');
  }, [addItem, navigation]);

  const onMessage = useCallback(
    ({ nativeEvent }) => {
      try {
        const message = JSON.parse(nativeEvent.data);

        switch (message?.type) {
          case ROUTE_CHANGE_MESSAGE_TYPE: {
            const nextUrl = message?.data?.url;
            if (!nextUrl) {
              return;
            }

            const wasProduct = isProductUrl(currentUrlRef.current);
            const isNextProduct = isProductUrl(nextUrl);
            currentUrlRef.current = nextUrl;

            if (!isNextProduct) {
              titleRef.current = '';
              imageRef.current = '';
              priceRef.current = '';
              currencyRef.current = '';
            }

            updateProductPageStatus(nextUrl);
            scheduleInject(nextUrl, { delays: SPA_INJECT_DELAYS });
            return;
          }
          case INJECT_STATUS_MESSAGE_TYPE: {
            const phase = message?.data?.phase;
            const messageUrl = message?.data?.url;

            if (phase === 'start') {
              setStatus('injecting');
              return;
            }

            if (phase === 'ready') {
              injectNow(messageUrl, {
                attempt: message?.data?.attempt || 1,
                total: message?.data?.total || 1,
                force: true,
              });
              return;
            }

            if (phase === 'defer') {
              setStatus('pending');
              return;
            }

            if (phase === 'done') {
              lastInjectedKeyRef.current = buildInjectKey(
                messageUrl || currentUrlRef.current,
                injectScript,
              );
              setStatus('injected');
              return;
            }

            return;
          }
          case 'isProductPage':
            updateProductPageStatus(currentUrlRef.current, !!message.data);
            return;
          case 'image':
            if (message.data && typeof message.data === 'string') {
              imageRef.current = message.data.trim();
            }
            return;
          case 'title':
            if (message.data && typeof message.data === 'string') {
              titleRef.current = message.data.trim();
            }
            return;
          case 'price':
            if (message.data && typeof message.data === 'string') {
              priceRef.current = message.data.trim();
            }
            return;
          case 'currency':
            if (message.data && typeof message.data === 'string') {
              currencyRef.current = message.data.trim();
            }
            return;
          case 'redirect':
            if (webViewRef.current && message.data) {
              webViewRef.current.injectJavaScript(
                `window.location.href = '${message.data}';true;`,
              );
            }
            return;
          default:
            return;
        }
      } catch (error) {
        return;
      }
    },
    [injectNow, injectScript, scheduleInject, setStatus, updateProductPageStatus],
  );

  const onLoadStart = useCallback(() => {
    loadingRef.current = true;
    setStatus(injectScript ? 'pending' : 'waiting');
  }, [injectScript, setStatus]);

  const onLoadEnd = useCallback(() => {
    loadingRef.current = false;
    injectTrendyolCookies(currentUrlRef.current);
    scheduleInject(currentUrlRef.current);
  }, [injectTrendyolCookies, scheduleInject]);

  const onNavigationStateChange = useCallback(
    navState => {
      const nextUrl = navState.url || currentUrlRef.current;
      if (nextUrl !== currentUrlRef.current) {
        const isNextProduct = isProductUrl(nextUrl);
        if (!isNextProduct) {
          titleRef.current = '';
          imageRef.current = '';
          priceRef.current = '';
          currencyRef.current = '';
        }
      }
      currentUrlRef.current = nextUrl;
      canGoBackRef.current = !!navState.canGoBack;
      loadingRef.current = !!navState.loading;
      setTranslateUrl(currentUrlRef.current);
      injectTrendyolCookies(currentUrlRef.current);

      updateProductPageStatus(currentUrlRef.current);

      if (!navState.loading) {
        scheduleInject(currentUrlRef.current);
      }
    },
    [injectTrendyolCookies, scheduleInject, setTranslateUrl, updateProductPageStatus],
  );

  const onShouldStartLoadWithRequest = useCallback(request => {
    const nextUrl = request?.url || '';
    if (!nextUrl) return true;

    if (
      nextUrl.includes('whatsapp.com') ||
      nextUrl.includes('wa.me') ||
      nextUrl.startsWith('whatsapp://')
    ) {
      Linking.openURL(nextUrl).catch(error => {
        console.error('WhatsApp linki acilamadi:', error);
      });
      return false;
    }

    if (
      nextUrl.startsWith('intent://') ||
      nextUrl.startsWith('intent:') ||
      (!nextUrl.startsWith('http://') &&
        !nextUrl.startsWith('https://') &&
        !nextUrl.startsWith('about:') &&
        !nextUrl.startsWith('data:'))
    ) {
      if (nextUrl.includes('S.browser_fallback_url=')) {
        try {
          const match = nextUrl.match(/S\.browser_fallback_url=([^;]+)/);
          if (match && match[1]) {
            const fallbackUrl = decodeURIComponent(match[1]);
            if (
              fallbackUrl &&
              (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))
            ) {
              webViewRef.current?.injectJavaScript(
                `window.location.href = "${fallbackUrl}"; true;`,
              );
            }
          }
        } catch (e) {
          console.log('Intent fallback URL parse error:', e?.message || e);
        }
      }
      return false;
    }

    return true;
  }, []);

  const onError = useCallback(syntheticEvent => {
    const { nativeEvent } = syntheticEvent;
    if (
      nativeEvent &&
      nativeEvent.description &&
      nativeEvent.description.includes('ERR_UNKNOWN_URL_SCHEME')
    ) {
      return;
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: __DEV__
        ? SCRIPT_STATUS_TITLES[injectStatus] || SCRIPT_STATUS_TITLES.idle
        : route?.params?.ad || '-',
      headerLeft: renderHeaderLeft,
      headerRight: __DEV__ ? renderHeaderRight : undefined,
    });
  }, [
    injectStatus,
    navigation,
    renderHeaderLeft,
    renderHeaderRight,
    route?.params?.ad,
  ]);

  useEffect(() => {
    currentUrlRef.current = sourceUrl;
    lastInjectedKeyRef.current = '';
    canGoBackRef.current = false;
    loadingRef.current = sourceUrl !== BLANK_SOURCE_URL;
    titleRef.current = '';
    imageRef.current = '';
    priceRef.current = '';
    currencyRef.current = '';
    clearInjectTimers();
    setTranslateUrl(sourceUrl);
    updateProductPageStatus(sourceUrl, '', '');
    setStatus(sourceUrl === BLANK_SOURCE_URL ? 'idle' : 'pending');
  }, [clearInjectTimers, setStatus, setTranslateUrl, sourceUrl, updateProductPageStatus]);

  useEffect(() => {
    if (!injectScript) {
      setStatus('waiting');
      return;
    }

    if (!loadingRef.current) {
      scheduleInject(currentUrlRef.current, {
        delays: [60, 500, 1400],
      });
    } else {
      setStatus('pending');
    }
  }, [injectScript, scheduleInject, setStatus]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack,
    );

    return () => {
      subscription.remove();
    };
  }, [handleHardwareBack]);

  useEffect(() => {
    return () => {
      clearInjectTimers();
    };
  }, [clearInjectTimers]);

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      <View style={styles.container}>
        <WebView
          key={sourceUrl}
          originWhitelist={['*']}
          ref={webViewRef}
          source={source}
          {...(webViewUserAgent ? { userAgent: webViewUserAgent } : {})}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={!useSheinCompatibilityMode}
          cacheMode={useSheinCompatibilityMode ? 'LOAD_NO_CACHE' : 'LOAD_DEFAULT'}
          cookiesEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          mixedContentMode={'compatibility'}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          setSupportMultipleWindows={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          injectedJavaScriptBeforeContentLoaded={
            injectedJavaScriptBeforeContentLoaded
          }
          injectedJavaScript={injectedJavaScript}
          onMessage={onMessage}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        />
        {isProductPage && <AddToCart addChart={addChart} />}
      </View>
    </SafeAreaView>
  );
}
