import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FastImage from "react-native-fast-image";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import AuthHeader from "../components/AuthHeader";
import CustomSlider from "../components/CustomSlider";
import UlkeBar from "../components/UlkeBar";
import { getToken } from "../helpers/auth";
import ai from "../helpers/ai";
import { storageGet, storageSet } from "../helpers/storage";
import { EmContext } from "../contexts/EmContext";
import { tr } from "../translate/i18n";
import Colors from "../assets/Colors";

const HERO_PEDESTALS_IMG = require("../assets/img/home/hero_banner_pedestals.jpg");
const STORE_AMAZON_IMG = require("../assets/img/home/store_card_amazon.jpg");
const STORE_SHEIN_IMG = require("../assets/img/home/store_card_shein.jpg");
const STORE_IHERB_IMG = require("../assets/img/home/store_card_iherb.jpg");
const STORE_YESSTYLE_IMG = require("../assets/img/home/store_card_yesstyle.jpg");

// Helper to safely format relative or absolute image URLs from the API
const resolveImageUrl = img => {
  if (!img || typeof img !== "string") return null;
  const trimmed = img.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `https://1click.thesyndicates.team${trimmed}`;
  }
  return `https://1click.thesyndicates.team/data/${trimmed}`;
};

// Default store definitions matching the exact Figma design
const BASE_STORE_THEMES = [
  {
    id: "amazon",
    key: "amazon",
    name: "Amazon",
    url: "https://www.amazon.ae",
    badgeText: "amazon",
    badgeTextColor: "#000000",
    badgeFontWeight: "900",
    titleLine1: "Summer Sale",
    titleLine2Prefix: "Up to ",
    titleLine2Highlight: "50% Off",
    highlightColor: "#F59E0B",
    subtitle: "Millions of products",
    btnText: "Shop Now →",
    btnBg: "#F67922",
    btnTextColor: "#FFFFFF",
    gradColors: ["#232D3F", "#111827"],
    assetImage: STORE_AMAZON_IMG,
  },
  {
    id: "shein",
    key: "shein",
    name: "SHEIN",
    url: "https://m.shein.com",
    badgeText: "SHEIN",
    badgeTextColor: "#000000",
    badgeFontWeight: "900",
    titleLine1: "New Season",
    titleLine2Prefix: "",
    titleLine2Highlight: "Styles",
    highlightColor: "#F472B6",
    subtitle: "Fashion & beauty picks",
    btnText: "Shop SHEIN →",
    btnBg: "#FFFFFF",
    btnTextColor: "#1A0E18",
    gradColors: ["#381C2B", "#1B0C15"],
    assetImage: STORE_SHEIN_IMG,
  },
  {
    id: "iherb",
    key: "iherb",
    name: "iHerb",
    url: "https://www.iherb.com",
    badgeText: "iHerb",
    badgeTextColor: "#166534",
    badgeFontWeight: "800",
    titleLine1: "Vitamins &",
    titleLine2Prefix: "",
    titleLine2Highlight: "Wellness",
    highlightColor: "#FFFFFF",
    subtitle: "Feel your best every day",
    btnText: "Shop iHerb →",
    btnBg: "#FFFFFF",
    btnTextColor: "#166534",
    gradColors: ["#1B5E20", "#0A3311"],
    assetImage: STORE_IHERB_IMG,
  },
  {
    id: "yesstyle",
    key: "yesstyle",
    name: "YESSTYLE",
    url: "https://www.yesstyle.com",
    badgeText: "YESSTYLE",
    badgeTextColor: "#0D5C58",
    badgeFontWeight: "800",
    titleLine1: "Beauty &",
    titleLine2Prefix: "",
    titleLine2Highlight: "Skincare",
    highlightColor: "#FFFFFF",
    subtitle: "Asian beauty favorites",
    btnText: "Shop YesStyle →",
    btnBg: "#FFFFFF",
    btnTextColor: "#0D5C58",
    gradColors: ["#0E5D57", "#05312E"],
    assetImage: STORE_YESSTYLE_IMG,
  },
];

