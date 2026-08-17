# OneClickToShop (1ClickToShop) - প্রজেক্ট এনালাইসিস ও আর্কিটেকচার রিপোর্ট

> **তৈরির তারিখ:** আগস্ট ৯, ২০২৬  
> **প্রজেক্ট টাইপ:** React Native (Cross-Border / Proxy E-Commerce Mobile App)  
> **বর্তমান ভার্সন:** 38 (Production Ready & Live App)  
> **প্রজেক্ট স্ট্যাটাস:** অ্যাক্টিভ প্রোডাকশন (Active Production)

---

## ১. প্রজেক্টের সারসংক্ষেপ (Executive Summary)

**OneClickToShop** একটি প্রোডাকশন-রেডি রিয়েক্ট নেটিভ (React Native) মোবাইল অ্যাপ্লিকেশন। অ্যাপটির প্রধান লক্ষ্য হলো আন্তর্জাতিক (বিশেষ করে তুরস্কের) বিভিন্ন জনপ্রিয় ই-কমার্স ওয়েবসাইট (যেমন: Trendyol, Hepsiburada, Amazon Turkey, Zara, LC Waikiki, Shein ইত্যাদি) থেকে সোমালিয়া এবং পূর্ব আফ্রিকার গ্রাহকদের পণ্য কেনার সুযোগ করে দেওয়া (Proxy / Cross-Border Shopping)।

### অ্যাপের মূল ফিচারসমূহ:
1. **In-App WebView & Auto Scraping:** ব্যবহারকারী অ্যাপের ভেতর বিভিন্ন ই-কমার্স ওয়েবসাইট ব্রাউজ করতে পারে। অ্যাপের ভেতর রিমোটলি ইনজেক্ট করা জাভাস্ক্রিপ্ট ইঞ্জিন ওয়েবসাইটের প্রোডাক্টের নাম, দাম, ছবি, অপশন/সাইজ এবং ডেসক্রিপশন রিয়েল-টাইমে ডিটেক্ট ও এক্সট্র্যাক্ট করতে পারে।
2. **Dynamic Web Translation:** তুর্কি বা বিদেশি ভাষার প্রোডাক্ট পেজকে ব্যবহারকারীর পছন্দের ভাষায় (Somali, English, Arabic) ইন-অ্যাপ অনূদিত করে দেখায়।
3. **Cart Management:** প্রোডাক্ট পছন্দ হলে এক ক্লিকে ইন-অ্যাপ কার্টে সেভ করা এবং কাস্টম নোট/সাইজ সিলেক্ট করে একাধিক আইটেম অর্ডার করা।
4. **External Link Sharing (Sharing Intent):** মোবাইল ব্রাউজার বা অন্যান্য ই-কমার্স অ্যাপ (যেমন Trendyol অ্যাপ) থেকে সরাসরি লিংক শেয়ার করে ১ক্লিক অ্যাপের কার্টে আইটেম যুক্ত করা।
5. **Somali Local Payment Integration:** সোমালিয়ার স্থানীয় জনপ্রিয় মোবাইল মানি পেমেন্ট গেটওয়ে **WaafiPay** এবং **eDahab** (Telesom/Hormuud) এর মাধ্যমে সহজ পেমেন্ট প্রসেসিং।
6. **Order Tracking & Notifications:** অর্ডারের স্ট্যাটাস পরিবর্তন (Order Placed, Purchased, Shipped, Arrived, Delivered) Firebase Push Notification এবং ইন-অ্যাপ নোটিফিকেশনের মাধ্যমে ট্র্যাকিং।

---

## ২. টেকনোলজি স্ট্যাক (Technology Stack Analysis)

