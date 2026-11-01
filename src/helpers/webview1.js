import { Platform } from 'react-native';
import { cleanProductTitle, getFallbackTitleFromUrl } from './storeHelper';
export { cleanProductTitle, getFallbackTitleFromUrl };

// SHEIN's CDN now serves product images as .avif URLs. The Android image stack
// (Glide via FastImage / Fresco via RN Image) cannot decode AVIF on API < 31,
// while the same path with a .jpg extension returns an identical, decodable
// image from the same CDN. Rewrite .avif to .jpg for SHEIN CDN hosts so the
// cart image loads on every supported Android version.
export const normalizeProductImageUrl = url => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (trimmed.toLowerCase().indexOf('ltwebstatic.com') === -1) return url;
  if (!/\.avif(?:[?#]|$)/i.test(trimmed)) return url;
  return trimmed.replace(/\.avif(?=[?#]|$)/i, '.jpg');
};

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
      if (str.indexOf('data:') === 0) return false;
      if (str.indexOf('.svg') > -1 || str.indexOf('/svgicons/') > -1 || str.indexOf('/icons/') > -1 || str.indexOf('/icon_') > -1 || str.indexOf('icon-') > -1) return false;
      if (str.indexOf('blank.gif') > -1 || str.indexOf('transparent.png') > -1 || str.indexOf('spacer.gif') > -1) return false;
      if (str.indexOf('logo') > -1 || str.indexOf('favicon') > -1) return false;
      if (str.indexOf('http://') !== 0 && str.indexOf('https://') !== 0) return false;
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
          var match = val.match(new RegExp('https?://[^"\\\\s\\\\\\\\]+'));
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
        var imgSelectors = [
          // Amazon main images
          '#landingImage',
          '#main-image',
          '#imgBlkFront',
          'img.a-dynamic-image',
          '[data-a-image-name="landingImage"]',
          '#main-image-container img',
          '#imageBlock img',
          '#canvasImage',
          '#ebooks-img-canvas img',
          'div[data-action="main-image-click"] img',
          'div#media-canvas img',
          'img[data-a-hires]',
          'img[src*="media-amazon.com/images/I/"]',
          'img[src*="images-amazon.com/images/I/"]',

          // Trendyol product images
          '.product-slide-item img',
          'img[src*="cdn.dsmcdn.com/mnresize"]',
          'img[data-src*="cdn.dsmcdn.com/mnresize"]',
          'img[src*="cdn.dsmcdn.com/ty"]',
          'img[data-src*="cdn.dsmcdn.com/ty"]',
          '.product-image-gallery-viewport img',

          // Shein specific product images (avoid SVG icons)
          'img.crop-image-container__img',
          '.crop-image-container img',
          '.product-intro__head-main img',
          'img.product-intro__head-main-img',
          '.goods-detail-gallery img',
          '.detail-gallery img',
          '.swiper-slide-active img',
          'img[data-before-crop-src]',
          'img[src*="ltwebstatic.com/images"]',
          'img[data-src*="ltwebstatic.com/images"]',
          'img[src*="_thumbnail_"]',
          'img[data-src*="_thumbnail_"]',

          // Zara / H&M / Noon / Other stores
          'img[src*="static.zara.net/photos"]',
          'img[data-src*="static.zara.net/photos"]',
          '.media-image img',
          'img[src*="lp2.hm.com"]',
          'img[src*="f.nooncdn.com/p/"]',
          'img[data-src*="f.nooncdn.com/p/"]',
          '[data-qa="div-gallery"] img',
          '.detail-section-img',
          '.base-product-image img',
          '.gallery-container img',
          '[data-test-id="product-image"] img',
          '.a-carousel-card img',
          'img.product-image'
        ];
        for (var sIdx = 0; sIdx < imgSelectors.length; sIdx++) {
          var candidateEls = document.querySelectorAll(imgSelectors[sIdx]);
          for (var cIdx = 0; cIdx < candidateEls.length; cIdx++) {
            var cEl = candidateEls[cIdx];
            var candDom = parseImageUrl(cEl.getAttribute('data-a-hires')) ||
                          parseImageUrl(cEl.getAttribute('data-old-hires')) ||
                          parseImageUrl(cEl.getAttribute('data-before-crop-src')) ||
                          parseImageUrl(cEl.getAttribute('data-src')) ||
                          parseImageUrl(cEl.getAttribute('data-lazy-src')) ||
                          parseImageUrl(cEl.getAttribute('data-original')) ||
                          parseImageUrl(cEl.getAttribute('data-origin-src')) ||
                          parseImageUrl(cEl.getAttribute('data-a-dynamic-image')) ||
                          parseImageUrl(cEl.currentSrc) ||
                          parseImageUrl(cEl.src) ||
                          parseImageUrl(cEl.getAttribute('src')) || '';
            if (candDom && isValidImg(candDom)) {
              imgUrl = candDom;
              break;
            }
          }
          if (imgUrl) break;
        }

        // 2. Fallback to Meta tags
        if (!imgUrl) {
          var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
          if (metaImg) {
            var candMeta = parseImageUrl(metaImg.content || metaImg.href || metaImg.getAttribute('content') || '');
            if (candMeta && isValidImg(candMeta)) {
              imgUrl = candMeta;
            }
          }
        }

        // 2b. Fallback to Shein / Store application state
        if (!imgUrl) {
          try {
            var shImgData = window.productIntroData || window.gbProductIntroData;
            if (shImgData && shImgData.detail) {
              var dtImg = (shImgData.detail.goods_imgs && shImgData.detail.goods_imgs.main_image && shImgData.detail.goods_imgs.main_image.origin_image) ||
                          shImgData.detail.original_img ||
                          shImgData.detail.goods_img;
              if (dtImg) {
                var pDt = parseImageUrl(dtImg);
                if (pDt && isValidImg(pDt)) imgUrl = pDt;
              }
            }
            if (!imgUrl && window.goodsInfo && window.goodsInfo.original_img) {
              var pGi = parseImageUrl(window.goodsInfo.original_img);
              if (pGi && isValidImg(pGi)) imgUrl = pGi;
            }
          } catch(_eShImg) {}
        }

        // 3. Check JSON-LD schema if DOM selector didn't find item image
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
                  if (parsedImg && isValidImg(parsedImg)) {
                    imgUrl = parsedImg;
                    break;
                  }
                }
              }
            } catch(e) {}
            if (imgUrl) break;
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
      var str = raw.replace(/\\r\\n|\\r|\\n|\\t/g, ' ').replace(/\\s+/g, ' ').trim();
      str = str
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ');
      str = str.replace(/^(?:Amazon(?:\\.[a-z.]+)?|Trendyol|Hepsiburada(?:\\.com)?|Shein|Zara|Noon|AliExpress|eBay|Walmart(?:\\.com)?|Nike(?:\\.com)?|Apple|Asos|Mango|H&M)\\s*[:|–—\\-]\\s*/gi, '');
      str = str.replace(/^(?:Visit the\\s+[^\\n\\r]+?\\s+Store|Brand:\\s*[^:\\n\\r]+?)\\s+/gi, '');
      str = str
        .replace(/\\s*Fiyatı,?\\s*Yorumları\\s*-\\s*Trendyol.*$/gi, '')
        .replace(/\\s*Fiyatı\\s*-\\s*Trendyol.*$/gi, '')
        .replace(/\\s*-\\s*Trendyol.*$/gi, '')
        .replace(/\\s*\\|\\s*Trendyol.*$/gi, '')
        .replace(/\\s*Fiyatı\\s*-\\s*Hepsiburada.*$/gi, '')
        .replace(/\\s*-\\s*Hepsiburada.*$/gi, '')
        .replace(/\\s*\\|\\s*Hepsiburada.*$/gi, '')
        .replace(/\\s*[:|–—\\-]\\s*Amazon\\.[a-z.]+(\\s*:.*)?$/gi, '')
        .replace(/\\s*[:|–—\\-]\\s*Amazon$/gi, '')
        .replace(/\\s*\\|\\s*Amazon.*$/gi, '')
        .replace(/\\s*\\|\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
        .replace(/\\s*-\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
        .replace(/\\s*\\|\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
        .replace(/\\s*-\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
        .replace(/\\s*\\|\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
        .replace(/\\s*-\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
        .replace(/\\s*\\|\\s*noon.*$/gi, '')
        .replace(/\\s*-\\s*noon.*$/gi, '')
        .replace(/\\s*-\\s*AliExpress(?:\\s+\\d+)?.*$/gi, '')
        .replace(/\\s*\\|\\s*AliExpress.*$/gi, '')
        .replace(/\\s*\\|\\s*eBay.*$/gi, '')
        .replace(/\\s*-\\s*eBay.*$/gi, '')
        .replace(/\\s*\\.?\\s*Nike\\.com.*$/gi, '')
        .replace(/\\s*\\|\\s*Nike.*$/gi, '')
        .replace(/\\s*-\\s*Walmart\\.com.*$/gi, '')
        .replace(/\\s*\\|\\s*Walmart.*$/gi, '')
        .replace(/\\s*[:|–—\\-]\\s*[a-z0-9-]+\\.(?:com|org|net|tr|ae|sa|co\\.uk|de|fr|es|it|ru|cn)(?:\\.[a-z]+)?\\s*$/gi, '');
      str = str.replace(/\\s*:\\s*(?:Electronics|Cell Phones & Accessories|Clothing, Shoes & Jewelry|Home & Kitchen|Beauty & Personal Care|Health & Household|Sports & Outdoors|Toys & Games|Automotive|Tools & Home Improvement|Office Products|Pet Supplies|Baby Products|Grocery & Gourmet Food|Moda|Elektronik|Ev & Yaşam|Mutfak|Kişisel Bakım|Spor & Outdoor|Oto & Yapı Market|Kitap|Oyuncak|Bebek|Computers? & Accessories|Video Games|Musical Instruments|Books|Luggage & Travel Gear|Industrial & Scientific)\\s*$/gi, '');
      str = str.replace(/\\s*\\d+(?:\\.\\d+)?\\s*(?:out of 5 stars|stars|yıldız).*$/gi, '');
      str = str.replace(/\\s*\\(\\s*\\d+(?:,\\d+)*\\s*(?:ratings?|reviews?|değerlendirme|yorum)\\s*\\).*$/gi, '');
      str = str.replace(/^[\\s:|–—•·\"'\\-]+|[\\s:|–—•·\"'\\-]+$/g, '').trim();
      if (/^ref[=_\s-]/i.test(str) || str.toLowerCase().indexOf('ref=') === 0 || /product summary|key product information/i.test(str)) return '';
      return str.replace(/\\s+/g, ' ').trim();
    };

    var checkTitle = function() {
      attempts++;
      try {
        var title = '';

        // Priority 1: JSON-LD Product schema
        try {
          var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var j = 0; j < ldScripts.length; j++) {
            var ldObj = JSON.parse(ldScripts[j].textContent);
            var ldItems = Array.isArray(ldObj) ? ldObj : [ldObj];
            for (var k = 0; k < ldItems.length; k++) {
              var item = ldItems[k];
              if (!item) continue;
              if (item['@type'] === 'Product' && item.name && typeof item.name === 'string') {
                var cName = cleanTitle(item.name);
                if (cName && cName.length > 2) { title = cName; break; }
              }
              if (Array.isArray(item['@graph'])) {
                for (var g = 0; g < item['@graph'].length; g++) {
                  var gItem = item['@graph'][g];
                  if (gItem && gItem['@type'] === 'Product' && gItem.name && typeof gItem.name === 'string') {
                    var cgName = cleanTitle(gItem.name);
                    if (cgName && cgName.length > 2) { title = cgName; break; }
                  }
                }
              }
            }
            if (title) break;
          }
        } catch (_ldErr) {}

        // Priority 2: High-specificity product title DOM selectors in strict priority order
        if (!title) {
          var prioritySelectors = [
            '#title_feature_div #productTitle',
            '#title #productTitle',
            '#productTitle',
            'h1.pr-new-br span',
            'h1.pr-new-br',
            '[data-automation-id="product-title"]',
            '.goods-detail-info__name',
            '.product-intro__head-name',
            '.product-intro__title',
            '.goods-title',
            'h1[data-test-id="product-title"]',
            'h1[itemprop="name"]',
            'h1#title',
            '[data-feature-name="title"] h1',
            '[data-feature-name="title"] #productTitle',
            '.product-title',
            '.pdp-title',
            '.product-detail__title',
            '.product__title',
            '#title h1',
            'h1'
          ];

          for (var p = 0; p < prioritySelectors.length; p++) {
            var el = document.querySelector(prioritySelectors[p]);
            if (el) {
              var elClass = String(el.className || '');
              if (/(^|[\s.;-])(a-offscreen|a-screen-reader|sr-only)($|[\s.;-])/i.test(elClass) ||
                  (el.offsetParent === null && window.getComputedStyle && window.getComputedStyle(el).position !== 'fixed')) {
                continue;
              }
              var rawText = (el.textContent || '').trim();
              if (rawText && rawText.length > 1) {
                var cleaned = cleanTitle(rawText);
                if (cleaned && cleaned.length > 2 &&
                    !/^(product|oneclick|-)$/i.test(cleaned) &&
                    !/product summary|key product information/i.test(cleaned)) {
                  title = cleaned;
                  break;
                }
              }
            }
          }
        }

        // Priority 3: OpenGraph / Twitter meta tags
        if (!title) {
          var metaTag = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
          if (metaTag && metaTag.content && metaTag.content.trim()) {
            var metaCleaned = cleanTitle(metaTag.content.trim());
            if (metaCleaned && metaCleaned.length > 2 && !/product summary|key product information/i.test(metaCleaned)) {
              title = metaCleaned;
            }
          }
        }

        // Priority 4: Document title
        if (!title && attempts > 4) {
          var docTitle = document.title || '';
          if (docTitle && docTitle.trim()) {
            var docCleaned = cleanTitle(docTitle.trim());
            if (docCleaned && docCleaned.length > 2 && !/product summary|key product information/i.test(docCleaned)) {
              title = docCleaned;
            }
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

        var isStruckOrOldPriceElement = function(el) {
          if (!el) return false;
          try {
            if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') return true;
            if (el.getAttribute && el.getAttribute('data-a-strike') === 'true') return true;
            var cls = String(el.className || '');
            if (/(^|[\s.;-])(bsc-strikethrough-price|prc-org|prc-box-org|prc-slg|a-text-price|basisPrice|line-through|crossed)($|[\s.;-])/i.test(cls)) return true;
            if (/(^|[\s.;-])(original-price|originalPrice|orig-price|old-price|oldPrice|oldprice|was-price|wasPrice|price-was|del-price|head-price-del|market-price|retail-price|productPrice__del|product-price__del)($|[\s.;-])/i.test(cls)) return true;
            if (el.closest && el.closest('del, s, strike, [data-a-strike="true"], .bsc-strikethrough-price, .a-text-price, .basisPrice, .prc-org, .prc-box-org, [class*="original-price"], [class*="old-price"], [class*="was-price"], [class*="head-price-del"], [class*="strikethrough"], [class*="del-price"], [class*="productPrice__del"], [class*="product-price__del"]')) {
              return true;
            }
          } catch(_e) {}
          return false;
        };

        var getCleanElementPriceText = function(el) {
          if (!el) return '';
          if (isStruckOrOldPriceElement(el)) return '';
          if (el.tagName === 'META') return el.getAttribute('content') || el.content || '';
          if (el.getAttribute && el.getAttribute('content') && /^[0-9]/.test(el.getAttribute('content'))) {
            return el.getAttribute('content');
          }
          try {
            var clone = el.cloneNode(true);
            var oldNodes = clone.querySelectorAll(
              'del, s, strike, [data-a-strike="true"], .bsc-strikethrough-price, .a-text-price, .basisPrice, .prc-org, .prc-box-org, .prc-slg, ' +
              '[class*="bsc-strikethrough"], [class*="head-price-del"], [class*="del-price"], [class*="market-price"], [class*="retail-price"], ' +
              '[class*="original-price"], [class*="originalPrice"], [class*="orig-price"], ' +
              '[class*="old-price"], [class*="oldPrice"], [class*="oldprice"], ' +
              '[class*="was-price"], [class*="wasPrice"], [class*="price-was"], ' +
              '[class*="strike"], [class*="line-through"], [class*="crossed"]'
            );
            for (var oi = 0; oi < oldNodes.length; oi++) {
              oldNodes[oi].remove();
            }
            return clone.textContent || clone.innerText || '';
          } catch(_eClone) {
            return el.textContent || el.innerText || '';
          }
        };

        var parsePriceAndCurrency = function(rawText) {
          if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
          var t = rawText.replace(/\s+/g, ' ').trim();
          // Convert Arabic-Indic digits ٠-٩ to 0-9
          t = t.replace(/[٠-٩]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 1632 + 48); });
          var detectedCurr = '';
          if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:AED|د\.?إ|د\.?ا|درهم)(?:$|[^a-zA-Z\u0600-\u06FF])|\u20C3/i.test(t)) detectedCurr = 'AED';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:SAR|SR|ر\.?س|ريال)(?:$|[^a-zA-Z\u0600-\u06FF])|[﷼\uFDFC\u20C1⃁]/i.test(t)) detectedCurr = 'SAR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:KWD|د\.?ك)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'KWD';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:QAR|ر\.?ق)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'QAR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:TL|TRY)(?:$|[^a-zA-Z\u0600-\u06FF])|₺/i.test(t)) detectedCurr = 'TL';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:USD|US\$)(?:$|[^a-zA-Z\u0600-\u06FF])|\$/i.test(t)) detectedCurr = 'USD';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])EUR(?:$|[^a-zA-Z\u0600-\u06FF])|€/i.test(t)) detectedCurr = 'EUR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])GBP(?:$|[^a-zA-Z\u0600-\u06FF])|£/i.test(t)) detectedCurr = 'GBP';

          // Strip discount percentages e.g. '-30%', '%25', '30% off', 'Save 20%'
          t = t.replace(/[-–]?[ \t]*[0-9]+(?:\.[0-9]+)?[ \t]*%[ \t]*(?:off|indirim|discount|saving|savings)?/gi, '');
          t = t.replace(/%[ \t]*[0-9]+(?:\.[0-9]+)?/gi, '');
          t = t.replace(/(?:save|off|indirim)[ \t]+[0-9]+(?:\.[0-9]+)?%?/gi, '');
          t = t.replace(/(?:save|tasarruf|indirim|saving|savings)\s*[$€£₺]?\s*[0-9]+(?:[.,][0-9]{1,2})?/gi, '');

          // Match price numbers:
          var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
          if (!matches || matches.length === 0) return { price: '', currency: detectedCurr };

          // In clean element, the first price is the selling/discount price
          var cleanPrice = matches[0].trim();
          return { price: cleanPrice, currency: detectedCurr };
        };

        // 1. Prioritized DOM Discount / Current Price extraction (gives live on-screen discounted prices)
        var candidatePriceSelectors = [
          // Shein Mobile & Desktop Live Discount / Selling Prices
          '.floor-price',
          '[class*="floor-price"]',
          '[class*="floorPrice"]',
          '.productPrice',
          '[class*="productPrice__main"]',
          '[class*="productPriceContainer"]',
          '[class*="productPrice"]',
          '[class*="product-price" i]',
          '[class*="productprice" i]',
          '.bsc-main-price',
          '[class*="bsc-main-price"]',
          '.product-intro__head-price-text',
          '.product-intro__head-price',
          '.product-intro__price-new',
          '.product-intro__price',
          '[class*="product-intro__head-price"]',
          '[class*="product-intro__price"]',
          '[class*="selling-price" i]',
          '[class*="sellingPrice" i]',
          '[class*="real-price" i]',
          '[class*="realPrice" i]',
          '[class*="shein-price" i]',
          '[class*="goods-price" i]',
          '[class*="goodsPrice" i]',
          '[class*="goods-detail-price" i]',
          '[class*="goodsDetailPrice" i]',
          '[data-price]',
          '[data-sku-price]',
          '[aria-label*="price" i]',
          '[aria-label*="Price" i]',
          '[itemprop="price"]',
          'span[itemprop="price"]',

          // Trendyol Discount / Campaign Prices
          'span.prc-dsc',
          '.prc-dsc',
          '.prc-box-dsc',
          '.product-price-container .prc-dsc',
          '.basket-discount-price',
          '.campaign-price',
          '.badge-basket-discount',
          '.discounted-price',

          // Amazon PriceToPay / Deal / BuyBox / Non-struck Prices
          '#corePriceDisplay_mobile_feature_div .priceToPay .a-offscreen',
          '#corePrice_mobile_feature_div .priceToPay .a-offscreen',
          '#apex_mobile_feature_div .priceToPay .a-offscreen',
          '.priceToPay .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
          '#corePrice_desktop .priceToPay .a-offscreen',
          '.apexPriceToPay .a-offscreen',
          '#priceblock_dealprice',
          '#priceblock_saleprice',
          '#price_inside_buybox',
          '#corePriceDisplay_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '#corePrice_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '#apex_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '.a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '.reinventPricePriceToPayMargin .a-offscreen',

          // Additional Shein / General Selectors
          '[class*="from-price"]',
          '[class*="goods-detail-price"]',
          '[class*="discount-price"]',
          '[class*="sale-price"]',
          '[class*="current-price"]',
          '[class*="currentPrice"]',
          '[class*="now-price"]',
          '[class*="priceNow"]',
          '[class*="normal-price"]',
          '.goods-detail-price .discount-price',
          '.product-price-info .discount-price',
          '.goods-detail-price .price',
          '.goods-price',
          '[data-test-id*="price"]',

          // Hepsiburada / Noon Current Prices
          '[data-test-id="price-current-price"]',
          '[data-test-id="price-discount-price"]',
          '[data-qa="div-price-now"]',
          '.priceNow',
          '#offering-price',

          // Generic E-Commerce / Shopify / WooCommerce Sale Prices
          'ins .amount',
          'ins [class*="price"]',
          '.price-item--sale',
          '.special-price',
          '.sale-price',
          '.discount-price',
          '.discounted-price',
          '[class*="discountPrice"]',
          '[class*="discountedPrice"]',
          '[class*="salePrice"]',
          '.product-price-container',
          '.product-price',
          '.pdp-price',

          // AliExpress / Carrefour / iHerb / YesStyle price selectors
          '[class*="currentPriceText"]',
          '[class*="price--currentPriceText"]',
          '[class*="price--current"]',
          '[class*="product-price-current"]',
          '[class*="product-price-value"]',
          '.uniform-banner-box-price',
          '[class*="uniform-banner-box-price"]',
          '.price-current',
          '.es--wrap-- [class*="price"]',
          '[class*="snow-price"]',
          '[data-pl="product-price"]',
          '.product-price-value',
          '#our-price',
          '.our-price',
          '.item-price',
          '.price-tag',
          '[class*="itemPrice"]',
          '[class*="price-now"]',
          '[class*="now-price"]'
        ];

        var priceEl = null;
        for (var s = 0; s < candidatePriceSelectors.length; s++) {
          var elList = document.querySelectorAll(candidatePriceSelectors[s]);
          for (var ei = 0; ei < elList.length; ei++) {
            var currEl = elList[ei];
            if (isStruckOrOldPriceElement(currEl)) continue;
            var raw = getCleanElementPriceText(currEl);
            if (raw && /[0-9]/.test(raw)) {
              var parsed = parsePriceAndCurrency(raw);
              if (parsed.price) {
                price = parsed.price;
                if (parsed.currency && !currency) currency = parsed.currency;
                priceEl = currEl;

                // Inspect currEl's ancestors up to 6 levels for currency symbols (AED, SAR, TL, then USD)
                if (!currency && currEl) {
                  var pNode = currEl;
                  for (var pi = 0; pi < 6 && pNode; pi++) {
                    var pText = pNode.textContent || '';
                    if (/د\.?إ|د\.?ا|درهم|\bAED\b|\u20C3/i.test(pText)) { currency = 'AED'; break; }
                    if (/[﷼\uFDFC\u20C1⃁]|ر\.?س|ريال|\bSAR\b/i.test(pText)) { currency = 'SAR'; break; }
                    if (/₺|\bTL\b|\bTRY\b/i.test(pText)) { currency = 'TL'; break; }
                    if (/\$|\bUSD\b/i.test(pText)) { currency = 'USD'; break; }
                    pNode = pNode.parentElement;
                  }
                }

                if (!currency && currEl) {
                  var containerEl = (currEl.closest && currEl.closest(
                    '[class*="head-price"], [class*="floor-price"], [class*="product-price"], [class*="productPrice"], [class*="goods-price"], [class*="selling-price"], [class*="goodsPrice"], .product-intro__head-price'
                  )) || currEl.parentElement;
                  if (containerEl) {
                    var containerText = getCleanElementPriceText(containerEl);
                    var parsedContainer = parsePriceAndCurrency(containerText);
                    if (parsedContainer.currency) {
                      currency = parsedContainer.currency;
                    }
                  }
                }
                break;
              }
            }
          }
          if (price) break;
        }

        // 2a. Check Trendyol application state (if DOM extraction hasn't found price yet)
        if (!price) {
          try {
            if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
              var tpProd = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;
              var selectedVarPrice = null;
              if (Array.isArray(tpProd.variants)) {
                var selVar = tpProd.variants.find(function(v) { return v && v.selected; });
                if (selVar && selVar.price) {
                  selectedVarPrice = selVar.price;
                }
              }
              var tpPrice = selectedVarPrice || tpProd.price;
              if (tpPrice) {
                var dPrice = tpPrice.discountedPrice;
                var sPrice = tpPrice.sellingPrice;
                if (dPrice) {
                  var dVal = typeof dPrice === 'object' ? (dPrice.value || dPrice.text || '') : dPrice;
                  if (dVal && dVal !== '0' && dVal !== 0) {
                    price = String(dVal).trim();
                  }
                }
                if (!price && sPrice) {
                  var sVal = typeof sPrice === 'object' ? (sPrice.value || sPrice.text || '') : sPrice;
                  if (sVal) price = String(sVal).trim();
                }
                if (tpPrice.currency && !currency) currency = String(tpPrice.currency).trim();
              }
            }
          } catch(_eTp) {}
        }

        // 2b. Check Shein application state
        if (!price) {
          try {
            if (window.gbCommonInfo) {
              var ssr = window.gbCommonInfo.contextForSSR;
              if (ssr) {
                if (!price && ssr.googleSEO && ssr.googleSEO.goodsDetailSchema && ssr.googleSEO.goodsDetailSchema.offers) {
                  var shSchema = ssr.googleSEO.goodsDetailSchema;
                  if (shSchema.offers) {
                    var off = shSchema.offers;
                    var pOff = off.price || off.lowPrice || '';
                    if (pOff) price = String(pOff).trim();
                    if (!currency && off.priceCurrency) currency = String(off.priceCurrency).trim();
                  }
                }
                if (!price && ssr.detail) {
                  var dtSsr = ssr.detail;
                  var spSsr = (dtSsr.currentSku && (dtSsr.currentSku.sku_sale_price || dtSsr.currentSku.salePrice || dtSsr.currentSku.price)) || dtSsr.salePrice || dtSsr.sale_price || dtSsr.retailPrice || dtSsr.originalPrice;
                  if (spSsr) {
                    if (typeof spSsr === 'object') {
                      if (spSsr.amount) price = String(spSsr.amount).trim();
                      else if (spSsr.usdAmount) price = String(spSsr.usdAmount).trim();
                      else if (spSsr.amountWithSymbol) {
                        var pResSsr = parsePriceAndCurrency(spSsr.amountWithSymbol);
                        if (pResSsr.price) { price = pResSsr.price; if (pResSsr.currency && !currency) currency = pResSsr.currency; }
                      }
                      if (spSsr.currency && !currency) currency = String(spSsr.currency).trim();
                    } else if (typeof spSsr === 'number' || typeof spSsr === 'string') {
                      var pResSsr2 = parsePriceAndCurrency(String(spSsr));
                      if (pResSsr2.price) { price = pResSsr2.price; if (pResSsr2.currency && !currency) currency = pResSsr2.currency; }
                    }
                  }
                }
              }
            }
            var shData = window.productIntroData || window.gbProductIntroData;
            if (shData && shData.detail) {
              var dt = shData.detail;
              var sp = (dt.currentSku && (dt.currentSku.sku_sale_price || dt.currentSku.salePrice || dt.currentSku.price)) || dt.salePrice || dt.sale_price || dt.retailPrice || dt.originalPrice;
              if (sp) {
                if (typeof sp === 'object') {
                  if (sp.amount) price = String(sp.amount).trim();
                  else if (sp.usdAmount) price = String(sp.usdAmount).trim();
                  else if (sp.amountWithSymbol) {
                    var pRes = parsePriceAndCurrency(sp.amountWithSymbol);
                    if (pRes.price) { price = pRes.price; if (pRes.currency && !currency) currency = pRes.currency; }
                  }
                  if (sp.currency && !currency) currency = String(sp.currency).trim();
                } else if (typeof sp === 'number' || typeof sp === 'string') {
                  var pRes2 = parsePriceAndCurrency(String(sp));
                  if (pRes2.price) { price = pRes2.price; if (pRes2.currency && !currency) currency = pRes2.currency; }
                }
              }
            }
            if (!price && window.goodsInfo) {
              var gP = window.goodsInfo.sale_price || window.goodsInfo.retail_price;
              if (gP) {
                var pRes3 = parsePriceAndCurrency(String(gP));
                if (pRes3.price) { price = pRes3.price; if (pRes3.currency && !currency) currency = pRes3.currency; }
              }
            }
          } catch(_eSh) {}
        }

        // 2b-1. OpenGraph / Product Meta Price
        if (!price) {
          try {
            var metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[name="twitter:data1"], [itemprop="price"]');
            if (metaPrice) {
              var mpVal = metaPrice.getAttribute('content') || metaPrice.content || metaPrice.textContent || '';
              var pResMeta = parsePriceAndCurrency(mpVal);
              if (pResMeta.price) {
                price = pResMeta.price;
                var metaCurr = document.querySelector('meta[property="product:price:currency"], meta[property="og:price:currency"], meta[itemprop="priceCurrency"]');
                if (metaCurr && !currency) {
                  currency = (metaCurr.getAttribute('content') || metaCurr.content || '').trim();
                }
              }
            }
          } catch(_eMp) {}
        }

        // 2b. Check AliExpress application state
        if (!price) {
          try {
            var rp = window.runParams && (window.runParams.data || window.runParams);
            var initD = window.__INITIAL_DATA__ && (window.__INITIAL_DATA__.data || window.__INITIAL_DATA__);
            var didaD = window._dida_config_ && window._dida_config_._init_data_ && (window._dida_config_._init_data_.data || window._dida_config_._init_data_);
            var aliObj = rp || initD || didaD;
            if (aliObj) {
              var pc = aliObj.priceComponent || (aliObj.productInfoComponent && aliObj.productInfoComponent.priceComponent) || (aliObj.skuComponent && aliObj.skuComponent.selectedSkuPrice);
              if (pc) {
                var rawAli = pc.formatedActivityPrice || pc.formatedPrice || (pc.activityAmount && pc.activityAmount.value) || (pc.origPriceComponent && pc.origPriceComponent.formatedPrice);
                if (rawAli) {
                  var pResAli = parsePriceAndCurrency(String(rawAli));
                  if (pResAli.price) {
                    price = pResAli.price;
                    if (pResAli.currency && !currency) currency = pResAli.currency;
                  }
                }
              }
            }
          } catch(_eAli) {}
        }

        // 2c. JSON-LD schema price check (AliExpress, Amazon, Shopify, etc.)
        if (!price) {
          var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var jld = 0; jld < jsonLdScripts.length; jld++) {
            try {
              var ldData = JSON.parse(jsonLdScripts[jld].textContent);
              var ldArr = Array.isArray(ldData) ? ldData : [ldData];
              for (var kld = 0; kld < ldArr.length; kld++) {
                var item = ldArr[kld];
                var offers = item && (item.offers || (item['@graph'] && Array.isArray(item['@graph']) && item['@graph'].find(function(g) { return g.offers; }) ? item['@graph'].find(function(g) { return g.offers; }).offers : null));
                if (offers) {
                  var offer = Array.isArray(offers) ? offers[0] : offers;
                  var offPrice = offer && (offer.price || offer.lowPrice || offer.highPrice);
                  if (offer && offPrice) {
                    var offPStr = String(offPrice).trim();
                    if (offPStr && offPStr !== '0') {
                      price = offPStr;
                      if (offer.priceCurrency && !currency) currency = String(offer.priceCurrency).trim();
                      break;
                    }
                  }
                }
              }
            } catch(_eLd) {}
            if (price) break;
          }
        }

        // 3. Fallback to Meta tags if no DOM price found
        if (!price) {
          var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"], [itemprop="price"]');
          if (metaPrice) {
            var rawMeta = metaPrice.getAttribute('content') || metaPrice.getAttribute('value') || metaPrice.textContent || '';
            if (rawMeta && /\d/.test(rawMeta)) {
              var parsedMeta = parsePriceAndCurrency(rawMeta);
              if (parsedMeta.price) price = parsedMeta.price;
              if (parsedMeta.currency && !currency) currency = parsedMeta.currency;
            }
          }
        }
        // 3b. Check out-of-stock / currently unavailable
        if (!price) {
          var availEl = document.querySelector('#availability, .out-of-stock, [data-testid*="out-of-stock"]');
          if (availEl && /unavailable|out of stock|tükendi|stokta yok/i.test(availEl.textContent || '')) {
            price = 'Currently unavailable';
          }
        }

        // 4. Extract or infer currency if missing (For Shein: check native cookie and gbCommonInfo FIRST!)
        var isSheinSite = (window.location && window.location.hostname && window.location.hostname.indexOf('shein.') > -1);
        if (isSheinSite && !currency) {
          try {
            if (document.cookie) {
              var ckNative = document.cookie.match(/(?:^|;\s*)currency=([A-Za-z]{3})(?:;|$)/i);
              if (ckNative && ckNative[1]) {
                var ckuNat = ckNative[1].toUpperCase();
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuNat) > -1) currency = ckuNat;
              }
              if (!currency) {
                var ckM = document.cookie.match(/(?:^|;\s*)(?:currency|shein_currency|sitecurrency|local_currency|user_currency)=([A-Za-z]{3})/i);
                if (ckM && ckM[1]) {
                  var cku = ckM[1].toUpperCase();
                  if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(cku) > -1) currency = cku;
                }
              }
            }
            if (!currency && window.gbCommonInfo && window.gbCommonInfo.currency) {
              var gbC = String(window.gbCommonInfo.currency).toUpperCase().trim();
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(gbC) > -1) currency = gbC;
            }
            if (!currency && window.localStorage) {
              var lsCur = window.localStorage.getItem('currency') || window.localStorage.getItem('shein_currency') || window.localStorage.getItem('currency_code');
              if (lsCur && typeof lsCur === 'string') {
                lsCur = lsCur.trim().toUpperCase().replace(/[^A-Z]/g, '');
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(lsCur) > -1) currency = lsCur;
              }
            }
          } catch(eSheinCk) {}
        }

        if (!currency) {
          var targetText = (priceEl ? priceEl.textContent : '') || '';
          if (priceEl && priceEl.parentElement) {
            targetText += ' ' + priceEl.parentElement.textContent;
          }
          if (!targetText && !isSheinSite && document.body) {
            targetText = document.body.innerText.slice(0, 3000);
          }
          var currMatch = targetText.match(/\b(TL|TRY|AED|SAR|KWD|QAR|USD|EUR|GBP)\b|([₺$€£﷼\uFDFC\u20C1⃁\u20C3]|د\.?إ|د\.?ا|درهم|ر\.?س|ريال)/i);
          if (currMatch) {
            var rawMatchedCurr = (currMatch[1] || currMatch[2] || currMatch[0]).trim();
            if (/د\.?إ|د\.?ا|درهم|\u20C3/i.test(rawMatchedCurr) || rawMatchedCurr.toUpperCase() === 'AED') currency = 'AED';
            else if (/[﷼\uFDFC\u20C1⃁]|ر\.?س|ريال/i.test(rawMatchedCurr) || rawMatchedCurr.toUpperCase() === 'SAR') currency = 'SAR';
            else if (rawMatchedCurr === '₺' || rawMatchedCurr.toUpperCase() === 'TL') currency = 'TL';
            else if (rawMatchedCurr === '$' || rawMatchedCurr.toUpperCase() === 'USD') currency = 'USD';
            else if (rawMatchedCurr === '€' || rawMatchedCurr.toUpperCase() === 'EUR') currency = 'EUR';
            else if (rawMatchedCurr === '£' || rawMatchedCurr.toUpperCase() === 'GBP') currency = 'GBP';
            else currency = rawMatchedCurr.toUpperCase();
          }
        }

        if (!currency && document.cookie) {
          try {
            var ckNative = document.cookie.match(/(?:^|;\s*)currency=([A-Za-z]{3})(?:;|$)/i);
            if (ckNative && ckNative[1]) {
              var ckuNat = ckNative[1].toUpperCase();
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuNat) > -1) currency = ckuNat;
            }
            if (!currency) {
              var ckM = document.cookie.match(/(?:^|;\s*)(?:currency|shein_currency|sitecurrency|local_currency|user_currency)=([A-Za-z]{3})/i);
              if (ckM && ckM[1]) {
                var cku = ckM[1].toUpperCase();
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(cku) > -1) currency = cku;
              }
            }
          } catch(eSheinCk) {}
        }

        if (!currency && window.gbCommonInfo && window.gbCommonInfo.currency) {
          try {
            var gbC = String(window.gbCommonInfo.currency).toUpperCase().trim();
            if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(gbC) > -1) currency = gbC;
          } catch(eGb) {}
        }

        if (!currency && window.localStorage) {
          try {
            var lsCur = window.localStorage.getItem('currency') || window.localStorage.getItem('shein_currency') || window.localStorage.getItem('currency_code');
            if (lsCur && typeof lsCur === 'string') {
              lsCur = lsCur.trim().toUpperCase().replace(/[^A-Z]/g, '');
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(lsCur) > -1) currency = lsCur;
            }
          } catch(eLs) {}
        }

        if (!currency) {
          var metaCurrency = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[name="twitter:label1"]');
          if (metaCurrency && metaCurrency.content) {
            currency = metaCurrency.content.trim();
          }
        }

        if (!currency) {
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
          } else if (href.indexOf('shein.') > -1) {
            if (href.indexOf('shein.ae') > -1) {
              currency = 'AED';
            } else if (href.indexOf('us.shein.com') > -1 || href.indexOf('/us/') > -1) {
              currency = 'USD';
            } else if (href.indexOf('/sa/') > -1 || href.indexOf('.sa') > -1) {
              currency = 'SAR';
            } else if (href.indexOf('/ar-en/') > -1 || href.indexOf('/ar/') > -1) {
              currency = 'SAR';
            } else {
              currency = 'USD';
            }
          } else if (href.indexOf('amazon.com') > -1 || href.indexOf('aliexpress.com') > -1 || href.indexOf('iherb.com') > -1 || href.indexOf('yesstyle.com') > -1) {
            currency = 'USD';
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
            if (href.indexOf('shein.') > -1 && currency && /^[A-Z]{3}$/.test(currency)) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'shein_currency_selected', currency: currency }));
            }
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

    // Listen for variant clicks/taps to re-check price immediately
    document.addEventListener('click', function() {
      setTimeout(function() { checkPrice(true); }, 300);
      setTimeout(function() { checkPrice(true); }, 900);
    }, true);

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
        'rehber', 'tablo', 'chart', 'model', 'waist', 'bust', 'hip', 'hips', 'height', 'shoulder',
        'omuz', 'göğüs', 'bel', 'basen', 'boy', 'paça', 'uzunluk', 'length', 'sleeve', 'kol'
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
        /(^|[\s.;-])(selected|active|is-selected|is-active|current|swatchSelect|a-button-selected|chosen|sp-itm-selected)($|[\s.;-])/i.test(cls) ||
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

        var addOptionValue = function(dimName, val, isSelected, explicitPrice) {
          var normName = normalizeDimName(dimName);
          if (!normName) return;
          if (!val) return;
          var strVal = String(val).trim();

          // If a value contains embedded "/ Size: ...", separate them
          var sizeEmbedMatch = strVal.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
          if (sizeEmbedMatch) {
            strVal = sizeEmbedMatch[1].trim();
            var extractedSize = cleanOptionValue(sizeEmbedMatch[2]);
            if (extractedSize) {
              setOptionSelected('Size', extractedSize);
            }
          }
          var colorEmbedMatch = strVal.match(/^(.*?)\s*[\/,|]\s*(?:color|renk)\s*:\s*([^,\/|]+)/i);
          if (colorEmbedMatch) {
            strVal = colorEmbedMatch[1].trim();
            var extractedColor = cleanOptionValue(colorEmbedMatch[2]);
            if (extractedColor) {
              setOptionSelected('Color', extractedColor);
            }
          }

          var isAgeOrMeasurement = function(s) {
            if (!s || typeof s !== 'string') return false;
            var str = s.trim();
            if (/\b\d+\s*[-–/]\s*\d+\s*(?:y|m|yr|yrs|mo|mos|ya[sş]|years?|months?|t|cm|mm|in|inch)(?![a-zA-Z0-9])/i.test(str)) return true;
            if (/[\(\[]\s*\d+\s*[-–/]\s*\d+\s*(?:y|m|yr|yrs|mo|mos|ya[sş]|years?|months?|t)?\s*[\)\]]/i.test(str)) return true;
            if (/^\d+\s*[-–/]\s*\d+$/i.test(str)) return true;
            if (/^\d+[yYtTmM]$/i.test(str)) return true;
            return false;
          };

          // Try extracting price if explicitPrice is missing
          var optPrice = explicitPrice ? String(explicitPrice).trim() : '';
          if (!optPrice && strVal && !isAgeOrMeasurement(strVal)) {
            var pMatch = strVal.match(
              /[\(\[]\s*([+\-]?\s*(?:[$€£₺]|(?:usd|eur|tl|try|aed|sar|kwd|qar|bhd|omr)\b)\s*[0-9]+(?:[.,][0-9]{1,2})?|[+\-]?\s*[0-9]+(?:[.,][0-9]{1,2})?\s*(?:[$€£₺]|(?:usd|eur|tl|try|aed|sar|kwd|qar|bhd|omr)\b)|[+\-]\s*[0-9]+(?:[.,][0-9]{1,2})?)\s*[\)\]]|[-–]\s*([$€£₺]|(?:usd|eur|tl|try|aed|sar|kwd|qar|bhd|omr)\b)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*([$€£₺]|(?:usd|eur|tl|try|aed|sar|kwd|qar|bhd|omr)\b)?/i
            );
            if (pMatch) {
              var hasCurrencyOrSign = /[$€£₺]|(?:usd|eur|tl|try|aed|sar|kwd|qar|bhd|omr)/i.test(pMatch[0]) || /^[+\-]/.test(pMatch[0].trim());
              if (hasCurrencyOrSign) {
                var numMatch = pMatch[0].match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                if (numMatch) {
                  optPrice = numMatch[0];
                }
              }
            }
          }

          var cleanVal = cleanOptionValue(strVal);
          if (!cleanVal) return;

          // Pure measurements in cm (e.g. "83 cm") must NOT overwrite or be added as Size when clothing sizes exist
          if (normName === 'Size' && /^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(cleanVal)) {
            if (optionsMap['Size'] && optionsMap['Size'].values.some(function(v) { return !/^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(v); })) {
              return;
            }
          }

          if (!optionsMap[normName]) {
            optionsMap[normName] = { name: normName, values: [], selected: '', prices: {} };
          }
          if (!optionsMap[normName].prices) {
            optionsMap[normName].prices = {};
          }
          if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
            optionsMap[normName].values.push(cleanVal);
          }
          if (optPrice) {
            optionsMap[normName].prices[cleanVal] = optPrice;
          }
          if (isSelected) {
            optionsMap[normName].selected = cleanVal;
            if (!optionsMap[normName].prices[cleanVal] && window.__currentProductPrice) {
              optionsMap[normName].prices[cleanVal] = String(window.__currentProductPrice).trim();
            }
          }
        };

        var setOptionSelected = function(dimName, selVal) {
          var normName = normalizeDimName(dimName);
          if (!normName) return;
          var strSel = String(selVal).trim();
          var sizeMatch = strSel.match(/^(.*?)\s*[\/,|]\s*(?:size|beden|numara)\s*:\s*([^,\/|]+)/i);
          if (sizeMatch) {
            strSel = sizeMatch[1].trim();
            var embSize = cleanOptionValue(sizeMatch[2]);
            if (embSize) setOptionSelected('Size', embSize);
          }
          var cleanVal = cleanOptionValue(strSel);
          if (!cleanVal) return;

          if (normName === 'Size' && /^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(cleanVal)) {
            if (optionsMap['Size'] && optionsMap['Size'].values.some(function(v) { return !/^\d+(?:\.\d+)?\s*(?:cm|inch|in|mm)$/i.test(v); })) {
              return;
            }
          }

          if (!optionsMap[normName]) {
            optionsMap[normName] = { name: normName, values: [cleanVal], selected: cleanVal, prices: {} };
          } else {
            optionsMap[normName].selected = cleanVal;
            if (optionsMap[normName].values.indexOf(cleanVal) === -1) {
              optionsMap[normName].values.unshift(cleanVal);
            }
          }
          if (!optionsMap[normName].prices) {
            optionsMap[normName].prices = {};
          }
          if (window.__currentProductPrice && !optionsMap[normName].prices[cleanVal]) {
            optionsMap[normName].prices[cleanVal] = String(window.__currentProductPrice).trim();
          }
        };

        // 1. GENERIC "Label: Value" HEADER DETECTION
        // Common on Trendyol ("Size: 37"), Amazon ("Color: Black"), Shein ("Size: M", "Color: Blue and White / Size: M"), etc.
        try {
          var headerEls = document.querySelectorAll('div, p, span, h2, h3, h4, label');
          for (var hi = 0; hi < headerEls.length; hi++) {
            var hText = cleanText(headerEls[hi].textContent || '');
            if (hText && hText.length < 80 && hText.indexOf(':') > -1) {
              var parts = hText.split(/\s*[\/,|]\s*/);
              for (var pi = 0; pi < parts.length; pi++) {
                var pSub = parts[pi].trim();
                var cIdx = pSub.indexOf(':');
                if (cIdx > -1) {
                  var pDim = normalizeDimName(pSub.substring(0, cIdx));
                  var pVal = cleanOptionValue(pSub.substring(cIdx + 1));
                  if (pDim && pVal) {
                    setOptionSelected(pDim, pVal);
                  }
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
                  var vPrice = (vItem.price && vItem.price.discountedPrice && (vItem.price.discountedPrice.value || vItem.price.discountedPrice.text)) ||
                               (vItem.price && vItem.price.sellingPrice && (vItem.price.sellingPrice.value || vItem.price.sellingPrice.text)) || '';
                  addOptionValue('Size', vItem.attributeValue, !!vItem.selected, vPrice ? String(vPrice) : '');
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
            var skuPriceMap = {};
            if (Array.isArray(dt.skuList)) {
              for (var sk = 0; sk < dt.skuList.length; sk++) {
                var sku = dt.skuList[sk];
                var skP = (sku.sku_sale_price && (sku.sku_sale_price.amount || sku.sku_sale_price.usdAmount)) ||
                          (sku.sale_price && (sku.sale_price.amount || sku.sale_price.usdAmount)) || '';
                if (skP && Array.isArray(sku.attr_value_id)) {
                  for (var avid = 0; avid < sku.attr_value_id.length; avid++) {
                    skuPriceMap[String(sku.attr_value_id[avid])] = String(skP);
                  }
                }
              }
            }

            if (Array.isArray(dt.mainSaleAttribute)) {
              for (var m = 0; m < dt.mainSaleAttribute.length; m++) {
                var mItem = dt.mainSaleAttribute[m];
                var mDim = normalizeDimName(mItem.attr_name || 'Color');
                if (mDim && Array.isArray(mItem.attr_value_list)) {
                  for (var mv = 0; mv < mItem.attr_value_list.length; mv++) {
                    var mValItem = mItem.attr_value_list[mv];
                    var mPrice = skuPriceMap[String(mValItem.attr_value_id)] || '';
                    var isMSel = !!mValItem.is_default;
                    if (dt.currentSku && Array.isArray(dt.currentSku.attr_value_id)) {
                      if (dt.currentSku.attr_value_id.indexOf(mValItem.attr_value_id) > -1 || dt.currentSku.attr_value_id.indexOf(String(mValItem.attr_value_id)) > -1) {
                        isMSel = true;
                      }
                    }
                    addOptionValue(mDim, mValItem.attr_value_name, isMSel, mPrice);
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
                    var sValItem = saItem.attr_value_list[sav];
                    var sPrice = skuPriceMap[String(sValItem.attr_value_id)] || '';
                    var isSSel = false;
                    if (dt.currentSku) {
                      if (Array.isArray(dt.currentSku.attr_value_id)) {
                        isSSel = dt.currentSku.attr_value_id.indexOf(sValItem.attr_value_id) > -1 || dt.currentSku.attr_value_id.indexOf(String(sValItem.attr_value_id)) > -1;
                      } else if (dt.currentSku.attr_value_id == sValItem.attr_value_id || (dt.currentSku.attr_value_name && dt.currentSku.attr_value_name === sValItem.attr_value_name)) {
                        isSSel = true;
                      }
                    }
                    addOptionValue(saDim, sValItem.attr_value_name, isSSel, sPrice);
                  }
                }
              }
            }

            if (dt.currentSku && Array.isArray(dt.currentSku.sale_attr_list)) {
              for (var cal = 0; cal < dt.currentSku.sale_attr_list.length; cal++) {
                var cObj = dt.currentSku.sale_attr_list[cal];
                var cName = normalizeDimName(cObj.attr_name || cObj.name || '');
                var cVal = cleanOptionValue(cObj.attr_value_name || cObj.value_name || cObj.value || '');
                if (cName && cVal) {
                  setOptionSelected(cName, cVal);
                }
              }
            }
          }
        } catch(_e) {}

        // Shein Mobile DOM Variant Elements - Color
        var shColorHeader = document.querySelector('#color-heading, .bs-main-sales-attr__header-title, [class*="main-sales-attr__header"]');
        if (shColorHeader && shColorHeader.textContent) {
          var hText = shColorHeader.textContent.trim();
          var cSep = hText.indexOf(':');
          if (cSep > -1) {
            var cHeadVal = cleanOptionValue(hText.substring(cSep + 1));
            if (cHeadVal) {
              setOptionSelected('Color', cHeadVal);
            }
          }
        }

        var shColorItems = document.querySelectorAll(
          '.bs-color__item, .bs-color-square-image__item, [class*="bs-color"], ' +
          '.goods-color__radio, .goods-color__item, .form-color-item, ' +
          'div[class*="color-item"], div[class*="color_item"], ' +
          '.product-intro__color-choose .choose-item, .goods-color-item'
        );
        for (var sci = 0; sci < shColorItems.length; sci++) {
          var sciEl = shColorItems[sci];
          if (sciEl.tagName === 'UL' || (sciEl.tagName === 'DIV' && sciEl.children.length > 2 && !sciEl.getAttribute('role'))) continue;
          var sciImg = sciEl.querySelector('img');
          var sciVal = sciEl.getAttribute('aria-label') || sciEl.getAttribute('title') || (sciImg ? (sciImg.getAttribute('alt') || sciImg.getAttribute('title')) : '') || sciEl.textContent;
          sciVal = cleanOptionValue(sciVal);
          if (!sciVal) continue;
          var isSciSel = (sciEl.getAttribute('aria-checked') === 'true') ||
                         (sciEl.getAttribute('aria-selected') === 'true') ||
                         /\b(active|selected|color-active)\b/i.test(sciEl.className || '') ||
                         isElementActive(sciEl) ||
                         isElementActive(sciEl.parentElement);
          addOptionValue('Color', sciVal, isSciSel);
        }

        var isSheinSizeSelected = function(el) {
          if (!el) return false;
          if (el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true') return true;
          var cls = String(el.className || '');
          if (/\b(size-active|selected|active|is-selected|is-active)\b/i.test(cls)) return true;
          if (isElementActive(el)) return true;
          var input = el.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input && input.checked) return true;
          var parent = el.parentElement;
          if (parent && (parent.getAttribute('aria-selected') === 'true' || parent.getAttribute('aria-checked') === 'true')) return true;
          if (parent && !/\b(list|container|wrap|choose|group|items|row|box|content)\b/i.test(parent.className || '')) {
            if (isElementActive(parent)) return true;
          }
          return false;
        };

        var shSizeItems = document.querySelectorAll(
          '.goods-size__sizes-item:not([class*="options-item"]), ' +
          '.goods-size__sizes li, .choose-size li, [class*="choose-size"] li, ' +
          '.goods-size__radio, .goods-size__item, .product-intro__size-choose .choose-item, ' +
          'div[class*="size-item"]:not([class*="options-item"]), div[class*="size_item"], .goods-size-item, div[class*="attr-radio"], .form-size-item'
        );
        for (var szi = 0; szi < shSizeItems.length; szi++) {
          var sziEl = shSizeItems[szi];
          if (sziEl.closest && (sziEl.closest('.goods-size__options') || sziEl.closest('[class*="options-item"]'))) continue;
          if (sziEl.classList && sziEl.classList.contains('goods-size__options-item')) continue;
          var nameEl = sziEl.querySelector('.goods-size__sizes-item-text, [class*="sizes-item-text"], .val-size, [class*="val-size"], .size-name, [class*="size-name"], .sub-title-main, p');
          var sziVal = (nameEl ? nameEl.textContent : '') || sziEl.getAttribute('title') || sziEl.getAttribute('aria-label') || sziEl.textContent;
          if (sziVal) {
            sziVal = sziVal.trim();
            var isSziSel = isSheinSizeSelected(sziEl);
            addOptionValue('Size', sziVal, isSziSel);
          }
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
                var rOptPrice = rOpts[ro].getAttribute('data-price') || '';
                addOptionValue(dimName, rOpts[ro].textContent, rOpts[ro].selected, rOptPrice);
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

              // Extract swatch price from swatch element if present
              var optPrice = '';
              var pEl = itemEl.querySelector('.twisterSwatchPrice, [class*="SwatchPrice"], [class*="swatch-price"], .a-color-secondary, .twister-price, .a-size-mini');
              if (pEl && pEl.textContent && /[0-9]/.test(pEl.textContent)) {
                var pMatches = pEl.textContent.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                if (pMatches) optPrice = pMatches[0];
              }

              var isSel = isElementActive(itemEl) || isElementActive(itemEl.parentElement);
              addOptionValue(dimName, val, isSel, optPrice);
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

          var gSelValueEl = gCont.querySelector('[class*="selected"], [class*="value"], [class*="current"]');
          if (gSelValueEl && gSelValueEl !== gLabel) {
            setOptionSelected(gDim, gSelValueEl.textContent);
          }

          var gSwatches = gCont.querySelectorAll('button, input[type="radio"], [role="radio"], [role="button"], [class*="chip"], [class*="item"]');
          for (var sw = 0; sw < gSwatches.length; sw++) {
            var swEl = gSwatches[sw];
            var swVal = swEl.getAttribute('value') || swEl.getAttribute('title') || swEl.getAttribute('aria-label') || swEl.textContent;
            var isSwSel = isElementActive(swEl) || (swEl.tagName === 'INPUT' && swEl.checked);
            var swPrice = swEl.getAttribute('data-price') || swEl.getAttribute('data-product-price') || '';
            if (!swPrice) {
              var swPEl = swEl.querySelector('[class*="price"], .price');
              if (swPEl && swPEl.textContent && /[0-9]/.test(swPEl.textContent)) {
                var swPMatch = swPEl.textContent.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})|[0-9]+)/);
                if (swPMatch) swPrice = swPMatch[0];
              }
            }
            addOptionValue(gDim, swVal, isSwSel, swPrice);
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
              var sOptPrice = sOpts[so].getAttribute('data-price') || '';
              addOptionValue(selName, sOpts[so].textContent, sOpts[so].selected, sOptPrice);
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
            opt.prices = opt.prices || {};
            if (window.__currentProductPrice && opt.selected && !opt.prices[opt.selected]) {
              opt.prices[opt.selected] = String(window.__currentProductPrice).trim();
            }
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
          var str = raw.replace(/\\r\\n|\\r|\\n|\\t/g, ' ').replace(/\\s+/g, ' ').trim();
          str = str
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&nbsp;/gi, ' ');
          str = str.replace(/^(?:Amazon(?:\\.[a-z.]+)?|Trendyol|Hepsiburada(?:\\.com)?|Shein|Zara|Noon|AliExpress|eBay|Walmart(?:\\.com)?|Nike(?:\\.com)?|Apple|Asos|Mango|H&M)\\s*[:|–—\\-]\\s*/gi, '');
          str = str.replace(/^(?:Visit the\\s+[^\\n\\r]+?\\s+Store|Brand:\\s*[^:\\n\\r]+?)\\s+/gi, '');
          str = str
            .replace(/\\s*Fiyatı,?\\s*Yorumları\\s*-\\s*Trendyol.*$/gi, '')
            .replace(/\\s*Fiyatı\\s*-\\s*Trendyol.*$/gi, '')
            .replace(/\\s*-\\s*Trendyol.*$/gi, '')
            .replace(/\\s*\\|\\s*Trendyol.*$/gi, '')
            .replace(/\\s*Fiyatı\\s*-\\s*Hepsiburada.*$/gi, '')
            .replace(/\\s*-\\s*Hepsiburada.*$/gi, '')
            .replace(/\\s*\\|\\s*Hepsiburada.*$/gi, '')
            .replace(/\\s*[:|–—\\-]\\s*Amazon\\.[a-z.]+(\\s*:.*)?$/gi, '')
            .replace(/\\s*[:|–—\\-]\\s*Amazon$/gi, '')
            .replace(/\\s*\\|\\s*Amazon.*$/gi, '')
            .replace(/\\s*\\|\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
            .replace(/\\s*-\\s*SHEIN(?:\\s+[A-Z]{2,3})?.*$/gi, '')
            .replace(/\\s*\\|\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
            .replace(/\\s*-\\s*ZARA(?:\\s+[^|–—\\-]+)?$/gi, '')
            .replace(/\\s*\\|\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
            .replace(/\\s*-\\s*H&M(?:\\s+[A-Z]{2,3})?.*$/gi, '')
            .replace(/\\s*\\|\\s*noon.*$/gi, '')
            .replace(/\\s*-\\s*noon.*$/gi, '')
            .replace(/\\s*-\\s*AliExpress(?:\\s+\\d+)?.*$/gi, '')
            .replace(/\\s*\\|\\s*AliExpress.*$/gi, '')
            .replace(/\\s*\\|\\s*eBay.*$/gi, '')
            .replace(/\\s*-\\s*eBay.*$/gi, '')
            .replace(/\\s*\\.?\\s*Nike\\.com.*$/gi, '')
            .replace(/\\s*\\|\\s*Nike.*$/gi, '')
            .replace(/\\s*-\\s*Walmart\\.com.*$/gi, '')
            .replace(/\\s*\\|\\s*Walmart.*$/gi, '')
            .replace(/\\s*[:|–—\\-]\\s*[a-z0-9-]+\\.(?:com|org|net|tr|ae|sa|co\\.uk|de|fr|es|it|ru|cn)(?:\\.[a-z]+)?\\s*$/gi, '');
          str = str.replace(/\\s*:\\s*(?:Electronics|Cell Phones & Accessories|Clothing, Shoes & Jewelry|Home & Kitchen|Beauty & Personal Care|Health & Household|Sports & Outdoors|Toys & Games|Automotive|Tools & Home Improvement|Office Products|Pet Supplies|Baby Products|Grocery & Gourmet Food|Moda|Elektronik|Ev & Yaşam|Mutfak|Kişisel Bakım|Spor & Outdoor|Oto & Yapı Market|Kitap|Oyuncak|Bebek|Computers? & Accessories|Video Games|Musical Instruments|Books|Luggage & Travel Gear|Industrial & Scientific)\\s*$/gi, '');
          str = str.replace(/\\s*\\d+(?:\\.\\d+)?\\s*(?:out of 5 stars|stars|yıldız).*$/gi, '');
          str = str.replace(/\\s*\\(\\s*\\d+(?:,\\d+)*\\s*(?:ratings?|reviews?|değerlendirme|yorum)\\s*\\).*$/gi, '');
          str = str.replace(/^[\\s:|–—•·\"'\\-]+|[\\s:|–—•·\"'\\-]+$/g, '').trim();
          if (/^ref[=_\s-]/i.test(str) || str.toLowerCase().indexOf('ref=') === 0 || /product summary|key product information/i.test(str)) return '';
          return str.replace(/\\s+/g, ' ').trim();
        };

        // Priority 1: JSON-LD Product schema
        try {
          var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var j = 0; j < ldScripts.length; j++) {
            var ldObj = JSON.parse(ldScripts[j].textContent);
            var ldItems = Array.isArray(ldObj) ? ldObj : [ldObj];
            for (var k = 0; k < ldItems.length; k++) {
              var item = ldItems[k];
              if (!item) continue;
              if (item['@type'] === 'Product' && item.name && typeof item.name === 'string') {
                var cName = cleanTitle(item.name);
                if (cName && cName.length > 2) { snapshot.title = cName; break; }
              }
              if (Array.isArray(item['@graph'])) {
                for (var g = 0; g < item['@graph'].length; g++) {
                  var gItem = item['@graph'][g];
                  if (gItem && gItem['@type'] === 'Product' && gItem.name && typeof gItem.name === 'string') {
                    var cgName = cleanTitle(gItem.name);
                    if (cgName && cgName.length > 2) { snapshot.title = cgName; break; }
                  }
                }
              }
            }
            if (snapshot.title) break;
          }
        } catch (_ldErr) {}

        // Priority 2: High-specificity product title DOM selectors in strict priority order
        if (!snapshot.title) {
          var prioritySelectors = [
            '#title_feature_div #productTitle',
            '#title #productTitle',
            '#productTitle',
            'h1.pr-new-br span',
            'h1.pr-new-br',
            '[data-automation-id="product-title"]',
            '.goods-detail-info__name',
            '.product-intro__head-name',
            '.product-intro__title',
            '.goods-title',
            'h1[data-test-id="product-title"]',
            'h1[itemprop="name"]',
            'h1#title',
            '[data-feature-name="title"] h1',
            '[data-feature-name="title"] #productTitle',
            '.product-title',
            '.pdp-title',
            '.product-detail__title',
            '.product__title',
            '#title h1',
            'h1'
          ];

          for (var p = 0; p < prioritySelectors.length; p++) {
            var el = document.querySelector(prioritySelectors[p]);
            if (el) {
              var elClass = String(el.className || '');
              if (/(^|[\s.;-])(a-offscreen|a-screen-reader|sr-only)($|[\s.;-])/i.test(elClass) ||
                  (el.offsetParent === null && window.getComputedStyle && window.getComputedStyle(el).position !== 'fixed')) {
                continue;
              }
              var rawText = (el.textContent || '').trim();
              if (rawText && rawText.length > 1) {
                var cleaned = cleanTitle(rawText);
                if (cleaned && cleaned.length > 2 &&
                    !/^(product|oneclick|-)$/i.test(cleaned) &&
                    !/product summary|key product information/i.test(cleaned)) {
                  snapshot.title = cleaned;
                  break;
                }
              }
            }
          }
        }

        // Priority 3: OpenGraph / Twitter meta tags
        if (!snapshot.title) {
          var metaTag = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"]');
          if (metaTag && metaTag.content && metaTag.content.trim()) {
            var metaCleaned = cleanTitle(metaTag.content.trim());
            if (metaCleaned && metaCleaned.length > 2 && !/product summary|key product information/i.test(metaCleaned)) {
              snapshot.title = metaCleaned;
            }
          }
        }

        // Priority 4: Document title
        if (!snapshot.title) {
          var docTitle = document.title || '';
          if (docTitle && docTitle.trim()) {
            var docCleaned = cleanTitle(docTitle.trim());
            if (docCleaned && docCleaned.length > 2 && !/product summary|key product information/i.test(docCleaned)) {
              snapshot.title = docCleaned;
            }
          }
        }
      } catch(e) {}

      // 2. Image
      try {
        var isValidImg = function(url) {
          if (!url || typeof url !== 'string') return false;
          var str = url.trim().toLowerCase();
          if (!str || str.length < 5) return false;
          if (str.indexOf('data:') === 0) return false;
          if (str.indexOf('.svg') > -1 || str.indexOf('/svgicons/') > -1 || str.indexOf('/icons/') > -1 || str.indexOf('/icon_') > -1 || str.indexOf('icon-') > -1) return false;
          if (str.indexOf('blank.gif') > -1 || str.indexOf('transparent.png') > -1 || str.indexOf('spacer.gif') > -1) return false;
          if (str.indexOf('logo') > -1 || str.indexOf('favicon') > -1) return false;
          if (str.indexOf('http://') !== 0 && str.indexOf('https://') !== 0) return false;
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

        var imgSelectors = [
          // Amazon main images
          '#landingImage',
          '#main-image',
          '#imgBlkFront',
          'img.a-dynamic-image',
          '[data-a-image-name="landingImage"]',
          '#main-image-container img',
          '#imageBlock img',
          '#canvasImage',
          '#ebooks-img-canvas img',
          'div[data-action="main-image-click"] img',
          'div#media-canvas img',
          'img[data-a-hires]',
          'img[src*="media-amazon.com/images/I/"]',
          'img[src*="images-amazon.com/images/I/"]',

          // Trendyol product images
          '.product-slide-item img',
          'img[src*="cdn.dsmcdn.com/mnresize"]',
          'img[data-src*="cdn.dsmcdn.com/mnresize"]',
          'img[src*="cdn.dsmcdn.com/ty"]',
          'img[data-src*="cdn.dsmcdn.com/ty"]',
          '.product-image-gallery-viewport img',

          // Shein specific product images (avoid SVG icons)
          'img.crop-image-container__img',
          '.crop-image-container img',
          '.product-intro__head-main img',
          'img.product-intro__head-main-img',
          '.goods-detail-gallery img',
          '.detail-gallery img',
          '.swiper-slide-active img',
          'img[data-before-crop-src]',
          'img[src*="ltwebstatic.com/images"]',
          'img[data-src*="ltwebstatic.com/images"]',
          'img[src*="_thumbnail_"]',
          'img[data-src*="_thumbnail_"]',

          // Zara / H&M / Noon / Other stores
          'img[src*="static.zara.net/photos"]',
          'img[data-src*="static.zara.net/photos"]',
          '.media-image img',
          'img[src*="lp2.hm.com"]',
          'img[src*="f.nooncdn.com/p/"]',
          'img[data-src*="f.nooncdn.com/p/"]',
          '[data-qa="div-gallery"] img',
          '.detail-section-img',
          '.base-product-image img',
          '.gallery-container img',
          '[data-test-id="product-image"] img',
          '.a-carousel-card img',
          'img.product-image'
        ];
        for (var sIdx = 0; sIdx < imgSelectors.length; sIdx++) {
          var candidateEls = document.querySelectorAll(imgSelectors[sIdx]);
          for (var cIdx = 0; cIdx < candidateEls.length; cIdx++) {
            var cEl = candidateEls[cIdx];
            var candDom = parseImageUrl(cEl.getAttribute('data-a-hires')) ||
                          parseImageUrl(cEl.getAttribute('data-old-hires')) ||
                          parseImageUrl(cEl.getAttribute('data-before-crop-src')) ||
                          parseImageUrl(cEl.getAttribute('data-src')) ||
                          parseImageUrl(cEl.getAttribute('data-lazy-src')) ||
                          parseImageUrl(cEl.getAttribute('data-original')) ||
                          parseImageUrl(cEl.getAttribute('data-origin-src')) ||
                          parseImageUrl(cEl.getAttribute('data-a-dynamic-image')) ||
                          parseImageUrl(cEl.currentSrc) ||
                          parseImageUrl(cEl.src) ||
                          parseImageUrl(cEl.getAttribute('src')) || '';
            if (candDom && isValidImg(candDom)) {
              snapshot.image = candDom;
              break;
            }
          }
          if (snapshot.image) break;
        }

        if (!snapshot.image) {
          var metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"], link[rel="image_src"]');
          if (metaImg) {
            var candMeta = parseImageUrl(metaImg.content || metaImg.href || metaImg.getAttribute('content') || '');
            if (candMeta && isValidImg(candMeta)) {
              snapshot.image = candMeta;
            }
          }
        }

        // Shein / Store application state image fallback
        if (!snapshot.image) {
          try {
            var shImgData = window.productIntroData || window.gbProductIntroData;
            if (shImgData && shImgData.detail) {
              var dtImg = (shImgData.detail.goods_imgs && shImgData.detail.goods_imgs.main_image && shImgData.detail.goods_imgs.main_image.origin_image) ||
                          shImgData.detail.original_img ||
                          shImgData.detail.goods_img;
              if (dtImg) {
                var pDt = parseImageUrl(dtImg);
                if (pDt && isValidImg(pDt)) snapshot.image = pDt;
              }
            }
            if (!snapshot.image && window.goodsInfo && window.goodsInfo.original_img) {
              var pGi = parseImageUrl(window.goodsInfo.original_img);
              if (pGi && isValidImg(pGi)) snapshot.image = pGi;
            }
          } catch(_eShImg) {}
        }

        if (!snapshot.image) {
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
                  if (parsedImg && isValidImg(parsedImg)) {
                    snapshot.image = parsedImg;
                    break;
                  }
                }
              }
            } catch(e) {}
            if (snapshot.image) break;
          }
        }
      } catch(e) {}

      // 3. Price & Currency
      try {
        var isStruckOrOldPriceElement = function(el) {
          if (!el) return false;
          try {
            if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') return true;
            if (el.getAttribute && el.getAttribute('data-a-strike') === 'true') return true;
            var cls = String(el.className || '');
            if (/(^|[\s.;-])(prc-org|prc-box-org|prc-slg|a-text-price|basisPrice|line-through|crossed)($|[\s.;-])/i.test(cls)) return true;
            if (/(^|[\s.;-])(original-price|originalPrice|orig-price|old-price|oldPrice|oldprice|was-price|wasPrice|price-was|del-price|head-price-del|market-price|retail-price|productPrice__del|product-price__del)($|[\s.;-])/i.test(cls)) return true;
            if (el.closest && el.closest('del, s, strike, [data-a-strike="true"], .a-text-price, .basisPrice, .prc-org, .prc-box-org, [class*="original-price"], [class*="old-price"], [class*="was-price"], [class*="head-price-del"], [class*="productPrice__del"], [class*="product-price__del"]')) {
              return true;
            }
          } catch(_e) {}
          return false;
        };

        var getCleanElementPriceText = function(el) {
          if (!el) return '';
          if (isStruckOrOldPriceElement(el)) return '';
          if (el.tagName === 'META') return el.getAttribute('content') || '';
          try {
            var clone = el.cloneNode(true);
            var oldNodes = clone.querySelectorAll(
              'del, s, strike, [data-a-strike="true"], .a-text-price, .basisPrice, .prc-org, .prc-box-org, .prc-slg, ' +
              '[class*="original-price"], [class*="originalPrice"], [class*="orig-price"], ' +
              '[class*="old-price"], [class*="oldPrice"], [class*="oldprice"], ' +
              '[class*="was-price"], [class*="wasPrice"], [class*="price-was"], ' +
              '[class*="strike"], [class*="line-through"], [class*="crossed"]'
            );
            for (var oi = 0; oi < oldNodes.length; oi++) {
              oldNodes[oi].remove();
            }
            return clone.textContent || clone.innerText || '';
          } catch(_eClone) {
            return el.textContent || el.innerText || '';
          }
        };

        var parsePriceAndCurrency = function(rawText) {
          if (!rawText || typeof rawText !== 'string') return { price: '', currency: '' };
          var t = rawText.replace(/\s+/g, ' ').trim();
          // Convert Arabic-Indic digits ٠-٩ to 0-9
          t = t.replace(/[٠-٩]/g, function(d) { return String.fromCharCode(d.charCodeAt(0) - 1632 + 48); });
          var detectedCurr = '';
          if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:AED|د\.?إ|د\.?ا|درهم)(?:$|[^a-zA-Z\u0600-\u06FF])|\u20C3/i.test(t)) detectedCurr = 'AED';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:SAR|SR|ر\.?س|ريال)(?:$|[^a-zA-Z\u0600-\u06FF])|[﷼\uFDFC\u20C1⃁]/i.test(t)) detectedCurr = 'SAR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:KWD|د\.?ك)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'KWD';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:QAR|ر\.?ق)(?:$|[^a-zA-Z\u0600-\u06FF])/i.test(t)) detectedCurr = 'QAR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:TL|TRY)(?:$|[^a-zA-Z\u0600-\u06FF])|₺/i.test(t)) detectedCurr = 'TL';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])(?:USD|US\$)(?:$|[^a-zA-Z\u0600-\u06FF])|\$/i.test(t)) detectedCurr = 'USD';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])EUR(?:$|[^a-zA-Z\u0600-\u06FF])|€/i.test(t)) detectedCurr = 'EUR';
          else if (/(?:^|[^a-zA-Z\u0600-\u06FF])GBP(?:$|[^a-zA-Z\u0600-\u06FF])|£/i.test(t)) detectedCurr = 'GBP';

          t = t.replace(/[-–]?[ \t]*[0-9]+(?:\.[0-9]+)?[ \t]*%[ \t]*(?:off|indirim|discount|saving|savings)?/gi, '');
          t = t.replace(/%[ \t]*[0-9]+(?:\.[0-9]+)?/gi, '');
          t = t.replace(/(?:save|off|indirim)[ \t]+[0-9]+(?:\.[0-9]+)?%?/gi, '');
          t = t.replace(/(?:save|tasarruf|indirim|saving|savings)\s*[$€£₺]?\s*[0-9]+(?:[.,][0-9]{1,2})?/gi, '');

          var matches = t.match(/([0-9]{1,3}(?:[., ][0-9]{3})+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]{1,3}(?:[., ][0-9]{3})+(?![0-9])|[0-9]+(?:[.,][0-9]{1,2})(?![0-9])|[0-9]+)/g);
          if (!matches || matches.length === 0) return { price: '', currency: detectedCurr };

          // Pick the last/discounted price if multiple prices are present
          var cleanPrice = matches[matches.length - 1].trim();
          return { price: cleanPrice, currency: detectedCurr };
        };

        // 3a. Prioritized DOM Discount / Current Price extraction
        var candidatePriceSelectors = [
          // Trendyol Discount / Campaign Prices
          'span.prc-dsc',
          '.prc-dsc',
          '.prc-box-dsc',
          '.product-price-container .prc-dsc',
          '.basket-discount-price',
          '.campaign-price',
          '.badge-basket-discount',
          '.discounted-price',

          // Amazon PriceToPay / Deal / BuyBox / Non-struck Prices
          '#corePriceDisplay_mobile_feature_div .priceToPay .a-offscreen',
          '#corePrice_mobile_feature_div .priceToPay .a-offscreen',
          '#apex_mobile_feature_div .priceToPay .a-offscreen',
          '.priceToPay .a-offscreen',
          '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
          '#corePrice_desktop .priceToPay .a-offscreen',
          '.apexPriceToPay .a-offscreen',
          '#priceblock_dealprice',
          '#priceblock_saleprice',
          '#price_inside_buybox',
          '#corePriceDisplay_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '#corePrice_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '#apex_mobile_feature_div .a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '.a-price:not([data-a-strike="true"]):not(.a-text-price) .a-offscreen',
          '.reinventPricePriceToPayMargin .a-offscreen',

          // Shein Mobile & Desktop Discounted / Current Prices
          '.floor-price',
          '[class*="floor-price"]',
          '[class*="floorPrice"]',
          '.productPrice',
          '[class*="productPrice__main"]',
          '[class*="productPriceContainer"]',
          '[class*="productPrice"]',
          '[class*="product-price" i]',
          '[class*="productprice" i]',
          '.bsc-main-price',
          '[class*="bsc-main-price"]',
          '.product-intro__head-price',
          '.product-intro__price',
          '.product-intro__price-new',
          '[class*="product-intro__head-price"]',
          '[class*="product-intro__price"]',
          '[class*="selling-price" i]',
          '[class*="sellingPrice" i]',
          '[class*="real-price" i]',
          '[class*="realPrice" i]',
          '[class*="shein-price" i]',
          '[class*="goods-price" i]',
          '[class*="goodsPrice" i]',
          '[class*="goods-detail-price" i]',
          '[class*="goodsDetailPrice" i]',
          '[data-price]',
          '[data-sku-price]',
          '[class*="from-price"]',
          '[class*="goods-detail-price"]',
          '[class*="discount-price"]',
          '[class*="sale-price"]',
          '[class*="current-price"]',
          '[class*="currentPrice"]',
          '[class*="now-price"]',
          '[class*="priceNow"]',
          '[class*="normal-price"]',
          '.goods-detail-price .discount-price',
          '.product-price-info .discount-price',
          '.goods-detail-price .price',
          '.goods-price',
          '[data-test-id*="price"]',
          '[aria-label*="Price" i]',
          '[aria-label*="price" i]',

          // Hepsiburada / Noon Current Prices
          '[data-test-id="price-current-price"]',
          '[data-test-id="price-discount-price"]',
          '[data-qa="div-price-now"]',
          '.priceNow',
          '#offering-price',

          // Generic E-Commerce / Shopify / WooCommerce Sale Prices
          'ins .amount',
          'ins [class*="price"]',
          '.price-item--sale',
          '.special-price',
          '.sale-price',
          '.discount-price',
          '.discounted-price',
          '[class*="discountPrice"]',
          '[class*="discountedPrice"]',
          '[class*="salePrice"]',
          '.product-price-container',
          '.product-price',
          '.pdp-price'
        ];

        for (var s = 0; s < candidatePriceSelectors.length; s++) {
          var elList = document.querySelectorAll(candidatePriceSelectors[s]);
          for (var ei = 0; ei < elList.length; ei++) {
            var currEl = elList[ei];
            if (isStruckOrOldPriceElement(currEl)) continue;
            var raw = getCleanElementPriceText(currEl);
            if (raw && /[0-9]/.test(raw)) {
              var parsed = parsePriceAndCurrency(raw);
              if (parsed.price) {
                snapshot.price = parsed.price;
                if (parsed.currency && !snapshot.currency) snapshot.currency = parsed.currency;

                // Inspect currEl's ancestors up to 4 levels for currency symbols (AED, SAR, TL, then USD)
                if (!snapshot.currency && currEl) {
                  var pNodeSnap = currEl;
                  for (var psi = 0; psi < 4 && pNodeSnap; psi++) {
                    var psText = pNodeSnap.textContent || '';
                    if (/د\.?إ|د\.?ا|درهم|\bAED\b|\u20C3/i.test(psText)) { snapshot.currency = 'AED'; break; }
                    if (/[﷼\uFDFC\u20C1⃁]|ر\.?س|ريال|\bSAR\b/i.test(psText)) { snapshot.currency = 'SAR'; break; }
                    if (/₺|\bTL\b|\bTRY\b/i.test(psText)) { snapshot.currency = 'TL'; break; }
                    if (/\$|\bUSD\b/i.test(psText)) { snapshot.currency = 'USD'; break; }
                    pNodeSnap = pNodeSnap.parentElement;
                  }
                }
                break;
              }
            }
          }
          if (snapshot.price) break;
        }

        // 3b. Trendyol App State (fallback)
        if (!snapshot.price) {
          try {
            if (window.__PRODUCT_DETAIL_APP_INITIAL_STATE__ && window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product) {
              var tpP = window.__PRODUCT_DETAIL_APP_INITIAL_STATE__.product;
              var selectedVarPrice = null;
              if (Array.isArray(tpP.variants)) {
                var selVar = tpP.variants.find(function(v) { return v && v.selected; });
                if (selVar && selVar.price) {
                  selectedVarPrice = selVar.price;
                }
              }
              var tpPrice = selectedVarPrice || tpP.price;
              if (tpPrice) {
                var dP = tpPrice.discountedPrice;
                var sP = tpPrice.sellingPrice;
                if (dP) {
                  var dVal = (typeof dP === 'object') ? (dP.value || dP.text || '') : dP;
                  if (dVal && dVal !== '0' && dVal !== 0) {
                    snapshot.price = String(dVal).trim();
                  }
                }
                if (!snapshot.price && sP) {
                  var sVal = (typeof sP === 'object') ? (sP.value || sP.text || '') : sP;
                  if (sVal) snapshot.price = String(sVal).trim();
                }
                if (tpPrice.currency && !snapshot.currency) snapshot.currency = String(tpPrice.currency).trim();
              }
            }
          } catch(_eTp) {}
        }

        // 3c. Shein App State (fallback)
        if (!snapshot.price) {
          try {
            if (window.gbCommonInfo) {
              var ssrSnap = window.gbCommonInfo.contextForSSR;
              if (ssrSnap) {
                if (!snapshot.price && ssrSnap.googleSEO && ssrSnap.googleSEO.goodsDetailSchema && ssrSnap.googleSEO.goodsDetailSchema.offers) {
                  var offSnap = ssrSnap.googleSEO.goodsDetailSchema.offers;
                  var pOffSnap = offSnap.price || offSnap.lowPrice || '';
                  if (pOffSnap) snapshot.price = String(pOffSnap).trim();
                  if (!snapshot.currency && offSnap.priceCurrency) snapshot.currency = String(offSnap.priceCurrency).trim();
                }
                if (!snapshot.price && ssrSnap.detail) {
                  var dtSsrSnap = ssrSnap.detail;
                  var spSsrSnap = (dtSsrSnap.currentSku && (dtSsrSnap.currentSku.sku_sale_price || dtSsrSnap.currentSku.salePrice || dtSsrSnap.currentSku.price)) || dtSsrSnap.salePrice || dtSsrSnap.sale_price || dtSsrSnap.retailPrice || dtSsrSnap.originalPrice;
                  if (spSsrSnap) {
                    if (typeof spSsrSnap === 'object') {
                      if (spSsrSnap.amount) snapshot.price = String(spSsrSnap.amount).trim();
                      else if (spSsrSnap.usdAmount) snapshot.price = String(spSsrSnap.usdAmount).trim();
                      else if (spSsrSnap.amountWithSymbol) {
                        var pResSnapSsr = parsePriceAndCurrency(spSsrSnap.amountWithSymbol);
                        if (pResSnapSsr.price) { snapshot.price = pResSnapSsr.price; if (pResSnapSsr.currency && !snapshot.currency) snapshot.currency = pResSnapSsr.currency; }
                      }
                      if (spSsrSnap.currency && !snapshot.currency) snapshot.currency = String(spSsrSnap.currency).trim();
                    } else if (typeof spSsrSnap === 'number' || typeof spSsrSnap === 'string') {
                      var pResSnapSsr2 = parsePriceAndCurrency(String(spSsrSnap));
                      if (pResSnapSsr2.price) { snapshot.price = pResSnapSsr2.price; if (pResSnapSsr2.currency && !snapshot.currency) snapshot.currency = pResSnapSsr2.currency; }
                    }
                  }
                }
              }
            }
            var shD = window.productIntroData || window.gbProductIntroData;
            if (shD && shD.detail) {
              var dtSnap = shD.detail;
              var sp = (dtSnap.currentSku && (dtSnap.currentSku.sku_sale_price || dtSnap.currentSku.salePrice || dtSnap.currentSku.price)) || dtSnap.salePrice || dtSnap.sale_price || dtSnap.retailPrice || dtSnap.originalPrice;
              if (sp) {
                if (typeof sp === 'object') {
                  if (sp.amount) snapshot.price = String(sp.amount).trim();
                  else if (sp.usdAmount) snapshot.price = String(sp.usdAmount).trim();
                  else if (sp.amountWithSymbol) {
                    var pResSnap = parsePriceAndCurrency(sp.amountWithSymbol);
                    if (pResSnap.price) {
                      snapshot.price = pResSnap.price;
                      if (pResSnap.currency && !snapshot.currency) snapshot.currency = pResSnap.currency;
                    }
                  }
                  if (sp.currency && !snapshot.currency) snapshot.currency = String(sp.currency).trim();
                } else if (typeof sp === 'number' || typeof sp === 'string') {
                  var pResSnap2 = parsePriceAndCurrency(String(sp));
                  if (pResSnap2.price) {
                    snapshot.price = pResSnap2.price;
                    if (pResSnap2.currency && !snapshot.currency) snapshot.currency = pResSnap2.currency;
                  }
                }
              }
            }
            if (!snapshot.price && window.goodsInfo) {
              var gPSnap = window.goodsInfo.sale_price || window.goodsInfo.retail_price;
              if (gPSnap) {
                var pResSnap3 = parsePriceAndCurrency(String(gPSnap));
                if (pResSnap3.price) {
                  snapshot.price = pResSnap3.price;
                  if (pResSnap3.currency && !snapshot.currency) snapshot.currency = pResSnap3.currency;
                }
              }
            }
          } catch(_eSh) {}
        }

        // 3c-2. JSON-LD schema price check (Amazon, Shopify, etc.)
        if (!snapshot.price) {
          var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (var jld = 0; jld < jsonLdScripts.length; jld++) {
            try {
              var ldData = JSON.parse(jsonLdScripts[jld].textContent);
              var ldArr = Array.isArray(ldData) ? ldData : [ldData];
              for (var kld = 0; kld < ldArr.length; kld++) {
                var item = ldArr[kld];
                var offers = item && (item.offers || (item['@graph'] && Array.isArray(item['@graph']) && item['@graph'].find(function(g) { return g.offers; }) ? item['@graph'].find(function(g) { return g.offers; }).offers : null));
                if (offers) {
                  var offer = Array.isArray(offers) ? offers[0] : offers;
                  if (offer && offer.price) {
                    snapshot.price = String(offer.price).trim();
                    if (offer.priceCurrency && !snapshot.currency) snapshot.currency = String(offer.priceCurrency).trim();
                    break;
                  }
                }
              }
            } catch(_eLd) {}
            if (snapshot.price) break;
          }
        }

        // 3d. Meta tag fallbacks
        if (!snapshot.price) {
          var metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"], meta[itemprop="price"], meta[name="twitter:data1"], [itemprop="price"]');
          if (metaPrice) {
            var rawMeta = metaPrice.getAttribute('content') || metaPrice.getAttribute('value') || metaPrice.textContent || '';
            if (rawMeta && /[0-9]/.test(rawMeta)) {
              var parsedMeta = parsePriceAndCurrency(rawMeta);
              if (parsedMeta.price) snapshot.price = parsedMeta.price;
              if (parsedMeta.currency && !snapshot.currency) snapshot.currency = parsedMeta.currency;
            }
          }
        }
        var isSheinSnapshot = (window.location && window.location.hostname && window.location.hostname.indexOf('shein.') > -1);
        if (isSheinSnapshot && !snapshot.currency) {
          try {
            if (document.cookie) {
              var ckNativeSnap = document.cookie.match(/(?:^|;\s*)currency=([A-Za-z]{3})(?:;|$)/i);
              if (ckNativeSnap && ckNativeSnap[1]) {
                var ckuNatSnap = ckNativeSnap[1].toUpperCase();
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuNatSnap) > -1) snapshot.currency = ckuNatSnap;
              }
              if (!snapshot.currency) {
                var ckMSnap = document.cookie.match(/(?:^|;\s*)(?:currency|shein_currency|sitecurrency|local_currency|user_currency)=([A-Za-z]{3})/i);
                if (ckMSnap && ckMSnap[1]) {
                  var ckuSnap = ckMSnap[1].toUpperCase();
                  if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuSnap) > -1) snapshot.currency = ckuSnap;
                }
              }
            }
            if (!snapshot.currency && window.gbCommonInfo && window.gbCommonInfo.currency) {
              var gbCSnap = String(window.gbCommonInfo.currency).toUpperCase().trim();
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(gbCSnap) > -1) snapshot.currency = gbCSnap;
            }
            if (!snapshot.currency && window.localStorage) {
              var lsCSnap = window.localStorage.getItem('currency') || window.localStorage.getItem('shein_currency') || window.localStorage.getItem('currency_code');
              if (lsCSnap && typeof lsCSnap === 'string') {
                lsCSnap = lsCSnap.trim().toUpperCase().replace(/[^A-Z]/g, '');
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(lsCSnap) > -1) snapshot.currency = lsCSnap;
              }
            }
          } catch(eSheinSnap) {}
        }

        if (!snapshot.currency && snapshot.price) {
          var bodyTxt = document.body ? document.body.innerText.slice(0, 3000) : '';
          var currMatchSnap = bodyTxt.match(/\b(TL|TRY|AED|SAR|KWD|QAR|USD|EUR|GBP)\b|([₺$€£﷼\uFDFC\u20C1⃁\u20C3]|د\.?إ|د\.?ا|درهم|ر\.?س|ريال)/i);
          if (currMatchSnap) {
            var rawCurrMatchSnap = (currMatchSnap[1] || currMatchSnap[2] || currMatchSnap[0]).trim();
            if (/د\.?إ|د\.?ا|درهم|\u20C3/i.test(rawCurrMatchSnap) || rawCurrMatchSnap.toUpperCase() === 'AED') snapshot.currency = 'AED';
            else if (/[﷼\uFDFC\u20C1⃁]|ر\.?س|ريال/i.test(rawCurrMatchSnap) || rawCurrMatchSnap.toUpperCase() === 'SAR') snapshot.currency = 'SAR';
            else if (!isSheinSnapshot && (rawCurrMatchSnap === '$' || rawCurrMatchSnap.toUpperCase() === 'USD')) snapshot.currency = 'USD';
            else if (rawCurrMatchSnap === '₺' || rawCurrMatchSnap.toUpperCase() === 'TL') snapshot.currency = 'TL';
            else if (!isSheinSnapshot) snapshot.currency = rawCurrMatchSnap.toUpperCase();
          }
        }
        if (!snapshot.currency && document.cookie) {
          try {
            var ckNativeSnap = document.cookie.match(/(?:^|;\s*)currency=([A-Za-z]{3})(?:;|$)/i);
            if (ckNativeSnap && ckNativeSnap[1]) {
              var ckuNatSnap = ckNativeSnap[1].toUpperCase();
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuNatSnap) > -1) snapshot.currency = ckuNatSnap;
            }
            if (!snapshot.currency) {
              var ckMSnap = document.cookie.match(/(?:^|;\s*)(?:currency|shein_currency|sitecurrency|local_currency|user_currency)=([A-Za-z]{3})/i);
              if (ckMSnap && ckMSnap[1]) {
                var ckuSnap = ckMSnap[1].toUpperCase();
                if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(ckuSnap) > -1) snapshot.currency = ckuSnap;
              }
            }
          } catch(eCk) {}
        }
        if (!snapshot.currency && window.localStorage) {
          try {
            var lsCSnap = window.localStorage.getItem('currency') || window.localStorage.getItem('shein_currency') || window.localStorage.getItem('currency_code');
            if (lsCSnap && typeof lsCSnap === 'string') {
              lsCSnap = lsCSnap.trim().toUpperCase().replace(/[^A-Z]/g, '');
              if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(lsCSnap) > -1) snapshot.currency = lsCSnap;
            }
          } catch(eLs) {}
        }
        if (!snapshot.currency && window.gbCommonInfo && window.gbCommonInfo.currency) {
          try {
            var gbCSnap = String(window.gbCommonInfo.currency).toUpperCase().trim();
            if (['USD', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'].indexOf(gbCSnap) > -1) snapshot.currency = gbCSnap;
          } catch(eGb) {}
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
          } else if (href.indexOf('amazon.ae') > -1 || href.indexOf('trendyol.ae') > -1 || href.indexOf('noon.com') > -1 || href.indexOf('shein.ae') > -1) {
            snapshot.currency = 'AED';
          } else if (href.indexOf('amazon.sa') > -1 || href.indexOf('trendyol.sa') > -1 || href.indexOf('shein.sa') > -1 || href.indexOf('/ar-en/') > -1 || href.indexOf('/ar/') > -1) {
            snapshot.currency = 'SAR';
          } else if (href.indexOf('amazon.de') > -1) {
            snapshot.currency = 'EUR';
          } else if (href.indexOf('amazon.co.uk') > -1) {
            snapshot.currency = 'GBP';
          } else if (href.indexOf('shein.') > -1) {
            var bodyText3k = document.body ? document.body.innerText.slice(0, 3000) : '';
            var isPageAedSnap = (/د\.?إ|د\.?ا|درهم|\bAED\b|\u20C3/i.test(bodyText3k));
            var isPageSarSnap = (/[﷼\uFDFC\u20C1⃁]|ر\.?س|ريال|\bSAR\b/i.test(bodyText3k));
            var isPageUsdSnap = (bodyText3k.indexOf('$') > -1 || /\bUSD\b/i.test(bodyText3k));
            if (isPageAedSnap) {
              snapshot.currency = 'AED';
            } else if (isPageSarSnap) {
              snapshot.currency = 'SAR';
            } else if (isPageUsdSnap) {
              snapshot.currency = 'USD';
            } else {
              snapshot.currency = 'USD';
            }
          } else {
            snapshot.currency = 'USD';
          }
        }
        if (snapshot.currency === 'USD' || snapshot.currency === '$') {
          if (snapshot.price && !snapshot.price.includes('$') && !/USD/i.test(snapshot.price)) {
            snapshot.price = '$' + snapshot.price;
          }
        } else if (snapshot.currency === 'AED' || snapshot.currency === 'SAR') {
          if (snapshot.price && snapshot.price.includes('$')) {
            snapshot.price = snapshot.price.replace(/\$/g, '').trim();
          }
        }
        if (snapshot.currency && href.indexOf('shein.') > -1 && /^[A-Z]{3}$/.test(snapshot.currency) && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'shein_currency_selected', currency: snapshot.currency }));
          } catch(e) {}
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
  return cleanProductTitle(title);
};

