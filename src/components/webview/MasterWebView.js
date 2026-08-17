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

  // WhatsApp linklerini dış uygulamada açmak için
  const onShouldStartLoadWithRequest = useCallback(request => {
    const {url} = request;

    if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
      Linking.openURL(url).catch(err => {
        console.error('WhatsApp linki açılamadı:', err);
      });
      return false;
    }

    return true;
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
      onMessage={onMessage}
      onNavigationStateChange={handleNavigationStateChange}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      source={source}
    />
  );
}