| ক্যাটাগরি | ব্যবহৃত টেকনোলজি / লাইব্রেরি | বিবরণ ও ব্যবহার |
| :--- | :--- | :--- |
| **Core Framework** | React Native `0.77.3` | অ্যান্ড্রয়েড ও আইওএস উভয় প্ল্যাটফর্মের জন্য নেটিভ অ্যাপ। |
| **Language & Runtime** | JavaScript (ES6+), React `18.3.1`, Node `>=18` | আধুনিক রিয়েক্ট ফাংশনাল কম্পোনেন্ট ও হুক্স ভিত্তিক কোড। |
| **State Management** | **Zustand** `^4.5.5` + React Context (`EmContext`) | হালকা ও দ্রুত স্টোর ম্যানেজমেন্ট, `@react-native-async-storage/async-storage` দ্বারা অফলাইন পার্সিস্টেন্স (Cart, User, Notifications, Webview state)। |
| **Navigation** | `@react-navigation/native` `^6.1.18`, `native-stack`, `bottom-tabs` | স্ট্যাক ও বটম-ট্যাব নেভিগেশন। গ্লোবাল নেভিগেশনের জন্য `RootNavigation` সার্ভিস। |
| **HTTP Client** | Axios `^1.7.4` | ব্যাকএন্ড API REST endpoints-এর সাথে ডেটা আদান-প্রদান। |
| **WebView Engine** | `react-native-webview` `^14.0.1` | ই-কমার্স সাইট লোড করা এবং স্ক্রিপ্ট ইনজেকশনের মাধ্যমে প্রোডাক্ট এক্সট্র্যাকশন ও অটোট্যাপ ফিক্সিং। |
| **Push Notifications** | `@react-native-firebase/app`, `@react-native-firebase/messaging` `24.0.0` | ফায়ারবেস ক্লাউড মেসেজিং (FCM) দিয়ে অর্ডার ও প্রোমো নোটিফিকেশন রিসিভ। |
| **Sharing Intent** | `react-native-receive-sharing-intent` `^2.0.0` | থার্ড-পার্টি অ্যাপ থেকে প্রোডাক্ট লিংক ইনপুট রিসিভ। |
| **Internationalization (i18n)** | `i18n-js`, `react-i18next`, `react-native-localize` | বহুভাষিক সমর্থন (Somali, English, Turkish, Arabic RTL support)। |
| **Local Payment Gateways** | WaafiPay, eDahab | সোমালিয়া অঞ্চলের স্থানীয় পেমেন্ট মেথড হ্যান্ডলিং। |
| **Dependency Patching** | `patch-package` `^8.0.0` | নেটিভ/লাইব্রেরি বাগ ফিক্স অ্যাপ্লাই করার জন্য (যেমন `react-native-fast-image`)। |
| **Build Tools** | Gradle (Android APK/AAB), Xcode / CocoaPods (iOS with Ruby logger fix), Yarn v3 (`3.6.4`) | নেটিভ বিল্ড ও ডিপেনডেন্সি ম্যানেজমেন্ট। |

---

## ৩. প্রজেক্ট আর্কিটেকচার ও ফাইল স্ট্রাকচার (Directory Structure)

```text
oneclick-mobile-app-main/
├── App.js                      # অ্যাপের প্রধান এন্ট্রি পয়েন্ট (Firebase, Intent & Dynamic Script Init)
├── AppNavigator.js             # প্রধান রাউটিং ও বটম-ট্যাব নেভিগেটর সংকলন
├── config.js                   # গ্লোবাল কনফিগারেশন (API URL, Live Script URL, Versioning, Payment Config)
├── Translate.js                # গ্লোবাল ওয়েবসাইট ডোম ট্রান্সলেশন ইঞ্জিন
├── AGENTS.md                   # কোডিং স্ট্যান্ডার্ড ও গাইডলাইন ফোল্ডার
├── package.json                # প্রজেক্ট ডিপেনডেন্সি ও বিল্ড স্ক্রিপ্টস
├── android/ & ios/             # অ্যান্ডয়েড ও আইওএস নেটিভ ফাইলসমূহ
├── patches/                    # patch-package দ্বারা ফিক্স করা লাইব্রেরির প্যাচসমূহ
└── src/
    ├── assets/                 # Colors, GlobalStyle, SVG আইকনসমূহ
    ├── components/             # পুনঃব্যবহারযোগ্য UI কম্পোনেন্ট (OrderItem, StoryItem, Search, Header ইত্যাদি)
    ├── contexts/               # EmContext (Theme, Global Language, Global Methods)
    ├── helpers/                # ইউটিলিটি লজিক (aggressiveTapFix, AI parsing, Firebase Notification, Storage)
    ├── pages/                  # অ্যাপের সমস্ত স্ক্রিন (Home, Webview, Cart, Orders, Profile, WaafiPay, EDahab ইত্যাদি)
    ├── services/               # RootNavigation & Navigation Helper Services
    ├── store/                  # Zustand Persistent Stores (useCartStore, useUserStore, useWebviewStore ইত্যাদি)
    └── translate/              # বহুভাষিক অনুবাদ ফাইল (translations.json, translations.ar.json ইত্যাদি)
```

