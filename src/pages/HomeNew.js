import { Text, View, StyleSheet, TouchableOpacity, Dimensions, ScrollView, SafeAreaView } from "react-native";
import React, { useContext, useEffect, useState, useRef, useMemo, memo } from "react";
import { getToken, getUser } from "../helpers/auth";
import { WebView } from "react-native-webview";

import { EmContext } from "../contexts/EmContext";
import { IS_DEV } from "../helpers/common";
import ai from "../helpers/ai";
import FastImage from "react-native-fast-image";
import AuthHeader from "../components/AuthHeader";
import { useFocusEffect } from "@react-navigation/native";
import CustomSlider from "../components/CustomSlider";
import GlobalStyle from "../assets/GlobalStyle";
import { tr } from "../translate/i18n";
import Dump from "../components/Dump";
import MasterWebView from "../components/webview/MasterWebView";
import { injectedJavascript } from "../helpers/webview";
import { BackHandler, Platform } from "react-native";
import {HeaderBackButton} from '@react-navigation/elements';


const HomeNew = memo(({ route, navigation }) => {
  // Render tracking - sadece development'ta
  if (__DEV__) {
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log('HomeNew render count:', renderCount.current);
  }

  const { ctx, setCtx, ctxDil, methods } = useContext(EmContext);
  
  const initialUrl = "https://1clicktoshop.com/";
  // const initialUrl = "http://192.168.1.178:3000/";

  const [state, setState] = useState({});
  // Ekrandaki temel state
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Ürüne dair bilgiler
  const [image, setImage] = useState('');
  const [title, setTitle] = useState('');

  useFocusEffect(() => {

  });



  // Styles'ı memoize et - ctx değişmedikçe yeniden oluşturma
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor || '#FFFFFF',
      // alignItems: "center",
      // justifyContent: "center",
      flexDirection: "column",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 100,
      backgroundColor: ctx.bgColor || '#FFFFFF',
      height: Dimensions.get("window").height - 200,
      width: "100%",
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor || '#FFFFFF',
    },
  }), [ctx.bgColor]);

  const webViewRef = useRef(null);

  //const INJECTED_JAVASCRIPT = useMemo(() => {
  const INJECTED_JAVASCRIPT = () => {
    // Next.js router cache'ini korumak için özel script
    const nextJsCacheScript = `
    (function() {
    console.log('init');
      window.ReactNativeWebView.postMessage(JSON.stringify({type: 'init', data: 'init'}));
      // Next.js router'ı korumaya al
      if (window.next && window.next.router) {
        window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
        
        // Back navigation'da cache'i koru
        window.addEventListener('popstate', function(e) {
          if (e.state && e.state.as) {
            // Next.js'in kendi navigation'ını kullan
            // push react native console
           window.ReactNativeWebView.postMessage(
              JSON.stringify({type: 'popstate', data: 'popstate'})
            );
              
            return true;
          }
        });
      }
      
      // Browser history API'yi koru
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function() {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'pushState', data: 'pushState'})
        );
        originalPushState.apply(window.history, arguments);
      };
      
      window.history.replaceState = function() {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'replaceState', data: 'replaceState'})
        );
        originalReplaceState.apply(window.history, arguments);
      };
    })();`;
    
    return nextJsCacheScript;
    /* return nextJsCacheScript + injectedJavascript({
      page_url: initialUrl,
      getMetaTagImage: true,
      getMetaTitle: true,
    }); */
  };
  //}, [initialUrl]);
  // handleBackPressed'i memoize et
  const handleBackPressed = useMemo(() => () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);


  // Navigation state değişikliklerini optimize et
  const onNavigationStateChange = useMemo(() => navState => {
    // Sadece gerçekten değişen değerleri güncelle
    setUrl(prevUrl => prevUrl !== navState.url ? navState.url : prevUrl);
    setLoading(prevLoading => prevLoading !== navState.loading ? navState.loading : prevLoading);
    setCanGoBack(prevCanGoBack => prevCanGoBack !== navState.canGoBack ? navState.canGoBack : prevCanGoBack);
    
    if (__DEV__) {
      console.log('url', navState.url);
    }
  }, []);

  // WebView event handler'ları memoize et
  const onLoadEnd = useMemo(() => () => {
    setLoading(false);
  }, []);
  
  const onLoadStart = useMemo(() => () => {
    setLoading(true);
  }, []);

  const [lastMessage, setLastMessage] = useState('');

  // onMessage'ı memoize et
  const onMessage = useMemo(() => ({ nativeEvent }) => {
    try {
      const message = JSON.parse(nativeEvent.data);
      console.log('onMessage', message);
      switch (message?.type) {
        case 'image':
          // if(lastMessage !== message.data) console.log('onMessage image:', message.data);
          setImage(message.data);
          setLastMessage(message.data);
          break;
        case 'title':
          // if(lastMessage !== message.data) console.log('onMessage title:', message.data);
          setTitle(message.data);
          setLastMessage(message.data);
          break;
        case "navtitle":
          // if(lastMessage !== message.data) console.log('onMessage navtitle:', message.data);
          navigation.setOptions({
            title: `${message.data}`,
          });

          setLastMessage(message.data);
          break;
        case 'error':
          if (lastMessage !== message.data) console.error('Error:', message.data);
          setLastMessage(message.data);
          break;
        default:
          if (lastMessage !== message.data) console.log('onMessage:', JSON.stringify(message));
          setLastMessage(message.data);
          break;
      }
    } catch (error) {
      console.error('onMessage parse error:', error);
    }
  }, [navigation, lastMessage]);

   // Header button'ı memoize et
   const headerLeftButton = useMemo(() => props => (
     <HeaderBackButton
       {...props}
       labelVisible={false}
       backTitleVisible={false}
       onPress={() => {
         if (canGoBack && webViewRef.current) {
           webViewRef.current.goBack();
         } else if(navigation.canGoBack()){
           navigation.goBack();
         }
       }}
     />
   ), [canGoBack, navigation]);
   
   // Navigation options'ı sadece canGoBack değiştiğinde güncelle
   useEffect(() => {
      navigation.setOptions({
        headerLeft: headerLeftButton,
      });
    }, [navigation, headerLeftButton]);
    
    // Android back handler'ı ayrı useEffect'te
    useEffect(() => {
      if (Platform.OS === 'android') {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPressed);
        return () => backHandler.remove();
      }
    }, [handleBackPressed]);

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>

        {/* <AuthHeader navigation={navigation} route={route} /> */}
        {/* <WebView
          source={{ uri: initialUrl }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={(req) => {
            console.log('onShouldStartLoadWithRequest', req);
            return true;
          }}
        /> */}
{ 
        <MasterWebView
          initialUrl={initialUrl}
          setSupportMultipleWindows={false}
          domStorageEnabled={true}
          javaScriptEnabled={true}
          webViewRef={webViewRef}
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
          handleBackPressed={handleBackPressed}
        />
 }
      </View>
    </SafeAreaView>
  );
});

// Display name for debugging
HomeNew.displayName = 'HomeNew';

export default HomeNew;
