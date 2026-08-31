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
      
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // Trendyol'un touch event'lerini engelle
        if (type === 'touchstart' || type === 'touchend' || type === 'touchmove') {
          // Sadece bizim optimizasyonlarımızın çalışmasına izin ver
          if (listener.toString().includes('trendyol') || 
              listener.toString().includes('analytics') ||
              listener.toString().includes('tracking') ||
              listener.toString().includes('sfxFragmentInjector')) {
            console.log('🚫 Blocked problematic touch listener:', type);
            return;
          }
        }
        
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Script tag blocking - sfxFragmentInjector içeren scriptleri engelle
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        
        if (tagName.toLowerCase() === 'script') {
          const originalSetAttribute = element.setAttribute;
          element.setAttribute = function(name, value) {
            if (name === 'src' && value && value.includes('sfxFragmentInjector')) {
              console.log('🚫 Blocked sfxFragmentInjector script:', value);
              return; // Script yüklenmesini engelle
            }
            return originalSetAttribute.call(this, name, value);
          };
          
          // innerHTML ve textContent için de kontrol
          Object.defineProperty(element, 'innerHTML', {
            set: function(value) {
              if (value && value.includes('sfxFragmentInjector')) {
                console.log('🚫 Blocked sfxFragmentInjector inline script');
                return;
              }
              this._innerHTML = value;
            },
            get: function() {
              return this._innerHTML || '';
            }
          });
          
          Object.defineProperty(element, 'textContent', {
            set: function(value) {
              if (value && value.includes('sfxFragmentInjector')) {
                console.log('🚫 Blocked sfxFragmentInjector text content');
                return;
              }
              this._textContent = value;
            },
            get: function() {
              return this._textContent || '';
            }
          });
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
    
    // 5. IMMEDIATE CLICK SIMULATION (with scroll protection)
    function setupImmediateClickHandling() {
      document.addEventListener('touchend', function(e) {
        // Don't trigger click if user was scrolling
        if (isScrolling) {
          console.log('🚫 Click blocked - user was scrolling');
          return;
        }
        
        if (e.touches.length === 0 && e.target) {
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
      // sfxFragmentInjector'ı engelle
      if (window.sfxFragmentInjector) {
         // window.sfxFragmentInjector = null;
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
    
    // Tüm düzeltmeleri uygula
    function applyAllFixes() {
      forceViewportFix();
      blockProblematicEventListeners();
      applyCSSFixes();
      setupScrollDetection();
      setupImmediateClickHandling();
      preventScriptInterference();
      
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