const DYNAMIC_PALETTES = [
  { grad: ["#1E1B4B", "#0F0C29"], btn: "#FFFFFF", btnText: "#1E1B4B", highlight: "#A78BFA" },
  { grad: ["#4C0519", "#200109"], btn: "#FFFFFF", btnText: "#4C0519", highlight: "#FB7185" },
  { grad: ["#064E3B", "#022C22"], btn: "#FFFFFF", btnText: "#064E3B", highlight: "#34D399" },
  { grad: ["#1C1917", "#0C0A09"], btn: "#F67922", btnText: "#FFFFFF", highlight: "#FBBF24" },
];

const DEFAULT_MARKET_DATA = {
  ulkes: [],
  sliders: [],
  banners_orta: [],
  banners: [],
};

export default function BannerList({ route, navigation }) {
  const { ctx, ctxDil } = useContext(EmContext);
  const carouselRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(
    windowWidth || Dimensions.get("window").width
  );

  const activeWidth =
    containerWidth > 0 ? containerWidth : (windowWidth || Dimensions.get("window").width);
  const bannerWidth = activeWidth - 32;
  const heroBannerHeight = Math.round(bannerWidth * (185 / 335));

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ulkeID, setUlkeID] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const [state, setState] = useState({
    banners: [],
    sliders: [],
    banners_orta: [],
    ulkes: DEFAULT_MARKET_DATA.ulkes,
    kur: "",
    loading: false,
  });

  // Fast fetch data with persistent cache fallback
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      // 1. Initial hydrate from local storage
      if (!state.sliders?.length && !state.banners?.length) {
        try {
          const cached = await storageGet("cached_home_data");
          if (cached && (cached.banners?.length || cached.sliders?.length)) {
            setState(prev => ({
              ...prev,
              banners: cached.banners || [],
              sliders: cached.sliders || [],
              banners_orta: cached.banners_orta || [],
              ulkes: cached.ulkes || [],
              kur: cached.kur ?? "",
            }));
          }
        } catch (_) {}
      }

      // 2. Fetch fresh data from backend
      const res = await ai.post(
        "home",
        { ulkeID: ulkeID },
        { timeout: 6000 }
      );

      if (res?.data && res.data.error === false) {
        setState(prev => ({
          ...prev,
          banners: res.data.banners || [],
          sliders: res.data.sliders || [],
          banners_orta: res.data.banners_orta || [],
          ulkes: res.data.ulkes || [],
          kur: res.data?.kur ?? "",
          loading: false,
        }));
        try {
          await storageSet("cached_home_data", res.data);
        } catch (_) {}
      }
    } catch (error) {
      console.log("BannerList fetchData note:", error?.message);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [ulkeID])
  );

  // 1. Top Carousel: Dynamic API Sliders + Hero Pedestal Slide
  const carouselSlides = useMemo(() => {
    const slides = [];

    // Prioritize API sliders from backend
    if (Array.isArray(state.sliders) && state.sliders.length > 0) {
      state.sliders.forEach((item, index) => {
        const rawImg =
          item["img_" + ctxDil] ||
          item.img_en ||
          item.img_tr ||
          item.img_ar ||
          item.image ||
          item.img;
        const img = resolveImageUrl(rawImg);
        if (img) {
          slides.push({
            id: item.id ? `api-slider-${item.id}` : `api-slider-${index}`,
            title:
              item["ad_" + ctxDil] ||
              item.ad_en ||
              item.ad_tr ||
              item.title ||
              item.ad ||
              "Special Deals",
            url: (item.link || item.url || "").trim() || "https://www.amazon.ae",
            remoteImage: img,
            isFigmaHero: false,
          });
        }
      });
    }

    // Always include the Figma Hero slide
    slides.push({
      id: "hero-app-pedestals",
      title: "App.",
      subtitle: "Everything you need",
      tags: "Amazon • SHEIN • iHerb • YesStyle",
      url: "https://www.amazon.ae",
      isFigmaHero: true,
      image: HERO_PEDESTALS_IMG,
    });

    return slides;
  }, [state.sliders, ctxDil]);

  // Auto-slide effect for top carousel
  useEffect(() => {
    if (!carouselSlides || carouselSlides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlideIndex(prev => {
        const next = (prev + 1) % carouselSlides.length;
        carouselRef.current?.scrollTo({
          x: next * activeWidth,
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [carouselSlides.length, activeWidth]);

  const handleCarouselScroll = event => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / (activeWidth || 1));
    if (
      pageIndex !== activeSlideIndex &&
      pageIndex >= 0 &&
      pageIndex < carouselSlides.length
    ) {
      setActiveSlideIndex(pageIndex);
    }
  };

  const handleSlidePress = slide => {
    const url = slide.url || "https://www.amazon.ae";
    const ad = slide.title || "Store";
    navigation.navigate("Webview", { ad, url });
  };

  const handleStorePress = store => {
    const targetUrl = store.url || "https://www.amazon.ae";
    navigation.navigate("Webview", {
      ad: store.name,
      url: targetUrl,
    });
  };

  // 2. Intelligent Mapping: Prioritize backend API data, fall back to Figma themes
  const displayStores = useMemo(() => {
    const apiBanners = Array.isArray(state.banners) ? state.banners : [];

    // Track which API banners have been assigned to avoid duplicating
    const usedBannerIndices = new Set();

    // Map the 4 standard stores with API overrides if returned by backend
    const matchedStores = BASE_STORE_THEMES.map((baseTheme, themeIdx) => {
      // 1. Try to match by key (e.g. "amazon", "shein", "iherb", "yesstyle") in title, name or URL
      let matchedIndex = apiBanners.findIndex((b, bIdx) => {
        if (!b || usedBannerIndices.has(bIdx)) return false;
        const name = (
          b["ad_" + ctxDil] ||
          b.ad_en ||
          b.ad_tr ||
          b.ad_ar ||
          b.title ||
          b.ad ||
          b.name ||
          ""
        ).toLowerCase();
        const link = (b.link || b.url || "").toLowerCase();
        return name.includes(baseTheme.key) || link.includes(baseTheme.key);
      });

      // 2. If no key match, but an unused banner exists at this index, associate it
      if (
        matchedIndex === -1 &&
        apiBanners[themeIdx] &&
        !usedBannerIndices.has(themeIdx)
      ) {
        matchedIndex = themeIdx;
      }

      if (matchedIndex !== -1) {
        usedBannerIndices.add(matchedIndex);
        const apiItem = apiBanners[matchedIndex];

        const rawImg =
          apiItem["img_" + ctxDil] ||
          apiItem.img_en ||
          apiItem.img_tr ||
          apiItem.img_ar ||
          apiItem.image ||
          apiItem.img ||
          null;

        const storeUrl =
          (apiItem.link || apiItem.url || "").trim() || baseTheme.url;

        const storeName =
          apiItem["ad_" + ctxDil] ||
          apiItem.ad_en ||
          apiItem.ad_tr ||
          apiItem.title ||
          apiItem.ad ||
          apiItem.name ||
          baseTheme.name;

        return {
          ...baseTheme,
          id: apiItem.id ? `store-api-${apiItem.id}` : baseTheme.id,
          name: storeName,
          // Priority 1: Backend API URL, Priority 2: baseTheme fallback URL
          url: storeUrl,
          // Priority 1: Backend API Image, Priority 2: baseTheme local assetImage
          apiRemoteImg: resolveImageUrl(rawImg),
        };
      }

      // If API misses this store, cleanly use the hardcoded theme
      return baseTheme;
    });

    // Check if there are other dynamic stores returned by API that aren't the 4 big stores
    const remainingBanners = apiBanners.filter(
      (_, idx) => !usedBannerIndices.has(idx)
    );

    const additionalStores = remainingBanners.map((item, idx) => {
      const storeName =
        item["ad_" + ctxDil] ||
        item.ad_en ||
        item.ad_tr ||
        item.title ||
        item.ad ||
        item.name ||
        `Store ${idx + 1}`;
      const palette = DYNAMIC_PALETTES[idx % DYNAMIC_PALETTES.length];
      const rawImg =
        item["img_" + ctxDil] ||
        item.img_en ||
        item.img_tr ||
        item.img_ar ||
        item.image ||
        item.img ||
        null;

      return {
        id: item.id ? `dynamic-${item.id}` : `dynamic-${idx}`,
        key: `dynamic-${idx}`,
        name: storeName,
        url: (item.link || item.url || "").trim() || "https://www.amazon.ae",
        badgeText: storeName.toUpperCase(),
        badgeTextColor: palette.btnText,
        badgeFontWeight: "800",
        titleLine1: storeName,
        titleLine2Prefix: "Special ",
        titleLine2Highlight: "Collection",
        highlightColor: palette.highlight,
        subtitle:
          tr("Featured International Brand") ||
          "Featured International Brand",
        btnText: `Shop ${storeName} →`,
        btnBg: palette.btn,
        btnTextColor: palette.btnText,
        gradColors: palette.grad,
        apiRemoteImg: resolveImageUrl(rawImg),
        assetImage: null,
      };
    });

    return [...matchedStores, ...additionalStores];
  }, [state.banners, ctxDil]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#1E293B";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: "#F67922" }]}
      edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#F67922" />

      {/* Figma Header with 1 Click Logo & Centered Notification Bell */}
      <AuthHeader navigation={navigation} route={route} variant="home" />

      <View style={[styles.container, { backgroundColor: pageBg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={["#F67922"]}
              tintColor="#F67922"
            />
          }>
          {/* Orange Backdrop behind Carousel Top Portion */}
          <View style={styles.orangeBackdrop} />

          {/* 1. Top Carousel Section (Figma Banner + Dynamic API Sliders) */}
          <View
            style={styles.carouselContainer}
            onLayout={e => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - containerWidth) > 1) {
                setContainerWidth(w);
              }
            }}>
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselScroll}
              scrollEventThrottle={16}>
              {carouselSlides.map(slide => (
                <View
                  key={slide.id}
                  style={{ width: activeWidth, paddingHorizontal: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => handleSlidePress(slide)}
                    style={[styles.heroCard, { height: heroBannerHeight }]}>
                    {slide.isFigmaHero ? (
                      <View style={styles.heroBannerWrap}>
                        <Image
                          source={slide.image}
                          style={styles.heroImage}
                          resizeMode="cover"
                        />
                        {/* Text Overlay on Left Side */}
                        <View style={styles.heroOverlayContent}>
                          <Text style={styles.heroAppTitle}>{slide.title}</Text>
                          <Text style={styles.heroAppSubtitle}>
                            {slide.subtitle}
                          </Text>
                          <Text style={styles.heroAppTags}>{slide.tags}</Text>
                        </View>
                      </View>
                    ) : slide.remoteImage ? (
                      <FastImage
                        source={{ uri: slide.remoteImage }}
                        style={styles.heroImage}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    ) : (
                      <Image
                        source={slide.image || HERO_PEDESTALS_IMG}
                        style={styles.heroImage}
                        resizeMode="cover"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Pagination Dots (Elongated active pill dot) */}
            <View style={styles.paginationRow}>
              {carouselSlides.map((_, idx) => {
                const isActive = idx === activeSlideIndex;
                return (
                  <View
                    key={`dot-${idx}`}
                    style={[
                      styles.dot,
                      isActive ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* 2. Optional Country Filter Bar from API */}
          {state.ulkes && state.ulkes.length > 1 ? (
            <View style={styles.countryBarWrap}>
              <UlkeBar
                state={state}
                ulkeID={ulkeID}
                loading={state.loading}
                setUlkeID={setUlkeID}
              />
            </View>
          ) : null}

          {/* 3. Section Title */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {tr("Shop International Stores") || "Shop International Stores"}
            </Text>
          </View>

          {/* 4. Single-Column Store Cards List (Figma Layout) */}
          <View style={styles.storeCardsList}>
            {displayStores.map((store, index) => {
              const gradId = `grad-${store.id || index}`;
              const c1 = store.gradColors?.[0] || "#1E2633";
              const c2 = store.gradColors?.[1] || "#111827";

              return (
                <TouchableOpacity
                  key={store.id || index}
                  activeOpacity={0.92}
                  onPress={() => handleStorePress(store)}
                  style={styles.cardContainer}>
                  {/* Svg Linear Gradient Background */}
                  <Svg
                    style={StyleSheet.absoluteFillObject}
                    width="100%"
                    height="100%">
                    <Defs>
                      <SvgGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={c1} />
                        <Stop offset="100%" stopColor={c2} />
                      </SvgGradient>
                    </Defs>
                    <Rect
                      width="100%"
                      height="100%"
                      rx={20}
                      ry={20}
                      fill={`url(#${gradId})`}
                    />
                  </Svg>

                  {/* Left Column: Badge, Headlines, Subtitle, CTA Button */}
                  <View style={styles.cardLeftCol}>
                    {/* Store Badge Pill */}
                    <View style={styles.storeBadgePill}>
                      <Text
                        style={[
                          styles.storeBadgeText,
                          {
                            color: store.badgeTextColor || "#000000",
                            fontWeight: store.badgeFontWeight || "800",
                          },
                        ]}>
                        {store.badgeText}
                      </Text>
                    </View>

                    {/* Headline */}
                    <View style={styles.headlineArea}>
                      <Text style={styles.titleLine1} numberOfLines={1}>
                        {store.titleLine1}
                      </Text>
                      <Text style={styles.titleLine2} numberOfLines={1}>
                        {store.titleLine2Prefix}
                        <Text style={{ color: store.highlightColor || "#FBBF24" }}>
                          {store.titleLine2Highlight}
                        </Text>
                      </Text>
                      <Text style={styles.subtitleText} numberOfLines={1}>
                        {store.subtitle}
                      </Text>
                    </View>

                    {/* Action Button */}
                    <View
                      style={[
                        styles.ctaBtn,
                        { backgroundColor: store.btnBg || "#FFFFFF" },
                      ]}>
                      <Text
                        style={[
                          styles.ctaBtnText,
                          { color: store.btnTextColor || "#000000" },
                        ]}>
                        {store.btnText}
                      </Text>
                    </View>
                  </View>

                  {/* Right Column: API Image takes priority; falls back to local asset */}
                  <View style={styles.cardRightCol}>
                    {store.apiRemoteImg && !failedImages[store.id] ? (
                      <FastImage
                        source={{ uri: store.apiRemoteImg }}
                        style={styles.cardShowcaseImage}
                        resizeMode={FastImage.resizeMode.contain}
                        onError={() => {
                          setFailedImages(prev => ({
                            ...prev,
                            [store.id]: true,
                          }));
                        }}
                      />
                    ) : store.assetImage ? (
                      <Image
                        source={store.assetImage}
                        style={styles.cardShowcaseImage}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 5. Middle Sliders from API (if provided) */}
          {state.banners_orta && state.banners_orta.length > 0 ? (
            <View style={styles.middleSliderWrap}>
              <View style={styles.middleSliderCard}>
                <CustomSlider
                  ctxDil={ctxDil}
                  state={state}
                  navigation={navigation}
                  width={430}
                  height={241}
                  data={state.banners_orta}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F67922",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  orangeBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#F67922",
  },
  carouselContainer: {
    paddingTop: 10,
  },
  heroCard: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#EA580C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heroBannerWrap: {
    width: "100%",
    height: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlayContent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "56%",
    paddingLeft: 16,
    paddingRight: 8,
    justifyContent: "center",
  },
  heroAppTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroAppSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  heroAppTags: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 8,
    lineHeight: 15,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#F67922",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#E2E8F0",
  },
  countryBarWrap: {
    marginBottom: 6,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  storeCardsList: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: "100%",
    height: 172,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardLeftCol: {
    width: "55%",
    height: "100%",
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 6,
    justifyContent: "space-between",
    zIndex: 2,
  },
  storeBadgePill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  storeBadgeText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  headlineArea: {
    marginVertical: 4,
  },
  titleLine1: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  titleLine2: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginTop: 1,
  },
  subtitleText: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  ctaBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  cardRightCol: {
    width: "45%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardShowcaseImage: {
    width: "100%",
    height: "100%",
  },
  middleSliderWrap: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  middleSliderCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});
