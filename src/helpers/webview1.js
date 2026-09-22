import {Platform} from 'react-native';

export const isTrendyol = page_url => {
  if (!page_url || typeof page_url !== 'string') return false;
  return page_url.indexOf('trendyol.') > -1 || page_url.indexOf('trendyol.com') > -1;
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

  if (params?.getMetaPrice || true) {
    str += getMetaTagPriceAndCurrency(page_url);
  }

  if (isTrendyol(page_url)) {
    str += fixTrendyolMobileLayout();
    str += hideTrendyolBanners();
    // str += translatePage();
  }

  str += getProductOptionsBridge(page_url);
  str += getProductSnapshotBridge(page_url);

  if (params?.translatePage) {
    str += params.translatePage;
  }

  return str;
};
export const getTrendyolImage = () => {
  return getMetaTagImage();
};
export const getMetaTagImage = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 30;

    var isValidImg = function(url) {
      if (!url || typeof url !== 'string') return false;
      var str = url.trim().toLowerCase();
      if (!str || str.length < 5) return false;
      if (str.indexOf('data:image/gif') === 0 ||
          str.indexOf('data:image/svg') === 0 ||
          str.indexOf('blank.gif') > -1 ||
          str.indexOf('transparent.png') > -1 ||
          str.indexOf('logo') > -1 ||
          str.indexOf('favicon') > -1) {
        return false;
      }
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
          var match = val.match(/https?:\/\/[^"\\s\\\\]+/);
          if (match) val = match[0];
        }
      }
      if (val.indexOf('//') === 0) val = 'https:' + val;
      if (val.indexOf('/') === 0) val = window.location.origin + val;
      return isValidImg(val) ? val : '';
    };

    var checkImage = function() {
      attempts++;
      try {
        var imgUrl = '';

        // 1. Primary DOM Product Selectors (Mobile/Desktop galleries)
        var imgEl = document.querySelector(
          '#landingImage, #main-image, #imgBlkFront, img.a-dynamic-image, [data-a-image-name="landingImage"], ' +
          '#main-image-container img, .product-slide-item img, img[src*="cdn.dsmcdn.com/mnresize"], ' +
          'img[data-src*="cdn.dsmcdn.com/mnresize"], .product-image-gallery-viewport img, ' +
          'img[src*="media/images"], img[data-src*="media/images"], .detail-section-img, .base-product-image img, ' +
          '.gallery-container img, img.product-intro__head-main-img, .crop-image-container img, ' +
          '[data-test-id="product-image"] img, img.product-image'
        );
        if (imgEl) {
          var candDom = parseImageUrl(imgEl.getAttribute('data-old-hires')) ||
                         parseImageUrl(imgEl.getAttribute('data-src')) ||
                         parseImageUrl(imgEl.getAttribute('data-original')) ||
                         parseImageUrl(imgEl.getAttribute('data-a-dynamic-image')) ||
                         parseImageUrl(imgEl.currentSrc) ||
                         parseImageUrl(imgEl.src) ||
                         parseImageUrl(imgEl.getAttribute('src')) || '';
          if (candDom) {
            imgUrl = candDom;
          }
        }

        // 2. Check JSON-LD schema if DOM selector didn't find item image
        if (!imgUrl) {
          var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var i = 0; i < jsonLdScripts.length; i++) {
            try {
              var data = JSON.parse(jsonLdScripts[i].textContent);
              var items = Array.isArray(data) ? data : [data];
              for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var rawImg = item && (item.image || (item['@graph'] && Array.isArray(item['@graph']) && item['@graph'].find(function(g) { return g.image; }) ? item['@graph'].find(function(g) { return g.image; }).image : null));
                if (rawImg) {
                  var cand = Array.isArray(rawImg) ? rawImg[0] : rawImg;
                  if (typeof cand === 'object' && cand.url) cand = cand.url;
                  var parsedImg = parseImageUrl(cand);
                  if (parsedImg) {
                    imgUrl = parsedImg;
                    break;
                  }
                }
              }
            } catch(e) {}
            if (imgUrl) break;
          }
        }

        // 3. Fallback to Meta tags
        if (!imgUrl) {
          var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
          if (metaImg) {
            var val = parseImageUrl(metaImg.content || metaImg.href || '');
            if (val) {
              imgUrl = val;
            }
          }
        }

        if (imgUrl && typeof imgUrl === 'string') {
          imgUrl = imgUrl.trim();
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'image', data: imgUrl }));
          }
          if (imgInterval) clearInterval(imgInterval);
        } else if (attempts >= maxAttempts) {
          if (imgInterval) clearInterval(imgInterval);
        }
      } catch(err) {}
    };

    var imgInterval = setInterval(checkImage, 500);
    checkImage();
  })();
  `;
};

export const getMetaTagTitle = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 30;

    var cleanTitle = function(raw) {
      if (!raw || typeof raw !== 'string') return '';
      return raw
        .replace(/\\s*Fiyatı,\\s*Yorumları\\s*-\\s*Trendyol/gi, '')
        .replace(/\\s*:\\s*Amazon\\.[a-z.]+/gi, '')
        .replace(/\\s*-\\s*Amazon\\.[a-z.]+/gi, '')
        .replace(/\\s*\\|\\s*Shein/gi, '')
        .replace(/\\s*-\\s*Trendyol/gi, '')
        .trim();
    };

    var checkTitle = function() {
      attempts++;
      try {
        var title = '';
        var titleEl = document.querySelector('#productTitle, h1#title, h1.pr-new-br span, [data-automation-id="product-title"], .product-title, .pdp-title, .goods-detail-info__name, .product-intro__head-name, .product-intro__title, .goods-title');
        if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
          title = cleanTitle(titleEl.textContent.trim());
        }

        if (!title) {
          var h1 = document.querySelector('h1');
          if (h1 && h1.textContent && h1.textContent.trim()) {
            title = cleanTitle(h1.textContent.trim());
          }
        }

        if (!title) {
          var metaTag = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
          if (metaTag && metaTag.content && metaTag.content.trim()) {
            title = cleanTitle(metaTag.content.trim());
          }
        }

        if (!title && attempts > 4) {
          var docTitle = document.title || '';
          if (docTitle && docTitle.trim()) {
            title = cleanTitle(docTitle.trim());
          }
        }

        if (title) {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'title', data: title }));
          }
          if (titleInterval) clearInterval(titleInterval);
        } else if (attempts >= maxAttempts) {
          if (titleInterval) clearInterval(titleInterval);
        }
      } catch(e) {}
    };

    var titleInterval = setInterval(checkTitle, 500);
    checkTitle();
  })();
`;
};

