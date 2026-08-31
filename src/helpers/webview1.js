import {Platform} from 'react-native';

export const isTrendyol = page_url => {
  return page_url.indexOf('trendyol.com') > -1;
};
export const injectedJavascript = params => {
  var page_url = params?.page_url || '';
  var str = '';
  /* if (isTrendyol(page_url)) {
     str += `
       (function() {
         var metaTag = document.querySelector('meta[property="og:image"]');
         if (metaTag) {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'image', data: metaTag.content }));
         } else {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Meta tag bulunamadı' }));
         }
       })();
     `;
   }
 */

  // remove .add-to-basket from html
  /*
  str += `
    (function() {
    setTimeout(function(){
      var addToBasket = document.querySelector('.add-to-basket');
      if (addToBasket) {
        addToBasket.remove();
      }else{
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'info', data: 'Sepet butonu bulunamadı'}));
      }
    }, 1000);
    })();
  `;
  */

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

  return str;
};
export const getTrendyolImage = () => {
  console.log('getTrendyolImage worked');

  return `
  (function() {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({type: 'debug', data: 'Script başladı'})
    );
    
    var attempts = 0;
    var maxAttempts = 1000000;
    
    var interval = setInterval(function() {
      attempts++;
      
      var img = document.querySelector('._carouselImage_abb7111');
      
      if (img && img.src) {
        console.log('getTrendyolImage', img.src);
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'message', data: 'Resim Bulundu: ' + img.src})
        );
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'image', data: img.src})
        );
        // clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'error', data: 'Resim bulunamadı (Max deneme: ' + maxAttempts + ')'})
        );
        clearInterval(interval);
      } else {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'debug', data: 'Deneme ' + attempts + '/' + maxAttempts})
        );
      }
    }, 500); // Her 500ms'de bir kontrol et
    
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
    // #onetrust-accept-btn-handler is visible click it
    (function(){
   
    var popupCleanerInterval = setInterval(function(){
        // console.log('popupCleanerInterval', +new Date());
        var acceptBtn = document.querySelector('#onetrust-accept-btn-handler');
        if(acceptBtn && acceptBtn.offsetParent !== null){
            acceptBtn.click();
        }


        const modalCloseButton = document.querySelector('#gender-popup-modal .modal-close');
        if (modalCloseButton && modalCloseButton.offsetParent !== null) {
            modalCloseButton.click();
        }

        const smartBanner = document.querySelector('#smartbanner');
        // console.log(smartBanner);

        if (smartBanner && smartBanner.offsetParent !== null) {
            smartBanner.style.display = 'none';
        }
        
        // remove all .button_add_to_basket
        const buttons = document.querySelectorAll('.button_add_to_basket');
        if(buttons.length > 0){
          
        buttons.forEach(function(button){
            button.style.display = 'none';
        });
        
        }

    },1000);
    
      
    })();
    
`;
};

