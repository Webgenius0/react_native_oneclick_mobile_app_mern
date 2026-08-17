import WebView from 'react-native-webview';
import { injectedJavascript, isTrendyol, userAgent } from '../../helpers/webview';
import trendyolTapFix from '../../helpers/trendyolTapFix';
import { useRef } from 'react';
import { delay } from '../../helpers/common';
import { Linking } from 'react-native';

export default function MasterWebView({ initialUrl, webViewRef, INJECTED_JAVASCRIPT, onLoadStart, onLoadEnd, onMessage, onNavigationStateChange }) {

    if (!webViewRef) {
        webViewRef = useRef(null);
    }

    const handleNavigationStateChange = (navState) => {
        if (navState.url && navState.url.includes('trendyol.com/en/')) {
            webViewRef.current?.injectJavaScript(`
                document.cookie = "countryCode=AE; path=/; domain=.trendyol.com";
                true;
            `);
        }
        if (onNavigationStateChange) {
            onNavigationStateChange(navState);
        }
    };

    // WhatsApp linklerini dış uygulamada açmak için
    const onShouldStartLoadWithRequest = (request) => {
        const { url } = request;
        
        // WhatsApp linkleri kontrol et
        if (url.includes('whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp://')) {
            // WhatsApp linkini dış uygulamada aç
            Linking.openURL(url).catch(err => {
                console.error('WhatsApp linki açılamadı:', err);
            });
            return false; // WebView'da açmasını engelle
        }
        
        // Diğer linkler için normal davranış
        return true;
    };


    /* return (
        <WebView 
        ref={webViewRef}
        source={{ uri: initialUrl }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        injectedJavaScriptBeforeContentLoaded={trendyolTapFix}
        injectedJavaScript={trendyolTapFix}


        cookiesEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}

        onMessage={onMessage}
        
        userAgent={userAgent()}
        />
    ) */

    return (
        <WebView
            originWhitelist={['*']}
            ref={webViewRef}

            cookiesEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            
            // Cache ayarları
            cacheEnabled={true}
            cacheMode={'LOAD_DEFAULT'} // Android için: LOAD_DEFAULT cache'i kullan, yoksa network'ten yükle
            
            // iOS için cache kontrolü
            allowsBackForwardNavigationGestures={true}
            pagingEnabled={false}
            
            // JavaScript ve localStorage desteği
            javaScriptEnabled={true}
            mixedContentMode={'compatibility'}
            
            // Performance ayarları
            startInLoadingState={true}
            renderToHardwareTextureAndroid={true}
            
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            injectedJavaScriptBeforeContentLoaded={trendyolTapFix}
            
            userAgent={userAgent()}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onMessage={onMessage}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            source={{ uri: initialUrl }}
        />
    );
}