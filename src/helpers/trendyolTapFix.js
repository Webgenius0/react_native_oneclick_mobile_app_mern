// This script is injected into the WebView to fix iOS tap delays on sites like Trendyol.
// It runs immediately after the document object is created but before the rest of the page loads.
const trendyolTapFix = `
  (function() {
    try {
      // 1. Fix the viewport meta tag to prevent iOS 300ms tap delay.
      // The delay is caused by the browser waiting to see if the user will double-tap to zoom.
      // By disabling user scaling, we eliminate this delay.
      var viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      } else {
        // If no viewport exists, create one with the correct settings.
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
      }

      // 2. Apply CSS 'touch-action' property to the body.
      // This tells the browser not to wait for a potential double-tap-to-zoom gesture.
      // We wait for DOMContentLoaded to ensure the body element is available.
      document.addEventListener('DOMContentLoaded', function() {
        if (document.body) {
          document.body.style.touchAction = 'manipulation';
        }

        // 3. Add a click listener for debugging 'a' tag clicks.
        // Use event delegation on the document to catch all clicks efficiently.
        document.addEventListener('click', function(event) {
          // Find the closest 'a' tag ancestor of the clicked element.
          var target = event.target.closest('a');
          
          if (target) {
            // If an 'a' tag was clicked, show the alert.
            // alert('tıkladın -> ' + target.href);
            // post data to postMessage
            window.ReactNativeWebView.postMessage(target.href, '*');
          }
        }, true); // Use capture phase to catch the event before it might be stopped by other scripts.
      });

    } catch (e) {
      // In case of any error, log it to the console for debugging.
      console.error('Error in trendyolTapFix script: ', e);
    }
  })();
`;

export default trendyolTapFix;
