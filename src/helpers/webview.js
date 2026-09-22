import {Platform} from 'react-native';
import { AGGRESSIVE_TAP_FIX } from './aggressiveTapFix';

export const isTrendyol = page_url => {
  if (!page_url || typeof page_url !== 'string') return false;
  return page_url.indexOf('trendyol.') > -1 || page_url.indexOf('trendyol.com') > -1;
};
export const injectedJavascript = params => {
  var page_url = params?.page_url || '';
  var str = '';

  if (params?.getMetaTagImage) {
    if (isTrendyol(page_url)) {
      console.log('getTrendyolImage');
      str += getTrendyolImage();
    } else {
      str += getMetaTagImage(page_url);
    }
  }

  if (params?.getMetaTitle) {
    str += getMetaTagTitle(page_url);
  }

  if (isTrendyol(page_url)) {
    str += fixTrendyolMobileLayout();
    str += hideTrendyolBanners();
    // str += translatePage();
  }

  if (params?.translatePage) {
    str += params.translatePage;
  }


  if(Platform.OS === 'ios'){
    // str+= AGGRESSIVE_TAP_FIX;
  }

  return str;
};

export const getTrendyolImage = () => {
  console.log('getTrendyolImage worked');

  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 30;

    var interval = setInterval(function() {
      attempts++;

      var img = document.querySelector('._carouselImage_abb7111');

      if (img && img.src) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'image', data: img.src})
        );
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);

  })();`;
};

export const getMetaTagImage = page_url => {
  return `
  (function() {
    var metaTag = document.querySelector('meta[property="og:image"]');
    if (metaTag) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'image', data: metaTag.content }));
    } else {
      // window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Meta tag bulunamadı' }));
    }
  })();
`;
};

export const getMetaTagTitle = page_url => {
  return `
  (function() {
    var metaTag = document.querySelector('meta[property="og:title"]');
  
    if (metaTag) {
      var title = metaTag.content;
      title = title.replace(' Fiyatı, Yorumları - Trendyol', '');
      title = title.trim();
      
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'title', data: title }));
    } else {
      // window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Meta tag bulunamadı' }));
    }
  })();
`;
};

export const fixTrendyolMobileLayout = () => {
  return `
    (function() {
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
    })();
  `;
};

export const hideTrendyolBanners = () => {
  return `
    (function(){
      var cleaned = { accept: false, modal: false, banner: false };
      var attempts = 0;
      var maxAttempts = 30;

      function cleanPopups() {
        if (!cleaned.accept) {
          var acceptBtn = document.querySelector('#onetrust-accept-btn-handler');
          if (acceptBtn && acceptBtn.offsetParent !== null) {
            acceptBtn.click();
            cleaned.accept = true;
          }
        }

        if (!cleaned.modal) {
          var modalCloseButton = document.querySelector('#gender-popup-modal .modal-close');
          if (modalCloseButton && modalCloseButton.offsetParent !== null) {
            modalCloseButton.click();
            cleaned.modal = true;
          }
        }

        if (!cleaned.banner) {
          var smartBanner = document.querySelector('#smartbanner');
          if (smartBanner && smartBanner.offsetParent !== null) {
            smartBanner.style.display = 'none';
            cleaned.banner = true;
          }
        }

        var anladimBtn = document.querySelector('.anladim-button, [class*="anladim"]');
        if (anladimBtn && anladimBtn.offsetParent !== null) {
          anladimBtn.click();
        }

        return cleaned.accept && cleaned.modal && cleaned.banner;
      }

      var interval = setInterval(function() {
        attempts++;
        var allDone = cleanPopups();
        if (allDone || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 1000);
    })();
`;
};


export const removeExtraTitle = title => {
  return title.replace(' Fiyatı, Yorumları - Trendyol', '');
};

export const userAgent = () => {
  return Platform.select({
    // ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1',
    // ios: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    android:
      'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
  });
};
