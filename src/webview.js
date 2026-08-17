import {Platform} from 'react-native';
import { AGGRESSIVE_TAP_FIX } from './aggressiveTapFix';

export const isTrendyol = page_url => {
  return page_url.indexOf('trendyol.com') > -1;
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

export const hideTrendyolBanners = () => {
  return `
    (function(){
      var cleaned = { accept: false, modal: false, banner: false, basket: false };
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

        if (!cleaned.basket) {
          var buttons = document.querySelectorAll('.button_add_to_basket');
          if (buttons.length > 0) {
            buttons.forEach(function(button) { button.style.display = 'none'; });
            cleaned.basket = true;
          }
        }

        return cleaned.accept && cleaned.modal && cleaned.banner && cleaned.basket;
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
