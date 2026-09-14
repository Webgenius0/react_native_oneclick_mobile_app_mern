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

  if (params?.getMetaPrice || true) {
    str += getMetaTagPriceAndCurrency(page_url);
  }

  str += checkProductPageBridge(page_url);
  str += getProductOptionsBridge(page_url);

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

    var checkImage = function() {
      attempts++;
      try {
        var imgUrl = '';

        // 1. Primary DOM Product Selectors (Mobile/Desktop galleries)
        var imgEl = document.querySelector(
          '.product-slide-item img, img[src*="cdn.dsmcdn.com/mnresize"], img[data-src*="cdn.dsmcdn.com/mnresize"], ' +
          'img[src*="media/images"], img[data-src*="media/images"], .detail-section-img, .base-product-image img, ' +
          '.gallery-container img, #landingImage, #imgBlkFront, #main-image, img.a-dynamic-image, ' +
          'img.product-intro__head-main-img, .crop-image-container img, [data-test-id="product-image"] img, img.product-image'
        );
        if (imgEl) {
          var candDom = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || imgEl.getAttribute('data-old-hires') || imgEl.getAttribute('data-a-dynamic-image') || imgEl.src || '';
          if (isValidImg(candDom)) {
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
                  if (isValidImg(cand)) {
                    imgUrl = cand;
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
            var val = metaImg.content || metaImg.href || '';
            if (isValidImg(val)) {
              imgUrl = val;
            }
          }
        }

        if (imgUrl && typeof imgUrl === 'string') {
          imgUrl = imgUrl.trim();
          if (imgUrl.indexOf('//') === 0) {
            imgUrl = 'https:' + imgUrl;
          } else if (imgUrl.indexOf('/') === 0) {
            imgUrl = window.location.origin + imgUrl;
          }

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
    try {
      var title = '';
      var metaTag = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
      if (metaTag && metaTag.content) {
        title = metaTag.content;
      } else {
        var h1 = document.querySelector('h1.pr-new-br span, h1, title');
        if (h1 && h1.textContent) {
          title = h1.textContent;
        }
      }
      if (title) {
        title = title.replace(' Fiyatı, Yorumları - Trendyol', '').trim();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'title', data: title }));
      }
    } catch(e) {}
  })();
`;
};

export const getMetaTagPriceAndCurrency = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 30;

    var checkPrice = function() {
      attempts++;
      try {
        var price = '';
        var currency = '';

        // 1. Meta tags
        var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"]');
        var metaCurrency = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[name="twitter:label1"]');

        if (metaPrice && metaPrice.content) {
          price = metaPrice.content.trim();
        }
        if (metaCurrency && metaCurrency.content) {
          currency = metaCurrency.content.trim();
        }

        // 2. JSON-LD schema if price not found
        if (!price) {
          var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var i = 0; i < jsonLdScripts.length; i++) {
            try {
              var data = JSON.parse(jsonLdScripts[i].textContent);
              var items = Array.isArray(data) ? data : [data];
              for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var offer = item && (item.offers || (item['@graph'] && Array.isArray(item['@graph']) && item['@graph'].find(function(g) { return g.offers; }) ? item['@graph'].find(function(g) { return g.offers; }).offers : null));
                if (offer) {
                  var targetOffer = Array.isArray(offer) ? offer[0] : offer;
                  if (targetOffer && targetOffer.price) {
                    price = String(targetOffer.price).trim();
                    if (targetOffer.priceCurrency) {
                      currency = String(targetOffer.priceCurrency).trim();
                    }
                    break;
                  }
                }
              }
            } catch(e) {}
            if (price) break;
          }
        }

        // 3. Fallback DOM selectors
        var priceEl = null;
        if (!price) {
          priceEl = document.querySelector('.prc-dsc, .prc-box-dsc, span.prc-dsc, div.product-price-container, .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, #corePrice_feature_div .a-offscreen, .product-intro__head-price, .price-item, [data-test-id="price-current-price"], #offering-price, .product-price, .pdp-price');
          if (priceEl && priceEl.textContent) {
            var text = priceEl.textContent.trim();
            var match = text.match(/([0-9\\.,\\s]+)\\s*([A-Za-z₺$€£AED]+)?/);
            if (match) {
              price = match[1].trim();
              if (match[2]) currency = match[2].trim();
            } else {
              price = text;
            }
          }
        }

        // 4. Extract or infer currency if missing
        if (!currency) {
          var targetText = (priceEl ? priceEl.textContent : '') || document.body.innerText || '';
          var currMatch = targetText.match(/(TL|TRY|₺|AED|SAR|USD|EUR|GBP|\\$|€|£)/i);
          if (currMatch) {
            currency = currMatch[1].toUpperCase();
          } else {
            var href = window.location.href || '';
            if (href.indexOf('trendyol.com') > -1 || href.indexOf('hepsiburada.com') > -1 || href.indexOf('.tr') > -1) {
              currency = 'TL';
            } else if (href.indexOf('amazon.ae') > -1) {
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

        if (price) {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'price', data: price }));
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'currency', data: currency || 'TL' }));
          }
          if (priceInterval) clearInterval(priceInterval);
        } else if (attempts >= maxAttempts) {
          if (priceInterval) clearInterval(priceInterval);
        }
      } catch(err) {}
    };

    var priceInterval = setInterval(checkPrice, 500);
    checkPrice();
  })();
`;
};

