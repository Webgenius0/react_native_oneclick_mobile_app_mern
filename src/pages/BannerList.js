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

const HERO_BANNER_IMG = require("../assets/img/home/home_hero_banner.png");

// Dedicated high-resolution assets exported from Figma
const KNOWN_STORE_ASSETS = {
  amazon: {
    image: require("../assets/img/home/store_amazon.png"),
    bgColor: "#FEF3E1",
    subtitle: "Millions of products across every category.",
  },
  iherb: {
    image: require("../assets/img/home/store_iherb.png"),
    bgColor: "#E8F7E7",
    subtitle: "Health, wellness & personal care products",
  },
  yesstyle: {
    image: require("../assets/img/home/store_yesstyle.png"),
    bgColor: "#EAF5EF",
    subtitle: "Beauty, fashion and lifestyle products.",
  },
  shein: {
    image: require("../assets/img/home/store_shein.png"),
    bgColor: "#FCEFF5",
    subtitle: "Fashion, beauty and lifestyle products",
  },
};

const DEFAULT_FALLBACK_STORES = [
  {
    id: "amazon",
    name: "Amazon",
    url: "https://www.amazon.ae",
    bgColor: "#FEF3E1",
    knownAsset: require("../assets/img/home/store_amazon.png"),
    subtitle: "Millions of products across every category.",
  },
  {
    id: "iherb",
    name: "iHerb",
    url: "https://www.iherb.com",
    bgColor: "#E8F7E7",
    knownAsset: require("../assets/img/home/store_iherb.png"),
    subtitle: "Health, wellness & personal care products",
  },
  {
    id: "yesstyle",
    name: "YESSTYLE",
    url: "https://www.yesstyle.com",
    bgColor: "#EAF5EF",
    knownAsset: require("../assets/img/home/store_yesstyle.png"),
    subtitle: "Beauty, fashion and lifestyle products.",
  },
  {
    id: "shein",
    name: "SHEIN",
    url: "https://m.shein.com",
    bgColor: "#FCEFF5",
    knownAsset: require("../assets/img/home/store_shein.png"),
    subtitle: "Fashion, beauty and lifestyle products",
  },
];

const PASTEL_PALETTE = [
  { bg: "#FEF3E1", text: "#B45309" },
  { bg: "#E8F7E7", text: "#15803D" },
  { bg: "#EAF5EF", text: "#0F766E" },
  { bg: "#FCEFF5", text: "#BE185D" },
  { bg: "#FFF7ED", text: "#C2410C" },
  { bg: "#F0F9FF", text: "#0369A1" },
  { bg: "#F5F3FF", text: "#6D28D9" },
  { bg: "#FEF2F2", text: "#B91C1C" },
];

const DEFAULT_MARKET_DATA = {
  ulkes: [
    { id: 0, ad: "Tümü", img: "https://flagcdn.com/w80/tr.png", width: 45, height: 30 },
    { id: 1, ad: "Türkiye", img: "https://flagcdn.com/w80/tr.png", width: 45, height: 30 },
    { id: 2, ad: "ABD", img: "https://flagcdn.com/w80/us.png", width: 45, height: 30 },
    { id: 3, ad: "İngiltere", img: "https://flagcdn.com/w80/gb.png", width: 45, height: 30 },
    { id: 4, ad: "Çin", img: "https://flagcdn.com/w80/cn.png", width: 45, height: 30 },
  ],
  sliders: [],
  banners_orta: [],
  banners: [],
};