export const getMetaTagPriceAndCurrency = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 30;

    var lastSentPrice = '';
    var lastSentCurrency = '';

    var checkPrice = function(forceSend) {
      attempts++;
      try {
        var price = '';
        var currency = '';

        var parsePriceAndCurrency = function(rawText) {
          if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
          var t = rawText.replace(/\\s+/g, ' ').trim();
          var detectedCurr = '';
          if (/(?:^|[^a-zA-Z])AED(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'AED';
          else if (/(?:^|[^a-zA-Z])SAR(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'SAR';
          else if (/(?:^|[^a-zA-Z])(TL|TRY)(?:$|[^a-zA-Z])|₺/i.test(t)) detectedCurr = 'TL';
          else if (/(?:^|[^a-zA-Z])USD(?:$|[^a-zA-Z])|\\$|US\\$/i.test(t)) detectedCurr = 'USD';
          else if (/(?:^|[^a-zA-Z])EUR(?:$|[^a-zA-Z])|€/i.test(t)) detectedCurr = 'EUR';
          else if (/(?:^|[^a-zA-Z])GBP(?:$|[^a-zA-Z])|£/i.test(t)) detectedCurr = 'GBP';

          // Strip discount percentages e.g. '-30%', '%25', '30% off', 'Save 20%'
          t = t.replace(/[-–]?[ \\t]*[0-9]+(?:\\.[0-9]+)?[ \\t]*%[ \\t]*(?:off|indirim|discount|saving|savings)?/gi, '');
          t = t.replace(/%[ \\t]*[0-9]+(?:\\.[0-9]+)?/gi, '');
          t = t.replace(/(?:save|off|indirim)[ \\t]+[0-9]+(?:\\.[0-9]+)?%?/gi, '');

          // Match price numbers:
          var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
          var cleanPrice = (matches && matches.length > 0) ? matches[0].trim() : '';

          return { price: cleanPrice, currency: detectedCurr };
        };

        // 1a. Check Trendyol application state
        try {
          if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
            var tpPrice = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product.price;
            if (tpPrice) {
              var dPrice = tpPrice.discountedPrice;
              var sPrice = tpPrice.sellingPrice;
              if (dPrice) {
                if (typeof dPrice === 'object') {
                  price = String(dPrice.value || dPrice.text || '').trim();
                } else {
                  price = String(dPrice).trim();
                }
              } else if (sPrice) {
                if (typeof sPrice === 'object') {
                  price = String(sPrice.value || sPrice.text || '').trim();
                } else {
                  price = String(sPrice).trim();
                }
              }
              if (tpPrice.currency) currency = String(tpPrice.currency).trim();
            }
          }
        } catch(_eTp) {}

        // 1b. Check Shein application state
        try {
          var shData = window.productIntroData || window.gbProductIntroData;
          if (shData && shData.detail && shData.detail.salePrice) {
            var sp = shData.detail.salePrice;
            if (sp.amount) price = String(sp.amount).trim();
            else if (sp.usdAmount) price = String(sp.usdAmount).trim();
            if (sp.currency) currency = String(sp.currency).trim();
          }
        } catch(_eSh) {}

        // 2. Live DOM selectors (Amazon mobile/desktop, Shein, Trendyol, Zara, etc.)
        var priceEl = null;
        if (!price) {
          priceEl = document.querySelector(
            'span.prc-dsc, .prc-dsc, .prc-box-dsc, .product-price-container .prc-dsc, ' +
            '#corePriceDisplay_mobile_feature_div .a-offscreen, #corePrice_mobile_feature_div .a-offscreen, ' +
            '#corePriceDisplay_desktop_feature_div .a-offscreen, #corePrice_desktop .a-offscreen, ' +
            '.apexPriceToPay .a-offscreen, #newAccordionRow .a-price .a-offscreen, #price_inside_buybox, ' +
            '#priceblock_ourprice, #priceblock_dealprice, .a-price:not([data-a-strike="true"]) .a-offscreen, ' +
            '.goods-detail-price .price, .product-price-info .discount-price, .normal-price-box .price, ' +
            '.product-intro__price-new, .goods-price, span[class*="price-val"], div[class*="price-val"], .from-price, ' +
            '.price-item--sale, .price-item, [data-test-id="price-current-price"], ' +
            '#offering-price, .product-price, .pdp-price, span.price, div.price, ' +
            '.product-intro__head-price, div.product-price-container'
          );
          if (priceEl && priceEl.textContent) {
            var parsed = parsePriceAndCurrency(priceEl.textContent);
            if (parsed.price) price = parsed.price;
            if (parsed.currency && !currency) currency = parsed.currency;
          }
        }

        // 3. Fallback to Meta tags if no DOM price found
        if (!price) {
          var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"]');
          if (metaPrice && metaPrice.content) {
            price = metaPrice.content.trim();
          }
        }
        if (!currency) {
          var metaCurrency = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[name="twitter:label1"]');
          if (metaCurrency && metaCurrency.content) {
            currency = metaCurrency.content.trim();
          }
        }

        // 3b. Check out-of-stock / currently unavailable
        if (!price) {
          var availEl = document.querySelector('#availability, .out-of-stock, [data-testid*="out-of-stock"]');
          if (availEl && /unavailable|out of stock|tükendi|stokta yok/i.test(availEl.textContent || '')) {
            price = 'Currently unavailable';
          }
        }

        // 4. Extract or infer currency if missing
        if (!currency) {
          var targetText = (priceEl ? priceEl.textContent : '') || document.body.innerText || '';
          var currMatch = targetText.match(/(TL|TRY|₺|AED|SAR|USD|EUR|GBP|\$|€|£)/i);
          if (currMatch) {
            currency = currMatch[1].toUpperCase();
          } else {
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
        }

        if (currency === '₺') currency = 'TL';
        if (currency === '$') currency = 'USD';
        if (currency === '€') currency = 'EUR';
        if (currency === '£') currency = 'GBP';

        if (price && (forceSend || price !== lastSentPrice || currency !== lastSentCurrency)) {
          lastSentPrice = price;
          lastSentCurrency = currency;
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'price', data: price }));
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'currency', data: currency || 'TL' }));
          }
        }

        if (attempts >= maxAttempts && priceInterval) {
          clearInterval(priceInterval);
          priceInterval = setInterval(function() { checkPrice(false); }, 2000);
        }
      } catch(err) {}
    };

    window.__extractAndSendPrice = function(force) {
      checkPrice(Boolean(force));
    };

    var priceInterval = setInterval(function() { checkPrice(false); }, 600);
    checkPrice(true);
  })();