export const translatePage = () => {
  return `
  (function() {
    var replaceAllTranslates = function (translations) {
    let elements = document.querySelectorAll('body *');
    elements.forEach(element => {
      if (
        element.childNodes.length === 1 &&
        element.childNodes[0].nodeType === Node.TEXT_NODE
      ) {
        let text = element.textContent.trim();
        if (translations.hasOwnProperty(text)) {
          element.textContent = translations[text];
        }
      }
    });
  };

var grepAllMobileText = function () {
var data = [];
const productNameElement = document.querySelector('span.product_info__product_name');

// Eğer element bulunursa metnini al
const productName = productNameElement ? productNameElement.textContent.trim() : null;
if(productName){
  data.push(productName);
}

return data;
}

  var grepAllText = function () {
    var data = [];
    
    var mobileData = grepAllMobileText();
    if(mobileData.length > 0){
      data = mobileData;
    }

    // 1. Ürün Adı
    const productNameElement = document.querySelector('h1.pr-new-br span');
    if (productNameElement) {
      data.push(productNameElement.textContent.trim());
      console.log('productName', productNameElement.textContent.trim()); 
    }else{
      console.log('productName not found');
    }
    
  

    // 2. Kategori Listesi
    const categoryElements = document.querySelectorAll(
      'ul.main-nav li a.category-header',
    );
    categoryElements.forEach(category => {
      // each all children
      category.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          data.push(child.textContent.trim());
        }
      });
    });

    // 3. Ürün Açıklamaları
    const detailsList = document.querySelectorAll('ul.detail-desc-list li');
    detailsList.forEach(item => {
      // each all children
      item.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          data.push(child.textContent.trim());
        }
      });
    });

    // make uniq
   //  const uniqData = [...new Set(data)];
    // console.log({data});

    return data;
  };

  var etranslatePage = function () {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({type: 'status', data: 'translating Working'}),
    );

    var uniqData = grepAllText();
    console.log({uniqData});
    window.ReactNativeWebView.postMessage(
      JSON.stringify({type: 'translatee', data: uniqData}),
    );
    // post to server
    
    fetch('https://s4.revea.com.tr/test/translate/translate.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: 'en',
        texts: uniqData,
      }),
    })
      .then(response => response.json())
      .then(data => {
        console.log({data});
        replaceAllTranslates(data.translations);
      })
      .catch(err => {
        console.error(err);
      });
      
  };

  etranslatePage();
  
  
    })();
  `;
};

export const translatePagee = () => {
  return `
  // Translate page
  (function() {
    
    console.log('Translate page');
    
    window.ReactNativeWebView.postMessage(JSON.stringify({type: "Translate page"}));

var grepAllText = function() {
    let elements = document.querySelectorAll('body *');
    let texts = [];
    elements.forEach(element => {
        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
          var c = element.textContent.trim();
          
          if(typeof c !== "string") return;
          
          if (c && c.length > 0 && !/\\<|\\>|\\{|\\}/.test(c)) {
                texts.push(c);
            }
          
          /*
          if(c.length === 0 
          || c.indexOf('{') !== -1 
          || c.indexOf('iframe') !== -1
          ){
            return;
          }
              texts.push(c);
          
          */
          
        
        }
    });
    
    return texts;
}

/*var postTranslate = function(texts) {
    return fetch('https://s4.revea.com.tr/test/translate/translate.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target: 'en',
            texts: texts
         })
    }).then(response => response.json())
    .catch(err => {
        window.ReactNativeWebView.postMessage(JSON.stringify({err: err.message || 'Unknown error'}));
    });
}*/

var postTranslate = function(texts) {
    return fetch('https://s4.revea.com.tr/test/translate/translate.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            target: 'en',
            texts: texts
         })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
      return data;
       //  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translate response', data: data }));
    })
    .catch(err => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ err: err.message || 'Unknown error' }));
    });
}

var replaceAllTranslates = function (translations) {
    let elements = document.querySelectorAll('body *');
    elements.forEach(element => {
        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
            let text = element.textContent.trim();
            if (translations.hasOwnProperty(text)) {
                element.textContent = translations[text];
            }
        }
    });
}

var etranslatePage = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'status', data: 'translating Working' }));

    let texts = grepAllText();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translate text', data: texts }));
    // console.log(texts);
    postTranslate(texts).then(res => {
         console.log({res});
        
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translate response', data: res }));
        if(res.hasOwnProperty('translations')){
            replaceAllTranslates(res.translations);
        }else{
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: 'Translation error', res: res}));
        }
      
        // replaceAllTranslates(res.translations);
    });
}

// Call the function to translate the page
 etranslatePage();



  })();
`;
};

export const removeExtraTitle = title => {
  return title.replace(' Fiyatı, Yorumları - Trendyol', '');
};

export const userAgent = () => {
  return Platform.select({
    ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    android:
      'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
  });
};
