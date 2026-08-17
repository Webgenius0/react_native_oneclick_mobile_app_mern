export const AGGRESSIVE_TAP_FIXX = ``;
export const AGGRESSIVE_TAP_FIX = `
  (function() {
    if (window.__AGGRESSIVE_TAP_FIX_APPLIED__) {
      return;
    }
    window.__AGGRESSIVE_TAP_FIX_APPLIED__ = true;

    const LOG_PREFIX = '[AggressiveTapFix]';
    const log = (...args) => {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(LOG_PREFIX, ...args);
      }
    };

    const SMART_BANNER_HINTS = ['handleTouchMove', 'q-popup-content', 'q-popup'];
    const SMART_BANNER_SELECTOR = '.q-popup-overlay';

    function ensureViewport() {
      const desired = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      const metas = Array.from(document.querySelectorAll('meta[name="viewport"]'));
      if (metas.length === 0) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = desired;
        document.head.appendChild(meta);
        log('viewport meta inserted');
        return;
      }
      const primary = metas[0];
      if (primary.content !== desired) {
        primary.setAttribute('content', desired);
        log('viewport meta normalised');
      }
      metas.slice(1).forEach((extra) => {
        if (extra.parentNode) {
          extra.parentNode.removeChild(extra);
        }
      });
    }

    function injectTouchStyles() {
      if (document.getElementById('aggressive-tap-fix-styles')) {
        return;
      }
      const style = document.createElement('style');
      style.id = 'aggressive-tap-fix-styles';
      style.textContent = [
        'body { touch-action: manipulation !important; -webkit-overflow-scrolling: touch; }',
        'a, button, [role="button"], label, input, summary { touch-action: manipulation !important; cursor: pointer; }',
        '[data-scrollable="true"], .scrollable, .product-list, .category-list, [style*="overflow"] { touch-action: pan-y !important; }'
      ].join('\\n');
      document.head.appendChild(style);
      log('touch-action styles injected');
    }

    function normalizeOptions(options) {
      if (typeof options === 'boolean') {
        return { capture: options };
      }
      return Object.assign({}, options);
    }

    function looksLikeSmartBannerListener(listener) {
      if (typeof listener !== 'function') {
        return false;
      }
      const name = listener.name || '';
      const body = listener.toString ? listener.toString() : '';
      return SMART_BANNER_HINTS.some((hint) => name.indexOf(hint) !== -1 || body.indexOf(hint) !== -1);
    }

    function relaxTouchMove(targetPrototype) {
      const original = targetPrototype && targetPrototype.addEventListener;
      if (!original || original.__aggressiveTapFixPatched__) {
        return;
      }
      targetPrototype.addEventListener = function(type, listener, options) {
        if (type === 'touchmove' && looksLikeSmartBannerListener(listener)) {
          const normalized = normalizeOptions(options);
          if (normalized.passive !== true) {
            normalized.passive = true;
            log('forced passive touchmove listener on smart banner');
            return original.call(this, type, listener, normalized);
          }
        }
        return original.call(this, type, listener, options);
      };
      targetPrototype.addEventListener.__aggressiveTapFixPatched__ = true;
    }

    function unlockBodyIfNeeded() {
      if (!document.body) {
        return;
      }
      const overlayVisible = document.querySelector(
        SMART_BANNER_SELECTOR + '.q-popup-show, ' + SMART_BANNER_SELECTOR + '.show'
      );
      if (!overlayVisible) {
        ['overflow', 'position', 'top', 'width'].forEach((prop) => {
          if (document.body.style[prop]) {
            document.body.style.removeProperty(prop);
          }
        });
      }
    }

    function monitorBodyLock() {
      if (!document.body) {
        return;
      }
      const observer = new MutationObserver(unlockBodyIfNeeded);
      observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
      document.addEventListener('transitionend', unlockBodyIfNeeded, true);
      document.addEventListener('click', unlockBodyIfNeeded, true);
    }

    function findAnchorFromNode(node) {
      if (!node || typeof node.closest !== 'function') {
        return null;
      }
      return node.closest('a[href]');
    }

    function findAnchorFromEvent(event) {
      const direct = findAnchorFromNode(event.target);
      if (direct) {
        return direct;
      }
      if (event.changedTouches && event.changedTouches.length && typeof document.elementFromPoint === 'function') {
        const touch = event.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element) {
          return findAnchorFromNode(element);
        }
      }
      return null;
    }

    function shouldHandleAnchor(anchor) {
      if (!anchor) {
        return false;
      }
      const href = anchor.getAttribute('href');
      if (!href || href.trim() === '' || href.startsWith('#') || href.startsWith('javascript:')) {
        return false;
      }
      if (anchor.target && anchor.target !== '' && anchor.target.toLowerCase() !== '_self') {
        return false;
      }
      if (anchor.hasAttribute('download')) {
        return false;
      }
      return true;
    }

    function toAbsoluteHref(anchor) {
      if (!anchor) {
        return null;
      }
      try {
        return anchor.href;
      } catch (error) {
        return anchor.getAttribute('href');
      }
    }

    function navigateImmediately(href) {
      if (!href) {
        return false;
      }
      try {
        if (window.location && typeof window.location.assign === 'function') {
          window.location.assign(href);
        } else {
          window.location.href = href;
        }
        log('navigated immediately', href);
        return true;
      } catch (error) {
        log('failed to navigate', error);
        return false;
      }
    }

    function setupGlobalRedirects() {
      const state = {
        lastHref: null,
        timestamp: 0,
        touchId: null,
        touchStartX: 0,
        touchStartY: 0,
        touchMoved: false,
        ignoreUntil: 0,
        candidateAnchor: null
      };

      const suppressSubsequentClick = (href) => {
        state.lastHref = href;
        state.timestamp = Date.now();
      };

      const wasJustForwarded = (href) => {
        if (!href) {
          return false;
        }
        const elapsed = Date.now() - state.timestamp;
        return elapsed < 700 && state.lastHref === href;
      };

      const resetTouchState = () => {
        state.touchId = null;
        state.touchStartX = 0;
        state.touchStartY = 0;
        state.touchMoved = false;
        state.candidateAnchor = null;
      };

      const touchStartHandler = (event) => {
        if (event.touches && event.touches.length === 1) {
          const touch = event.touches[0];
          state.touchId = touch.identifier;
          state.touchStartX = touch.clientX;
          state.touchStartY = touch.clientY;
          state.touchMoved = false;
          state.candidateAnchor = findAnchorFromEvent(event);
        } else {
          resetTouchState();
        }
      };

      const touchMoveHandler = (event) => {
        if (!event.touches || state.touchId === null) {
          return;
        }
        const threshold = 10;
        for (let i = 0; i < event.touches.length; i += 1) {
          const touch = event.touches[i];
          if (touch.identifier === state.touchId) {
            const deltaX = Math.abs(touch.clientX - state.touchStartX);
            const deltaY = Math.abs(touch.clientY - state.touchStartY);
            if (deltaX > threshold || deltaY > threshold) {
              state.touchMoved = true;
            }
            break;
          }
        }
      };

      const touchEndHandler = (event) => {
        if (event.defaultPrevented) {
          return;
        }
        if (state.touchMoved) {
          state.ignoreUntil = Date.now() + 400;
          resetTouchState();
          return;
        }
        const anchor = findAnchorFromEvent(event) || state.candidateAnchor;
        resetTouchState();
        if (!shouldHandleAnchor(anchor)) {
          return;
        }
        const href = toAbsoluteHref(anchor);
        if (navigateImmediately(href)) {
          suppressSubsequentClick(href);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      const clickHandler = (event) => {
        if (event.defaultPrevented || (event.type === 'click' && event.button !== 0)) {
          return;
        }
        if (Date.now() <= state.ignoreUntil) {
          return;
        }
        const anchor = findAnchorFromEvent(event);
        if (!shouldHandleAnchor(anchor)) {
          return;
        }
        const href = toAbsoluteHref(anchor);
        if (wasJustForwarded(href)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (navigateImmediately(href)) {
          suppressSubsequentClick(href);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };

      document.addEventListener('touchstart', touchStartHandler, { passive: true, capture: true });
      document.addEventListener('touchmove', touchMoveHandler, { passive: true, capture: true });
      document.addEventListener('touchend', touchEndHandler, true);
      document.addEventListener('click', clickHandler, true);
    }

    function init() {
      ensureViewport();
      injectTouchStyles();
      relaxTouchMove(Document.prototype);
      relaxTouchMove(Window.prototype);
      unlockBodyIfNeeded();
      monitorBodyLock();
      setupGlobalRedirects();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }

    window.addEventListener('load', unlockBodyIfNeeded);
  })();
`;