export default function BannerList({ route, navigation }) {
  const { ctx, setCtx, ctxDil } = useContext(EmContext);
  const carouselRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth || Dimensions.get("window").width);

  const activeWidth = containerWidth > 0 ? containerWidth : (windowWidth || Dimensions.get("window").width);
  const bannerWidth = activeWidth - 32;
  const heroBannerHeight = Math.round(bannerWidth * (202 / 335));
  const cardWidth = Math.floor((activeWidth - 44) / 2);
  const cardHeight = Math.round(cardWidth * 1.05);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ulkeID, setUlkeID] = useState(0);

  const [state, setState] = useState({
    banners: [],
    sliders: [],
    banners_orta: [],
    ulkes: DEFAULT_MARKET_DATA.ulkes,
    kur: "",
    firstLoad: false,
    loading: false,
    token: "",
    storageAllKeys: {},
  });

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }

      // Check cached data if currently empty
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
        } catch (e) {}
      }

      const token = await getToken();
      if (!token) {
        const cached = await storageGet("cached_home_data");
        if (cached && (cached.banners?.length || cached.sliders?.length)) {
          setState(prev => ({
            ...prev,
            banners: cached.banners || [],
            sliders: cached.sliders || [],
            banners_orta: cached.banners_orta || [],
            ulkes: cached.ulkes || [],
            kur: cached.kur ?? "",
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            ...DEFAULT_MARKET_DATA,
            loading: false,
          }));
        }
        return;
      }

      const c = await ai.post("home", {
        ulkeID: ulkeID,
      });

      let ns = { ...state };
      if (c?.data?.error === false) {
        ns = {
          ...ns,
          banners: c.data.banners || [],
          sliders: c.data.sliders || [],
          banners_orta: c.data.banners_orta || [],
          ulkes: c.data.ulkes || [],
          kur: c.data?.kur ?? "",
        };
        try {
          await storageSet("cached_home_data", c.data);
        } catch (e) {}
      } else {
        const cached = await storageGet("cached_home_data");
        if (cached && (cached.banners?.length || cached.sliders?.length)) {
          ns = {
            ...ns,
            banners: cached.banners || [],
            sliders: cached.sliders || [],
            banners_orta: cached.banners_orta || [],
            ulkes: cached.ulkes || [],
            kur: cached.kur ?? "",
          };
        }
      }

      ns.loading = false;
      setState(ns);
    } catch (error) {
      console.log("BannerList fetchData error:", error?.message);
      const cached = await storageGet("cached_home_data");
      if (cached && (cached.banners?.length || cached.sliders?.length)) {
        setState(prev => ({
          ...prev,
          banners: cached.banners || [],
          sliders: cached.sliders || [],
          banners_orta: cached.banners_orta || [],
          ulkes: cached.ulkes || [],
          kur: cached.kur ?? "",
          loading: false,
        }));
      }
    } finally {
      setSubLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [ulkeID])
  );

  // Dynamic + Curated Slides for the top Carousel
  const carouselSlides = useMemo(() => {
    const slides = [
      {
        id: "figma-hero-amazon",
        title: "Summer Sale",
        ad: "Amazon",
        url: "https://www.amazon.com",
        localImage: HERO_BANNER_IMG,
      },
    ];

    if (state.sliders && state.sliders.length > 0) {
      state.sliders.forEach((item, index) => {
        const img =
          item["img_" + ctxDil] ||
          item.img_en ||
          item.img_tr ||
          item.image ||
          item.img;
        if (img) {
          slides.push({
            id: item.id ? `api-slider-${item.id}` : `api-slider-${index}`,
            title:
              item["ad_" + ctxDil] ||
              item.ad_en ||
              item.title ||
              item.ad ||
              "Special Deals",
            ad:
              item["ad_" + ctxDil] ||
              item.ad_en ||
              item.title ||
              item.ad ||
              "Store",
            url: item.link || "https://www.amazon.com",
            remoteImage: img,
          });
        }
      });
    }

    if (slides.length === 1) {
      slides.push(
        {
          id: "promo-iherb",
          title: "iHerb Specials",
          ad: "iHerb",
          url: "https://www.iherb.com",
          cardType: "promo",
          store: "iHerb",
          headline: "Vitamins & Wellness",
          discount: "Up to 30% Off",
          bgColor: "#00693E",
          bgLight: "#E8F7E7",
        },
        {
          id: "promo-shein",
          title: "SHEIN Trends",
          ad: "SHEIN",
          url: "https://www.shein.com",
          cardType: "promo",
          store: "SHEIN",
          headline: "Fashion & Lifestyle",
          discount: "Hot Trends",
          bgColor: "#1A1A1A",
          bgLight: "#FCEFF5",
        },
        {
          id: "promo-yesstyle",
          title: "YESSTYLE K-Beauty",
          ad: "YESSTYLE",
          url: "https://www.yesstyle.com",
          cardType: "promo",
          store: "YESSTYLE",
          headline: "Asian Skincare & Makeup",
          discount: "Best Sellers",
          bgColor: "#2F5233",
          bgLight: "#EAF5EF",
        }
      );
    }

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
    if (pageIndex !== activeSlideIndex && pageIndex >= 0 && pageIndex < carouselSlides.length) {
      setActiveSlideIndex(pageIndex);
    }
  };

  const handleSlidePress = slide => {
    const url = slide.url || slide.link || "https://www.amazon.com";
    const ad = slide.ad || slide.title || "Store";
    navigation.navigate("Webview", {
      ad: ad,
      url: url,
    });
  };

  const handleStorePress = store => {
    const targetUrl = store.url || "https://www.amazon.com";
    navigation.navigate("Webview", {
      ad: store.name,
      url: targetUrl,
    });
  };

  // Convert dynamic API banners into responsive Figma-styled 2-column cards
  const displayStores = useMemo(() => {
    if (!state.banners || state.banners.length === 0) {
      return DEFAULT_FALLBACK_STORES;
    }

    return state.banners.map((item, index) => {
      const rawName =
        item["ad_" + ctxDil] || item.ad_en || item.title || item.ad || "Store";
      const nameLower = rawName.toLowerCase();
      const linkLower = (item.link || "").toLowerCase();

      // Check if matches one of the 4 known Figma store assets
      let matchedKey = null;
      if (nameLower.includes("amazon") || linkLower.includes("amazon"))
        matchedKey = "amazon";
      else if (nameLower.includes("iherb") || linkLower.includes("iherb"))
        matchedKey = "iherb";
      else if (
        nameLower.includes("yesstyle") ||
        linkLower.includes("yesstyle")
      )
        matchedKey = "yesstyle";
      else if (nameLower.includes("shein") || linkLower.includes("shein"))
        matchedKey = "shein";

      if (matchedKey && KNOWN_STORE_ASSETS[matchedKey]) {
        const assetInfo = KNOWN_STORE_ASSETS[matchedKey];
        return {
          id: item.id ? `store-${item.id}` : `store-${index}`,
          name: rawName,
          url: item.link || "https://www.amazon.com",
          bgColor: assetInfo.bgColor,
          knownAsset: assetInfo.image,
          subtitle: assetInfo.subtitle,
        };
      }

      const colorConfig = PASTEL_PALETTE[index % PASTEL_PALETTE.length];
      const remoteImg =
        item["img_" + ctxDil] || item.img_en || item.image || item.img || "";

      return {
        id: item.id ? `store-${item.id}` : `store-${index}`,
        name: rawName,
        url: item.link || "https://www.amazon.com",
        bgColor: colorConfig.bg,
        accentColor: colorConfig.text,
        remoteImg: remoteImg,
        subtitle: tr("Featured Store") || "Featured Store",
      };
    });
  }, [state.banners, ctxDil]);

  const isDark = ctx?.isDark;
  const pageBg = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#1E293B";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: "#F67922" }]}
      edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#F67922" />

      {/* Figma Home Header with 1 Click Logo & Centered Notification Bell */}
      <AuthHeader
        navigation={navigation}
        route={route}
        variant="home"
      />

      <View style={[styles.container, { backgroundColor: pageBg }]}>
        {state.loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F67922" />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              {tr("Loading") || "Loading"}...
            </Text>
          </View>
        ) : (
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
                  <View key={slide.id} style={{ width: activeWidth, paddingHorizontal: 16 }}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => handleSlidePress(slide)}
                      style={[styles.heroCard, { height: heroBannerHeight }]}>
                      {slide.localImage ? (
                        <Image
                          source={slide.localImage}
                          style={styles.heroImage}
                          resizeMode="cover"
                        />
                      ) : slide.remoteImage ? (
                        <FastImage
                          source={{ uri: slide.remoteImage }}
                          style={styles.heroImage}
                          resizeMode={FastImage.resizeMode.cover}
                        />
                      ) : (
                        <View
                          style={[
                            styles.promoCardContent,
                            { backgroundColor: slide.bgLight || "#F8FAFC" },
                          ]}>
                          <View>
                            <View style={styles.promoBadgeRow}>
                              <Text
                                style={[styles.promoStoreName, { color: slide.bgColor }]}>
                                {slide.store}
                              </Text>
                              <View
                                style={[
                                  styles.promoBadgePill,
                                  { backgroundColor: slide.bgColor },
                                ]}>
                                <Text style={styles.promoBadgeText}>
                                  {slide.discount}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[styles.promoHeadline, { color: "#1E293B" }]}
                              numberOfLines={2}>
                              {slide.headline}
                            </Text>
                          </View>

                          <View style={styles.promoCtaRow}>
                            <View
                              style={[
                                styles.promoShopBtn,
                                { backgroundColor: slide.bgColor },
                              ]}>
                              <Text style={styles.promoShopBtnText}>Shop Now →</Text>
                            </View>
                          </View>
                        </View>
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

            {/* 2. Country Filter Bar (Filter Dynamic Stores from API) */}
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

            {/* 3. Responsive Dynamic Stores Grid (Figma 2-Column Layout) */}
            <View style={styles.storesSection}>
              <View style={styles.storesHeaderRow}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {tr("Shop International Stores") || "Shop International Stores"}
                </Text>
              </View>

              <View style={styles.storesGrid}>
                {displayStores.map(store => (
                  <TouchableOpacity
                    key={store.id}
                    activeOpacity={0.88}
                    onPress={() => handleStorePress(store)}
                    style={[
                      styles.storeCard,
                      {
                        width: cardWidth,
                        height: cardHeight,
                        backgroundColor: store.bgColor,
                      },
                    ]}>
                    {store.knownAsset ? (
                      <Image
                        source={store.knownAsset}
                        style={styles.storeCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.dynamicCardInner}>
                        <View style={styles.dynamicCardHeader}>
                          <Text
                            style={[styles.dynamicStoreName, { color: textColor }]}
                            numberOfLines={1}>
                            {store.name}
                          </Text>
                          <Text
                            style={[styles.dynamicStoreSub, { color: subTextColor }]}
                            numberOfLines={2}>
                            {store.subtitle}
                          </Text>
                        </View>

                        <View style={styles.dynamicCardImageWrap}>
                          {store.remoteImg ? (
                            <FastImage
                              source={{ uri: store.remoteImg }}
                              style={styles.dynamicStoreImg}
                              resizeMode={FastImage.resizeMode.contain}
                            />
                          ) : (
                            <Text
                              style={[
                                styles.dynamicStoreInitial,
                                { color: store.accentColor || Colors.primary },
                              ]}>
                              {store.name.charAt(0)}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 4. Middle Sliders from API (if available, enclosed in Figma-styled container) */}
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
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  orangeBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: "#F67922",
  },
  carouselContainer: {
    paddingTop: 10,
  },
  heroCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  promoCardContent: {
    flex: 1,
    padding: 18,
    justifyContent: "space-between",
  },
  promoBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  promoStoreName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  promoBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  promoHeadline: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  promoCtaRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  promoShopBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  promoShopBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: "#F67922",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#E2E8F0",
  },
  countryBarWrap: {
    marginBottom: 10,
  },
  storesSection: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  storesHeaderRow: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  storesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  storeCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  storeCardImage: {
    width: "100%",
    height: "100%",
  },
  dynamicCardInner: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  dynamicCardHeader: {
    marginBottom: 6,
  },
  dynamicStoreName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  dynamicStoreSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  dynamicCardImageWrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    padding: 6,
  },
  dynamicStoreImg: {
    width: "100%",
    height: "100%",
  },
  dynamicStoreInitial: {
    fontSize: 32,
    fontWeight: "900",
  },
  middleSliderWrap: {
    marginTop: 18,
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