export const userAgent = () => {
  return Platform.select({
    ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    android:
      'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
  });
};

export const checkProductPageBridge = page_url => {
  return `
  (function() {
    if (window.__RN_PRODUCT_CHECK_TIMER__) {
      try {
        if (typeof window.clearInterval === 'function') {
          window.clearInterval(window.__RN_PRODUCT_CHECK_TIMER__);
        } else if (typeof clearInterval === 'function') {
          clearInterval(window.__RN_PRODUCT_CHECK_TIMER__);
        }
      } catch(e) {}
      window.__RN_PRODUCT_CHECK_TIMER__ = null;
    }
    if (window.__RN_PRODUCT_MUTATION_OBSERVER__) {
      try {
        window.__RN_PRODUCT_MUTATION_OBSERVER__.disconnect();
      } catch(e) {}
      window.__RN_PRODUCT_MUTATION_OBSERVER__ = null;
    }

    var attempts = 0;
    var maxAttempts = 25;
    var lastPostedState = null;

    var postStatus = function(isProduct, currentHref) {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'isProductPage',
          data: {
            isProduct: !!isProduct,
            url: currentHref || window.location.href
          }
        }));
      }
    };

    var isElementVisible = function(el) {
      if (!el) return false;
      try {
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
          return false;
        }
        var style = window.getComputedStyle(el);
        if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        var rect = el.getBoundingClientRect();
        return (rect.width > 0 && rect.height > 0) || (el.offsetWidth > 0 && el.offsetHeight > 0);
      } catch(e) {
        return false;
      }
    };

    var hasActiveCartOrBuyButton = function() {
      var candidateSelectors = [
        '#add-to-cart-button',
        '#buy-now-button',
        '#add-to-cart-button-ubb',
        'input[name="submit.add-to-cart"]',
        'input[name="submit.buy-now"]',
        '.add-to-basket',
        '.add-to-basket-button',
        '.product-button-container',
        '[data-testid*="add-to-basket"]',
        '[data-testid*="add-to-cart"]',
        '[data-testid*="addToCart"]',
        '[data-test-id*="addToCart"]',
        '[data-test-id*="add-to-basket"]',
        '[class*="add-to-basket"]',
        '[class*="addToBasket"]',
        '[class*="add-to-cart"]',
        '[class*="addToCart"]',
        '[class*="add-to-bag"]',
        '[class*="addToBag"]',
        '[class*="buy-now"]',
        '[class*="buyNow"]',
        'form[action*="/cart/add"] button[type="submit"]',
        'form[action*="/cart/add"] input[type="submit"]',
        'button[name="add"]',
        '#addToCart',
        '#buyNow'
      ];

      for (var i = 0; i < candidateSelectors.length; i++) {
        var els = document.querySelectorAll(candidateSelectors[i]);
        for (var j = 0; j < els.length; j++) {
          var btn = els[j];
          if (!isElementVisible(btn)) continue;
          var btnText = (btn.innerText || btn.textContent || btn.value || btn.getAttribute('aria-label') || '').toLowerCase();
          if (
            btnText.indexOf('tükendi') > -1 ||
            btnText.indexOf('stokta yok') > -1 ||
            btnText.indexOf('gelince haber ver') > -1 ||
            btnText.indexOf('haber ver') > -1 ||
            btnText.indexOf('out of stock') > -1 ||
            btnText.indexOf('sold out') > -1 ||
            btnText.indexOf('currently unavailable') > -1 ||
            btnText.indexOf('notify me') > -1 ||
            btnText.indexOf('غير متوفر') > -1
          ) {
            continue;
          }

          var nonBuyPhrases = [
            'view details', 'details', 'detay', 'detaylar', 'read more', 'dahası',
            'close', 'kapat', 'cancel', 'iptal', 'back', 'geri', 'next', 'ileri',
            'sign in', 'giriş yap', 'login', 'register', 'kayıt ol'
          ];
          var isNonBuy = false;
          for (var nb = 0; nb < nonBuyPhrases.length; nb++) {
            if (btnText === nonBuyPhrases[nb] || btnText.indexOf(nonBuyPhrases[nb]) > -1) {
              isNonBuy = true;
              break;
            }
          }
          if (isNonBuy) continue;

          return true;
        }
      }

      var genericCandidates = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"], [role="button"], a, div[class*="btn"], div[class*="button"], div[class*="basket"], div[class*="cart"], div[class*="buy"], span[class*="btn"], span[class*="button"], span[class*="basket"]'
      );
      var validPhrases = [
        'add to cart', 'add to bag', 'add to basket', 'buy now', 'buy it now', 'instant checkout',
        'sepete ekle', 'hemen al', 'şimdi al', 'simdi al', 'satın al', 'satin al', 'sepete at', 'torbaya ekle',
        'أضف إلى عربة التسوق', 'أضف إلى السلة', 'اشتري الآن', 'شراء الآن', 'إضافة إلى السلة', 'أضف إلى الحقيبة', 'اضف الى السلة'
      ];
      var invalidPhrases = [
        'tükendi', 'stokta yok', 'gelince haber ver', 'out of stock', 'sold out',
        'currently unavailable', 'notify me', 'view cart', 'go to cart', 'sepeti görüntüle',
        'sepete git', 'sepetim', 'cart', 'basket', 'checkout', 'odeme', 'ödeme'
      ];

      for (var k = 0; k < genericCandidates.length; k++) {
        var gBtn = genericCandidates[k];
        if (!isElementVisible(gBtn)) continue;

        var text = (gBtn.innerText || gBtn.textContent || gBtn.value || gBtn.getAttribute('aria-label') || '').trim().toLowerCase();
        if (!text || text.length > 50) continue;

        var isInvalid = false;
        for (var inv = 0; inv < invalidPhrases.length; inv++) {
          if (text === invalidPhrases[inv] || text.indexOf(invalidPhrases[inv]) > -1) {
            isInvalid = true;
            break;
          }
        }
        if (isInvalid) continue;

        for (var v = 0; v < validPhrases.length; v++) {
          if (text.indexOf(validPhrases[v]) > -1) {
            return true;
          }
        }
      }

      return false;
    };

    var isSingleProductPage = function(href) {
      var lowerHref = (href || window.location.href || '').toLowerCase();
      var path = window.location.pathname ? window.location.pathname.toLowerCase() : '';

      if (path === '/' || path === '' || path === '/en' || path === '/tr' || path === '/som' || path === '/home') {
        return false;
      }

      var isSearchOrListingUrl = (
        lowerHref.indexOf('/search') > -1 ||
        lowerHref.indexOf('/sr?') > -1 ||
        lowerHref.indexOf('/s?') > -1 ||
        lowerHref.indexOf('?keyword=') > -1 ||
        lowerHref.indexOf('/kategori/') > -1 ||
        lowerHref.indexOf('/category/') > -1 ||
        lowerHref.indexOf('/categories/') > -1 ||
        lowerHref.indexOf('/collection/') > -1 ||
        lowerHref.indexOf('/collections/') > -1 ||
        lowerHref.indexOf('/catalog/') > -1 ||
        lowerHref.indexOf('/checkout') > -1 ||
        lowerHref.indexOf('/odeme') > -1 ||
        lowerHref.indexOf('/account') > -1 ||
        lowerHref.indexOf('/user') > -1 ||
        lowerHref.indexOf('/login') > -1 ||
        lowerHref.indexOf('/register') > -1
      );

      var isProductUrl = (
        /-p-[a-z0-9_-]+/i.test(lowerHref) ||
        /-pm-[a-z0-9_-]+/i.test(lowerHref) ||
        /\/dp\/[a-z0-9]+/i.test(lowerHref) ||
        /\/gp\/aw\/d\/[a-z0-9]+/i.test(lowerHref) ||
        /\/gp\/product\/[a-z0-9]+/i.test(lowerHref) ||
        /\/d\/[a-z0-9]+/i.test(lowerHref) ||
        /\/pr\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/p\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/product\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/products\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/item\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/items\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/itm\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/goods\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/pd\/[a-z0-9_-]+/i.test(lowerHref) ||
        /\/pid\.[a-z0-9]+/i.test(lowerHref) ||
        /[?&](product_id|goods_id|item_id|pid|sku|asin)=/i.test(lowerHref)
      );

      if (isProductUrl) {
        return true;
      }

      if (isSearchOrListingUrl) {
        return false;
      }

      var ogType = document.querySelector('meta[property="og:type"]');
      var isProductMeta = (
        (ogType && ogType.content && ogType.content.toLowerCase().indexOf('product') > -1) ||
        !!document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]')
      );
      if (isProductMeta) {
        return true;
      }

      var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < jsonLdScripts.length; i++) {
        try {
          var text = jsonLdScripts[i].textContent || '';
          if (text.indexOf('"Product"') > -1 || text.indexOf('"@type":"Product"') > -1 || text.indexOf('"IndividualProduct"') > -1) {
            return true;
          }
        } catch(e) {}
      }

      var isProductContainer = !!document.querySelector(
        '#productTitle, #centerCol, #buybox, .product-detail-container, .product-detail-wrapper, .product-detail-app, .product-detail, .product-container, .product-intro, .pr-in-w, .p-detail, [data-test-id="product-detail"], [data-testid*="product-detail"], [class*="productDetail"], [class*="product-detail"]'
      );
      if (isProductContainer) {
        return true;
      }

      return false;
    };

    var check = function() {
      attempts++;
      try {
        var currentHref = window.location.href || '';
        var isSingleProduct = isSingleProductPage(currentHref);
        var hasBuyButton = false;

        if (isSingleProduct) {
          hasBuyButton = hasActiveCartOrBuyButton();
        }

        var isProduct = isSingleProduct && hasBuyButton;

        if (lastPostedState !== isProduct) {
          lastPostedState = isProduct;
          postStatus(isProduct, currentHref);
        }

        if (isProduct || attempts >= maxAttempts) {
          if (window.__RN_PRODUCT_CHECK_TIMER__) {
            try {
              if (typeof window.clearInterval === 'function') {
                window.clearInterval(window.__RN_PRODUCT_CHECK_TIMER__);
              } else if (typeof clearInterval === 'function') {
                clearInterval(window.__RN_PRODUCT_CHECK_TIMER__);
              }
            } catch(e) {}
            window.__RN_PRODUCT_CHECK_TIMER__ = null;
          }
        }
      } catch(err) {}
    };

    var setTimerFn = typeof window.setInterval === 'function' ? window.setInterval : setInterval;
    window.__RN_PRODUCT_CHECK_TIMER__ = setTimerFn(check, 500);
    check();

    if (window.MutationObserver && document.body) {
      try {
        var observer = new MutationObserver(function() {
          check();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.__RN_PRODUCT_MUTATION_OBSERVER__ = observer;
      } catch(e) {}
    }
  })();
  `;
};

