export const AGGRESSIVE_TAP_FIXX = ``;
export const AGGRESSIVE_TAP_FIX = `
  (function() {
    console.log('🚀 Aggressive iOS Tap Delay Fix - Starting...');
    
    // Scroll detection variables
    let isScrolling = false;
    let scrollTimeout;
    let touchStartY = 0;
    let touchStartX = 0;
    let scrollThreshold = 10; // minimum pixels to consider as scroll
    
    // 1. VIEWPORT OVERRIDE - En kritik düzeltme
    function forceViewportFix() {
      // Tüm mevcut viewport meta tag'lerini sil
      document.querySelectorAll('meta[name="viewport"]').forEach(meta => {
        meta.remove();
      });
      
      // Yeni viewport meta tag'i ekle (maximum-scale=1 ile)
      const newViewport = document.createElement('meta');
      newViewport.name = 'viewport';
      newViewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      document.head.appendChild(newViewport);
      
      console.log('✅ Viewport fixed - maximum-scale=1 enforced');
    }
    
    // 2. EVENT LISTENER BLOCKING
    function blockProblematicEventListeners() {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      
      const blockedTouchListenerPatterns = [/analytics/i, /tracking/i, /sfxFragmentInjector/i];

      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Search elementleri için event listener'ları koruma
        if (this && (this.classList?.contains('search-icon') || 
                     this.classList?.contains('search-button') ||
                     this.className?.includes('search') ||
                     this.id?.includes('search'))) {
          console.log('🔍 Allowing event listener for search element:', type);
          return originalAddEventListener.call(this, type, listener, options);
        }
        
        // Trendyol arama butonu gibi temel etkileşimlerin bozulmaması için
        // sadece gerçekten problemli script imzalarını taşıyan dinleyicileri engelle.
        if ((type === 'touchstart' || type === 'touchend' || type === 'touchmove') && listener) {
          const source = typeof listener === 'function'
            ? listener.toString()
            : (listener && typeof listener.handleEvent === 'function')
              ? listener.handleEvent.toString()
              : '';

          if (source && blockedTouchListenerPatterns.some(pattern => pattern.test(source))) {
            console.log('🚫 Blocked problematic touch listener:', type);
            return;
          }
        }
        
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Script tag blocking - sfxFragmentInjector içeren scriptleri engelle

      // bu kısım problemli ------
      const blockedScriptPattern = /sfxFragmentInjector/i;
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          
        const originalSetAttribute = element.setAttribute;
          
          
          // innerHTML ve textContent için de kontrol - daha spesifik blokaj
          const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'innerHTML');
          const textContentDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'textContent') ||
            Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');

          if (innerHTMLDescriptor && typeof innerHTMLDescriptor.set === 'function') {
            Object.defineProperty(element, 'innerHTML', {
              set: function(value) {
                // Sadece gerçekten script tag'i içeren ve sfxFragmentInjector pattern'i olan içeriği engelle
                if (value && typeof value === 'string' && 
                    value.includes('<script') && 
                    blockedScriptPattern.test(value)) {
                  console.log('🚫 Blocked sfxFragmentInjector inline script');
                  return;
                }
                innerHTMLDescriptor.set.call(this, value);
              },
              get: function() {
                return innerHTMLDescriptor.get ? innerHTMLDescriptor.get.call(this) : '';
              }
            });
          }

          if (textContentDescriptor && typeof textContentDescriptor.set === 'function') {
            Object.defineProperty(element, 'textContent', {
              set: function(value) {
                // Sadece script element'inde ve sfxFragmentInjector pattern'i varsa engelle
                if (value && typeof value === 'string' && 
                    blockedScriptPattern.test(value) &&
                    (value.includes('function') || value.includes('var ') || value.includes('let ') || value.includes('const '))) {
                  console.log('🚫 Blocked sfxFragmentInjector text content');
                  return;
                }
                textContentDescriptor.set.call(this, value);
              },
              get: function() {
                return textContentDescriptor.get ? textContentDescriptor.get.call(this) : '';
              }
            });
          }
        }
        
        return element;
      };
      
      console.log('✅ Event listeners and script blocking setup complete');
    }
    
    // 3. CSS TOUCH-ACTION OVERRIDE
    function applyCSSFixes() {
      const style = document.createElement('style');
      style.textContent = \`
        * {
          touch-action: manipulation !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        a, button, [onclick], [role="button"] {
          touch-action: manipulation !important;
          cursor: pointer !important;
        }
        
        /* Trendyol specific overrides */
        .product-item, .add-to-basket, .btn, .button {
          touch-action: manipulation !important;
        }
        
        /* Search functionality specific fixes */
        .search-icon, .search-button, [class*="search"], [id*="search"] {
          touch-action: manipulation !important;
          pointer-events: auto !important;
          -webkit-user-select: auto !important;
        }
        
        /* Input elements should allow user interaction */
        input, textarea, select {
          touch-action: manipulation !important;
          -webkit-user-select: auto !important;
          pointer-events: auto !important;
        }
        
        /* Allow scrolling on scrollable elements */
        .scroll-container, .product-list, .category-list, [style*="overflow"] {
          touch-action: pan-y !important;
        }
      \`;
      document.head.appendChild(style);
      console.log('✅ CSS touch-action rules applied');
    }
    
    // 4. SCROLL DETECTION
    function setupScrollDetection() {
      // Track touch start position
      document.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
          isScrolling = false;
        }
      }, { passive: true });
      
      // Detect scroll movement
      document.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1) {
          const touchY = e.touches[0].clientY;
          const touchX = e.touches[0].clientX;
          const deltaY = Math.abs(touchY - touchStartY);
          const deltaX = Math.abs(touchX - touchStartX);
          
          // If movement exceeds threshold, consider it scrolling
          if (deltaY > scrollThreshold || deltaX > scrollThreshold) {
            isScrolling = true;
            clearTimeout(scrollTimeout);
          }
        }
      }, { passive: true });
      
      // Reset scroll state after touch ends
      document.addEventListener('touchend', function(e) {
        if (isScrolling) {
          scrollTimeout = setTimeout(() => {
            isScrolling = false;
          }, 100); // Small delay to prevent immediate clicks after scroll
        }
      }, { passive: true });
      
      console.log('✅ Scroll detection setup complete');
    }
    
    // 5. IMMEDIATE CLICK SIMULATION (with scroll protection and search support)
    function setupImmediateClickHandling() {
      document.addEventListener('touchend', function(e) {
        // Don't trigger click if user was scrolling
        if (isScrolling) {
          console.log('🚫 Click blocked - user was scrolling');
          return;
        }
        
        if (e.touches.length === 0 && e.target) {
          // Search elementleri için özel işlem
          const isSearchElement = e.target.classList.contains('search-icon') ||
                                 e.target.classList.contains('search-button') ||
                                 e.target.className.includes('search') ||
                                 e.target.id.includes('search') ||
                                 e.target.closest('[class*="search"]') ||
                                 e.target.closest('[id*="search"]');
          
          if (isSearchElement) {
            console.log('🔍 Search element detected, allowing native behavior');
            // Search elementleri için native behavior'a izin ver
            return;
          }
          
          // Tüm event propagation'ı durdur
          e.stopImmediatePropagation();
          e.preventDefault();
          
          // Anında click event'i tetikle
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: e.changedTouches[0].clientX,
            clientY: e.changedTouches[0].clientY
          });
          
          e.target.dispatchEvent(clickEvent);
          
          // Link ise direkt navigate et
          if (e.target.tagName === 'A' && e.target.href) {
            window.location.href = e.target.href;
          }
        }
      }, true); // Capture phase'de çalış
      
      console.log('✅ Immediate click handling setup complete');
    }
    
    // 6. TRENDYOL SCRIPT INTERFERENCE PREVENTION
    function preventScriptInterference() {
      // sfxFragmentInjectorr'ı engelle
      if (window.sfxFragmentInjectorr) {
         window.sfxFragmentInjectorr = null;
      }
      
      // Analytics script'lerini devre dışı bırak
      window.dataLayer = window.dataLayer || [];
      const originalPush = window.dataLayer.push;
      window.dataLayer.push = function() {
        // Analytics event'lerini sessizce yok say
        return;
      };
      
      console.log('✅ Trendyol script interference prevented');
    }
    
    // 7. SEARCH FUNCTIONALITY PROTECTION
    function protectSearchFunctionality() {
      // Search elementlerini sürekli izle ve koruma altına al
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) { // Element node
                // Search elementlerini bul ve koru
                const searchElements = node.querySelectorAll ? 
                  node.querySelectorAll('[class*="search"], [id*="search"], .search-icon, .search-button') : [];
                
                searchElements.forEach(function(element) {
                  // Search elementleri için özel koruma
                  element.style.pointerEvents = 'auto';
                  element.style.touchAction = 'manipulation';
                  console.log('🔍 Protected search element:', element.className || element.id);
                });
              }
            });
          }
        });
      });
      
      // DOM'u izlemeye başla
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('✅ Search functionality protection active');
    }
    
    // Tüm düzeltmeleri uygula
    function applyAllFixes() {
      forceViewportFix();
      blockProblematicEventListeners();
      applyCSSFixes();
      setupScrollDetection();
      setupImmediateClickHandling();
      preventScriptInterference();
      protectSearchFunctionality();
      
      console.log('🎯 All iOS tap delay fixes applied successfully!');
    }
    
    // DOM hazır olduğunda çalıştır
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyAllFixes);
    } else {
      applyAllFixes();
    }
    
    // Sayfa yüklendikten sonra da tekrar kontrol et
    window.addEventListener('load', function() {
      setTimeout(applyAllFixes, 100);
    });
    
  })();
`;
