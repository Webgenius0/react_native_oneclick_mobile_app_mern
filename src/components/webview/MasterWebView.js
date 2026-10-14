import React, {useCallback, useRef} from 'react';
import WebView from 'react-native-webview';
import {Linking} from 'react-native';
import {userAgent} from '../../helpers/webview';

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
          type: 'routeChange',
          data: {
            url: window.location.href,
            kind: kind || 'unknown',
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

const BLANK_WEBVIEW_SOURCE = {
  html: '',
  baseUrl: 'about:blank',
};
const BLANK_SOURCE_URL = 'about:blank';

export default function MasterWebView({
  initialUrl,
  webViewRef,
  INJECTED_JAVASCRIPT,
  onLoadStart,
  onLoadEnd,
  onMessage,
  onNavigationStateChange,
}) {
  const localWebViewRef = useRef(null);
  const resolvedWebViewRef = webViewRef || localWebViewRef;

  const handleNavigationStateChange = useCallback((navState) => {
    if (navState.url && navState.url.includes('trendyol.com/en')) {
      resolvedWebViewRef.current?.injectJavaScript(`
        document.cookie = "countryCode=AE; path=/; domain=.trendyol.com";
        document.cookie = "storefrontId=36; path=/; domain=.trendyol.com";
        true;
      `);
    }

    if (onNavigationStateChange) {
      onNavigationStateChange(navState);
    }
  }, [onNavigationStateChange, resolvedWebViewRef]);

  // WhatsApp ve Intent linklerini ele almak için
  const onShouldStartLoadWithRequest = useCallback(request => {
    const {url} = request;
    if (!url) return true;

    if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
      Linking.openURL(url).catch(err => {
        console.error('WhatsApp linki açılamadı:', err);
      });
      return false;
    }

    // Handle intent://, ty://, and non-http/https custom schemes
    if (
      url.startsWith('intent://') ||
      url.startsWith('intent:') ||
      (!url.startsWith('http://') &&
        !url.startsWith('https://') &&
        !url.startsWith('about:') &&
        !url.startsWith('data:'))
    ) {
      if (url.includes('S.browser_fallback_url=')) {
        try {
          const match = url.match(/S\.browser_fallback_url=([^;]+)/);
          if (match && match[1]) {
            const fallbackUrl = decodeURIComponent(match[1]);
            if (
              fallbackUrl &&
              (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))
            ) {
              resolvedWebViewRef.current?.injectJavaScript(
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
  }, [resolvedWebViewRef]);

  const onError = useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    if (nativeEvent && nativeEvent.description && nativeEvent.description.includes('ERR_UNKNOWN_URL_SCHEME')) {
      return;
    }
  }, []);

  const source = initialUrl && initialUrl !== BLANK_SOURCE_URL
    ? {uri: initialUrl}
    : BLANK_WEBVIEW_SOURCE;


  return (
    <WebView
      originWhitelist={['*']}
      ref={resolvedWebViewRef}
      cookiesEnabled={true}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      domStorageEnabled={true}
      cacheEnabled={true}
      cacheMode={'LOAD_DEFAULT'}
      allowsBackForwardNavigationGestures={true}
      pagingEnabled={false}
      javaScriptEnabled={true}
      mixedContentMode={'compatibility'}
      startInLoadingState={true}
      renderToHardwareTextureAndroid={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      userAgent={userAgent()}
      injectedJavaScriptBeforeContentLoaded={ROUTE_CHANGE_BRIDGE}
      // injectedJavaScript={INJECTED_JAVASCRIPT}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={onError}
      onMessage={onMessage}
      onNavigationStateChange={handleNavigationStateChange}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      androidLayerType="hardware"
      onRenderProcessGone={syntheticEvent => {
        const { didCrash } = syntheticEvent?.nativeEvent || {};
        console.warn('MasterWebView render process terminated, didCrash:', didCrash);
        try {
          resolvedWebViewRef.current?.reload();
        } catch (err) {
          console.warn('Failed to reload MasterWebView after render process gone:', err);
        }
        return true;
      }}
      onContentProcessDidTerminate={() => {
        console.warn('MasterWebView content process terminated');
        try {
          resolvedWebViewRef.current?.reload();
        } catch (err) {
          console.warn('Failed to reload MasterWebView after content process terminated:', err);
        }
      }}
      source={source}
    />
  );
}