---

## ৪. সিস্টেমের অভ্যন্তরীণ কাজের ফ্লো (System Workflow & Data Flow)

### ১. পণ্য ব্রাউজ ও ডাটা এক্সট্র্যাকশন ফ্লো (Product Scraping Flow):
```
[User opens WebView / Shares Link] 
        ↓
[WebView loads E-Commerce Website (e.g. Trendyol)] 
        ↓
[App fetches dynamic remote script (`bundle.js`) from API/CDN] 
        ↓
[Script injected into WebView DOM via aggressiveTapFix.js] 
        ↓
[Extracts Product Title, Price, Currency, Image, Options & Translates DOM] 
        ↓
[User taps "Add to Cart" → Saved to Zustand `useCartStore` (AsyncStorage)]
```

### ২. অর্ডার ও কার্ট ম্যানেজমেন্ট ফ্লো (Cart & Checkout Flow):
```
[User views Cart (`src/pages/Cart.js`)] 
        ↓
[Selects items, checks total price & quantity] 
        ↓
[Navigates to Order Form (`src/pages/CartForm.js` / `OrderForm.js`)] 
        ↓
[Enters/Selects Shipping City & Recipient Details] 
        ↓
[Sends API Request to Backend (`/api/order/create`)]
```

### ৩. পেমেন্ট ফ্লো (Payment Integration Flow):
```
[Order Created] 
        ↓
[Navigates to Payment Start (`PaymentStart.js`)] 
        ↓
[Selects Payment Method: WaafiPay or eDahab] 
        ↓
[Sends Payment Request to Mobile Money API] 
        ↓
[User receives USSD/OTP prompt on phone to confirm PIN] 
        ↓
[Payment Response Callback → Order Status updated to "Paid"]
```

---

## ৫. প্রজেক্টের বর্তমান লেভেল ও কোড কোয়ালিটি অ্যাসেসমেন্ট (Code Quality & Level Assessment)

### 🟢 ইতিবাচক দিকসমূহ (Strengths):
1. **প্রোডাকশন-প্রুভেন (Live App):** অ্যাপটি ইতিমধ্যেই প্রোডাকশনে সফলভাবে চলছে (Version 38), যা প্রমাণ করে যে সিস্টেমের কোরে বড় ধরনের কোনো স্ট্রাকচারাল ভাঙন নেই।
2. **ডাইনামিক স্ক্রিপ্ট ইনজেকশন:** গুগল প্লে-স্টোর বা অ্যাপ স্টোরে নতুন রিলিজ না দিয়েও দূরবর্তী সার্ভার (`bundle.js`) থেকে স্ক্র্যাপার বা ট্রান্সলেশন ইঞ্জিন আপডেট করার চমৎকার ব্যবস্থা রয়েছে।
3. **ক্লিন স্টেট ম্যানেজমেন্ট:** Zustand ব্যবহারের কারণে অ্যাপের পারফরম্যান্স বেশ দ্রুত এবং অফলাইন কার্ট ও ইউজার ডাটা হ্যান্ডলিং খুব মসৃণ।
4. **অঞ্চল-ভিত্তিক সমাধান:** সোমালিয়ার স্থানীয় পেমেন্ট সিস্টেম (WaafiPay/eDahab) এবং বহুভাষিক/RTL সমর্থন দারুণভাবে সুসংগঠিত।

