import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { getStoreName, isProductUrl } from '../helpers/storeHelper';
import { isPlaceholderValue } from '../helpers/variantUtils';
import { t } from '../translate/i18n';

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
  return (
    host === 'trendyol.com' ||
    host.includes('.trendyol.') ||
    host.startsWith('trendyol.') ||
    host.endsWith('.trendyol.com') ||
    host.indexOf('trendyol.') > -1
  );
};

const isSheinUrl = url => {
  const host = getUrlHost(url);
  return host === 'shein.com' || host.endsWith('.shein.com');
};

const shouldProbeBeforeInject = url =>
  Platform.OS === 'android' && isSheinUrl(url);

const isDifferentProduct = (urlA, urlB) => {
  if (!urlA || !urlB) {
    return true;
  }
  try {
    const cleanA = urlA.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
    const cleanB = urlB.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
    if (cleanA === cleanB) {
      return false;
    }
    // Amazon ASIN match
    const asinA = cleanA.match(/\/dp\/([a-z0-9]+)/i);
    const asinB = cleanB.match(/\/dp\/([a-z0-9]+)/i);
    if (asinA && asinB && asinA[1] === asinB[1]) {
      return false;
    }
    // Trendyol/Shein/Hepsiburada product ID match
    const pIdA = cleanA.match(/-p-(\d+)/i);
    const pIdB = cleanB.match(/-p-(\d+)/i);
    if (pIdA && pIdB && pIdA[1] === pIdB[1]) {
      return false;
    }
    // Amazon gp/product ID match
    const gpA = cleanA.match(/\/gp\/product\/([a-z0-9]+)/i);
    const gpB = cleanB.match(/\/gp\/product\/([a-z0-9]+)/i);
    if (gpA && gpB && gpA[1] === gpB[1]) {
      return false;
    }
  } catch (_e) {}
  return true;
};

const getFallbackTitleFromUrl = (url, fallback) => {
  if (fallback && fallback !== '-' && fallback !== 'OneClick') {
    return fallback;
  }
  if (!url) {
    return '';
  }
  try {
    const parsed = url.split('?')[0].split('#')[0];
    const segments = parsed.split('/').filter(Boolean);
    let asinCandidate = '';
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i] || '';
      const slug = seg.replace(/\.(html?|php|asp)$/i, '').replace(/-p-\d+.*$/i, '');
      if (slug && slug.length > 3 && !/^(dp|gp|product|d|item|items|goods)$/i.test(slug)) {
        if (/^[a-z0-9]{8,12}$/i.test(slug) && i > 0) {
          if (!asinCandidate) asinCandidate = slug;
          continue;
        }
        const decoded = decodeURIComponent(slug).replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim();
        if (decoded.length > 3 && !/^\d+$/.test(decoded)) {
          return decoded;
        }
      }
    }
    if (asinCandidate) {
      return asinCandidate;
    }
  } catch (_e) {}
  return '';
};

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

const getTrendyolCookieDomain = url => {
  const host = getUrlHost(url);
  if (host.endsWith('.ae')) return '.trendyol.ae';
  if (host.endsWith('.sa')) return '.trendyol.sa';
  if (host.endsWith('.de')) return '.trendyol.de';
  if (host.endsWith('.com.tr')) return '.trendyol.com.tr';
  return '.trendyol.com';
};

