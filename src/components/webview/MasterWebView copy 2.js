
import WebView from 'react-native-webview';
import { injectedJavascript, isTrendyol, userAgent } from '../../helpers/webview';
import { useRef } from 'react';
import { delay } from '../../helpers/common';

export default function MasterWebView({ initialUrl, webViewRef, INJECTED_JAVASCRIPT, onLoadStart, onLoadEnd, onMessage, onNavigationStateChange }) {

    if (!webViewRef) {
        webViewRef = useRef(null);
        
    }

    const generatedUserAgent = userAgent();

    return (<WebView 
    ref={webViewRef}
    userAgent={generatedUserAgent}
    source={{ uri: initialUrl }}
    />);

}