### ⚠️ টেকনিক্যাল ডেবট ও উন্নতির জায়গা (Technical Debt & Improvement Areas):
1. **ডুপ্লিকেট ও আন-ইউজড ফাইল (Legacy Code):** প্রজেক্টে কিছু পুরনো টেস্ট ফাইল ও ডুপ্লিকেট ব্যাকআপ রয়েছে (যেমন: `Webview kopyası.js`, `WebviewOld.js`, `Orders1.js`, `OrderItem1.js`, `useCartStore.js.txt`, `Gemfile_old`) যা নতুন ডেভেলপারের বুঝতে সমস্যা তৈরি করতে পারে।
2. **ইনলাইন স্টাইল ও দীর্ঘ ফাইল:** কিছু পেজ কম্পোনেন্ট ১০০০+ লাইনের (যেমন `Webview.js` ও `Profile.js`), যা ছোট ছোট মডিউলে ভাগ করলে মেইনটেইন করা সহজ হবে।
3. **টাইপস্ক্রিপ্ট আংশিক:** প্রজেক্টে `tsconfig.json` থাকলেও মূলত JavaScript (JS) হিসেবে লেখা হয়েছে। নতুন ফিচারে JSDoc বা Typescript ব্যবহার করলে বাগ কমবে।

---

## ৬. নতুন ফিচার যুক্ত করতে কত দিন লাগবে? (Time Estimation Guide for Client)

ক্লায়েন্ট যখন কোনো নতুন ফিচার দাবি করবে, তখন এস্টিমেশন (Time Estimation) দেওয়ার জন্য নিচের গাইডলাইনটি অনুসরণ করুন:

### ⏱️ এস্টিমেশন হিসাবের ৩টি প্রধান নিয়ম:
1. **প্রভাবিত মডিউল চিহ্নিতকরণ (Scope Identification):** নতুন ফিচারটি কি শুধুই UI/Screen নাকি এটি WebView Scraping, Zustand Cart, API Integration, অথবা Native SDK-কে প্রভাবিত করছে?
2. **প্ল্যাটফর্ম টেস্টিং (Android + iOS):** রিয়্যাক্ট নেটিভে প্রতিটি ফিচার অ্যান্ড্রয়েড এবং আইওএস দুটোতেই টেস্ট ও ফিক্স করতে হয়।
3. **স্টোর রিভিউ সময় (Store Review Buffer):** প্রোডাকশন অ্যাপ হওয়ায় যেকোনো নেটিভ বা বড় পরিবর্তনের জন্য প্লে-স্টোর ও অ্যাপ-স্টোর রিভিউর জন্য বাড়তি ১-২ দিন সময় হাতে রাখা উচিত।

---

### 📊 সাধারণ ফিচারের সময়সীমার নমুনা টেবিল (Estimation Template):

| ফিচারের ক্যাটাগরি | ফিচারের ধরণ / উদাহরণ | আনুমানিক সময় (Working Days) | ব্যাখ্যা |
| :--- | :--- | :--- | :--- |
| **Small Feature** | UI পরিবর্তন, নতুন ব্যানার যোগ, নোটিফিকেশন ফিল্টার, পেজ ডিজাইন রিফাইনমেন্ট | **১ – ৩ দিন** | ছোটখাট রিফ্যাক্টরিং ও UI টেস্টিং সহ। |
| **Medium Feature** | নতুন পেমেন্ট মেথড যোগ, নতুন ই-কমার্স ওয়েবসাইট স্ক্র্যাপিং সাপোর্ট, অর্ডারে নতুন ট্র্যাকিং স্ট্যাটাস, কুপন/ডিসকাউন্ট কোড সিস্টেম | **৪ – ৭ দিন** | API আপডেট, Zustand Store পরিমার্জন এবং এন্ড-টু-এন্ড টেস্টিং প্রয়োজন। |
| **Large / Complex Feature**| ইন-অ্যাপ চ্যাট/সাপোর্ট সিস্টেম, নতুন বড় মডিউল (যেমন: ওয়ালেট সিস্টেম, রেফারেল/রিওয়ার্ড সিস্টেম), সম্পূর্ণ নতুন ব্যাকএন্ড রি-আর্কিটেকচার | **৮ – ১৫+ দিন** | নেটিভ ডিপেনডেন্সি ইন্টিগ্রেশন, ডাটাবেজ/API পরিবর্তন, সিকিউরিটি অডিট ও মাল্টি-ডিভাইস টেস্টিং সহ। |