export const checkProductPageBridge = page_url => {
  return `
  (function() {
    var attempts = 0;
    var maxAttempts = 20;

    var check = function() {
      attempts++;
      try {
        var href = (window.location.href || '').toLowerCase();

        // 1. Strict URL pattern check
        var isProductUrl = (
          /-p-[a-z0-9_-]+/i.test(href) ||
          /-pm-[a-z0-9_-]+/i.test(href) ||
          /\/dp\/[a-z0-9]+/i.test(href) ||
          /\/gp\/aw\/d\/[a-z0-9]+/i.test(href) ||
          /\/gp\/product\/[a-z0-9]+/i.test(href) ||
          /\/d\/[a-z0-9]+/i.test(href) ||
          /\/product\/[a-z0-9_-]+/i.test(href) ||
          /\/products\/[a-z0-9_-]+/i.test(href) ||
          /\/item\/[a-z0-9_-]+/i.test(href) ||
          /\/items\/[a-z0-9_-]+/i.test(href) ||
          /\/itm\/[a-z0-9_-]+/i.test(href) ||
          /\/goods\/[a-z0-9_-]+/i.test(href) ||
          /\/pd\/[a-z0-9_-]+/i.test(href) ||
          /[?&](product_id|goods_id|item_id|pid|sku|asin)=/i.test(href)
        );

        // 2. Meta tags check for single product
        var ogType = document.querySelector('meta[property="og:type"]');
        var isProductMeta = (
          (ogType && ogType.content && ogType.content.toLowerCase().indexOf('product') > -1) ||
          !!document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]')
        );

        // 3. JSON-LD Schema check
        var isProductSchema = false;
        var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (var i = 0; i < jsonLdScripts.length; i++) {
          try {
            var text = jsonLdScripts[i].textContent || '';
            if (text.indexOf('"Product"') > -1 || text.indexOf('"@type":"Product"') > -1 || text.indexOf('"IndividualProduct"') > -1) {
              isProductSchema = true;
              break;
            }
          } catch(e) {}
        }

        // 4. Single Product DOM Elements
        var isProductDom = !!document.querySelector(
          '#add-to-cart-button, #buy-now-button, .add-to-basket, .button_add_to_basket, #addToCart, ' +
          'button[class*="add-to-cart"], a[class*="add-to-cart"], [data-test-id*="add-to-cart"], ' +
          'button[class*="addToCart"], button[class*="buy-now"], ' +
          '.product-detail-container, .product-intro, [data-goods-id], [data-product-id]'
        );

        var isProduct = isProductUrl || isProductMeta || isProductSchema || isProductDom;

        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'isProductPage',
            data: isProduct
          }));
        }

        if (isProduct || attempts >= maxAttempts) {
          if (checkInterval) clearInterval(checkInterval);
        }
      } catch(err) {}
    };

    var checkInterval = setInterval(check, 500);
    check();
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
      // Strip trailing price diffs, e.g. (+200 TL), (+15,00 TL), (-$5.00), (350 TL), +10 ₺
      clean = clean.replace(/\\s*[\\(\\[]?[+\\-]?\\s*\\d+([.,]\\d+)?\\s*(tl|₺|\\$|€|usd|eur)[\\)\\]]?/gi, '');
      clean = clean.replace(/^[:\\-\\s]+|[:\\-\\s]+$/g, '').trim();
      if (clean.length === 0 || clean.length > 25) return '';

      var lower = clean.toLowerCase();
      var junkWords = [
        'select', 'seçiniz', 'seç', 'choose', 'lütfen', 'beden tablosu', 'size guide',
        'size chart', 'beden rehberi', 'out of stock', 'tükendi', 'stokta yok',
        'gelince haber ver', 'sepete ekle', 'add to cart', 'buy now', 'hemen al',
        'kargo bedava', 'free delivery', 'kupon', 'coupon', 'indirim', 'discount',
        'taksit', 'installment', 'satıcı', 'seller', 'yorum', 'review', 'değerlendirme',
        'kargo', 'teslimat', 'iade', 'return', 'share', 'paylaş', 'fiyat', 'price'
      ];
      for (var j = 0; j < junkWords.length; j++) {
        if (lower === junkWords[j] || lower.indexOf(junkWords[j]) === 0) return '';
      }

      // Discard pure digits >= 7 chars (barcodes / skus)
      if (/^\\d{7,}$/.test(clean)) return '';

      return clean;
    };

    var normalizeDimName = function(rawName) {
      if (!rawName || typeof rawName !== 'string') return null;
      var n = cleanText(rawName);
      var lower = n.toLowerCase();

      // Junk dimensions to ignore
      var ignoreDims = ['quantity', 'adet', 'miktar', 'qty', 'seller', 'satıcı', 'kargo', 'teslimat', 'garanti', 'warranty', 'sigorta', 'protection', 'fiyat', 'price', 'sepet', 'basket', 'cart', 'taksit', 'adres', 'address'];
      for (var i = 0; i < ignoreDims.length; i++) {
        if (lower.indexOf(ignoreDims[i]) > -1) return null;
      }

      // Valid e-commerce variant dimensions only
      if (lower.indexOf('beden') > -1 || lower.indexOf('size') > -1 || lower.indexOf('numara') > -1 || lower.indexOf('ölçü') > -1 || lower.indexOf('boyut') > -1 || lower.indexOf('dimension') > -1) return 'Size';
      if (lower.indexOf('renk') > -1 || lower.indexOf('color') > -1 || lower.indexOf('colour') > -1) return 'Color';
      if (lower.indexOf('model') > -1 || lower.indexOf('tip') > -1 || lower === 'type') return 'Model';
      if (lower.indexOf('ağırlık') > -1 || lower.indexOf('weight') > -1 || lower.indexOf('gram') > -1 || lower.indexOf('kg') > -1) return 'Weight';
      if (lower.indexOf('kapasite') > -1 || lower.indexOf('capacity') > -1 || lower.indexOf('hafıza') > -1 || lower.indexOf('storage') > -1 || lower.indexOf('hacim') > -1) return 'Capacity';
      if (lower.indexOf('stil') > -1 || lower.indexOf('style') > -1 || lower.indexOf('tarz') > -1) return 'Style';
      if (lower.indexOf('desen') > -1 || lower.indexOf('pattern') > -1) return 'Pattern';

      return null;
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
          if (isSelected && !optionsMap[normName].selected) {
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

        // 1. WINDOW APPLICATION STATE (Trendyol, Shein, Hepsiburada)
        // Trendyol Product State
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

        // 2. AMAZON VARIATION DIMENSIONS (Mobile & Desktop)
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
              var isSel = itemEl.classList.contains('swatchSelect') || itemEl.classList.contains('a-button-selected') || itemEl.getAttribute('aria-checked') === 'true';
              addOptionValue(dimName, val, isSel);
            }
          }
        }

        // Amazon Global / Mobile Dropdowns
        var amzDropdowns = document.querySelectorAll('select[name^="dropdown_selected_"], select[id^="dropdown_selected_"], select[id^="native_dropdown_selected_"]');
        for (var ad = 0; ad < amzDropdowns.length; ad++) {
          var adSel = amzDropdowns[ad];
          var adName = normalizeDimName(adSel.name || adSel.id || '');
          if (adName) {
            var adOpts = adSel.querySelectorAll('option');
            for (var ao = 0; ao < adOpts.length; ao++) {
              if (adOpts[ao].value && adOpts[ao].value !== '-1') {
                addOptionValue(adName, adOpts[ao].textContent, adOpts[ao].selected);
              }
            }
          }
        }

        // 3. TRENDYOL ATTRIBUTES & VARIANTS (Mobile .sp-itm & Desktop)
        var spItems = document.querySelectorAll('.sp-itm, .size-options .sp-itm, .sp-v .sp-itm, .size-item');
        for (var sp = 0; sp < spItems.length; sp++) {
          var spEl = spItems[sp];
          var isSpSel = spEl.classList.contains('selected') || spEl.classList.contains('active') || spEl.getAttribute('aria-checked') === 'true';
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
            var isTsiSel = tsiEl.classList.contains('selected') || tsiEl.classList.contains('active') || tsiEl.getAttribute('aria-checked') === 'true';
            addOptionValue(tDim, tsiVal, isTsiSel);
          }
        }

        // 4. HEPSIBURADA ATTRIBUTES & VARIANTS
        var hbContainers = document.querySelectorAll('div[data-test-id="variant-property"], div[class*="variantProperty"], div[class*="VariantProperty"], div[class*="variant-property"]');
        for (var h = 0; h < hbContainers.length; h++) {
          var hCont = hbContainers[h];
          var hTitle = hCont.querySelector('span[class*="variantTitle"], div[data-test-id="variant-name"], label[class*="variant"]');
          var hDim = normalizeDimName(hTitle ? hTitle.textContent : '');
          if (!hDim) continue;

          var hItems = hCont.querySelectorAll('a[data-test-id="variant-item"], div[class*="variantItem"], div[class*="variant-item"], button');
          for (var hi = 0; hi < hItems.length; hi++) {
            var hEl = hItems[hi];
            var hImg = hEl.querySelector('img');
            var hVal = hEl.getAttribute('title') || (hImg ? hImg.getAttribute('alt') : '') || hEl.textContent;
            var isHSel = hEl.classList.contains('selected') || hEl.getAttribute('aria-selected') === 'true';
            addOptionValue(hDim, hVal, isHSel);
          }
        }

        // 5. SHEIN DOM ATTRIBUTES & VARIANTS
        var shContainers = document.querySelectorAll('div[class*="product-intro__attr-item"], div[class*="goods-size"], div[class*="goods-color"], div[data-attr-type]');
        for (var s = 0; s < shContainers.length; s++) {
          var sCont = shContainers[s];
          var sTitle = sCont.querySelector('[class*="attr-title"], [class*="attr-name"], .val-title');
          var sDim = normalizeDimName(sTitle ? sTitle.textContent : (sCont.getAttribute('data-attr-type') || ''));
          if (!sDim) continue;

          var shEls = sCont.querySelectorAll('.goods-size__radio, .goods-color__radio, [data-attr-type] button, .val-item');
          for (var shi = 0; shi < shEls.length; shi++) {
            var shEl = shEls[shi];
            var shVal = shEl.getAttribute('title') || shEl.getAttribute('aria-label') || shEl.textContent;
            var isShSel = shEl.classList.contains('active') || shEl.classList.contains('selected') || shEl.getAttribute('aria-checked') === 'true';
            addOptionValue(sDim, shVal, isShSel);
          }
        }

        // 6. GENERIC E-COMMERCE SELECTS
        var allSelects = document.querySelectorAll('select');
        for (var sc = 0; sc < allSelects.length; sc++) {
          var selBox = allSelects[sc];
          var selName = normalizeDimName(selBox.name || selBox.id || (selBox.previousElementSibling ? selBox.previousElementSibling.textContent : ''));
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
          if (opt && opt.values.length > 0 && opt.values.length <= 35) {
            if (!opt.selected) opt.selected = opt.values[0];
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

    try {
      document.addEventListener('click', function() {
        setTimeout(function() { extractOptions(false); }, 200);
      }, true);
      document.addEventListener('change', function() {
        setTimeout(function() { extractOptions(false); }, 150);
      }, true);
      document.addEventListener('touchend', function() {
        setTimeout(function() { extractOptions(false); }, 250);
      }, true);
    } catch(e) {}

    try {
      if (window.MutationObserver) {
        var optObserver = new MutationObserver(function() {
          clearTimeout(window.__optDebounceTimer);
          window.__optDebounceTimer = setTimeout(function() { extractOptions(false); }, 300);
        });
        optObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
      }
    } catch(e) {}
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