`;
};

export const getProductOptionsBridge = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxFastAttempts = 20;
    var lastSentKey = '';

    var cleanText = function(text) {
      if (!text || typeof text !== 'string') return '';
      return text.replace(/\\s+/g, ' ').replace(/^[:\\-\\s]+|[:\\-\\s]+$/g, '').trim();
    };

    var cleanOptionValue = function(text) {
      if (!text || typeof text !== 'string') return '';
      var clean = text.replace(/\\s+/g, ' ').trim();
      // Strip trailing price diffs in parens/brackets, e.g. (+200 TL), (+15,00 TL), (-$5.00), (350 TL), (+5 ₺), (179.10 AED)
      clean = clean.replace(/\\s*[\\(\\[]\\s*[+\\-]?\\s*[$€£₺]?\\s*\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)?\\s*[\\)\\]]/gi, '');
      // Strip trailing price suffix separated by dash or space, e.g. " - $15.00", " 179.1 AED"
      clean = clean.replace(/\\s*[-–]\\s*[$€£₺]?\\s*\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)?$/gi, '');
      clean = clean.replace(/\\s+\\d+(?:[.,]\\d+)?\\s*(?:tl|₺|\\$|€|usd|eur|aed|sar|try)\\b.*$/gi, '');
      clean = clean.replace(/\\s*[-:]?\\s*\\b(tl|₺|\\$|€|usd|eur|aed|sar|try)\\b.*$/gi, '');
      clean = clean.replace(/^[:\\-\\s]+|[:\\-\\s]+$/g, '').trim();
      if (clean.length === 0 || clean.length > 35) return '';

      var lower = clean.toLowerCase();
      var exactJunk = [
        'select', 'seçiniz', 'seç', 'choose', 'lütfen', 'beden tablosu', 'size guide',
        'size chart', 'beden rehberi', 'out of stock', 'tükendi', 'stokta yok',
        'gelince haber ver', 'sepete ekle', 'add to cart', 'buy now', 'hemen al',
        'kargo bedava', 'free delivery', 'kupon', 'coupon', 'indirim', 'discount',
        'taksit', 'installment', 'satıcı', 'seller', 'yorum', 'review', 'değerlendirme',
        'kargo', 'teslimat', 'iade', 'return', 'share', 'paylaş', 'fiyat', 'price',
        'hızlı teslimat', 'fast shipping'
      ];
      for (var j = 0; j < exactJunk.length; j++) {
        if (lower === exactJunk[j]) return '';
        if (exactJunk[j].indexOf(' ') > -1 && lower.indexOf(exactJunk[j]) === 0) return '';
        if (exactJunk[j].length >= 5 && new RegExp('^' + exactJunk[j] + '\\\\b', 'i').test(lower)) return '';
      }

      if (/^\\d{8,}$/.test(clean)) return '';

      return clean;
    };

    var normalizeDimName = function(rawName) {
      if (!rawName || typeof rawName !== 'string') return null;
      var n = cleanText(rawName);
      var lower = n.toLowerCase();

      var ignoreDims = [
        'quantity', 'adet', 'miktar', 'qty', 'seller', 'satıcı', 'kargo',
        'teslimat', 'garanti', 'warranty', 'sigorta', 'protection', 'fiyat',
        'price', 'sepet', 'basket', 'cart', 'taksit', 'adres', 'address',
        'rating', 'review', 'kupon', 'coupon', 'shipping', 'delivery', 'guide',
        'rehber', 'tablo'
      ];
      for (var i = 0; i < ignoreDims.length; i++) {
        if (lower === ignoreDims[i] || lower.indexOf(ignoreDims[i]) > -1) return null;
      }

      if (
        lower.indexOf('beden') > -1 ||
        lower.indexOf('size') > -1 ||
        lower.indexOf('numara') > -1 ||
        lower.indexOf('ölçü') > -1 ||
        lower.indexOf('boyut') > -1 ||
        lower.indexOf('dimension') > -1
      ) return 'Size';

      if (
        lower.indexOf('renk') > -1 ||
        lower.indexOf('color') > -1 ||
        lower.indexOf('colour') > -1
      ) return 'Color';

      if (
        lower.indexOf('ağırlık') > -1 ||
        lower.indexOf('weight') > -1 ||
        lower.indexOf('gram') > -1 ||
        lower.indexOf('kg') > -1
      ) return 'Weight';

      if (
        lower.indexOf('hafıza') > -1 ||
        lower.indexOf('storage') > -1 ||
        lower.indexOf('dahili hafıza') > -1 ||
        lower.indexOf('kapasite') > -1 ||
        lower.indexOf('capacity') > -1
      ) return 'Storage';

      if (
        lower.indexOf('hacim') > -1 ||
        lower.indexOf('volume') > -1 ||
        lower.indexOf('ml') > -1
      ) return 'Volume';

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
      ) {
        return true;
      }
      var cls = String(el.className || '');
      if (
        /\\b(selected|active|is-selected|is-active|current|swatchSelect|a-button-selected|chosen|sp-itm-selected)\\b/i.test(cls) ||
        cls.indexOf('--active') > -1 ||
        cls.indexOf('--selected') > -1
      ) {
        return true;
      }
      return false;
    };

    var extractOptions = function(forceSend) {
      attempts++;
      try {
        var optionsMap = {};

        var addOptionValue = function(dimName, val, isSelected) {
          var normName = normalizeDimName(dimName);
          if (!normName) return;
          var cleanVal = cleanOptionValue(val);
          if (!cleanVal) return;

          if (!optionsMap[normName]) {
            optionsMap[normName] = { name: normName, values: [], selected: '' };
          }
          if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
            optionsMap[normName].values.push(cleanVal);
          }
          if (isSelected) {
            optionsMap[normName].selected = cleanVal;
          }
        };

        var setOptionSelected = function(dimName, selVal) {
          var normName = normalizeDimName(dimName);
          if (!normName) return;
          var cleanVal = cleanOptionValue(selVal);
          if (!cleanVal) return;

          if (!optionsMap[normName]) {
            optionsMap[normName] = { name: normName, values: [cleanVal], selected: cleanVal };
          } else {
            optionsMap[normName].selected = cleanVal;
            if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
              optionsMap[normName].values.unshift(cleanVal);
            }
          }
        };

        // 1. GENERIC "Label: Value" HEADER DETECTION
        // Common on Trendyol ("Size: 37"), Amazon ("Color: Black"), Shein ("Size: M"), etc.
        try {
          var headerEls = document.querySelectorAll('div, p, span, h2, h3, h4, label');
          for (var hi = 0; hi < headerEls.length; hi++) {
            var hText = cleanText(headerEls[hi].textContent || '');
            if (hText && hText.length < 50 && hText.indexOf(':') > -1) {
              var colonIdx = hText.indexOf(':');
              var prefix = hText.substring(0, colonIdx).trim();
              var suffix = hText.substring(colonIdx + 1).trim();

              var matchedDim = normalizeDimName(prefix);
              if (matchedDim && suffix) {
                // If suffix contains extra text like "Size guide", clean it
                var cleanedVal = cleanOptionValue(suffix.split(/\\s{2,}|\\n|\\t/)[0]);
                if (cleanedVal) {
                  setOptionSelected(matchedDim, cleanedVal);
                }
              }
            }
          }
        } catch(_eH) {}

        // 2. WINDOW APPLICATION STATE (Trendyol, Shein, Shopify)
        try {
          if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
            var tp = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;
            if (Array.isArray(tp.variants)) {
              for (var vi = 0; vi < tp.variants.length; vi++) {
                var vItem = tp.variants[vi];
                if (vItem && vItem.attributeValue) {
                  addOptionValue('Size', vItem.attributeValue, !!vItem.selected);
                }
              }
            }
            if (Array.isArray(tp.slicingAttributes)) {
              for (var si = 0; si < tp.slicingAttributes.length; si++) {
                var sAttr = tp.slicingAttributes[si];
                var sDim = normalizeDimName(sAttr.name || sAttr.type || 'Color');
                if (sDim && Array.isArray(sAttr.attributes)) {
                  for (var ai = 0; ai < sAttr.attributes.length; ai++) {
                    var aItem = sAttr.attributes[ai];
                    var aVal = aItem.name || aItem.value;
                    if (aVal) addOptionValue(sDim, aVal, !!aItem.selected);
                  }
                }
              }
            }
          }
        } catch(_e) {}

        // Shein Global Data
        try {
          var shData = window.productIntroData || window.gbProductIntroData;
          if (shData && shData.detail) {
            var dt = shData.detail;
            if (Array.isArray(dt.mainSaleAttribute)) {
              for (var m = 0; m < dt.mainSaleAttribute.length; m++) {
                var mItem = dt.mainSaleAttribute[m];
                var mDim = normalizeDimName(mItem.attr_name || 'Color');
                if (mDim && Array.isArray(mItem.attr_value_list)) {
                  for (var mv = 0; mv < mItem.attr_value_list.length; mv++) {
                    addOptionValue(mDim, mItem.attr_value_list[mv].attr_value_name, !!mItem.attr_value_list[mv].is_default);
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
                    addOptionValue(saDim, saItem.attr_value_list[sav].attr_value_name, !!saItem.attr_value_list[sav].is_default);
                  }
                }
              }
            }
          }
        } catch(_e) {}

        // Shein Mobile DOM Variant Elements
        var shColorItems = document.querySelectorAll('.goods-color__radio, .goods-color__item, .form-color-item, div[class*="color-item"], div[class*="color_item"], .product-intro__color-choose .choose-item, .goods-color-item');
        for (var sci = 0; sci < shColorItems.length; sci++) {
          var sciEl = shColorItems[sci];
          var sciImg = sciEl.querySelector('img');
          var sciVal = sciEl.getAttribute('title') || sciEl.getAttribute('aria-label') || (sciImg ? sciImg.getAttribute('alt') : '') || sciEl.textContent;
          var isSciSel = isElementActive(sciEl) || isElementActive(sciEl.parentElement);
          addOptionValue('Color', sciVal, isSciSel);
        }

        var shSizeItems = document.querySelectorAll('.goods-size__radio, .goods-size__item, .product-intro__size-choose .choose-item, div[class*="size-item"], div[class*="size_item"], .goods-size-item, div[class*="attr-radio"], .form-size-item, span[class*="val-size"]');
        for (var szi = 0; szi < shSizeItems.length; szi++) {
          var sziEl = shSizeItems[szi];
          var sziVal = sziEl.getAttribute('title') || sziEl.getAttribute('aria-label') || sziEl.textContent;
          var isSziSel = isElementActive(sziEl) || isElementActive(sziEl.parentElement);
          addOptionValue('Size', sziVal, isSziSel);
        }

        // 3. AMAZON VARIATION ROWS (Inline Twister, etc.)
        var amzRows = document.querySelectorAll('div[id^="inline-twister-row-"], div[id^="variation_"], .inline-twister-row');
        for (var r = 0; r < amzRows.length; r++) {
          var row = amzRows[r];
          var rawId = row.id || '';
          var rawFromId = rawId.replace('inline-twister-row-', '').replace('variation_', '').replace('_name', '');
          var labelEl = row.querySelector('.inline-twister-dim-title-label, label, .a-form-label, h4');
          var dimName = normalizeDimName(labelEl ? labelEl.textContent : rawFromId);
          if (!dimName) continue;

          var selEl = row.querySelector('.inline-twister-dim-title-value, .selection, span[id^="inline-twister-dim-title-value-"]');
          if (selEl) {
            setOptionSelected(dimName, selEl.textContent);
          }

          var rowSelect = row.querySelector('select');
          if (rowSelect) {
            var rOpts = rowSelect.querySelectorAll('option');
            for (var ro = 0; ro < rOpts.length; ro++) {
              if (rOpts[ro].value && rOpts[ro].value !== '-1') {
                addOptionValue(dimName, rOpts[ro].textContent, rOpts[ro].selected);
              }
            }
          } else {
            var items = row.querySelectorAll('li, div[data-csa-c-content-id], div[data-asin], .a-button-text, button');
            for (var it = 0; it < items.length; it++) {
              var itemEl = items[it];
              var img = itemEl.querySelector('img');
              var val = img ? (img.getAttribute('alt') || img.getAttribute('title') || '') : '';
              if (!val) {
                var btn = itemEl.querySelector('.a-button-text, button, span') || itemEl;
                val = btn.textContent;
              }
              var isSel = isElementActive(itemEl) || isElementActive(itemEl.parentElement);
              addOptionValue(dimName, val, isSel);
            }
          }
        }

        // 4. TRENDYOL ATTRIBUTES & VARIANTS
        var spItems = document.querySelectorAll('.sp-itm, .size-options .sp-itm, .sp-v .sp-itm, .size-item');
        for (var sp = 0; sp < spItems.length; sp++) {
          var spEl = spItems[sp];
          var isSpSel = isElementActive(spEl);
          addOptionValue('Size', spEl.textContent, isSpSel);
        }

        var tyContainers = document.querySelectorAll('.attribute-v2-container, .variants-container, div[class*="size-variant"], div[class*="color-variant"], .slicing-attributes');
        for (var t = 0; t < tyContainers.length; t++) {
          var tCont = tyContainers[t];
          var tLabel = tCont.querySelector('.attribute-v2-label, .title, .sp-itm-title, span[class*="label"]');
          var rawTName = tLabel ? tLabel.textContent : (tCont.className.indexOf('color') > -1 ? 'Color' : 'Size');
          var tDim = normalizeDimName(rawTName);
          if (!tDim) continue;

          var tSubItems = tCont.querySelectorAll('.attribute-v2-item, .sp-itm, .sl-itm, .color-item, button, a');
          for (var tsi = 0; tsi < tSubItems.length; tsi++) {
            var tsiEl = tSubItems[tsi];
            var tsiImg = tsiEl.querySelector('img');
            var tsiVal = tsiEl.getAttribute('title') || (tsiImg ? tsiImg.getAttribute('alt') : '') || tsiEl.textContent;
            var isTsiSel = isElementActive(tsiEl);
            addOptionValue(tDim, tsiVal, isTsiSel);
          }
        }

        // 5. GENERIC VARIANT CONTAINERS & SWATCHES
        var genericContainers = document.querySelectorAll(
          'fieldset, [data-component*="variant"], [class*="variant"], [class*="swatch"], [class*="option-group"], [class*="product-attribute"], [data-testid*="variant"]'
        );
        for (var gc = 0; gc < genericContainers.length; gc++) {
          var gCont = genericContainers[gc];
          var gLabel = gCont.querySelector('legend, label, [class*="title"], [class*="name"], [class*="label"], h3, h4');
          var gDim = normalizeDimName(gLabel ? gLabel.textContent : '');
          if (!gDim) continue;

          // Check selected value in label header if available
          var gSelValueEl = gCont.querySelector('[class*="selected"], [class*="value"], [class*="current"]');
          if (gSelValueEl && gSelValueEl !== gLabel) {
            setOptionSelected(gDim, gSelValueEl.textContent);
          }

          var gSwatches = gCont.querySelectorAll('button, input[type="radio"], [role="radio"], [role="button"], [class*="chip"], [class*="item"]');
          for (var sw = 0; sw < gSwatches.length; sw++) {
            var swEl = gSwatches[sw];
            var swVal = swEl.getAttribute('value') || swEl.getAttribute('title') || swEl.getAttribute('aria-label') || swEl.textContent;
            var isSwSel = isElementActive(swEl) || (swEl.tagName === 'INPUT' && swEl.checked);
            addOptionValue(gDim, swVal, isSwSel);
          }
        }

        // 6. GENERIC E-COMMERCE SELECT ELEMENTS
        var allSelects = document.querySelectorAll('select');
        for (var sc = 0; sc < allSelects.length; sc++) {
          var selBox = allSelects[sc];
          var selParent = selBox.parentElement;
          var selLabel = selBox.labels && selBox.labels[0] ? selBox.labels[0].textContent : '';
          if (!selLabel && selParent) {
            var parentLabel = selParent.querySelector('label, [class*="label"], [class*="title"]');
            if (parentLabel) selLabel = parentLabel.textContent;
          }
          var selName = normalizeDimName(selLabel || selBox.name || selBox.id || (selBox.previousElementSibling ? selBox.previousElementSibling.textContent : ''));
          if (!selName) continue;

          var sOpts = selBox.querySelectorAll('option');
          for (var so = 0; so < sOpts.length; so++) {
            if (sOpts[so].value && sOpts[so].value !== '-1') {
              addOptionValue(selName, sOpts[so].textContent, sOpts[so].selected);
            }
          }
        }

        // 7. FORMAT AND COMPILE RESULT
        var finalOptions = [];
        var sizeObj = null;
        var colorObj = null;

        var dimKeys = Object.keys(optionsMap);
        for (var k = 0; k < dimKeys.length; k++) {
          var opt = optionsMap[dimKeys[k]];
          if (opt && opt.values.length > 0 && opt.values.length <= 40) {
            opt.selected = opt.selected || '';
            finalOptions.push(opt);
            if (opt.name === 'Size') sizeObj = opt;
            if (opt.name === 'Color') colorObj = opt;
          }
        }

        var hasSize = Boolean(sizeObj && sizeObj.values.length > 0);
        var hasColor = Boolean(colorObj && colorObj.values.length > 0);

        var resultData = {
          hasOptions: finalOptions.length > 0,
          options: finalOptions,
          hasSize: hasSize,
          sizes: hasSize ? sizeObj.values : [],
          selectedSize: hasSize ? sizeObj.selected : '',
          hasColor: hasColor,
          colors: hasColor ? colorObj.values : [],
          selectedColor: hasColor ? colorObj.selected : '',
        };

        var key = JSON.stringify(resultData);
        if (forceSend || key !== lastSentKey) {
          lastSentKey = key;
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'productOptions',
              data: resultData
            }));
          }
        }

        if (attempts >= maxFastAttempts && optInterval) {
          clearInterval(optInterval);
          optInterval = setInterval(function() { extractOptions(false); }, 2000);
        }
      } catch(e) {}
    };

    window.__extractAndSendProductOptions = function(force) {
      extractOptions(Boolean(force));
    };

    var optInterval = setInterval(function() { extractOptions(false); }, 600);
    extractOptions(false);

    var notifyChange = function() {
      extractOptions(false);
      if (typeof window.__extractAndSendPrice === 'function') {
        window.__extractAndSendPrice(false);
      }
    };

    try {
      document.addEventListener('click', function() {
        setTimeout(notifyChange, 200);
        setTimeout(notifyChange, 650);
      }, true);
      document.addEventListener('change', function() {
        setTimeout(notifyChange, 150);
        setTimeout(notifyChange, 500);
      }, true);
      document.addEventListener('touchend', function() {
        setTimeout(notifyChange, 250);
        setTimeout(notifyChange, 700);
      }, true);
    } catch(e) {}

    try {
      if (window.MutationObserver) {
        var optObserver = new MutationObserver(function() {
          clearTimeout(window.__optDebounceTimer);
          window.__optDebounceTimer = setTimeout(notifyChange, 350);
        });
        optObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
      }
    } catch(e) {}
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
        if (smartBanner && smartBanner.offsetParent !== null) {
            smartBanner.style.display = 'none';
        }

        // Auto-dismiss location tooltip if present
        var anladimBtn = document.querySelector('.anladim-button, [class*="anladim"]');
        if (anladimBtn && anladimBtn.offsetParent !== null) {
            anladimBtn.click();
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

export const getProductSnapshotBridge = page_url => {
  return `
  (function() {
    window.__extractProductSnapshot = function() {
      var snapshot = {
        title: '',
        image: '',
        price: '',
        currency: '',
      };

      // 1. Title
      try {
        var cleanTitle = function(raw) {
          if (!raw || typeof raw !== 'string') return '';
          return raw
            .replace(/\\s*Fiyatı,\\s*Yorumları\\s*-\\s*Trendyol/gi, '')
            .replace(/\\s*:\\s*Amazon\\.[a-z.]+/gi, '')
            .replace(/\\s*-\\s*Amazon\\.[a-z.]+/gi, '')
            .replace(/\\s*\\|\\s*Shein/gi, '')
            .replace(/\\s*-\\s*Trendyol/gi, '')
            .trim();
        };

        var titleEl = document.querySelector('#productTitle, h1#title, h1.pr-new-br span, [data-automation-id="product-title"], .product-title, .pdp-title, .goods-detail-info__name, .product-intro__head-name, .product-intro__title, .goods-title');
        if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
          snapshot.title = cleanTitle(titleEl.textContent.trim());
        }
        if (!snapshot.title) {
          var h1 = document.querySelector('h1');
          if (h1 && h1.textContent && h1.textContent.trim()) {
            snapshot.title = cleanTitle(h1.textContent.trim());
          }
        }
        if (!snapshot.title) {
          var metaTag = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
          if (metaTag && metaTag.content && metaTag.content.trim()) {
            snapshot.title = cleanTitle(metaTag.content.trim());
          }
        }
        if (!snapshot.title) {
          var docTitle = document.title || '';
          if (docTitle && docTitle.trim()) {
            snapshot.title = cleanTitle(docTitle.trim());
          }
        }
      } catch(e) {}

      // 2. Image
      try {
        var isValidImg = function(url) {
          if (!url || typeof url !== 'string') return false;
          var str = url.trim().toLowerCase();
          if (!str || str.length < 5) return false;
          if (str.indexOf('data:image/gif') === 0 ||
              str.indexOf('data:image/svg') === 0 ||
              str.indexOf('blank.gif') > -1 ||
              str.indexOf('transparent.png') > -1 ||
              str.indexOf('logo') > -1 ||
              str.indexOf('favicon') > -1) {
            return false;
          }
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

        var imgEl = document.querySelector(
          '#landingImage, #main-image, #imgBlkFront, img.a-dynamic-image, [data-a-image-name="landingImage"], ' +
          '#main-image-container img, .product-slide-item img, img[src*="cdn.dsmcdn.com/mnresize"], ' +
          'img[data-src*="cdn.dsmcdn.com/mnresize"], .product-image-gallery-viewport img, ' +
          'img[src*="media/images"], img[data-src*="media/images"], .detail-section-img, .base-product-image img, ' +
          '.gallery-container img, img.product-intro__head-main-img, img[src*="ltwebstatic.com"], img[data-src*="ltwebstatic.com"], ' +
          '.crop-image-container img, [data-test-id="product-image"] img, img.product-image'
        );
        if (imgEl) {
          snapshot.image = parseImageUrl(imgEl.getAttribute('data-old-hires')) ||
                           parseImageUrl(imgEl.getAttribute('data-src')) ||
                           parseImageUrl(imgEl.getAttribute('data-original')) ||
                           parseImageUrl(imgEl.getAttribute('data-a-dynamic-image')) ||
                           parseImageUrl(imgEl.currentSrc) ||
                           parseImageUrl(imgEl.src) ||
                           parseImageUrl(imgEl.getAttribute('src')) || '';
        }

        if (!snapshot.image) {
          var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
          if (metaImg) {
            snapshot.image = parseImageUrl(metaImg.content || metaImg.href || '');
          }
        }
      } catch(e) {}

      // 3. Price & Currency
      try {
        var parsePriceAndCurrency = function(rawText) {
          if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
          var t = rawText.replace(/\\s+/g, ' ').trim();
          var detectedCurr = '';
          if (/(?:^|[^a-zA-Z])AED(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'AED';
          else if (/(?:^|[^a-zA-Z])SAR(?:$|[^a-zA-Z])/i.test(t)) detectedCurr = 'SAR';
          else if (/(?:^|[^a-zA-Z])(TL|TRY)(?:$|[^a-zA-Z])|₺/i.test(t)) detectedCurr = 'TL';
          else if (/(?:^|[^a-zA-Z])USD(?:$|[^a-zA-Z])|\\$|US\\$/i.test(t)) detectedCurr = 'USD';
          else if (/(?:^|[^a-zA-Z])EUR(?:$|[^a-zA-Z])|€/i.test(t)) detectedCurr = 'EUR';
          else if (/(?:^|[^a-zA-Z])GBP(?:$|[^a-zA-Z])|£/i.test(t)) detectedCurr = 'GBP';

          t = t.replace(/[-–]?[ \\t]*[0-9]+(?:\\.[0-9]+)?[ \\t]*%[ \\t]*(?:off|indirim|discount|saving|savings)?/gi, '');
          t = t.replace(/%[ \\t]*[0-9]+(?:\\.[0-9]+)?/gi, '');
          t = t.replace(/(?:save|off|indirim)[ \\t]+[0-9]+(?:\\.[0-9]+)?%?/gi, '');

          var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
          var cleanPrice = (matches && matches.length > 0) ? matches[0].trim() : '';

          return { price: cleanPrice, currency: detectedCurr };
        };

        // 3a. Trendyol App State
        try {
          if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
            var tpP = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product.price;
            if (tpP) {
              var dP = tpP.discountedPrice;
              var sP = tpP.sellingPrice;
              if (dP) {
                snapshot.price = (typeof dP === 'object') ? String(dP.value || dP.text || '').trim() : String(dP).trim();
              } else if (sP) {
                snapshot.price = (typeof sP === 'object') ? String(sP.value || sP.text || '').trim() : String(sP).trim();
              }
              if (tpP.currency) snapshot.currency = String(tpP.currency).trim();
            }
          }
        } catch(_eTp) {}

        // 3b. Shein App State
        try {
          var shD = window.productIntroData || window.gbProductIntroData;
          if (shD && shD.detail && shD.detail.salePrice) {
            var sp = shD.detail.salePrice;
            if (sp.amount) snapshot.price = String(sp.amount).trim();
            else if (sp.usdAmount) snapshot.price = String(sp.usdAmount).trim();
            if (sp.currency) snapshot.currency = String(sp.currency).trim();
          }
        } catch(_eSh) {}

        // 3c. DOM Selectors
        if (!snapshot.price) {
          var priceEl = document.querySelector(
            'span.prc-dsc, .prc-dsc, .prc-box-dsc, .product-price-container .prc-dsc, ' +
            '#corePriceDisplay_mobile_feature_div .a-offscreen, #corePrice_mobile_feature_div .a-offscreen, ' +
            '#corePriceDisplay_desktop_feature_div .a-offscreen, #corePrice_desktop .a-offscreen, ' +
            '.apexPriceToPay .a-offscreen, #newAccordionRow .a-price .a-offscreen, #price_inside_buybox, ' +
            '#priceblock_ourprice, #priceblock_dealprice, .a-price:not([data-a-strike="true"]) .a-offscreen, ' +
            '.goods-detail-price .price, .product-price-info .discount-price, .normal-price-box .price, ' +
            '.product-intro__price-new, .goods-price, span[class*="price-val"], div[class*="price-val"], .from-price, ' +
            '.price-item--sale, .price-item, [data-test-id="price-current-price"], ' +
            '#offering-price, .product-price, .pdp-price, span.price, div.price, ' +
            '.product-intro__head-price, div.product-price-container'
          );
          if (priceEl && priceEl.textContent) {
            var parsed = parsePriceAndCurrency(priceEl.textContent);
            if (parsed.price) snapshot.price = parsed.price;
            if (parsed.currency && !snapshot.currency) snapshot.currency = parsed.currency;
          }
        }

        // 3d. Meta tag fallbacks
        if (!snapshot.price) {
          var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"]');
          if (metaPrice && metaPrice.content) snapshot.price = metaPrice.content.trim();
        }
        if (!snapshot.currency) {
          var metaCurrency = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[name="twitter:label1"]');
          if (metaCurrency && metaCurrency.content) snapshot.currency = metaCurrency.content.trim();
        }

        // 3e. Inferred currency
        if (!snapshot.currency) {
          var href = window.location.href || '';
          if (href.indexOf('trendyol.com') > -1 || href.indexOf('hepsiburada.com') > -1 || href.indexOf('.tr') > -1) {
            snapshot.currency = 'TL';
          } else if (href.indexOf('amazon.ae') > -1 || href.indexOf('trendyol.ae') > -1 || href.indexOf('noon.com') > -1) {
            snapshot.currency = 'AED';
          } else if (href.indexOf('amazon.sa') > -1 || href.indexOf('trendyol.sa') > -1) {
            snapshot.currency = 'SAR';
          } else if (href.indexOf('amazon.de') > -1) {
            snapshot.currency = 'EUR';
          } else if (href.indexOf('amazon.co.uk') > -1) {
            snapshot.currency = 'GBP';
          } else {
            snapshot.currency = 'USD';
          }
        }
        if (snapshot.currency === '₺') snapshot.currency = 'TL';
        if (snapshot.currency === '$') snapshot.currency = 'USD';
        if (snapshot.currency === '€') snapshot.currency = 'EUR';
        if (snapshot.currency === '£') snapshot.currency = 'GBP';
      } catch(e) {}

      return snapshot;
    };
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