---

## 🎯 ক্লায়েন্টকে উত্তর দেওয়ার জন্য প্রস্তুতকৃত সামারি (Ready Summary for Client Communication)

> **ক্লায়েন্টকে যেভাবে জানাবেন:**
> 
> "আমরা `OneClickToShop` অ্যাপটির বিদ্যমান কোডবেস, ফাইল আর্কিটেকচার এবং বিজনেস ফ্লো (WebView Scraping, Zustand Cart, WaafiPay/eDahab Payment, FCM Notification) পুঙ্খানুপুঙ্খভাবে বিশ্লেষণ করেছি।
> 
> অ্যাপটি একটি সুসংগঠিত এবং প্রোডাকশন-লেভেলের (Version 38) রিয়্যাক্ট নেটিভ অ্যাপ্লিকেশন। আপনার কাঙ্ক্ষিত **[ফিচারের নাম উল্লেখ করুন]** যুক্ত করার জন্য আমাদের বিদ্যমান কোডের নির্দিষ্ট কিছু মডিউলে পরিবর্তন ও নতুন টেস্ট সম্পন্ন করতে হবে।
> 
> **ফিচার বাস্তবায়নে আনুমানিক সময় সূচি:**
> - **আর্কিটেকচার ও API ইন্টিগ্রেশন:** X দিন
> - **UI ডেভেলপমেন্ট ও Zustand Store আপডেট:** Y দিন
> - **অ্যান্ড্রয়েড ও আইওএস ডিভাইসে টেস্টিং ও বাগ ফিক্সিং:** Z দিন
> - **মোট আনুমানিক সময়:** **[মোট দিন] দিন**
> 
> আপনি ফিচারের বিস্তারিত রিকোয়ারমেন্ট পাঠালে আমরা ঠিক কোন কোন ফাইলে কাজ করতে হবে তা চূড়ান্ত করে নির্দিষ্ট সময়সীমা নিশ্চিত করতে পারব।"

---

## ৭. কোডিং প্যাটার্ন ও ফোল্ডার স্ট্রাকচার (Coding Patterns & Folder Structure Breakdown)

### 📁 ফোল্ডার স্ট্রাকচার (Folder Structure Type):
প্রজেক্টটিতে **Layer-First Hybrid Architecture (লেয়ার-ফার্স্ট হাইব্রিড আর্কিটেকচার)** ব্যবহার করা হয়েছে। 

অর্থাৎ, কোডের কাজের ধরণ অনুযায়ী `src/` ডিরেক্টরিকে প্রধান লেয়ারে ভাগ করা হয়েছে, এবং প্রয়োজন অনুসারে লেয়ারের ভেতর ফিচার অনুযায়ী সাব-ফোল্ডার করা হয়েছে:

1. **`src/pages/` (Screen Layer):** অ্যাপের সম্পূর্ণ স্ক্রিন বা ভিউসমূহ (যেমন: `Home.js`, `Cart.js`, `Orders.js`, `Webview.js`, `Login.js`)।
2. **`src/components/` (UI Component Layer):** ছোট এবং পুনঃব্যবহারযোগ্য UI এলিমেন্ট। এখানে ফিচার অনুযায়ী সাব-ফোল্ডার রয়েছে:
   - `cart/` (কার্ট স্ক্রিনের ছোট কম্পোনেন্ট)
   - `orders/` (অর্ডার ট্র্যাকিং কম্পোনেন্ট)
   - `webview/` (ওয়েবভিউ সংক্রান্ত বটমশিট/অ্যাড-টু-কার্ট বাটন)
   - `paymentStart/` (পেমেন্ট নির্বাচন বাটন)
