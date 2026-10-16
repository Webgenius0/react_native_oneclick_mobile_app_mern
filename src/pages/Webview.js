import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { injectedJavascript, normalizeProductImageUrl } from '../helpers/webview1';
import { cleanProductTitle, getFallbackTitleFromUrl, getStoreName, isProductUrl } from '../helpers/storeHelper';
import { isPlaceholderValue } from '../helpers/variantUtils';
import { getReceivedCurrencyInfo } from '../helpers/currencyHelper';
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
  addingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  addingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  addingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
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

const shouldProbeBeforeInject = url => isSheinUrl(url);

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
  } catch (_e) { }
  return true;
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
        var isReady = (document.readyState === 'complete' || document.readyState === 'interactive') && (productPageReady || listPageReady);

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
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setIsAddingToCart(false);
      isAddingRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

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
    props => (
      <HeaderBackButton
        {...props}
        labelVisible={false}
        backTitleVisible={false}
        onPress={handleHeaderBack}
      />
    ),
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
    setIsAddingToCart(true);

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
              var str = raw.replace(/\\r\\n|\\r|\\n|\\t/g, ' ').replace(/\\s+/g, ' ').trim();
              str = str
                .replace(/&amp;/gi, '&')
                .replace(/&quot;/gi, '"')
                .replace(/&#39;|&apos;/gi, "'")
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&nbsp;/gi, ' ');
              str = str.replace(/^(?:Amazon(?:\\.[a-z.]+)?|Trendyol|Hepsiburada(?:\\.com)?|Shein|Zara|Noon|AliExpress|eBay|Walmart(?:\\.com)?|Nike(?:\\.com)?|Apple|Asos|Mango|H&M)\\s*[:|–—\\-]\\s*/gi, '');
              str = str.replace(/^(?:Visit the\\s+[^\\n\\r]+?\\s+Store|Brand:\\s*[^:\\n\\r]+?)\\s+/gi, '');
              str = str
                .replace(/\\s*Fiyatı,?\\s*Yorumları\\s*-\\s*Trendyol.*$/gi, '')
                .replace(/\\s*Fiyatı\\s*-\\s*Trendyol.*$/gi, '')
                .replace(/\\s*-\\s*Trendyol.*$/gi, '')
                .replace(/\\s*\\|\\s*Trendyol.*$/gi, '')
                .replace(/\\s*Fiyatı\\s*-\\s*Hepsiburada.*$/gi, '')
                .replace(/\\s*-\\s*Hepsiburada.*$/gi, '')
                .replace(/\\s*\\|\\s*Hepsiburada.*$/gi, '')
                .replace(/\\s*[:|–—\\-]\\s*Amazon\\.[a-z.]+(\\s*:.*)?$/gi, '')
                .replace(/\\s*[:|–—\\-]\\s*Amazon$/gi, '')
                .replace(/\\s*\\|\\s*Amazon.*$/gi, '')
                .replace(/\\s*\\|\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
                .replace(/\\s*-\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
                .replace(/\\s*\\|\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
                .replace(/\\s*-\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
                .replace(/\\s*\\|\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
                .replace(/\\s*-\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
                .replace(/\\s*\\|\\s*noon.*$/gi, '')
                .replace(/\\s*-\\s*noon.*$/gi, '')
                .replace(/\\s*-\\s*AliExpress(?:\\s+\\d+)?.*$/gi, '')
                .replace(/\\s*\\|\\s*AliExpress.*$/gi, '')
                .replace(/\\s*\\|\\s*eBay.*$/gi, '')
                .replace(/\\s*-\\s*eBay.*$/gi, '')
                .replace(/\\s*\\.?\\s*Nike\\.com.*$/gi, '')
                .replace(/\\s*\\|\\s*Nike.*$/gi, '')
                .replace(/\\s*-\\s*Walmart\\.com.*$/gi, '')
                .replace(/\\s*\\|\\s*Walmart.*$/gi, '')
                .replace(/\\s*[:|–—\\-]\\s*[a-z0-9-]+\\.(?:com|org|net|tr|ae|sa|co\\.uk|de|fr|es|it|ru|cn)(?:\\.[a-z]+)?\\s*$/gi, '');
              str = str.replace(/\\s*:\\s*(?:Electronics|Cell Phones & Accessories|Clothing, Shoes & Jewelry|Home & Kitchen|Beauty & Personal Care|Health & Household|Sports & Outdoors|Toys & Games|Automotive|Tools & Home Improvement|Office Products|Pet Supplies|Baby Products|Grocery & Gourmet Food|Moda|Elektronik|Ev & Yaşam|Mutfak|Kişisel Bakım|Spor & Outdoor|Oto & Yapı Market|Kitap|Oyuncak|Bebek|Computers? & Accessories|Video Games|Musical Instruments|Books|Luggage & Travel Gear|Industrial & Scientific)\\s*$/gi, '');
              str = str.replace(/\\s*\\d+(?:\\.\\d+)?\\s*(?:out of 5 stars|stars|yıldız).*$/gi, '');
              str = str.replace(/\\s*\\(\\s*\\d+(?:,\\d+)*\\s*(?:ratings?|reviews?|değerlendirme|yorum)\\s*\\).*$/gi, '');
              str = str.replace(/^[\\s:|–—•·\"'\\-]+|[\\s:|–—•·\"'\\-]+$/g, '').trim();
              if (/^ref[=_\s-]/i.test(str) || str.toLowerCase().indexOf('ref=') === 0 || /product summary|key product information/i.test(str)) return '';
              return str.replace(/\\s+/g, ' ').trim();
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
              var ignoreDims = [
                'quantity', 'adet', 'miktar', 'qty', 'seller', 'satıcı', 'kargo', 'teslimat',
                'price', 'fiyat', 'sepet', 'cart', 'taksit', 'adres', 'address', 'rating',
                'review', 'kupon', 'coupon', 'shipping', 'delivery', 'guide', 'rehber',
                'tablo', 'chart', 'model', 'waist', 'bust', 'hip', 'hips', 'height', 'shoulder',
                'omuz', 'göğüs', 'bel', 'basen', 'boy', 'paça', 'uzunluk', 'length', 'sleeve', 'kol'
              ];
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
                /(^|[\s.;-])(selected|active|is-selected|is-active|current|swatchSelect|a-button-selected|chosen|sp-itm-selected)($|[\s.;-])/i.test(cls) ||
                cls.indexOf('--active') > -1 ||
                cls.indexOf('--selected') > -1
              ) return true;
              return false;
            };

            var isValidImg = function(url) {
              if (!url || typeof url !== 'string') return false;
              var s = url.trim().toLowerCase();
              if (!s || s.length < 5) return false;
              if (s.indexOf('data:') === 0) return false;
              if (s.indexOf('.svg') > -1 || s.indexOf('/svgicons/') > -1 || s.indexOf('/icons/') > -1 || s.indexOf('/icon_') > -1 || s.indexOf('icon-') > -1) return false;
              if (s.indexOf('blank.gif') > -1 || s.indexOf('transparent.png') > -1 || s.indexOf('spacer.gif') > -1) return false;
              if (s.indexOf('logo') > -1 || s.indexOf('favicon') > -1) return false;
              if (s.indexOf('http://') !== 0 && s.indexOf('https://') !== 0) return false;
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

            // Priority 1: JSON-LD Product schema
            try {
              var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
              for (var j = 0; j < ldScripts.length; j++) {
                var ldObj = JSON.parse(ldScripts[j].textContent);
                var ldItems = Array.isArray(ldObj) ? ldObj : [ldObj];
                for (var k = 0; k < ldItems.length; k++) {
                  var item = ldItems[k];
                  if (!item) continue;
                  if (item['@type'] === 'Product' && item.name && typeof item.name === 'string') {
                    var cName = cleanTitle(item.name);
                    if (cName && cName.length > 2) { title = cName; break; }
                  }
                  if (Array.isArray(item['@graph'])) {
                    for (var g = 0; g < item['@graph'].length; g++) {
                      var gItem = item['@graph'][g];
                      if (gItem && gItem['@type'] === 'Product' && gItem.name && typeof gItem.name === 'string') {
                        var cgName = cleanTitle(gItem.name);
                        if (cgName && cgName.length > 2) { title = cgName; break; }
                      }
                    }
                  }
                }
                if (title) break;
              }
            } catch (_ldErr) {}

            // Priority 2: High-specificity product title DOM selectors in strict priority order
            if (!title) {
              var prioritySelectors = [
                '#title_feature_div #productTitle',
                '#title #productTitle',
                '#productTitle',
                'h1.pr-new-br span',
                'h1.pr-new-br',
                '[data-automation-id="product-title"]',
                '.goods-detail-info__name',
                '.product-intro__head-name',
                '.product-intro__title',
                '.goods-title',
                'h1[data-test-id="product-title"]',
                'h1[itemprop="name"]',
                'h1#title',
                '[data-feature-name="title"] h1',
                '[data-feature-name="title"] #productTitle',
                '.product-title',
                '.pdp-title',
                '.product-detail__title',
                '.product__title',
                '#title h1',
                'h1'
              ];

              for (var p = 0; p < prioritySelectors.length; p++) {
                var el = document.querySelector(prioritySelectors[p]);
                if (el) {
                  var elClass = String(el.className || '');
                  if (/(^|[\s.;-])(a-offscreen|a-screen-reader|sr-only)($|[\s.;-])/i.test(elClass) ||
                      (el.offsetParent === null && window.getComputedStyle && window.getComputedStyle(el).position !== 'fixed')) {
                    continue;
                  }
                  var rawText = (el.textContent || '').trim();
                  if (rawText && rawText.length > 1) {
                    var cleaned = cleanTitle(rawText);
                    if (cleaned && cleaned.length > 2 &&
                        !/^(product|oneclick|-)$/i.test(cleaned) &&
                        !/product summary|key product information/i.test(cleaned)) {
                      title = cleaned;
                      break;
                    }
                  }
                }
              }
            }

            // Priority 3: OpenGraph / Twitter meta tags
            if (!title) {
              var metaTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
              if (metaTitle && metaTitle.content) {
                var mTitle = cleanTitle(metaTitle.content);
                if (mTitle && !/product summary|key product information/i.test(mTitle)) {
                  title = mTitle;
                }
              }
            }

            // Priority 4: Document title
            if (!title && document.title) {
              var dTitle = cleanTitle(document.title);
              if (dTitle && !/product summary|key product information/i.test(dTitle)) {
                title = dTitle;
              }
            }

            // 2. Image
            var image = '';
            var imgSelectors = [
              // Amazon main images
              '#landingImage',
              '#main-image',
              '#imgBlkFront',
              'img.a-dynamic-image',
              '[data-a-image-name="landingImage"]',
              '#main-image-container img',
              '#imageBlock img',
              '#canvasImage',
              '#ebooks-img-canvas img',
              'div[data-action="main-image-click"] img',
              'div#media-canvas img',
              'img[data-a-hires]',
              'img[src*="media-amazon.com/images/I/"]',
              'img[src*="images-amazon.com/images/I/"]',

              // Trendyol product images
              '.product-slide-item img',
              'img[src*="cdn.dsmcdn.com/mnresize"]',
              'img[data-src*="cdn.dsmcdn.com/mnresize"]',
              'img[src*="cdn.dsmcdn.com/ty"]',
              'img[data-src*="cdn.dsmcdn.com/ty"]',
              '.product-image-gallery-viewport img',

              // Shein specific product images (avoid SVG icons)
              'img.crop-image-container__img',
              '.crop-image-container img',
              '.product-intro__head-main img',
              'img.product-intro__head-main-img',
              '.goods-detail-gallery img',
              '.detail-gallery img',
              '.swiper-slide-active img',
              'img[data-before-crop-src]',
              'img[src*="ltwebstatic.com/images"]',
              'img[data-src*="ltwebstatic.com/images"]',
              'img[src*="_thumbnail_"]',
              'img[data-src*="_thumbnail_"]',

              // Zara / H&M / Noon / Other stores
              'img[src*="static.zara.net/photos"]',
              'img[data-src*="static.zara.net/photos"]',
              '.media-image img',
              'img[src*="lp2.hm.com"]',
              'img[src*="f.nooncdn.com/p/"]',
              'img[data-src*="f.nooncdn.com/p/"]',
              '[data-qa="div-gallery"] img',
              '.detail-section-img',
              '.base-product-image img',
              '.gallery-container img',
              '[data-test-id="product-image"] img',
              '.a-carousel-card img',
              'img.product-image'
            ];
            for (var sIdx = 0; sIdx < imgSelectors.length; sIdx++) {
              var candidateEls = document.querySelectorAll(imgSelectors[sIdx]);
              for (var cIdx = 0; cIdx < candidateEls.length; cIdx++) {
                var cEl = candidateEls[cIdx];
                var candUrl = parseImageUrl(cEl.getAttribute('data-a-hires')) ||
                              parseImageUrl(cEl.getAttribute('data-old-hires')) ||
                              parseImageUrl(cEl.getAttribute('data-before-crop-src')) ||
                              parseImageUrl(cEl.getAttribute('data-src')) ||
                              parseImageUrl(cEl.getAttribute('data-lazy-src')) ||
                              parseImageUrl(cEl.getAttribute('data-original')) ||
                              parseImageUrl(cEl.getAttribute('data-origin-src')) ||
                              parseImageUrl(cEl.getAttribute('data-a-dynamic-image')) ||
                              parseImageUrl(cEl.currentSrc) ||
                              parseImageUrl(cEl.src) ||
                              parseImageUrl(cEl.getAttribute('src')) || '';
                if (candUrl && isValidImg(candUrl)) {
                  image = candUrl;
                  break;
                }
              }
              if (image) break;
            }
            if (!image) {
              var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
              if (metaImg) {
                var candMeta = parseImageUrl(metaImg.content || metaImg.href || metaImg.getAttribute('content') || '');
                if (candMeta && isValidImg(candMeta)) image = candMeta;
              }
            }
            if (!image) {
              try {
                var shImgData = window.productIntroData || window.gbProductIntroData;
                if (shImgData && shImgData.detail) {
                  var dtImg = (shImgData.detail.goods_imgs && shImgData.detail.goods_imgs.main_image && shImgData.detail.goods_imgs.main_image.origin_image) ||
                              shImgData.detail.original_img ||
                              shImgData.detail.goods_img;
                  if (dtImg) {
                    var pDt = parseImageUrl(dtImg);
                    if (pDt && isValidImg(pDt)) image = pDt;
                  }
                }
                if (!image && window.goodsInfo && window.goodsInfo.original_img) {
                  var pGi = parseImageUrl(window.goodsInfo.original_img);
                  if (pGi && isValidImg(pGi)) image = pGi;
                }
              } catch(_eShImg) {}
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
                      if (parsed && isValidImg(parsed)) { image = parsed; break; }
                    }
                  }
                } catch(_ldErr) {}
                if (image) break;
              }
            }

            // 3. Price & Currency
            var price = '';
            var currency = '';

            var isStruckOrOldPriceElement = function(el) {
              if (!el) return false;
              try {
                if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') return true;
                if (el.getAttribute && el.getAttribute('data-a-strike') === 'true') return true;
                var cls = String(el.className || '');
                if (/(^|[\s.;-])(bsc-strikethrough-price|prc-org|prc-box-org|prc-slg|a-text-price|basisPrice|line-through|crossed)($|[\s.;-])/i.test(cls)) return true;
                if (/(^|[\s.;-])(original-price|originalPrice|orig-price|old-price|oldPrice|oldprice|was-price|wasPrice|price-was|del-price|head-price-del|market-price|retail-price|productPrice__del|product-price__del)($|[\s.;-])/i.test(cls)) return true;
                if (el.closest && el.closest('del, s, strike, [data-a-strike="true"], .bsc-strikethrough-price, .a-text-price, .basisPrice, .prc-org, .prc-box-org, [class*="original-price"], [class*="old-price"], [class*="was-price"], [class*="head-price-del"], [class*="strikethrough"], [class*="del-price"], [class*="productPrice__del"], [class*="product-price__del"]')) {
                  return true;
                }
              } catch(_e) {}
              return false;
            };

            var getCleanElementPriceText = function(el) {
              if (!el) return '';
              if (isStruckOrOldPriceElement(el)) return '';
              if (el.tagName === 'META') return el.getAttribute('content') || el.content || '';
              if (el.getAttribute && el.getAttribute('content') && /^[0-9]/.test(el.getAttribute('content'))) {
                return el.getAttribute('content');
              }
              try {
                var clone = el.cloneNode(true);
                var oldNodes = clone.querySelectorAll(
                  'del, s, strike, [data-a-strike="true"], .bsc-strikethrough-price, .a-text-price, .basisPrice, .prc-org, .prc-box-org, .prc-slg, ' +
                  '[class*="bsc-strikethrough"], [class*="head-price-del"], [class*="del-price"], [class*="market-price"], [class*="retail-price"], ' +
                  '[class*="original-price"], [class*="originalPrice"], [class*="orig-price"], ' +
                  '[class*="old-price"], [class*="oldPrice"], [class*="oldprice"], ' +
                  '[class*="was-price"], [class*="wasPrice"], [class*="price-was"], ' +
                  '[class*="productPrice__del"], [class*="product-price__del"], ' +
                  '[class*="strike"], [class*="line-through"], [class*="crossed"]'
                );
                for (var oi = 0; oi < oldNodes.length; oi++) {
                  oldNodes[oi].remove();
                }
                return clone.textContent || clone.innerText || '';
              } catch(_eClone) {
                return el.textContent || el.innerText || '';
              }
            };

            var parsePriceAndCurrency = function(rawText) {
              if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
              var t = rawText.replace(/[ \t\r\n]+/g, ' ').trim();
              // Convert Arabic-Indic digits ٠-٩ to 0-9
              t = t.replace(/[٠-٩]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 1632 + 48); });
              var detectedCurr = '';
              if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:AED|د\.?إ|درهم)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'AED';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:SAR|SR|ر\.?س|ريال)(?:$|[^a-zA-Z\u0600-\u06FF])|[﷼\uFDFC]/i.test(t)) detectedCurr = 'SAR';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:KWD|د\.?ك)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'KWD';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:QAR|ر\.?ق)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'QAR';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:BHD|د\.?ب)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'BHD';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:OMR|ر\.?ع)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'OMR';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:TL|TRY)(?:$|[^a-zA-Z\u0600-\u06FF])|₺/i.test(t)) detectedCurr = 'TL';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:USD|US\$)(?:$|[^a-zA-Z\u0600-\u06FF])|\$/i.test(t)) detectedCurr = 'USD';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])EUR(?:$|[^a-zA-Z\u0600-\u06FF])|€/i.test(t)) detectedCurr = 'EUR';
              else if (/(?:^|[^a-zA-Z\u0600-\u06FF])GBP(?:$|[^a-zA-Z\u0600-\u06FF])|£/i.test(t)) detectedCurr = 'GBP';

              // Strip discount percentages e.g. '-30%', '%25', '30% off', 'Save 20%'
              t = t.replace(/[-–]?[ \t]*[0-9]+(?:\.[0-9]+)?[ \t]*%[ \t]*(?:off|indirim|discount|saving|savings)?/gi, '');
              t = t.replace(/%[ \t]*[0-9]+(?:\.[0-9]+)?/gi, '');
              t = t.replace(/(?:save|off|indirim)[ \t]+[0-9]+(?:\.[0-9]+)?%?/gi, '');
              t = t.replace(/(?:save|tasarruf|indirim|saving|savings)\s*[$€£₺]?\s*[0-9]+(?:[.,][0-9]{1,2})?/gi, '');

              // Match price numbers:
              var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
              if (!matches || matches.length === 0) return { price: '', currency: detectedCurr };

              // In clean element, the first price is the selling/discount price
              var cleanPrice = matches[0].trim();
              return { price: cleanPrice, currency: detectedCurr };
            };

            // 3a. Prioritized DOM Discount / Current Price extraction (gives live on-screen discounted prices)
            var candidatePriceSelectors = [
              // Shein Mobile & Desktop Live Discount / Selling Prices
              '.floor-price',
              '[class*="floor-price"]',
              '[class*="floorPrice"]',
              '.productPrice',
              '[class*="productPrice__main"]',
              '[class*="productPriceContainer"]',
              '[class*="productPrice"]',
              '[class*="product-price" i]',
              '[class*="productprice" i]',
              '.bsc-main-price',
              '[class*="bsc-main-price"]',
              '.product-intro__head-price-text',
              '.product-intro__head-price',
              '.product-intro__price-new',
              '.product-intro__price',
              '[class*="product-intro__head-price"]',
              '[class*="product-intro__price"]',
              '[class*="selling-price" i]',
              '[class*="sellingPrice" i]',
              '[class*="real-price" i]',
              '[class*="realPrice" i]',
              '[class*="shein-price" i]',
              '[class*="goods-price" i]',
              '[class*="goodsPrice" i]',
              '[class*="goods-detail-price" i]',
              '[class*="goodsDetailPrice" i]',
              '[data-price]',
              '[data-sku-price]',
              '[aria-label*="price" i]',
              '[aria-label*="Price" i]',
              '[itemprop="price"]',
              'span[itemprop="price"]',

              // Trendyol Discount / Campaign Prices
              'span.prc-dsc',
              '.prc-dsc',
              '.prc-box-dsc',
              '.product-price-container .prc-dsc',
              '.basket-discount-price',
              '.campaign-price',
              '.badge-basket-discount',
              '.discounted-price',

              // Amazon PriceToPay / Deal / BuyBox / Non-struck Prices
              '#corePriceDisplay_mobile_feature_div .priceToPay .a-offscreen',
              '#corePrice_mobile_feature_div .priceToPay .a-offscreen',
              '#apex_mobile_feature_div .priceToPay .a-offscreen',
              '.priceToPay .a-offscreen',
              '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
              '#corePrice_desktop .priceToPay .a-offscreen',
              '.apexPriceToPay .a-offscreen',
              '#priceblock_dealprice',
              '#priceblock_saleprice',
              '#price_inside_buybox',
              '#corePriceDisplay_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
              '#corePrice_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
              '#apex_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
              '.a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
              '.reinventPricePriceToPayMargin .a-offscreen',

              // Additional Shein / General Selectors
              '[class*="from-price"]',
              '[class*="goods-detail-price"]',
              '[class*="discount-price"]',
              '[class*="sale-price"]',
              '[class*="current-price"]',
              '[class*="currentPrice"]',
              '[class*="now-price"]',
              '[class*="priceNow"]',
              '[class*="normal-price"]',
              '.goods-detail-price .discount-price',
              '.product-price-info .discount-price',
              '.goods-detail-price .price',
              '.goods-price',
              '[data-test-id*="price"]',

              // Hepsiburada / Noon Current Prices
              '[data-test-id="price-current-price"]',
              '[data-test-id="price-discount-price"]',
              '[data-qa="div-price-now"]',
              '.priceNow',
              '#offering-price',

              // Generic E-Commerce / Shopify / WooCommerce Sale Prices
              'ins .amount',
              'ins [class*="price"]',
              '.price-item--sale',
              '.special-price',
              '.sale-price',
              '.discount-price',
              '.discounted-price',
              '[class*="discountPrice"]',
              '[class*="discountedPrice"]',
              '[class*="salePrice"]',
              '.product-price-container',
              '.product-price',
              '.pdp-price'
            ];

            for (var s = 0; s < candidatePriceSelectors.length; s++) {
              var elList = document.querySelectorAll(candidatePriceSelectors[s]);
              for (var ei = 0; ei < elList.length; ei++) {
                var currEl = elList[ei];
                if (isStruckOrOldPriceElement(currEl)) continue;
                var raw = getCleanElementPriceText(currEl);
                if (raw && /[0-9]/.test(raw)) {
                  var parsed = parsePriceAndCurrency(raw);
                  if (parsed.price) {
                    price = parsed.price;
                    if (parsed.currency && !currency) currency = parsed.currency;

                    // If currency not detected directly inside currEl, inspect parent / container and siblings
                    if (!currency && currEl) {
                      var containerEl = (currEl.closest && currEl.closest(
                        '[class*="head-price"], [class*="floor-price"], [class*="product-price"], [class*="productPrice"], [class*="goods-price"], [class*="selling-price"], [class*="goodsPrice"], .product-intro__head-price'
                      )) || currEl.parentElement;
                      if (containerEl) {
                        var containerText = getCleanElementPriceText(containerEl);
                        var parsedContainer = parsePriceAndCurrency(containerText);
                        if (parsedContainer.currency) {
                          currency = parsedContainer.currency;
                        }
                      }
                    }
                    break;
                  }
                }
              }
              if (price) break;
            }

            // Check live cookies or localStorage if currency still not determined from DOM
            if (!currency) {
              try {
                var cookieMatch = document.cookie.match(/(?:^|;\s*)(?:currency|shein_currency|sitecurrency|local_currency|user_currency)=([A-Za-z]{3})/i);
                if (cookieMatch && cookieMatch[1]) {
                  var cVal = cookieMatch[1].toUpperCase();
                  if (/^[A-Z]{3}$/.test(cVal)) currency = cVal;
                }
                if (!currency && window.localStorage) {
                  var lsCur = window.localStorage.getItem('currency') || window.localStorage.getItem('shein_currency') || window.localStorage.getItem('currency_code');
                  if (lsCur && typeof lsCur === 'string') {
                    lsCur = lsCur.trim().toUpperCase().replace(/[^A-Z]/g, '');
                    if (lsCur.length === 3) currency = lsCur;
                  }
                }
              } catch(_eCk) {}
            }

            // Normalize currency symbol into price if USD
            if (price) {
              if (currency === 'USD' || currency === '$') {
                if (!price.includes('$') && !/USD/i.test(price)) {
                  price = '$' + price;
                }
              }
            }

            // 3b. Check Trendyol application state (if DOM extraction hasn't found price yet)
            if (!price) {
              try {
                if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
                  var tpProd = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;
                  var selectedVarPrice = null;
                  if (Array.isArray(tpProd.variants)) {
                    var selVar = tpProd.variants.find(function(v) { return v && v.selected; });
                    if (selVar && selVar.price) {
                      selectedVarPrice = selVar.price;
                    }
                  }
                  var tpPrice = selectedVarPrice || tpProd.price;
                  if (tpPrice) {
                    var dPrice = tpPrice.discountedPrice;
                    var sPrice = tpPrice.sellingPrice;
                    if (dPrice) {
                      var dVal = typeof dPrice === 'object' ? (dPrice.value || dPrice.text || '') : dPrice;
                      if (dVal && dVal !== '0' && dVal !== 0) {
                        price = String(dVal).trim();
                      }
                    }
                    if (!price && sPrice) {
                      var sVal = typeof sPrice === 'object' ? (sPrice.value || sPrice.text || '') : sPrice;
                      if (sVal) price = String(sVal).trim();
                    }
                    if (tpPrice.currency && !currency) currency = String(tpPrice.currency).trim();
                  }
                }
              } catch(_eTp) {}
            }

            // 3c. Check Shein application state
            if (!price || !currency) {
              try {
                if (window.gbCommonInfo) {
                  if (!currency && window.gbCommonInfo.currency) {
                    currency = String(window.gbCommonInfo.currency).trim();
                  }
                  var ssr = window.gbCommonInfo.contextForSSR;
                  if (ssr) {
                    if (!currency && ssr.currency) currency = String(ssr.currency).trim();
                    if (!price && ssr.googleSEO && ssr.googleSEO.goodsDetailSchema && ssr.googleSEO.goodsDetailSchema.offers) {
                      var shSchema = ssr.googleSEO.goodsDetailSchema;
                      if (shSchema.offers) {
                        var off = shSchema.offers;
                        var pOff = off.price || off.lowPrice || '';
                        if (pOff) price = String(pOff).trim();
                        if (!currency && off.priceCurrency) currency = String(off.priceCurrency).trim();
                      }
                    }
                    if (!price && ssr.detail) {
                      var dtSsr = ssr.detail;
                      var spSsr = (dtSsr.currentSku && (dtSsr.currentSku.sku_sale_price || dtSsr.currentSku.salePrice || dtSsr.currentSku.price)) || dtSsr.salePrice || dtSsr.sale_price || dtSsr.retailPrice || dtSsr.originalPrice;
                      if (spSsr) {
                        if (typeof spSsr === 'object') {
                          if (spSsr.amount) price = String(spSsr.amount).trim();
                          else if (spSsr.usdAmount) price = String(spSsr.usdAmount).trim();
                          else if (spSsr.amountWithSymbol) {
                            var pResSsr = parsePriceAndCurrency(spSsr.amountWithSymbol);
                            if (pResSsr.price) { price = pResSsr.price; if (pResSsr.currency && !currency) currency = pResSsr.currency; }
                          }
                          if (spSsr.currency && !currency) currency = String(spSsr.currency).trim();
                        } else if (typeof spSsr === 'number' || typeof spSsr === 'string') {
                          var pResSsr2 = parsePriceAndCurrency(String(spSsr));
                          if (pResSsr2.price) { price = pResSsr2.price; if (pResSsr2.currency && !currency) currency = pResSsr2.currency; }
                        }
                      }
                    }
                  }
                }
                var shData = window.productIntroData || window.gbProductIntroData;
                if (shData && shData.detail) {
                  var dt = shData.detail;
                  var sp = (dt.currentSku && (dt.currentSku.sku_sale_price || dt.currentSku.salePrice || dt.currentSku.price)) || dt.salePrice || dt.sale_price || dt.retailPrice || dt.originalPrice;
                  if (sp) {
                    if (typeof sp === 'object') {
                      if (sp.amount) price = String(sp.amount).trim();
                      else if (sp.usdAmount) price = String(sp.usdAmount).trim();
                      else if (sp.amountWithSymbol) {
                        var pRes = parsePriceAndCurrency(sp.amountWithSymbol);
                        if (pRes.price) { price = pRes.price; if (pRes.currency && !currency) currency = pRes.currency; }
                      }
                      if (sp.currency && !currency) currency = String(sp.currency).trim();
                    } else if (typeof sp === 'number' || typeof sp === 'string') {
                      var pRes2 = parsePriceAndCurrency(String(sp));
                      if (pRes2.price) { price = pRes2.price; if (pRes2.currency && !currency) currency = pRes2.currency; }
                    }
                  }
                }
                if (!price && window.goodsInfo) {
                  var gP = window.goodsInfo.sale_price || window.goodsInfo.retail_price;
                  if (gP) {
                    var pRes3 = parsePriceAndCurrency(String(gP));
                    if (pRes3.price) { price = pRes3.price; if (pRes3.currency && !currency) currency = pRes3.currency; }
                  }
                }
              } catch(_eSh) {}
            }

            // 3c-1. OpenGraph / Product Meta Price
            if (!price) {
              try {
                var metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[name="twitter:data1"], [itemprop="price"]');
                if (metaPrice) {
                  var mpVal = metaPrice.getAttribute('content') || metaPrice.content || metaPrice.textContent || '';
                  var pResMeta = parsePriceAndCurrency(mpVal);
                  if (pResMeta.price) {
                    price = pResMeta.price;
                    var metaCurr = document.querySelector('meta[property="product:price:currency"], meta[property="og:price:currency"], meta[itemprop="priceCurrency"]');
                    if (metaCurr && !currency) {
                      currency = (metaCurr.getAttribute('content') || metaCurr.content || '').trim();
                    }
                  }
                }
              } catch(_eMp) {}
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
              var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"], [itemprop="price"]');
              if (metaPrice) {
                var rawMeta = metaPrice.getAttribute('content') || metaPrice.getAttribute('value') || metaPrice.textContent || '';
                if (rawMeta && /[0-9]/.test(rawMeta)) {
                  var parsedMeta = parsePriceAndCurrency(rawMeta);
                  if (parsedMeta.price) price = parsedMeta.price;
                  if (parsedMeta.currency && !currency) currency = parsedMeta.currency;
                }
              }
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
            var addOptionValue = function(dimName, val, isSelected, explicitPrice) {
              var normName = normalizeDimName(dimName);
              if (!normName) return;
              if (!val) return;
              var strVal = String(val).trim();

              // If a value contains embedded "/ Size: ...", separate them
              var sizeEmbedMatch = strVal.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
              if (sizeEmbedMatch) {
                strVal = sizeEmbedMatch[1].trim();
                var extractedSize = cleanOptionValue(sizeEmbedMatch[2]);
                if (extractedSize) {
                  setOptionSelected('Size', extractedSize);
                }
              }
              var colorEmbedMatch = strVal.match(/^(.*?)\s*[\/,|]\s*(?:color|renk)\s*:\s*([^,\/|]+)/i);
              if (colorEmbedMatch) {
                strVal = colorEmbedMatch[1].trim();
                var extractedColor = cleanOptionValue(colorEmbedMatch[2]);
                if (extractedColor) {
                  setOptionSelected('Color', extractedColor);
                }
              }

              var optPrice = explicitPrice ? String(explicitPrice).trim() : '';
              if (!optPrice && strVal) {
                var pMatch = strVal.match(/[\(\[]\s*[+\-]?\s*([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)\s*[\)\]]|[-–]\s*[$€£₺]?\s*([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                if (pMatch) {
                  optPrice = pMatch[1] || pMatch[2] || '';
                }
              }

              var cleanVal = cleanOptionValue(strVal);
              if (!cleanVal) return;

              // Pure measurements in cm (e.g. "83 cm") must NOT overwrite or be added as Size when clothing sizes exist
              if (normName === 'Size' && /^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(cleanVal)) {
                if (optionsMap['Size'] && optionsMap['Size'].values.some(function(v) { return !/^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(v); })) {
                  return;
                }
              }

              if (!optionsMap[normName]) {
                optionsMap[normName] = { name: normName, values: [], selected: '', prices: {} };
              }
              if (!optionsMap[normName].prices) {
                optionsMap[normName].prices = {};
              }
              if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
                optionsMap[normName].values.push(cleanVal);
              }
              if (optPrice) {
                optionsMap[normName].prices[cleanVal] = optPrice;
              }
              if (isSelected) {
                optionsMap[normName].selected = cleanVal;
                if (!optionsMap[normName].prices[cleanVal] && price) {
                  optionsMap[normName].prices[cleanVal] = String(price).trim();
                }
              }
            };
            var setOptionSelected = function(dimName, selVal) {
              var normName = normalizeDimName(dimName);
              if (!normName) return;
              var strSel = String(selVal).trim();
              var sizeMatch = strSel.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
              if (sizeMatch) {
                strSel = sizeMatch[1].trim();
                var embSize = cleanOptionValue(sizeMatch[2]);
                if (embSize) setOptionSelected('Size', embSize);
              }
              var cleanVal = cleanOptionValue(strSel);
              if (!cleanVal) return;

              if (normName === 'Size' && /^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(cleanVal)) {
                if (optionsMap['Size'] && optionsMap['Size'].values.some(function(v) { return !/^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(v); })) {
                  return;
                }
              }

              if (!optionsMap[normName]) {
                optionsMap[normName] = { name: normName, values: [cleanVal], selected: cleanVal, prices: {} };
              } else {
                optionsMap[normName].selected = cleanVal;
                if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
                  optionsMap[normName].values.unshift(cleanVal);
                }
              }
              if (!optionsMap[normName].prices) {
                optionsMap[normName].prices = {};
              }
              if (price && !optionsMap[normName].prices[cleanVal]) {
                optionsMap[normName].prices[cleanVal] = String(price).trim();
              }
            };

            // 5a. Header label detection ("Size: M", "Color: Black", "Color: Blue and White / Size: M")
            try {
              var headerEls = document.querySelectorAll('div, p, span, h2, h3, h4, label');
              for (var hi = 0; hi < headerEls.length; hi++) {
                var hText = cleanText(headerEls[hi].textContent || '');
                if (hText && hText.length < 80 && hText.indexOf(':') > -1) {
                  var parts = hText.split(/\s*[\/,|]\s*/);
                  for (var pi = 0; pi < parts.length; pi++) {
                    var pSub = parts[pi].trim();
                    var cIdx = pSub.indexOf(':');
                    if (cIdx > -1) {
                      var pDim = normalizeDimName(pSub.substring(0, cIdx));
                      var pVal = cleanOptionValue(pSub.substring(cIdx + 1));
                      if (pDim && pVal) {
                        setOptionSelected(pDim, pVal);
                      }
                    }
                  }
                }
              }
            } catch(_eH) {}

            // 5b. Shein Global / DOM items
            try {
              var shData = window.productIntroData || window.gbProductIntroData;
              if (shData && shData.detail) {
                var dt = shData.detail;
                var skuPriceMap = {};
                if (Array.isArray(dt.skuList)) {
                  for (var sk = 0; sk < dt.skuList.length; sk++) {
                    var sku = dt.skuList[sk];
                    var skP = (sku.sku_sale_price && (sku.sku_sale_price.amount || sku.sku_sale_price.usdAmount)) ||
                              (sku.sale_price && (sku.sale_price.amount || sku.sale_price.usdAmount)) || '';
                    if (skP && Array.isArray(sku.attr_value_id)) {
                      for (var avid = 0; avid < sku.attr_value_id.length; avid++) {
                        skuPriceMap[String(sku.attr_value_id[avid])] = String(skP);
                      }
                    }
                  }
                }

                if (Array.isArray(dt.mainSaleAttribute)) {
                  for (var m = 0; m < dt.mainSaleAttribute.length; m++) {
                    var mItem = dt.mainSaleAttribute[m];
                    var mDim = normalizeDimName(mItem.attr_name || 'Color');
                    if (mDim && Array.isArray(mItem.attr_value_list)) {
                      for (var mv = 0; mv < mItem.attr_value_list.length; mv++) {
                        var mValItem = mItem.attr_value_list[mv];
                        var mPrice = skuPriceMap[String(mValItem.attr_value_id)] || '';
                        var isMSel = !!mValItem.is_default;
                        if (dt.currentSku && Array.isArray(dt.currentSku.attr_value_id)) {
                          if (dt.currentSku.attr_value_id.indexOf(mValItem.attr_value_id) > -1 || dt.currentSku.attr_value_id.indexOf(String(mValItem.attr_value_id)) > -1) {
                            isMSel = true;
                          }
                        }
                        addOptionValue(mDim, mValItem.attr_value_name, isMSel, mPrice);
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
                        var sValItem = saItem.attr_value_list[sav];
                        var sPrice = skuPriceMap[String(sValItem.attr_value_id)] || '';
                        var isSSel = false;
                        if (dt.currentSku) {
                          if (Array.isArray(dt.currentSku.attr_value_id)) {
                            isSSel = dt.currentSku.attr_value_id.indexOf(sValItem.attr_value_id) > -1 || dt.currentSku.attr_value_id.indexOf(String(sValItem.attr_value_id)) > -1;
                          } else if (dt.currentSku.attr_value_id == sValItem.attr_value_id || (dt.currentSku.attr_value_name && dt.currentSku.attr_value_name === sValItem.attr_value_name)) {
                            isSSel = true;
                          }
                        }
                        addOptionValue(saDim, sValItem.attr_value_name, isSSel, sPrice);
                      }
                    }
                  }
                }

                if (dt.currentSku && Array.isArray(dt.currentSku.sale_attr_list)) {
                  for (var cal = 0; cal < dt.currentSku.sale_attr_list.length; cal++) {
                    var cObj = dt.currentSku.sale_attr_list[cal];
                    var cName = normalizeDimName(cObj.attr_name || cObj.name || '');
                    var cVal = cleanOptionValue(cObj.attr_value_name || cObj.value_name || cObj.value || '');
                    if (cName && cVal) {
                      setOptionSelected(cName, cVal);
                    }
                  }
                }
              }
            } catch(_e) {}

            // Shein Mobile DOM Variant Elements - Color
            var shColorHeader = document.querySelector('#color-heading, .bs-main-sales-attr__header-title, [class*="main-sales-attr__header"]');
            if (shColorHeader && shColorHeader.textContent) {
              var hText = shColorHeader.textContent.trim();
              var cSep = hText.indexOf(':');
              if (cSep > -1) {
                var cHeadVal = cleanOptionValue(hText.substring(cSep + 1));
                if (cHeadVal) {
                  setOptionSelected('Color', cHeadVal);
                }
              }
            }

            var shColorItems = document.querySelectorAll(
              '.bs-color__item, .bs-color-square-image__item, [class*="bs-color"], ' +
              '.goods-color__radio, .goods-color__item, .form-color-item, ' +
              'div[class*="color-item"], div[class*="color_item"], ' +
              '.product-intro__color-choose .choose-item, .goods-color-item'
            );
            for (var sci = 0; sci < shColorItems.length; sci++) {
              var sciEl = shColorItems[sci];
              if (sciEl.tagName === 'UL' || (sciEl.tagName === 'DIV' && sciEl.children.length > 2 && !sciEl.getAttribute('role'))) continue;
              var sciImg = sciEl.querySelector('img');
              var sciVal = sciEl.getAttribute('aria-label') || sciEl.getAttribute('title') || (sciImg ? (sciImg.getAttribute('alt') || sciImg.getAttribute('title')) : '') || sciEl.textContent;
              sciVal = cleanOptionValue(sciVal);
              if (!sciVal) continue;
              var isSciSel = (sciEl.getAttribute('aria-checked') === 'true') ||
                             (sciEl.getAttribute('aria-selected') === 'true') ||
                             /\b(active|selected|color-active)\b/i.test(sciEl.className || '') ||
                             isElementActive(sciEl) ||
                             isElementActive(sciEl.parentElement);
              addOptionValue('Color', sciVal, isSciSel);
            }

            var isSheinSizeSelected = function(el) {
              if (!el) return false;
              if (el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true') return true;
              var cls = String(el.className || '');
              if (/\b(size-active|selected|active|is-selected|is-active)\b/i.test(cls)) return true;
              if (isElementActive(el)) return true;
              var input = el.querySelector('input[type="radio"], input[type="checkbox"]');
              if (input && input.checked) return true;
              var parent = el.parentElement;
              if (parent && (parent.getAttribute('aria-selected') === 'true' || parent.getAttribute('aria-checked') === 'true')) return true;
              if (parent && !/\b(list|container|wrap|choose|group|items|row|box|content)\b/i.test(parent.className || '')) {
                if (isElementActive(parent)) return true;
              }
              return false;
            };

            var shSizeItems = document.querySelectorAll(
              '.goods-size__sizes-item:not([class*="options-item"]), ' +
              '.goods-size__sizes li, .choose-size li, [class*="choose-size"] li, ' +
              '.goods-size__radio, .goods-size__item, .product-intro__size-choose .choose-item, ' +
              'div[class*="size-item"]:not([class*="options-item"]), div[class*="size_item"], .goods-size-item, div[class*="attr-radio"], .form-size-item'
            );
            for (var szi = 0; szi < shSizeItems.length; szi++) {
              var sziEl = shSizeItems[szi];
              if (sziEl.closest && (sziEl.closest('.goods-size__options') || sziEl.closest('[class*="options-item"]'))) continue;
              if (sziEl.classList && sziEl.classList.contains('goods-size__options-item')) continue;
              var nameEl = sziEl.querySelector('.goods-size__sizes-item-text, [class*="sizes-item-text"], .val-size, [class*="val-size"], .size-name, [class*="size-name"], .sub-title-main, p');
              var sziVal = (nameEl ? nameEl.textContent : '') || sziEl.getAttribute('title') || sziEl.getAttribute('aria-label') || sziEl.textContent;
              if (sziVal) {
                sziVal = sziVal.trim();
                var isSziSel = isSheinSizeSelected(sziEl);
                addOptionValue('Size', sziVal, isSziSel);
              }
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

                var optPrice = '';
                var pEl = itemEl.querySelector('.twisterSwatchPrice, [class*="SwatchPrice"], [class*="swatch-price"], .a-color-secondary, .twister-price, .a-size-mini');
                if (pEl && pEl.textContent && /[0-9]/.test(pEl.textContent)) {
                  var pMatches = pEl.textContent.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                  if (pMatches) optPrice = pMatches[0];
                }

                var isSel = isElementActive(itemEl) || isElementActive(itemEl.parentElement);
                addOptionValue(dimName, val, isSel, optPrice);
              }
            }

            // 5d. Trendyol attributes
            if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
              var tpP = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;
              if (Array.isArray(tpP.variants)) {
                for (var vi = 0; vi < tpP.variants.length; vi++) {
                  var vItem = tpP.variants[vi];
                  if (vItem && vItem.attributeValue) {
                    var vPrice = (vItem.price && vItem.price.discountedPrice && (vItem.price.discountedPrice.value || vItem.price.discountedPrice.text)) ||
                                 (vItem.price && vItem.price.sellingPrice && (vItem.price.sellingPrice.value || vItem.price.sellingPrice.text)) || '';
                    addOptionValue('Size', vItem.attributeValue, !!vItem.selected, vPrice ? String(vPrice) : '');
                  }
                }
              }
            }
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
                  var sOptPrice = sOpts[so].getAttribute('data-price') || '';
                  if (!sOptPrice && sOpts[so].textContent) {
                    var pSelMatch = sOpts[so].textContent.match(/[\(\[]\s*[+\-]?\s*([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)\s*[\)\]]|[-–]\s*[$€£₺]?\s*([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                    if (pSelMatch) sOptPrice = pSelMatch[1] || pSelMatch[2] || '';
                  }
                  addOptionValue(selName, sOpts[so].textContent, sOpts[so].selected, sOptPrice);
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
                opt.prices = opt.prices || {};
                if (price && opt.selected && !opt.prices[opt.selected]) {
                  opt.prices[opt.selected] = String(price).trim();
                }
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

              if (new RegExp('/(products?|items?|goods|p|pr)/[^/?#]+', 'i').test(pPath) || new RegExp('-p-[0-9]+', 'i').test(pPath) || new RegExp('/pid\\.[a-z0-9]+', 'i').test(pPath)) {
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

        let resolvedSnapshot = null;
        let resolvedOpts = null;

        // Snapshot script runs immediately inside the webview and extracts full product details + options
        resolvedSnapshot = await Promise.race([
          snapshotPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 2000)),
        ]);

        if (resolvedSnapshot) {
          // If options have already resolved or arrive quickly within 300ms, capture them; otherwise proceed with snapshot
          resolvedOpts = await Promise.race([
            optionPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 300)),
          ]);
        } else {
          // Fallback if snapshot didn't arrive fast
          resolvedOpts = await Promise.race([
            optionPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 800)),
          ]);
        }

        freshOpts = resolvedOpts;
        freshSnapshot = resolvedSnapshot;
        pendingOptionsResolveRef.current = null;
        pendingSnapshotResolveRef.current = null;
      }

      if (freshSnapshot) {
        if (freshSnapshot.title && !/product summary|key product information/i.test(freshSnapshot.title)) {
          titleRef.current = freshSnapshot.title;
        } else if (titleRef.current && /product summary|key product information/i.test(titleRef.current)) {
          titleRef.current = '';
        }
        if (freshSnapshot.image) imageRef.current = normalizeProductImageUrl(freshSnapshot.image);
        if (freshSnapshot.price) priceRef.current = freshSnapshot.price;
        if (freshSnapshot.currency) currencyRef.current = freshSnapshot.currency;
      } else if (titleRef.current && /product summary|key product information/i.test(titleRef.current)) {
        titleRef.current = '';
      }

      // --- Determine whether the current page is a product page ---
      const snapshotIsProduct = freshSnapshot?.isProduct;
      const urlIsProduct = isProductUrl(currentUrlRef.current);
      // Only block when BOTH signals agree this is NOT a product page
      const pageIsProduct = snapshotIsProduct === true || urlIsProduct === true ||
        (snapshotIsProduct === undefined && urlIsProduct === undefined);

      if (!pageIsProduct) {
        setIsAddingToCart(false);
        isAddingRef.current = false;
        Alert.alert(
          t('Uyarı') || 'Uyarı',
          t('gecersizUrunSayfasi') ||
          'Sadece ürün detay sayfaları sepete eklenebilir. Lütfen bir ürün sayfasına gidip tekrar deneyiniz.',
          [{ text: t('Tamam') || 'Tamam' }],
        );
        return;
      }

      // --- Validate product data ---
      const rawTitleCandidate = titleRef.current && !/product summary|key product information/i.test(titleRef.current)
        ? titleRef.current
        : '';
      const finalTitle = rawTitleCandidate || getFallbackTitleFromUrl(currentUrlRef.current, '');
      const finalImage = (imageRef.current || '').trim();

      // Only block for truly generic / site-level titles (no product name at all)
      const isGenericTitle = (title) => {
        if (!title || typeof title !== 'string') return true;
        const clean = title.trim().toLowerCase();
        if (!clean || clean === 'product' || clean === 'oneclick' || clean === '-' || /product summary|key product information/i.test(clean)) return true;
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
        setIsAddingToCart(false);
        isAddingRef.current = false;
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
          const lower = (name || '').toLowerCase();
          if (lower.includes('size') || lower.includes('beden')) return t('Beden') || 'Size';
          if (lower.includes('color') || lower.includes('renk')) return t('Renk') || 'Color';
          if (lower.includes('weight') || lower.includes('ağırlık')) return t('Ağırlık') || 'Weight';
          if (lower.includes('volume') || lower.includes('hacim')) return t('Hacim / Kapasite') || 'Volume';
          if (lower.includes('variant') || lower.includes('varyant') || lower.includes('option')) return t('Varyant') || 'Variant';
          return name;
        }).join(', ');

        const alertMsg = t('lutfenSecimYapin', { options: translatedNames }) ||
          `Lütfen sepete eklemeden önce ürün seçeneklerini (${translatedNames}) seçiniz.`;

        setIsAddingToCart(false);
        isAddingRef.current = false;
        Alert.alert(t('Uyarı') || 'Uyarı', alertMsg, [
          { text: t('Tamam') || 'Tamam' }
        ]);
        return;
      }

      const finalStore = getStoreName(currentUrlRef.current, freshSnapshot?.store || route?.params?.ad);

      const isShein = isSheinUrl(currentUrlRef.current);
      const isAmazonUsUrl = currentUrlRef.current.includes('amazon.com');
      const isUaeUrl = currentUrlRef.current.includes('amazon.ae') || currentUrlRef.current.includes('noon.com');
      const isSaUrl = currentUrlRef.current.includes('amazon.sa');
      const fallbackCurrency = isAmazonUsUrl ? 'USD' : (isUaeUrl ? 'AED' : (isSaUrl ? 'SAR' : (isShein ? 'USD' : 'TL')));

      const resolvedImage = normalizeProductImageUrl(finalImage || freshSnapshot?.image || imageRef.current || '');
      let resolvedPrice = freshSnapshot?.price || priceRef.current || '';
      let rawCurrency = freshSnapshot?.currency || currencyRef.current || '';

      const currencyInfo = getReceivedCurrencyInfo({
        url: currentUrlRef.current,
        price: resolvedPrice,
        currency: rawCurrency,
        store: finalStore,
      });

      let resolvedCurrency;
      if (currencyInfo.isUsd) {
        resolvedCurrency = currencyInfo.display; // '$' or 'USD' exactly as received
      } else {
        resolvedCurrency = rawCurrency ? currencyInfo.code : (currencyInfo.code || fallbackCurrency);
      }

      // Sanitize options so that only the user-selected value is retained
      const sanitizedOptions = finalOptions.map(opt => {
        if (opt && opt.selected) {
          return {
            ...opt,
            values: [opt.selected],
          };
        }
        return opt;
      });

      const sanitizedSizes = selectedSize ? [selectedSize] : sizes;
      const sanitizedColors = selectedColor ? [selectedColor] : colors;

      addItem({
        title: cleanProductTitle(finalTitle, currentUrlRef.current),
        url: currentUrlRef.current,
        count: 1,
        checked: true,
        image: resolvedImage,
        price: resolvedPrice,
        currency: resolvedCurrency,
        store: finalStore,
        options: sanitizedOptions,
        hasSize: hasSize,
        sizes: sanitizedSizes,
        size: selectedSize,
        hasColor: hasColor,
        colors: sanitizedColors,
        color: selectedColor,
      });

      await delay(150);
      navigation.navigate('Cart');
    } catch (err) {
      console.log('addChart error:', err);
    } finally {
      isAddingRef.current = false;
      setIsAddingToCart(false);
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

            const isShein = nextUrl.includes('shein.com');
            scheduleInject(nextUrl, { delays: isShein ? [300, 1000, 2500, 5000] : SPA_INJECT_DELAYS });
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
              if (message.data.title) titleRef.current = cleanProductTitle(String(message.data.title).trim(), currentUrlRef.current);
              if (message.data.image) imageRef.current = normalizeProductImageUrl(String(message.data.image).trim());
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
              imageRef.current = normalizeProductImageUrl(message.data.trim());
            }
            return;
          case 'title':
            if (message.data && typeof message.data === 'string') {
              titleRef.current = cleanProductTitle(message.data.trim(), currentUrlRef.current);
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
      title: route?.params?.ad || '',
      headerLeft: renderHeaderLeft,
      headerRight: undefined,
    });
  }, [
    navigation,
    renderHeaderLeft,
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
          androidLayerType="hardware"
          onRenderProcessGone={syntheticEvent => {
            const { didCrash } = syntheticEvent?.nativeEvent || {};
            console.warn('WebView render process terminated, didCrash:', didCrash);
            try {
              webViewRef.current?.reload();
            } catch (err) {
              console.warn('Failed to reload WebView after render process gone:', err);
            }
            return true;
          }}
          onContentProcessDidTerminate={() => {
            console.warn('WebView content process terminated');
            try {
              webViewRef.current?.reload();
            } catch (err) {
              console.warn('Failed to reload WebView after content process terminated:', err);
            }
          }}
        />
        <AddToCart addChart={addChart} loading={isAddingToCart} />
        {isAddingToCart && (
          <View style={styles.addingOverlay} pointerEvents="auto">
            <View style={styles.addingCard}>
              <ActivityIndicator size="large" color={Colors.primary || 'orange'} />
              <Text style={styles.addingText}>{t('Yükleniyor') || 'Loading'}...</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}