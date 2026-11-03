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

// Default fallback store definitions used when API banners are loading or offline
const DEFAULT_FALLBACK_STORES = [
  {
    id: "amazon",
    name: "Amazon",
    url: "https://www.amazon.ae",
    assetImage: STORE_AMAZON_IMG,
    btnText: "Shop Now →",
  },
  {
    id: "shein",
    name: "SHEIN",
    url: "https://m.shein.com",
    assetImage: STORE_SHEIN_IMG,
    btnText: "Shop Now →",
  },
  {
    id: "iherb",
    name: "iHerb",
    url: "https://www.iherb.com",
    assetImage: STORE_IHERB_IMG,
    btnText: "Shop Now →",
  },
  {
    id: "yesstyle",
    name: "YESSTYLE",
    url: "https://www.yesstyle.com",
    assetImage: STORE_YESSTYLE_IMG,
    btnText: "Shop Now →",
  },
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

  const handleStorePress = store => {
    const targetUrl = store.url || "https://www.amazon.ae";
    navigation.navigate("Webview", {
      ad: store.name,
      url: targetUrl,
    });
  };

  // 2. Dynamic Stores: Driven directly by API banners, with graceful asset fallback
  const displayStores = useMemo(() => {
    const apiBanners = Array.isArray(state.banners) ? state.banners : [];

    if (apiBanners.length > 0) {
      return apiBanners.map((item, index) => {
        const storeName =
          item["ad_" + ctxDil] ||
          item.ad_en ||
          item.ad_tr ||
          item.ad_ar ||
          item.title ||
          item.ad ||
          item.name ||
          `Store ${index + 1}`;

        const storeUrl =
          (item.link || item.url || "").trim() || "https://www.amazon.ae";

        const rawImg =
          item["img_" + ctxDil] ||
          item.img_en ||
          item.img_tr ||
          item.img_ar ||
          item.image ||
          item.img ||
          null;

        const nameLower = storeName.toLowerCase();
        const linkLower = storeUrl.toLowerCase();

        let assetFallback = null;
        if (nameLower.includes("amazon") || linkLower.includes("amazon")) {
          assetFallback = STORE_AMAZON_IMG;
        } else if (nameLower.includes("shein") || linkLower.includes("shein")) {
          assetFallback = STORE_SHEIN_IMG;
        } else if (nameLower.includes("iherb") || linkLower.includes("iherb")) {
          assetFallback = STORE_IHERB_IMG;
        } else if (nameLower.includes("yesstyle") || linkLower.includes("yesstyle")) {
          assetFallback = STORE_YESSTYLE_IMG;
        }

        return {
          id: item.id ? `api-store-${item.id}` : `api-store-${index}`,
          name: storeName,
          url: storeUrl,
          apiRemoteImg: resolveImageUrl(rawImg),
          assetImage: assetFallback,
          btnText: "Shop Now →",
        };
      });
    }

    return DEFAULT_FALLBACK_STORES;
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
                  <View style={[styles.heroCard, { height: heroBannerHeight }]}>
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
                  </View>
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

          {/* 4. Single-Column Store Cards List (Full-Image Dynamic Cards) */}
          <View style={styles.storeCardsList}>
            {displayStores.map((store, index) => {
              const gradId = `card-grad-${store.id || index}`;

              return (
                <TouchableOpacity
                  key={store.id || index}
                  activeOpacity={0.92}
                  onPress={() => handleStorePress(store)}
                  style={styles.cardContainer}>
                  {/* Full-bleed card background image */}
                  {store.apiRemoteImg && !failedImages[store.id] ? (
                    <FastImage
                      source={{ uri: store.apiRemoteImg }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode={FastImage.resizeMode.cover}
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
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: "#1E293B" },
                      ]}
                    />
                  )}

                  {/* Subtle Gradient Scrim for contrast */}
                  <Svg
                    style={StyleSheet.absoluteFillObject}
                    width="100%"
                    height="100%">
                    <Defs>
                      <SvgGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
                        <Stop offset="35%" stopColor="#000000" stopOpacity="0.08" />
                        <Stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
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

                  {/* Card Content Overlay: Only Marketplace Name */}
                  <View style={styles.cardOverlayContent}>
                    {/* Marketplace Name Badge */}
                    <View style={styles.storeBadgePill}>
                      <Text style={styles.storeBadgeText} numberOfLines={1}>
                        {store.name}
                      </Text>
                    </View>
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
    height: 168,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardOverlayContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    alignItems: "flex-start",
    zIndex: 2,
  },
  storeBadgePill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  storeBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.2,
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