3. **`src/store/` (State Management Layer):** Zustand ডিক্লেয়ারেশন যা অ্যাপের স্টেট ও বিজনেস লজিক কন্টেইন করে (`useCartStore.js`, `useUserStore.js`, `useNotificationStore.js`)।
4. **`src/helpers/` (Utility & Service Layer):** স্বাধীন পিওর ফাংশন (Pure Functions), গ্লোবাল হেল্পার, স্ক্র্যাপার ইনজেকশন লজিক (`auth.js`, `storage.js`, `aggressiveTapFix.js`, `notification.js`)।
5. **`src/services/` (Infrastructure / Service Layer):** গ্লোবাল সার্ভিস সমূহ যেমন `RootNavigation.js` (রিয়্যাক্ট কম্পোনেন্টের বাইরে থেকে নেভিগেট করার জন্য)।
6. **`src/translate/` (i18n Layer):** বহুভাষিক ডিকশনারি ও কনফিগারেশন (`i18n.js`, JSON অনুবাদ ফাইলসমূহ)।

---

### 🧠 কোডিং প্যাটার্নসমূহ (Coding Patterns Used):

#### ১. State Management Pattern (Zustand Store Pattern with Persistence):
- **বর্ণনা:** প্রজেক্টে Redux-এর চেয়ে হালকা এবং দ্রুততর **Zustand** ব্যবহার করা হয়েছে। 
- **প্যাটার্ন:** এতে `store` আলাদা থাকে এবং কম্পোনেন্ট সরাসরি Action ডেকে ডাটা পরিবর্তন করে। `persist` মিডেলওয়্যারের মাধ্যমে ডাটা রিলোড হলেও হারিয়ে যায় না (`AsyncStorage`-এ সেভ থাকে)।
- **উদাহরণ:** `src/store/useCartStore.js`

#### ২. Hybrid State Pattern (Zustand + React Context):
- **বর্ণনা:** কার্ট, ইউজার বা ওয়েবসাইটের ডাটার জন্য **Zustand** এবং গ্লোবাল থিম (Dark/Light) ও ডাইনামিক মেথড প্রেরণের জন্য **React Context (`EmContext`)** ব্যবহার করা হয়েছে।
- **উদাহরণ:** `App.js`-এ `EmContext.Provider` দিয়ে অ্যাপকে র‍্যাপ করা হয়েছে।

#### ৩. Service / Navigation Ref Pattern (Non-React Navigation):
- **বর্ণনা:** নোটিফিকেশন বা জাভাস্ক্রিপ্ট স্ক্রিপ্ট ইভেন্ট থেকে রিয়্যাক্ট কম্পোনেন্টের বাইরে বসেই নেভিগেশন পরিবর্তন করার জন্য `RootNavigation.js`-এ `createNavigationContainerRef()` ব্যবহার করা হয়েছে।
- **উদাহরণ:** `src/services/RootNavigation.js`

#### ৪. Bridge / Adapter Pattern (WebView & Native Bridge):
- **বর্ণনা:** ই-কমার্স ওয়েবসাইটের সাধারণ HTML/DOM ডাটায় ইনজেক্ট করা জাভাস্ক্রিপ্ট চালানো এবং `onMessage` ইভেন্টের মাধ্যমে নেটিভ রিয়্যাক্ট নেটিভ স্টেট (Zustand Cart)-এ সংযুক্ত করার জন্য অ্যাডাপ্টার প্যাটার্ন ব্যবহার করা হয়েছে।
- **উদাহরণ:** `src/pages/Webview.js` ও `src/helpers/aggressiveTapFix.js`

#### ৫. Modular Utility / Helper Pattern:
- **বর্ণনা:** কোডের রিইউজেবিলিটি বাড়াতে হেল্পার ফাংশনগুলোকে আলাদা ফাইল বানিয়ে প্রজেক্টে ইমপোর্ট করা হয়েছে।
- **উদাহরণ:** `src/helpers/auth.js`, `src/helpers/storage.js`

#### ৬. Dependency Patching Pattern:
- **বর্ণনা:** থার্ড-পার্টি npm প্যাকেজের বাগ ঠিক করতে মূল প্যাকেজ পরিবর্তন না করে `patch-package` প্যাটার্ন ব্যবহার করা হয়েছে।
- **উদাহরণ:** `patches/react-native-fast-image+8.6.3.patch`

---

---
*রিপোর্ট প্রস্তুতকারক: Antigravity AI (Pair Programmer)*

