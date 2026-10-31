/**
 * Exact, optimized HTML & CSS animation from 1click-splash.html
 * Runs hardware-accelerated 60/120fps CSS keyframes in WebView
 */
export const SPLASH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>1Click To Shop</title>
<style>
  :root {
    --tango: #F58423;
    --tango-hi: #FFA54F;
    --tango-lo: #EC6F12;
    --ink: #000000;
    --cream: #FFF7EE;
    --muted: rgba(255, 247, 238, 0.92);
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: inherit;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  html, body {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #F58423;
  }
  body {
    background:
      radial-gradient(90% 55% at 50% 42%, rgba(255, 214, 160, 0.45) 0%, rgba(255, 214, 160, 0) 70%),
      linear-gradient(165deg, var(--tango-hi) 0%, var(--tango) 48%, var(--tango-lo) 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .stage {
    position: relative;
    width: 100%;
    max-width: 430px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg.splash {
    width: 100%;
    height: 100%;
    max-height: 100%;
    display: block;
    overflow: visible;
  }

  .journey { transform-origin: 180px 330px; }
  .stop { transform-box: fill-box; transform-origin: center; opacity: 0; transform: scale(0.8); }
  .reveal-bar { transform-box: fill-box; transform-origin: left center; transform: scaleX(0); }
  .plane, .moto { opacity: 0; transform-box: fill-box; transform-origin: center; }

  .logo-wrap { transform: translate(180px, 190px) scale(0.55) translate(-227px, -274px); }
  .l-one, .l-hand, .l-click, .l-shop { opacity: 0; }
  .l-hand { transform-box: fill-box; transform-origin: 50% 100%; }
  .tap-ring { opacity: 0; transform-box: fill-box; transform-origin: center; }

  .loader {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(92px + env(safe-area-inset-bottom, 0px));
    width: 132px;
    height: 4px;
    border-radius: 4px;
    background: rgba(255, 247, 238, 0.35);
    overflow: hidden;
  }
  .loader i {
    display: block;
    height: 100%;
    width: 100%;
    border-radius: 4px;
    background: var(--cream);
    transform-origin: left;
    transform: scaleX(0);
  }
  .version {
    position: absolute;
    left: 0;
    right: 0;
    text-align: center;
    color: var(--muted);
    font-weight: 500;
    bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    font-size: 0.95rem;
    letter-spacing: 0.03em;
  }

  /* ---------- timeline (optimized 2.7s for mobile splash) ---------- */
  .play .l-one   { animation: rise 0.4s cubic-bezier(.2,1.25,.5,1) 0.00s forwards; }
  .play .l-hand  { animation: tap 0.4s cubic-bezier(.3,1.4,.6,1) 0.15s forwards; }
  .play .l-click { animation: slide-in 0.35s cubic-bezier(.2,1.1,.4,1) 0.10s forwards; }
  .play .l-shop  { animation: slide-in 0.35s cubic-bezier(.2,1.1,.4,1) 0.20s forwards; }
  .play .tap-ring.t1 { animation: ripple 0.45s ease-out 0.40s forwards, ripple 0.45s ease-out 2.95s forwards; }
  .play .tap-ring.t2 { animation: ripple 0.45s ease-out 0.50s forwards, ripple 0.45s ease-out 3.05s forwards; }
  .play .logo-wrap { animation: settle 0.35s cubic-bezier(.3,.9,.3,1) 2.50s forwards; }

  .play .bag        { animation: pop 0.35s cubic-bezier(.2,1.4,.5,1) 0.25s forwards; }
  .play .reveal-bar { animation: reveal 1.55s linear 0.40s forwards; }
  .play .plane      { animation: takeoff 0.45s cubic-bezier(.3,.7,.3,1) 0.42s forwards; }
  .play .wh         { animation: pop 0.35s cubic-bezier(.2,1.4,.5,1) 0.95s forwards; }
  .play .moto       { animation: ride 0.40s cubic-bezier(.3,.7,.3,1) 1.30s forwards; }
  .play .home       { animation: pop 0.35s cubic-bezier(.2,1.4,.5,1) 1.85s forwards; }
  .play .journey    { animation: journey-out 0.26s cubic-bezier(.6,0,.8,.4) 2.45s forwards; }
  .play ~ .loader i { animation: load 2.7s cubic-bezier(.4,0,.2,1) forwards; }

  @keyframes reveal { to { transform: scaleX(1); } }
  @keyframes takeoff {
    0%   { opacity: 0; transform: translate(-36px, 0) rotate(0deg); }
    25%  { opacity: 1; }
    55%  { transform: translate(-14px, -5px) rotate(-12deg); }
    100% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
  }
  @keyframes ride {
    0%   { opacity: 0; transform: translateX(-34px); }
    30%  { opacity: 1; }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes pop  { to { opacity: 1; transform: scale(1); } }
  @keyframes journey-out { to { opacity: 0; transform: translateY(14px) scale(0.9); } }
  @keyframes settle { to { transform: translate(180px, 318px) scale(1.12) translate(-227px, -274px); } }
  @keyframes rise { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: none; } }
  @keyframes tap { 0% { opacity: 0; transform: translateY(-22px) scale(1.1); } 60% { opacity: 1; transform: translateY(3px) scale(.96); } 100% { opacity: 1; transform: none; } }
  @keyframes ripple { 0% { opacity: .9; transform: scale(.5); } 100% { opacity: 0; transform: scale(1.8); } }
  @keyframes slide-in { 0% { opacity: 0; transform: translateX(18px); } 100% { opacity: 1; transform: none; } }
  @keyframes load { to { transform: scaleX(1); } }
</style>
</head>
<body>
<div class="stage">
  <svg class="splash play" id="splash" viewBox="0 0 360 640" role="img" aria-label="1Click To Shop">
    <defs>
      <mask id="routeMask" maskUnits="userSpaceOnUse" x="0" y="300" width="360" height="60">
        <rect class="reveal-bar" x="60" y="324" width="240" height="12" fill="#fff"/>
        <rect x="89" y="318" width="38" height="24" fill="#000"/>
        <rect x="156" y="318" width="48" height="24" fill="#000"/>
        <rect x="234" y="318" width="38" height="24" fill="#000"/>
      </mask>
    </defs>

    <!-- JOURNEY: store -> plane -> warehouse -> courier -> doorstep -->
    <g class="journey">
      <path d="M62 330 H298" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 7" mask="url(#routeMask)"/>

      <g fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <!-- 1. online store: shopping bag -->
        <g class="stop bag">
          <g transform="translate(38 330) scale(1.3) translate(-38 -330)" stroke-width="1.7">
            <path d="M29.5 325 H46.5 L45.2 340 Q45 341.6 43.4 341.6 H32.6 Q31 341.6 30.8 340 Z"/>
            <path d="M34 325 V322.5 Q34 318 38 318 Q42 318 42 322.5 V325"/>
            <circle cx="38" cy="332.5" r="2" fill="var(--ink)" stroke="none"/>
          </g>
        </g>

        <!-- 2. airplane on the route -->
        <g transform="translate(108 330)">
          <g class="plane">
            <path d="M-12.5 0 Q-12.5 -2.2 -9.8 -2.2 H10.5 Q14 -2.2 14 0 Q14 2.2 10.5 2.2 H-9.8 Q-12.5 2.2 -12.5 0 Z" fill="var(--ink)" stroke="none"/>
            <path d="M-1 -1.8 L-6.2 -12 H-2.4 L6 -1.8 Z M-1 1.8 L-6.2 12 H-2.4 L6 1.8 Z" fill="var(--ink)" stroke="none"/>
            <path d="M-10.5 -1.4 L-13.6 -6.6 H-10.6 L-7 -1.4 Z M-10.5 1.4 L-13.6 6.6 H-10.6 L-7 1.4 Z" fill="var(--ink)" stroke="none"/>
          </g>
        </g>

        <!-- 3. 1Click warehouse -->
        <g class="stop wh">
          <g transform="translate(180 330) scale(1.3) translate(-180 -330)" stroke-width="1.7">
            <path d="M168.5 328.5 L180 319.5 L191.5 328.5"/>
            <path d="M171 327 V340.5 H189 V327"/>
            <path d="M175 340.5 V332.5 H185 V340.5"/>
            <path d="M175 336.5 H185"/>
            <circle cx="180" cy="326.2" r="1.7" fill="var(--ink)" stroke="none"/>
          </g>
        </g>

        <!-- 4. courier: motorbike carrying package -->
        <g transform="translate(252 330)">
          <g class="moto">
            <circle cx="-9.5" cy="6" r="4.8"/>
            <circle cx="10" cy="6" r="4.8"/>
            <path d="M-9.5 6 L-4 -0.5 H5 L10 6"/>
            <path d="M5 -0.5 L7.6 -7 H11.4"/>
            <path d="M-1.6 -0.5 L1 -8.5"/>
            <circle cx="1.6" cy="-12" r="3" fill="var(--ink)" stroke="none"/>
            <rect x="-14.5" y="-11" width="9.5" height="8.5" rx="1.6" fill="var(--ink)"/>
            <path d="M-14.5 -6.75 H-5" stroke="var(--tango)"/>
          </g>
        </g>

        <!-- 5. customer doorstep: house -->
        <g class="stop home">
          <g transform="translate(322 330) scale(1.3) translate(-322 -330)" stroke-width="1.7">
            <path d="M310.5 329 L322 319.5 L333.5 329"/>
            <path d="M313.5 326.8 V340.5 H330.5 V326.8"/>
            <rect x="319.4" y="333.2" width="5.2" height="7.3" rx="1" fill="var(--ink)" stroke="none"/>
          </g>
        </g>
      </g>
    </g>

    <!-- LOGO (brand file) -->
    <g class="logo-wrap">
      <polygon class="l-one" points="166.45 213.52 166.45 334.35 137.26 334.35 137.26 244.38 120.88 244.38 120.88 231.2 137.26 213.52 166.45 213.52" fill="var(--ink)"/>
      <circle class="tap-ring t1" cx="195.8" cy="227" r="9" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
      <circle class="tap-ring t2" cx="195.8" cy="227" r="9" fill="none" stroke="var(--ink)" stroke-width="1.1"/>
      <g class="l-hand" fill="var(--ink)">
        <path d="M213.81,237.78c-.59,0-1.15.23-1.57.65-.42.42-.65.97-.64,1.570l.04,6.92c0,.43-.35.8-.78.8-.42,0-.76-.35-.76-.77l-.04-8.58c0-1.23-.99-2.23-2.2-2.23-.59,0-1.15.23-1.56.65-.42.42-.65.97-.64,1.57l.04,8.14c0,.42-.33.77-.75.78-.43.01-.79-.36-.79-.79l-.04-8.45c.51-.39.99-.81,1.44-1.27.73-.74,1.37-1.54,1.9-2.4,1.34-2.16,2.06-4.65,2.04-7.26-.02-3.64-1.46-7.06-4.04-9.62-2.59-2.56-6.02-3.96-9.66-3.94s-7.06,1.46-9.62,4.04c-2.56,2.59-3.96,6.02-3.94,9.66s1.46,7.06,4.04,9.62c1.62,1.6,3.57,2.75,5.69,3.38v-1.91c-4.59-1.61-7.9-5.97-7.92-11.1-.03-6.52,5.24-11.86,11.77-11.89s11.86,5.24,11.89,11.77c.02,2.930-1.04,5.62-2.8,7.7-.39.46-.82.89-1.27,1.29-.4-.5-1.02-.83-1.7-.83h-.02c-.59,0-1.13.23-1.55.65-.16.16-.28.33-.39.52-.17.32-.26.68-.26,1.05v.87s.01,1.9.01,1.9l.03,6.27c0,.42-.33.77-.75.78-.43.01-.79-.36-.79-.79l-.03-5.9v-1.84s-.03-3.59-.03-3.59v-1.9s-.04-5.14-.04-5.14c0-1.23-.99-2.23-2.2-2.23h-.02c-.59,0-1.14.23-1.55.65-.42.42-.64,1-.64,1.6l.03,5.16v1.89s.03,3.58.03,3.58v1.84s.06,10.08.06,10.08c-.98-1.35-3.92-4.18-6.72-6.55-.41-.35-.93-.54-1.46-.53-.07,0-.15,0-.22.01-.61.06-1.16.36-1.54.85-.32.4-.48.89-.48,1.4s.19,1.05.54,1.45c4.83,5.7,7.93,9.97,9.48,13.04.86,1.71,1.69,3.36,2.46,4.89.67,1.34,2.01,2.16,3.51,2.15l10.84-.06c1.05,0,2.01-.58,2.51-1.5l1.81-3.33c1.04-1.92,1.59-4.09,1.58-6.28l-.08-16.26c0-1.23-.99-2.23-2.2-2.23Z"/>
        <path d="M195.81,220.63c3.6-.02,6.54,2.89,6.56,6.49.01,2.07-.95,3.92-2.45,5.13v1.71h0v.46c.47-.26.91-.57,1.32-.92,1.8-1.54,2.95-3.83,2.93-6.39-.02-4.6-3.78-8.32-8.38-8.29-4.6.02-8.32,3.78-8.29,8.38.02,3.16,1.8,5.9,4.4,7.3v-2.15c-1.57-1.19-2.58-3.06-2.59-5.16-.02-3.6,2.89-6.54,6.49-6.56Z"/>
      </g>
      <text class="l-click" x="183.42" y="311.95" font-family="Roboto, -apple-system, sans-serif" font-weight="700" font-size="49.73" fill="var(--ink)">CLICK</text>
      <text class="l-shop" x="238.22" y="334.35" font-family="Roboto, -apple-system, sans-serif" font-weight="700" font-size="20.43" fill="var(--ink)">TO SHOP</text>
    </g>
  </svg>
  <div class="loader" aria-hidden="true"><i></i></div>
  <div class="version">Version 1.0</div>
</div>
<script>
  setTimeout(function() {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage('READY');
      }
    } catch (e) {}
  }, 2750);
</script>
</body>
</html>`;