const buildTrendyolCookieScript = url => {
  const cookies = getTrendyolCookieEntries(url);

  if (!cookies.length) {
    return '';
  }

  const domain = getTrendyolCookieDomain(url);
  const cookieStatements = cookies
    .map(cookie =>
      JSON.stringify(
        `${buildCookieValue(cookie)}; path=/; domain=${domain}`,
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

      if (host.indexOf('trendyol.') === -1) {
        true;
        return;
      }

      var cookieDomain = host.indexOf('.trendyol.') > -1 ? host.slice(host.indexOf('.trendyol.')) : ('.' + host);

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

const TRENDYOL_MOBILE_STYLE_BRIDGE = `
  (function() {
    try {
      var host = String(window.location.hostname || '').toLowerCase();
      if (host.indexOf('trendyol.') === -1) {
        return;
      }
      var STYLE_ID = 'oneclick-trendyol-mobile-fix';
      var css = [
        '.pageLayout .content .productDetailWrapper {',
        '  display: flex !important;',
        '  flex-direction: column !important;',
        '  width: 100% !important;',
        '  max-width: 100% !important;',
        '  box-sizing: border-box !important;',
        '  padding: 0 12px 100px 12px !important;',
        '  margin: 0 !important;',
        '  overflow-x: hidden !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .leftSide {',
        '  width: 100% !important;',
        '  max-width: 100% !important;',
        '  margin: 0 0 12px 0 !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .product-image-gallery-container {',
        '  width: 100% !important;',
        '  max-width: 100% !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .product-image-gallery-viewport {',
        '  width: 100% !important;',
        '  max-width: 100% !important;',
        '  display: flex !important;',
        '  justify-content: center !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .product-image-gallery-viewport img {',
        '  max-width: 100% !important;',
        '  height: auto !important;',
        '  max-height: 380px !important;',
        '  object-fit: contain !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .rightArea,',
        '.pageLayout .content .productDetailWrapper .rightSide,',
        '.pageLayout .content .productDetailWrapper .main {',
        '  width: 100% !important;',
        '  max-width: 100% !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .sectionRowSecond {',
        '  display: flex !important;',
        '  flex-direction: column !important;',
        '  width: 100% !important;',
        '  gap: 12px !important;',
        '}',
        '.pageLayout .content .productDetailWrapper .product-actions-fragment,',
        '.pageLayout .content .productDetailWrapper .product-actions,',
        '.pageLayout .content .productDetailWrapper [data-testid="product-actions"],',
        '.product-actions-fragment,',
        '.product-actions {',
        '  position: fixed !important;',
        '  bottom: 0 !important;',
        '  left: 0 !important;',
        '  right: 0 !important;',
        '  width: 100% !important;',
        '  background: #ffffff !important;',
        '  padding: 8px 16px !important;',
        '  box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.15) !important;',
        '  z-index: 999999 !important;',
        '  box-sizing: border-box !important;',
        '  display: flex !important;',
        '  flex-direction: row !important;',
        '  gap: 10px !important;',
        '  align-items: center !important;',
        '}',
        '.product-actions .add-to-cart-button,',
        '.product-actions [data-testid="add-to-cart-button"],',
        'button.add-to-cart-button {',
        '  display: flex !important;',
        '  visibility: visible !important;',
        '  opacity: 1 !important;',
        '  flex: 1 1 auto !important;',
        '  width: 100% !important;',
        '  min-height: 48px !important;',
        '  justify-content: center !important;',
        '  align-items: center !important;',
        '}',
        '.product-actions .buy-now-button,',
        'button.buy-now-button {',
        '  display: flex !important;',
        '  visibility: visible !important;',
        '  opacity: 1 !important;',
        '  flex: 1 1 auto !important;',
        '  min-height: 48px !important;',
        '  justify-content: center !important;',
        '  align-items: center !important;',
        '}'
      ].join('\\n');

      function applyStyles() {
        if (!document.getElementById(STYLE_ID)) {
          var style = document.createElement('style');
          style.id = STYLE_ID;
          style.type = 'text/css';
          style.appendChild(document.createTextNode(css));
          (document.head || document.documentElement).appendChild(style);
        }
      }

      applyStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyStyles);
      }
    } catch (_e) {}
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

    window.addEventListener('beforeunload', function() {
      postRouteChange('beforeunload');
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
      // return 'https://www.amazon.ae/SKY-TOUCH-Portable-Shattaf-Bidet-Bottle/dp/B0C4TNZLSY/ref=mp_s_a_1_1_sspa?_encoding=UTF8&dib=eyJ2IjoiMSJ9.p0ov1f7M3pnaG6oDRM0QzlZVQalfzoqmcPcod2tkpzvKNrpqoR8ROjaCK7YzYfVm_c-QQb_rhqpT2Co2d2I2n5Gfhk1k-gGcwG7Hr2UxqrV_S78Lw9T6iC7iR2p9X7eshlP9tTGm4lTbdPlwpo6O84Pv0LrMirri2rRbFdahwEAZU1CWD5EnaT-Yhj_xqKRmE6ZkG87HYCNTz9YX2a75MQ.xwjagqifuNTU-OV7DbIj7N2F-NVEGp8-wED5GzjxKq8&dib_tag=se&qid=1777591427&refinements=p_36%3A-6900%2Cp_n_prime_domestic%3A20642115031%2Cp_72%3A12407972031&rnid=12407971031&s=health&sr=1-1-spons&aref=9mUJ1O0z3K&sp_csd=d2lkZ2V0TmFtZT1zcF9waG9uZV9icm93c2VfYXRm&psc=1';
      // return 'https://www.amazon.ae/';
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
        ? `${TRENDYOL_COOKIE_SETUP_BRIDGE}\n${TRENDYOL_MOBILE_STYLE_BRIDGE}`
        : `${TRENDYOL_COOKIE_SETUP_BRIDGE}\n${TRENDYOL_MOBILE_STYLE_BRIDGE}\n${ROUTE_CHANGE_BRIDGE}`,
    [useSheinCompatibilityMode],
  );
  const localInitialScript = useMemo(() => {
    return injectedJavascript({
      page_url: sourceUrl,
      getMetaTagImage: true,
      getMetaTitle: true,
      getMetaPrice: true,
    });
  }, [sourceUrl]);

  const injectedJavaScript = useMemo(
    () =>
      useSheinCompatibilityMode
        ? `${localInitialScript}\ntrue;`
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
          ${localInitialScript}
        `,
    [localInitialScript, useSheinCompatibilityMode],
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
  const optionsRef = useRef({
    hasOptions: false,
    options: [],
    hasSize: false,
    sizes: [],
    selectedSize: '',
    hasColor: false,
    colors: [],
    selectedColor: '',
  });
  const pendingOptionsResolveRef = useRef(null);
  const pendingSnapshotResolveRef = useRef(null);

  const resetOptionsRef = useCallback(() => {
    optionsRef.current = {
      hasOptions: false,
      options: [],
      hasSize: false,
      sizes: [],
      selectedSize: '',
      hasColor: false,
      colors: [],
      selectedColor: '',
    };
    if (pendingOptionsResolveRef.current) {
      pendingOptionsResolveRef.current = null;
    }
    if (pendingSnapshotResolveRef.current) {
      pendingSnapshotResolveRef.current = null;
    }
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

      if (!webViewRef.current) {
        setStatus('pending');
        return;
      }

      const injectKey = buildInjectKey(nextUrl, injectScript);

      if (lastInjectedKeyRef.current === injectKey && attempt === 1 && !force) {
        setStatus('injected');
        return;
      }

      try {
        if (shouldProbeBeforeInject(nextUrl) && !force && attempt === 1) {
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
        if (attempt >= total) {
          lastInjectedKeyRef.current = injectKey;
        }
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

  const isAddingRef = useRef(false);

  const addChart = useCallback(async () => {
    if (isAddingRef.current) return;
    isAddingRef.current = true;

    try {
      let freshOpts = null;
      let freshSnapshot = null;

      if (webViewRef.current) {
        const optionPromise = new Promise(resolve => {
          pendingOptionsResolveRef.current = resolve;
        });
        const snapshotPromise = new Promise(resolve => {
          pendingSnapshotResolveRef.current = resolve;
        });

        webViewRef.current.injectJavaScript(`
        (function() {
          try {
            if (typeof window.__extractAndSendProductOptions === 'function') {
              window.__extractAndSendProductOptions(true);
            }

            var cleanText = function(str) {
              if (!str || typeof str !== 'string') return '';
              return str.replace(/\\s+/g, ' ').trim();
            };

            var cleanTitle = function(raw) {
              if (!raw || typeof raw !== 'string') return '';
              return raw
                .replace(/\\s*Fiyatı,\\s*Yorumları\\s*-\\s*Trendyol/gi, '')
                .replace(/\\s*[:|-]\\s*Amazon\\.[a-z.]+(\\s*:.*)?$/gi, '')
                .replace(/\\s*:\\s*Amazon\\.[a-z.]+/gi, '')
                .replace(/\\s*-\\s*Amazon\\.[a-z.]+/gi, '')
                .replace(/\\s*\\|\\s*Shein/gi, '')
                .replace(/\\s*-\\s*Trendyol/gi, '')
                .replace(/\\s+/g, ' ')
                .trim();
            };

            var cleanOptionValue = function(text) {
              if (!text || typeof text !== 'string') return '';
              var clean = text.replace(/\\s+/g, ' ').trim();
              clean = clean.replace(/\\s*[\\(\\[]\\s*[+\\-]?\\s*[$€£₺]?\\s*\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)?\\s*[\\)\\]]/gi, '');
              clean = clean.replace(/\\s*[-–]\\s*[$€£₺]?\\s*\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)?$/gi, '');
              clean = clean.replace(/\\s+\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)\\b.*$/gi, '');
              clean = clean.replace(/\\s*[-:]?\\s*\\b(tl|₺|\\$|€|usd|eur|aed|sar|try)\\b.*$/gi, '');
              clean = clean.replace(/^[:\\-\\s]+|[:\\-\\s]+$/g, '').trim();
              if (clean.length === 0 || clean.length > 35) return '';
              var lower = clean.toLowerCase();
              var exactJunk = ['select', 'seçiniz', 'seç', 'choose', 'lütfen', 'beden tablosu', 'size guide', 'size chart', 'out of stock', 'tükendi', 'stokta yok', 'sepete ekle', 'add to cart', 'buy now', 'hemen al'];
              for (var j = 0; j < exactJunk.length; j++) {
                if (lower === exactJunk[j] || (lower.indexOf(exactJunk[j]) === 0 && exactJunk[j].indexOf(' ') > -1)) return '';
              }
              if (/^\\d{8,}$/.test(clean)) return '';
              return clean;
            };

            var normalizeDimName = function(rawName) {
              if (!rawName || typeof rawName !== 'string') return null;
              var n = cleanText(rawName);
              var lower = n.toLowerCase();
              var ignoreDims = ['quantity', 'adet', 'miktar', 'qty', 'seller', 'satıcı', 'kargo', 'teslimat', 'price', 'fiyat', 'sepet', 'cart'];
              for (var i = 0; i < ignoreDims.length; i++) {
                if (lower === ignoreDims[i] || lower.indexOf(ignoreDims[i]) > -1) return null;
              }
              if (lower.indexOf('beden') > -1 || lower.indexOf('size') > -1 || lower.indexOf('numara') > -1 || lower.indexOf('ölçü') > -1 || lower.indexOf('boyut') > -1) return 'Size';
              if (lower.indexOf('renk') > -1 || lower.indexOf('color') > -1 || lower.indexOf('colour') > -1) return 'Color';
              if (lower.indexOf('hafıza') > -1 || lower.indexOf('storage') > -1 || lower.indexOf('dahili hafıza') > -1 || lower.indexOf('kapasite') > -1 || lower.indexOf('capacity') > -1) return 'Storage';
              if (lower.indexOf('ağırlık') > -1 || lower.indexOf('weight') > -1 || lower.indexOf('gram') > -1 || lower.indexOf('kg') > -1) return 'Weight';
              if (lower.indexOf('hacim') > -1 || lower.indexOf('volume') > -1 || lower.indexOf('ml') > -1) return 'Volume';
              return null;
            };

            var isElementActive = function(el) {
              if (!el || !el.getAttribute) return false;
              if (
                el.getAttribute('aria-selected') === 'true' ||
                el.getAttribute('aria-checked') === 'true' ||
                el.getAttribute('aria-pressed') === 'true' ||
                el.getAttribute('data-selected') === 'true' ||
                el.getAttribute('data-active') === 'true' ||
                el.getAttribute('data-checked') === 'true' ||
                (el.tagName === 'INPUT' && el.checked)
              ) return true;
              var cls = String(el.className || '');
              if (
                /\\b(selected|active|is-selected|is-active|current|swatchSelect|a-button-selected|chosen|sp-itm-selected)\\b/i.test(cls) ||
                cls.indexOf('--active') > -1 ||
                cls.indexOf('--selected') > -1
              ) return true;
              return false;
            };

            var isValidImg = function(url) {
              if (!url || typeof url !== 'string') return false;
              var s = url.trim().toLowerCase();
              if (!s || s.length < 5) return false;
              if (s.indexOf('data:image/gif') === 0 ||
                  s.indexOf('data:image/svg') === 0 ||
                  s.indexOf('blank.gif') > -1 ||
                  s.indexOf('transparent.png') > -1 ||
                  s.indexOf('logo') > -1 ||
                  s.indexOf('favicon') > -1) return false;
              return true;
            };

            var parseImageUrl = function(val) {
              if (!val || typeof val !== 'string') return '';
              val = val.trim();
              if (val.charAt(0) === '{') {
                try {
                  var parsed = JSON.parse(val);
                  var keys = Object.keys(parsed);
                  if (keys.length > 0) {
                    keys.sort(function(a, b) {
                      var dimA = Array.isArray(parsed[a]) ? parsed[a][0] * parsed[a][1] : 0;
                      var dimB = Array.isArray(parsed[b]) ? parsed[b][0] * parsed[b][1] : 0;
                      return dimB - dimA;
                    });
                    val = keys[0];
                  }
                } catch(e) {
                  var match = val.match(new RegExp('https?://[^"\\s\\\\]+'));
                  if (match) val = match[0];
                }
              }
              if (val.indexOf('//') === 0) val = 'https:' + val;
              if (val.indexOf('/') === 0) val = window.location.origin + val;
              return isValidImg(val) ? val : '';
            };

            // 1. Title
            var title = '';
            var titleEl = document.querySelector(
              '#productTitle, #title, #title_feature_div span, #title_feature_div, [data-feature-name="title"], h1#title, h1.pr-new-br span, [data-automation-id="product-title"], .product-title, .pdp-title, ' +
              '.goods-detail-info__name, .product-intro__head-name, .product-intro__title, .goods-title, h1'
            );
            if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
              title = cleanTitle(titleEl.textContent);
            }
            if (!title) {
              var metaTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
              if (metaTitle && metaTitle.content) title = cleanTitle(metaTitle.content);
            }
            if (!title && document.title) {
              title = cleanTitle(document.title);
            }

            // 2. Image
            var image = '';
            var imgEl = document.querySelector(
              '#landingImage, #main-image, #imgBlkFront, img.a-dynamic-image, [data-a-image-name="landingImage"], ' +
              '#main-image-container img, #imageBlock img, #canvasImage, #ebooks-img-canvas img, .a-carousel-card img, ' +
              'div[data-action="main-image-click"] img, div#media-canvas img, img[data-a-hires], ' +
              'img[src*="media-amazon.com/images/I/"], img[src*="images-amazon.com/images/I/"], ' +
              '.product-slide-item img, img[src*="cdn.dsmcdn.com/mnresize"], ' +
              'img[data-src*="cdn.dsmcdn.com/mnresize"], .product-image-gallery-viewport img, ' +
              'img[src*="media/images"], img[data-src*="media/images"], .detail-section-img, .base-product-image img, ' +
              '.gallery-container img, img.product-intro__head-main-img, img[src*="ltwebstatic.com"], img[data-src*="ltwebstatic.com"], ' +
              '.crop-image-container img, [data-test-id="product-image"] img, img.product-image'
            );
            if (imgEl) {
              image = parseImageUrl(imgEl.getAttribute('data-a-hires')) ||
                      parseImageUrl(imgEl.getAttribute('data-old-hires')) ||
                      parseImageUrl(imgEl.getAttribute('data-src')) ||
                      parseImageUrl(imgEl.getAttribute('data-original')) ||
                      parseImageUrl(imgEl.getAttribute('data-a-dynamic-image')) ||
                      parseImageUrl(imgEl.currentSrc) ||
                      parseImageUrl(imgEl.src) ||
                      parseImageUrl(imgEl.getAttribute('src')) || '';
            }
            if (!image) {
              var jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
              for (var j = 0; j < jsonLds.length; j++) {
                try {
                  var ldData = JSON.parse(jsonLds[j].textContent);
                  var ldArr = Array.isArray(ldData) ? ldData : [ldData];
                  for (var k = 0; k < ldArr.length; k++) {
                    var ldItem = ldArr[k];
                    var rImg = ldItem && (ldItem.image || (ldItem['@graph'] && Array.isArray(ldItem['@graph']) && ldItem['@graph'].find(function(g) { return g.image; }) ? ldItem['@graph'].find(function(g) { return g.image; }).image : null));
                    if (rImg) {
                      var cImg = Array.isArray(rImg) ? rImg[0] : rImg;
                      if (typeof cImg === 'object' && cImg.url) cImg = cImg.url;
                      var parsed = parseImageUrl(cImg);
                      if (parsed) { image = parsed; break; }
                    }
                  }
                } catch(_ldErr) {}
                if (image) break;
              }
            }
            if (!image) {
              var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
              if (metaImg) image = parseImageUrl(metaImg.content || metaImg.href || '');
            }

            // 3. Price & Currency
            var price = '';
            var currency = '';

            var parsePriceAndCurrency = function(rawText) {
              if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
              var t = rawText.replace(/\\s+/g, ' ').trim();
              var detectedCurr = '';
              if (/(?:^|[^a-zA-Z])AED(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'AED';
              else if (/(?:^|[^a-zA-Z])SAR(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'SAR';
              else if (/(?:^|[^a-zA-Z])(TL|TRY)(?:$|[^a-zA-Z])|₺/i.test(t)) detectedCurr = 'TL';
              else if (/(?:^|[^a-zA-Z])USD(?:$|[^a-zA-Z])|\\$|US\\$/i.test(t)) detectedCurr = 'USD';
              else if (/(?:^|[^a-zA-Z])EUR(?:$|[^a-zA-Z])|€/i.test(t)) detectedCurr = 'EUR';
              else if (/(?:^|[^a-zA-Z])GBP(?:$|[^a-zA-Z])|£/i.test(t)) detectedCurr = 'GBP';

              // Strip discount percentages e.g. '-30%', '%25', '30% off', 'Save 20%'
              t = t.replace(/[-–]?[ \\t]*[0-9]+(?:\\.[0-9]+)?[ \\t]*%[ \\t]*(?:off|indirim|discount|saving|savings)?/gi, '');
              t = t.replace(/%[ \\t]*[0-9]+(?:\\.[0-9]+)?/gi, '');
              t = t.replace(/(?:save|off|indirim)[ \\t]+[0-9]+(?:\\.[0-9]+)?%?/gi, '');

              // Match price numbers:
              var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
              var cleanPrice = (matches && matches.length > 0) ? matches[0].trim() : '';

              return { price: cleanPrice, currency: detectedCurr };
            };

            // 3a. Check Trendyol application state
            try {
              if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
                var tpPrice = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product.price;
                if (tpPrice) {
                  var dPrice = tpPrice.discountedPrice;
                  var sPrice = tpPrice.sellingPrice;
                  if (dPrice) {
                    if (typeof dPrice === 'object') {
                      price = String(dPrice.value || dPrice.text || '').trim();
                    } else {
                      price = String(dPrice).trim();
                    }
                  } else if (sPrice) {
                    if (typeof sPrice === 'object') {
                      price = String(sPrice.value || sPrice.text || '').trim();
                    } else {
                      price = String(sPrice).trim();
                    }
                  }
                  if (tpPrice.currency) currency = String(tpPrice.currency).trim();
                }
              }
            } catch(_eTp) {}

            // 3b. Check Shein application state
            try {
              var shData = window.productIntroData || window.gbProductIntroData;
              if (shData && shData.detail && shData.detail.salePrice) {
                var sp = shData.detail.salePrice;
                if (sp.amount) price = String(sp.amount).trim();
                else if (sp.usdAmount) price = String(sp.usdAmount).trim();
                if (sp.currency) currency = String(sp.currency).trim();
              }
            } catch(_eSh) {}

            // 3c. Live DOM elements (Amazon mobile/desktop, Shein, Trendyol, Zara, etc.)
            if (!price) {
              var priceEl = document.querySelector(
                'span.prc-dsc, .prc-dsc, .prc-box-dsc, .product-price-container .prc-dsc, ' +
                '#corePriceDisplay_mobile_feature_div .a-offscreen, #corePrice_mobile_feature_div .a-offscreen, ' +
                '#apex_mobile_feature_div .a-offscreen, #corePrice_feature_div .a-offscreen, #corePriceDisplay_feature_div .a-offscreen, ' +
                '#corePriceDisplay_desktop_feature_div .a-offscreen, #corePrice_desktop .a-offscreen, ' +
                '.apexPriceToPay .a-offscreen, #newAccordionRow .a-price .a-offscreen, #price_inside_buybox, ' +
                '#priceblock_ourprice, #priceblock_dealprice, .a-price:not([data-a-strike="true"]) .a-offscreen, ' +
                '.reinventPriceAccordionHeader_feature_div .a-price, .a-price.aok-align-center .a-offscreen, .a-price .a-offscreen, ' +
                '.goods-detail-price .price, .product-price-info .discount-price, .normal-price-box .price, ' +
                '.product-intro__price-new, .goods-price, span[class*="price-val"], div[class*="price-val"], .from-price, ' +
                '.price-item--sale, .price-item, [data-test-id="price-current-price"], ' +
                '#offering-price, .product-price, .pdp-price, span.price, div.price, ' +
                '.product-intro__head-price, div.product-price-container'
              );
              if (priceEl && priceEl.textContent) {
                var parsed = parsePriceAndCurrency(priceEl.textContent);
                if (parsed.price) price = parsed.price;
                if (parsed.currency && !currency) currency = parsed.currency;
              }
            }

            // 3c-2. JSON-LD schema price check (Amazon, Shopify, etc.)
            if (!price) {
              var jsonLdPriceScripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (var jld = 0; jld < jsonLdPriceScripts.length; jld++) {
                try {
                  var ldPriceData = JSON.parse(jsonLdPriceScripts[jld].textContent);
                  var ldPriceArr = Array.isArray(ldPriceData) ? ldPriceData : [ldPriceData];
                  for (var kld = 0; kld < ldPriceArr.length; kld++) {
                    var pItem = ldPriceArr[kld];
                    var offers = pItem && (pItem.offers || (pItem['@graph'] && Array.isArray(pItem['@graph']) && pItem['@graph'].find(function(g) { return g.offers; }) ? pItem['@graph'].find(function(g) { return g.offers; }).offers : null));
                    if (offers) {
                      var offer = Array.isArray(offers) ? offers[0] : offers;
                      if (offer && offer.price) {
                        price = String(offer.price).trim();
                        if (offer.priceCurrency && !currency) currency = String(offer.priceCurrency).trim();
                        break;
                      }
                    }
                  }
                } catch(_eLd) {}
                if (price) break;
              }
            }

            // 3d. JSON-LD and Meta fallbacks
            if (!price) {
              var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"]');
              if (metaPrice && metaPrice.content) price = cleanText(metaPrice.content);
            }
            if (!currency) {
              var metaCurrency = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[name="twitter:label1"]');
              if (metaCurrency && metaCurrency.content) currency = cleanText(metaCurrency.content);
            }

            // 3e. Fallback currency detection from URL
            if (!currency) {
              var href = window.location.href || '';
              if (href.indexOf('trendyol.com') > -1 || href.indexOf('hepsiburada.com') > -1 || href.indexOf('.tr') > -1) {
                currency = 'TL';
              } else if (href.indexOf('amazon.ae') > -1 || href.indexOf('noon.com') > -1) {
                currency = 'AED';
              } else if (href.indexOf('amazon.sa') > -1) {
                currency = 'SAR';
              } else if (href.indexOf('amazon.de') > -1) {
                currency = 'EUR';
              } else if (href.indexOf('amazon.co.uk') > -1) {
                currency = 'GBP';
              } else if (href.indexOf('amazon.com') > -1 || href.indexOf('shein.com') > -1) {
                currency = 'USD';
              }
            }
            if (currency === '₺') currency = 'TL';
            if (currency === '$') currency = 'USD';
            if (currency === '€') currency = 'EUR';
            if (currency === '£') currency = 'GBP';

            // 4. Store Name
            var store = '';
            var metaSite = document.querySelector('meta[property="og:site_name"]');
            if (metaSite && metaSite.content) {
              store = cleanText(metaSite.content);
            }

            // 5. Options & Variants (Size, Color, Capacity, Model)
            var optionsMap = {};
            var addOptionValue = function(dimName, val, isSelected) {
              var normName = normalizeDimName(dimName);
              if (!normName) return;
              var cleanVal = cleanOptionValue(val);
              if (!cleanVal) return;
              if (!optionsMap[normName]) {
                optionsMap[normName] = { name: normName, values: [], selected: '' };
              }
              if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
                optionsMap[normName].values.push(cleanVal);
              }
              if (isSelected) {
                optionsMap[normName].selected = cleanVal;
              }
            };
            var setOptionSelected = function(dimName, selVal) {
              var normName = normalizeDimName(dimName);
              if (!normName) return;
              var cleanVal = cleanOptionValue(selVal);
              if (!cleanVal) return;
              if (!optionsMap[normName]) {
                optionsMap[normName] = { name: normName, values: [cleanVal], selected: cleanVal };
              } else {
                optionsMap[normName].selected = cleanVal;
                if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
                  optionsMap[normName].values.unshift(cleanVal);
                }
              }
            };

            // 5a. Header label detection ("Size: M", "Color: Black")
            try {
              var headerEls = document.querySelectorAll('div, p, span, h2, h3, h4, label');
              for (var hi = 0; hi < headerEls.length; hi++) {
                var hText = cleanText(headerEls[hi].textContent || '');
                if (hText && hText.length < 50 && hText.indexOf(':') > -1) {
                  var colonIdx = hText.indexOf(':');
                  var prefix = hText.substring(0, colonIdx).trim();
                  var suffix = hText.substring(colonIdx + 1).trim();
                  var matchedDim = normalizeDimName(prefix);
                  if (matchedDim && suffix) {
                    var cleanedVal = cleanOptionValue(suffix.split(/\\s{2,}|\\n|\\t/)[0]);
                    if (cleanedVal) setOptionSelected(matchedDim, cleanedVal);
                  }
                }
              }
            } catch(_eH) {}

            // 5b. Shein Global / DOM items
            try {
              var shData = window.productIntroData || window.gbProductIntroData;
              if (shData && shData.detail) {
                var dt = shData.detail;
                if (Array.isArray(dt.mainSaleAttribute)) {
                  for (var m = 0; m < dt.mainSaleAttribute.length; m++) {
                    var mItem = dt.mainSaleAttribute[m];
                    var mDim = normalizeDimName(mItem.attr_name || 'Color');
                    if (mDim && Array.isArray(mItem.attr_value_list)) {
                      for (var mv = 0; mv < mItem.attr_value_list.length; mv++) {
                        addOptionValue(mDim, mItem.attr_value_list[mv].attr_value_name, !!mItem.attr_value_list[mv].is_default);
                      }
                    }
                  }
                }
                if (Array.isArray(dt.saleAttribute)) {
                  for (var sa = 0; sa < dt.saleAttribute.length; sa++) {
                    var saItem = dt.saleAttribute[sa];
                    var saDim = normalizeDimName(saItem.attr_name || 'Size');
                    if (saDim && Array.isArray(saItem.attr_value_list)) {
                      for (var sav = 0; sav < saItem.attr_value_list.length; sav++) {
                        addOptionValue(saDim, saItem.attr_value_list[sav].attr_value_name, !!saItem.attr_value_list[sav].is_default);
                      }
                    }
                  }
                }
              }
            } catch(_e) {}

            var shColorItems = document.querySelectorAll('.goods-color__radio, .goods-color__item, .form-color-item, div[class*="color-item"], div[class*="color_item"], .product-intro__color-choose .choose-item, .goods-color-item');
            for (var sci = 0; sci < shColorItems.length; sci++) {
              var sciEl = shColorItems[sci];
              var sciImg = sciEl.querySelector('img');
              var sciVal = sciEl.getAttribute('title') || sciEl.getAttribute('aria-label') || (sciImg ? sciImg.getAttribute('alt') : '') || sciEl.textContent;
              var isSciSel = isElementActive(sciEl) || isElementActive(sciEl.parentElement);
              addOptionValue('Color', sciVal, isSciSel);
            }
            var shSizeItems = document.querySelectorAll('.goods-size__radio, .goods-size__item, .product-intro__size-choose .choose-item, div[class*="size-item"], div[class*="size_item"], .goods-size-item, div[class*="attr-radio"], .form-size-item, span[class*="val-size"]');
            for (var szi = 0; szi < shSizeItems.length; szi++) {
              var sziEl = shSizeItems[szi];
              var sziVal = sziEl.getAttribute('title') || sziEl.getAttribute('aria-label') || sziEl.textContent;
              var isSziSel = isElementActive(sziEl) || isElementActive(sziEl.parentElement);
              addOptionValue('Size', sziVal, isSziSel);
            }

            // 5c. Amazon twisters & variants
            var amzRows = document.querySelectorAll('div[id^="inline-twister-row-"], div[id^="variation_"], .inline-twister-row');
            for (var r = 0; r < amzRows.length; r++) {
              var row = amzRows[r];
              var rawId = row.id || '';
              var rawFromId = rawId.replace('inline-twister-row-', '').replace('variation_', '').replace('_name', '');
              var labelEl = row.querySelector('.inline-twister-dim-title-label, label, .a-form-label, h4');
              var dimName = normalizeDimName(labelEl ? labelEl.textContent : rawFromId);
              if (!dimName) continue;
              var selEl = row.querySelector('.inline-twister-dim-title-value, .selection, span[id^="inline-twister-dim-title-value-"]');
              if (selEl) setOptionSelected(dimName, selEl.textContent);
              var items = row.querySelectorAll('li, div[data-csa-c-content-id], div[data-asin], .a-button-text, button');
              for (var it = 0; it < items.length; it++) {
                var itemEl = items[it];
                var img = itemEl.querySelector('img');
                var val = img ? (img.getAttribute('alt') || img.getAttribute('title') || '') : '';
                if (!val) {
                  var btn = itemEl.querySelector('.a-button-text, button, span') || itemEl;
                  val = btn.textContent;
                }
                var isSel = isElementActive(itemEl) || isElementActive(itemEl.parentElement);
                addOptionValue(dimName, val, isSel);
              }
            }

            // 5d. Trendyol attributes
            var spItems = document.querySelectorAll('.sp-itm, .size-options .sp-itm, .sp-v .sp-itm, .size-item');
            for (var sp = 0; sp < spItems.length; sp++) {
              addOptionValue('Size', spItems[sp].textContent, isElementActive(spItems[sp]));
            }
            var tyContainers = document.querySelectorAll('.attribute-v2-container, .variants-container, div[class*="size-variant"], div[class*="color-variant"], .slicing-attributes');
            for (var t = 0; t < tyContainers.length; t++) {
              var tCont = tyContainers[t];
              var tLabel = tCont.querySelector('.attribute-v2-label, .title, .sp-itm-title, span[class*="label"]');
              var tDim = normalizeDimName(tLabel ? tLabel.textContent : (tCont.className.indexOf('color') > -1 ? 'Color' : 'Size'));
              if (!tDim) continue;
              var tSubItems = tCont.querySelectorAll('.attribute-v2-item, .sp-itm, .sl-itm, .color-item, button, a');
              for (var tsi = 0; tsi < tSubItems.length; tsi++) {
                var tsiEl = tSubItems[tsi];
                var tsiImg = tsiEl.querySelector('img');
                var tsiVal = tsiEl.getAttribute('title') || (tsiImg ? tsiImg.getAttribute('alt') : '') || tsiEl.textContent;
                addOptionValue(tDim, tsiVal, isElementActive(tsiEl));
              }
            }

            // 5e. Generic dropdowns & swatches
            var allSelects = document.querySelectorAll('select');
            for (var sc = 0; sc < allSelects.length; sc++) {
              var selBox = allSelects[sc];
              var selParent = selBox.parentElement;
              var selLabel = selBox.labels && selBox.labels[0] ? selBox.labels[0].textContent : '';
              if (!selLabel && selParent) {
                var parentLabel = selParent.querySelector('label, [class*="label"], [class*="title"]');
                if (parentLabel) selLabel = parentLabel.textContent;
              }
              var selName = normalizeDimName(selLabel || selBox.name || selBox.id);
              if (!selName) continue;
              var sOpts = selBox.querySelectorAll('option');
              for (var so = 0; so < sOpts.length; so++) {
                if (sOpts[so].value && sOpts[so].value !== '-1') {
                  addOptionValue(selName, sOpts[so].textContent, sOpts[so].selected);
                }
              }
            }

            // 6. Compile options
            var finalOptions = [];
            var sizeObj = null;
            var colorObj = null;
            var dimKeys = Object.keys(optionsMap);
            for (var dk = 0; dk < dimKeys.length; dk++) {
              var opt = optionsMap[dimKeys[dk]];
              if (opt && opt.values.length > 0 && opt.values.length <= 40) {
                opt.selected = opt.selected || '';
                finalOptions.push(opt);
                if (opt.name === 'Size') sizeObj = opt;
                if (opt.name === 'Color') colorObj = opt;
              }
            }
            var hasSize = Boolean(sizeObj && sizeObj.values.length > 0);
            var hasColor = Boolean(colorObj && colorObj.values.length > 0);

            var isProduct = (function() {
              var pLoc = window.location.href || '';
              var pPath = (window.location.pathname || '').toLowerCase().replace(new RegExp('/+$'), '');
              var pHost = (window.location.hostname || '').toLowerCase();

              // Explicit non-product pages
              if (!pPath || pPath === '' || pPath === '/en' || pPath === '/tr' || pPath === '/ar' || pPath === '/som') return false;
              if (
                pPath.indexOf('/search') > -1 ||
                pPath.indexOf('/category') > -1 ||
                pPath.indexOf('/categories') > -1 ||
                pPath.indexOf('/collections') > -1 ||
                pPath.indexOf('/basket') > -1 ||
                pPath.indexOf('/cart') > -1 ||
                pPath.indexOf('/checkout') > -1 ||
                pPath.indexOf('/account') > -1 ||
                pPath.indexOf('/login') > -1 ||
                pPath.indexOf('/register') > -1 ||
                pPath.indexOf('/butik') > -1 ||
                pPath.indexOf('/butikler') > -1 ||
                pPath.endsWith('/sr') ||
                pPath.endsWith('/s')
              ) return false;

              // Trendyol specific
              if (pHost.indexOf('trendyol.') > -1) {
                if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) return true;
                if (pPath.indexOf('-p-') > -1 || pPath.indexOf('/p/') > -1) return true;
                if (document.querySelector('.add-to-basket, .add-to-basket-button, #addToBasket, [data-test-id="add-to-basket-button"]')) return true;
                return false;
              }

              // Amazon specific
              if (pHost.indexOf('amazon.') > -1) {
                if (new RegExp('/(dp|gp/product|d)/[a-z0-9]{8,12}', 'i').test(pPath)) return true;
                if (document.querySelector('#add-to-cart-button, #buy-now-button, #ppd, #dp')) return true;
                return false;
              }

              // Shein specific
              if (pHost.indexOf('shein.') > -1) {
                if (window.productIntroData || window.gbProductIntroData) return true;
                if (new RegExp('-p-[0-9]+\\\\.html', 'i').test(pPath) || pPath.indexOf('/goods-p-') > -1 || pPath.indexOf('/item/') > -1) return true;
                if (document.querySelector('.product-intro__add-btn, .shein-add-to-cart')) return true;
                return false;
              }

              // Hepsiburada specific
              if (pHost.indexOf('hepsiburada.') > -1) {
                if (new RegExp('-p-[a-z0-9]+', 'i').test(pPath) || new RegExp('-pm-[a-z0-9]+', 'i').test(pPath)) return true;
                if (document.querySelector('#addToCart, [data-test-id="addToCart"]')) return true;
                return false;
              }

              // Noon specific
              if (pHost.indexOf('noon.') > -1) {
                if (pPath.indexOf('/p/') > -1) return true;
                if (document.querySelector('[data-qa="btn-addToCart"]')) return true;
                return false;
              }

              // Schema.org Product check
              var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (var li = 0; li < ldScripts.length; li++) {
                try {
                  var ldContent = JSON.parse(ldScripts[li].textContent);
                  var checkLd = function(obj) {
                    if (!obj) return false;
                    var oType = obj['@type'];
                    if (oType === 'Product' || (Array.isArray(oType) && oType.indexOf('Product') > -1)) return true;
                    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
                      for (var gi = 0; gi < obj['@graph'].length; gi++) {
                        if (checkLd(obj['@graph'][gi])) return true;
                      }
                    }
                    return false;
                  };
                  if (Array.isArray(ldContent)) {
                    for (var lk = 0; lk < ldContent.length; lk++) {
                      if (checkLd(ldContent[lk])) return true;
                    }
                  } else if (checkLd(ldContent)) {
                    return true;
                  }
                } catch(_eLd) {}
              }

              // OpenGraph type check
              var ogEl = document.querySelector('meta[property="og:type"], meta[name="og:type"]');
              if (ogEl && ogEl.content) {
                var ogContent = ogEl.content.toLowerCase().trim();
                if (ogContent === 'product' || ogContent === 'og:product') return true;
                if (ogContent === 'website') return false;
              }

              // Generic add-to-cart button or detail elements
              if (document.querySelector(
                'button[name="add"], form[action*="cart/add"] button, ' +
                '#add-to-cart, .add-to-cart, #addToCart, .addToCart, ' +
                '[data-action="add-to-cart"], [data-action="addToCart"], ' +
                'button[id*="add-to-cart"], button[class*="add-to-cart"]'
              )) return true;

              if (document.querySelector('#productTitle, #title, #title_feature_div span, #title_feature_div, [data-feature-name="title"], h1#title, .product-title, .pdp-title, .goods-detail-info__name')) {
                return true;
              }

              if (new RegExp('/(products?|items?|goods|p)/[^/?#]+', 'i').test(pPath) || new RegExp('-p-[0-9]+', 'i').test(pPath)) {
                return true;
              }

              return false;
            })();

            var snapshot = {
              isProduct: isProduct,
              title: title,
              image: image,
              price: price,
              currency: currency,
              store: store,
              options: finalOptions,
              hasSize: hasSize,
              sizes: hasSize ? sizeObj.values : [],
              selectedSize: hasSize ? sizeObj.selected : '',
              hasColor: hasColor,
              colors: hasColor ? colorObj.values : [],
              selectedColor: hasColor ? colorObj.selected : '',
            };

            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'productDetailsSnapshot',
                data: snapshot
              }));
            }

            if (typeof onUrlChange === 'function') {
              onUrlChange();
            }
          } catch (_e) {}
          true;
        })();
      `);

      const [resolvedOpts, resolvedSnapshot] = await Promise.all([
        Promise.race([
          optionPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 3500)),
        ]),
        Promise.race([
          snapshotPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 3500)),
        ]),
      ]);

      freshOpts = resolvedOpts;
      freshSnapshot = resolvedSnapshot;
      pendingOptionsResolveRef.current = null;
      pendingSnapshotResolveRef.current = null;
    }

    if (freshSnapshot) {
      if (freshSnapshot.title) titleRef.current = freshSnapshot.title;
      if (freshSnapshot.image) imageRef.current = freshSnapshot.image;
      if (freshSnapshot.price) priceRef.current = freshSnapshot.price;
      if (freshSnapshot.currency) currencyRef.current = freshSnapshot.currency;
    }

    // --- Determine whether the current page is a product page ---
    const snapshotIsProduct = freshSnapshot?.isProduct;
    const urlIsProduct = isProductUrl(currentUrlRef.current);
    // Only block when BOTH signals agree this is NOT a product page
    const pageIsProduct = snapshotIsProduct === true || urlIsProduct === true ||
      (snapshotIsProduct === undefined && urlIsProduct === undefined);

    if (!pageIsProduct) {
      Alert.alert(
        t('Uyarı') || 'Uyarı',
        t('gecersizUrunSayfasi') ||
          'Sadece ürün detay sayfaları sepete eklenebilir. Lütfen bir ürün sayfasına gidip tekrar deneyiniz.',
        [{ text: t('Tamam') || 'Tamam' }],
      );
      return;
    }

    // --- Validate product data ---
    const finalTitle = titleRef.current || getFallbackTitleFromUrl(currentUrlRef.current, '');
    const finalImage = (imageRef.current || '').trim();

    // Only block for truly generic / site-level titles (no product name at all)
    const isGenericTitle = (title) => {
      if (!title || typeof title !== 'string') return true;
      const clean = title.trim().toLowerCase();
      if (!clean || clean === 'product' || clean === 'oneclick' || clean === '-') return true;
      // Pure store homepage titles (no product name mixed in)
      const genericPatterns = [
        /^trendyol\s*[-–|:]?\s*(fashion|home|electronics|beauty|online al[ıi][sş]veri[sş]|en uygun fiyat)/i,
        /^amazon\s*[-–|.]?\s*(com|ae|sa|de|co\.uk)?\s*[-–|:]?\s*(online shopping|spend less|smile more|low prices)?\s*$/i,
        /^shein\s*[-–|:]?\s*(online fashion|women'?s? clothing|affordable)/i,
        /^hepsiburada\s*[-–|:]?/i,
        /^noon\s*[-–|:]?\s*(online shopping)?\s*$/i,
      ];
      for (const pat of genericPatterns) {
        if (pat.test(clean)) return true;
      }
      return false;
    };

    if (isGenericTitle(finalTitle) && !finalImage) {
      // Both title and image are missing/generic — likely not on a real product
      Alert.alert(
        t('Uyarı') || 'Uyarı',
        t('gecersizUrunSayfasi') ||
          'Sadece ürün detay sayfaları sepete eklenebilir. Lütfen bir ürün sayfasına gidip tekrar deneyiniz.',
        [{ text: t('Tamam') || 'Tamam' }],
      );
      return;
    }

    const opts = freshOpts || optionsRef.current || {};
    const finalOptions = (freshSnapshot && Array.isArray(freshSnapshot.options) && freshSnapshot.options.length > 0)
      ? freshSnapshot.options
      : (opts.options || []);

    const hasSize = !!(
      freshSnapshot?.hasSize ||
      opts.hasSize ||
      (freshSnapshot?.sizes && freshSnapshot.sizes.length > 0) ||
      (opts.sizes && opts.sizes.length > 0)
    );
    const sizes = freshSnapshot?.sizes?.length ? freshSnapshot.sizes : (opts.sizes || []);
    const selectedSize = freshSnapshot?.selectedSize || opts.selectedSize || '';

    const hasColor = !!(
      freshSnapshot?.hasColor ||
      opts.hasColor ||
      (freshSnapshot?.colors && freshSnapshot.colors.length > 0) ||
      (opts.colors && opts.colors.length > 0)
    );
    const colors = freshSnapshot?.colors?.length ? freshSnapshot.colors : (opts.colors || []);
    const selectedColor = freshSnapshot?.selectedColor || opts.selectedColor || '';

    // Enforce selection of product variants (e.g. Size, Color, Weight/Volume)
    const missingOptions = [];

    if (Array.isArray(finalOptions) && finalOptions.length > 0) {
      finalOptions.forEach(opt => {
        if (opt && Array.isArray(opt.values) && opt.values.length > 1) {
          const sel = (opt.selected || '').trim();
          if (!sel || isPlaceholderValue(sel)) {
            const optName = opt.name || 'Option';
            if (!missingOptions.includes(optName)) {
              missingOptions.push(optName);
            }
          }
        }
      });
    }

    if (hasSize && sizes.length > 1 && (!selectedSize || isPlaceholderValue(selectedSize))) {
      if (!missingOptions.includes('Size')) {
        missingOptions.push('Size');
      }
    }

    if (hasColor && colors.length > 1 && (!selectedColor || isPlaceholderValue(selectedColor))) {
      if (!missingOptions.includes('Color')) {
        missingOptions.push('Color');
      }
    }

    if (missingOptions.length > 0) {
      const translatedNames = missingOptions.map(name => {
        const lower = name.toLowerCase();
        if (lower.includes('size') || lower.includes('beden')) return t('Beden') || 'Beden';
        if (lower.includes('color') || lower.includes('renk')) return t('Renk') || 'Renk';
        if (lower.includes('weight') || lower.includes('ağırlık')) return t('Ağırlık') || 'Ağırlık';
        if (lower.includes('volume') || lower.includes('hacim')) return t('Hacim / Kapasite') || 'Hacim';
        return name;
      }).join(', ');

      const alertMsg = t('lutfenSecimYapin', { options: translatedNames }) ||
        `Lütfen devam etmeden önce (${translatedNames}) seçiminizi yapınız.`;

      Alert.alert(t('Uyarı') || 'Uyarı', alertMsg, [
        { text: t('Tamam') || 'Tamam' }
      ]);
      return;
    }

    const finalStore = getStoreName(currentUrlRef.current, freshSnapshot?.store || route?.params?.ad);

    const resolvedImage = finalImage || freshSnapshot?.image || imageRef.current || '';
    const resolvedPrice = freshSnapshot?.price || priceRef.current || '';
    const resolvedCurrency = freshSnapshot?.currency || currencyRef.current || 'TL';

    addItem({
      title: finalTitle,
      url: currentUrlRef.current,
      count: 1,
      checked: true,
      image: resolvedImage,
      price: resolvedPrice,
      currency: resolvedCurrency,
      store: finalStore,
      options: finalOptions,
      hasSize: hasSize,
      sizes: sizes,
      size: selectedSize,
      hasColor: hasColor,
      colors: colors,
      color: selectedColor,
    });

    await delay(150);
    navigation.navigate('Cart');
  } finally {
    isAddingRef.current = false;
  }
}, [addItem, navigation, route?.params?.ad]);

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

            if (isDifferentProduct(currentUrlRef.current, nextUrl)) {
              titleRef.current = '';
              imageRef.current = '';
              priceRef.current = '';
              currencyRef.current = '';
              resetOptionsRef();
            }
            currentUrlRef.current = nextUrl;

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
          case 'productDetailsSnapshot': {
            if (message.data && typeof message.data === 'object') {
              if (message.data.title) titleRef.current = String(message.data.title).trim();
              if (message.data.image) imageRef.current = String(message.data.image).trim();
              if (message.data.price) priceRef.current = String(message.data.price).trim();
              if (message.data.currency) currencyRef.current = String(message.data.currency).trim();
              if (typeof pendingSnapshotResolveRef.current === 'function') {
                const resolver = pendingSnapshotResolveRef.current;
                pendingSnapshotResolveRef.current = null;
                resolver(message.data);
              }
            }
            return;
          }
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
          case 'productOptions':
            if (message.data && typeof message.data === 'object') {
              const opts = Array.isArray(message.data.options) ? message.data.options : [];
              let extractedSize = message.data.selectedSize ? String(message.data.selectedSize).trim() : '';
              let extractedColor = message.data.selectedColor ? String(message.data.selectedColor).trim() : '';

              // Ensure size/color are synced from options array if not directly populated
              if (!extractedSize) {
                const sizeOpt = opts.find(o => o.name && o.name.toLowerCase() === 'size');
                if (sizeOpt && sizeOpt.selected) {
                  extractedSize = String(sizeOpt.selected).trim();
                }
              }
              if (!extractedColor) {
                const colorOpt = opts.find(o => o.name && o.name.toLowerCase() === 'color');
                if (colorOpt && colorOpt.selected) {
                  extractedColor = String(colorOpt.selected).trim();
                }
              }

              const nextOptions = {
                hasOptions: opts.length > 0,
                options: opts,
                hasSize: !!(message.data.hasSize || extractedSize),
                sizes: Array.isArray(message.data.sizes) ? message.data.sizes : [],
                selectedSize: extractedSize,
                hasColor: !!(message.data.hasColor || extractedColor),
                colors: Array.isArray(message.data.colors) ? message.data.colors : [],
                selectedColor: extractedColor,
              };
              optionsRef.current = nextOptions;

              if (typeof pendingOptionsResolveRef.current === 'function') {
                const resolver = pendingOptionsResolveRef.current;
                pendingOptionsResolveRef.current = null;
                resolver(nextOptions);
              }
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
    [injectNow, injectScript, resetOptionsRef, scheduleInject, setStatus],
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
        if (isDifferentProduct(currentUrlRef.current, nextUrl)) {
          titleRef.current = '';
          imageRef.current = '';
          priceRef.current = '';
          currencyRef.current = '';
          resetOptionsRef();
        }
      }
      currentUrlRef.current = nextUrl;
      canGoBackRef.current = !!navState.canGoBack;
      loadingRef.current = !!navState.loading;
      setTranslateUrl(currentUrlRef.current);
      injectTrendyolCookies(currentUrlRef.current);

      if (!navState.loading) {
        scheduleInject(currentUrlRef.current);
      }
    },
    [injectTrendyolCookies, resetOptionsRef, scheduleInject, setTranslateUrl],
  );

  const onShouldStartLoadWithRequest = useCallback(request => {
    const nextUrl = request?.url || '';
    if (!nextUrl) {
      return true;
    }

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
    resetOptionsRef();
    clearInjectTimers();
    setTranslateUrl(sourceUrl);
    setStatus(sourceUrl === BLANK_SOURCE_URL ? 'idle' : 'pending');
  }, [clearInjectTimers, resetOptionsRef, setStatus, setTranslateUrl, sourceUrl]);

  useEffect(() => {
    if (!loadingRef.current) {
      scheduleInject(currentUrlRef.current, {
        delays: [60, 500, 1400],
      });
    } else {
      setStatus('pending');
    }
  }, [scheduleInject, setStatus]);

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
        <AddToCart addChart={addChart} />
      </View>
    </SafeAreaView>
  );
}
