
import WebView from 'react-native-webview';
import { injectedJavascript, isTrendyol, userAgent } from '../../helpers/webview';
import { useRef } from 'react';
import { delay } from '../../helpers/common';

export default function MasterWebView({ initialUrl, webViewRef, INJECTED_JAVASCRIPT, onLoadStart, onLoadEnd, onMessage, onNavigationStateChange }) {

    if (!webViewRef) {
        webViewRef = useRef(null);
    }

    const generatedUserAgent = userAgent();

    return (
        <WebView
            ref={webViewRef}
            source={{ uri: initialUrl }}
            
            // Security & Origin
            originWhitelist={['*']}
            
            // Cookie Management - Critical for performance and functionality
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            
            // Storage & Cache - Performance critical
            domStorageEnabled={true}
            cacheEnabled={true}
            cacheMode={'LOAD_DEFAULT'} // Android: Use cache when available, network when needed
            
            // JavaScript Performance
            javaScriptEnabled={true}
            javaScriptCanOpenWindowsAutomatically={false} // Security & performance
            
            // Content & Media Performance
            mixedContentMode={'compatibility'}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            
            // Android Performance Optimizations
            androidLayerType={'hardware'} // Use hardware acceleration
            textZoom={100} // Prevent scaling issues
            setBuiltInZoomControls={false} // Disable zoom for better performance
            setDisplayZoomControls={false}
            
            // iOS Performance Optimizations
            allowsLinkPreview={false} // Disable 3D touch preview for better performance
            decelerationRate={'fast'} // Faster scroll deceleration
            allowsBackForwardNavigationGestures={true} // Enable swipe gestures
            
            // iOS Touch & Tap Optimizations
            scrollEnabled={true}
            bounces={false} // Disable bounce for faster response
            showsVerticalScrollIndicator={false} // Reduce UI overhead
            showsHorizontalScrollIndicator={false}
            keyboardDisplayRequiresUserAction={false} // Faster keyboard response
            
            // iOS Content & Interaction
            dataDetectorTypes={'none'} // Disable data detection for faster taps
            contentInsetAdjustmentBehavior={'never'} // Prevent layout shifts
            
            // Advanced iOS Performance
            suppressesIncrementalRendering={false} // Allow faster rendering
            hideKeyboardAccessoryView={true} // Reduce keyboard overhead
            allowsAirPlayForMediaPlayback={false} // Disable unnecessary features
            
            // Loading & UI Performance
            startInLoadingState={true}
            pullToRefreshEnabled={false} // Disable unless needed
            
            // Network & Security
            userAgent={generatedUserAgent}
            injectedJavaScriptBeforeContentLoaded={tapDelayFixScript}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScript={INJECTED_JAVASCRIPT || ''}
            
            // Event Handlers
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onMessage={onMessage}
            onNavigationStateChange={onNavigationStateChange}
            
            // Advanced Navigation Control for iOS
            onShouldStartLoadWithRequest={(request) => {
                // Allow immediate navigation for better performance
                return true;
            }}
            
            // Error Handling for better UX
            onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
            }}
            
            onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent);
            }}
        />
    );
}