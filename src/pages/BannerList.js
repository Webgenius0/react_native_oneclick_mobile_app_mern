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
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
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

const { width } = Dimensions.get("window");
const bannerWidth = width - 32;
const heroBannerHeight = Math.round(bannerWidth * (202 / 335));
const cardWidth = (width - 44) / 2;
const cardHeight = Math.round(cardWidth * 1.05);

const HERO_BANNER_IMG = require("../assets/img/home/home_hero_banner.png");

const STORE_CARDS = [
  {
    id: "amazon",
    name: "Amazon",
    url: "https://www.amazon.com",
    bgColor: "#FEF3E1",
    image: require("../assets/img/home/store_amazon.png"),
  },
  {
    id: "iherb",
    name: "iHerb",
    url: "https://www.iherb.com",
    bgColor: "#E8F7E7",
    image: require("../assets/img/home/store_iherb.png"),
  },
  {
    id: "yesstyle",
    name: "YESSTYLE",
    url: "https://www.yesstyle.com",
    bgColor: "#EAF5EF",
    image: require("../assets/img/home/store_yesstyle.png"),
  },
  {
    id: "shein",
    name: "SHEIN",
    url: "https://www.shein.com",
    bgColor: "#FCEFF5",
    image: require("../assets/img/home/store_shein.png"),
  },
];

const DEFAULT_MARKET_DATA = {
  ulkes: [
    { id: 0, ad: "Tümü", img: "https://flagcdn.com/w80/tr.png", width: 45, height: 30 },
    { id: 1, ad: "Türkiye", img: "https://flagcdn.com/w80/tr.png", width: 45, height: 30 },
    { id: 2, ad: "ABD", img: "https://flagcdn.com/w80/us.png", width: 45, height: 30 },
    { id: 3, ad: "İngiltere", img: "https://flagcdn.com/w80/gb.png", width: 45, height: 30 },
    { id: 4, ad: "Çin", img: "https://flagcdn.com/w80/cn.png", width: 45, height: 30 },
  ],
  sliders: [
    {
      id: 1,
      ad_tr: "Trendyol Fırsatları",
      img_tr: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80",
      link: "https://www.trendyol.com",
    },
    {
      id: 2,
      ad_tr: "Amazon İndirimleri",
      img_tr: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&auto=format&fit=crop&q=80",
      link: "https://www.amazon.com",
    },
  ],
  banners_orta: [],
  banners: [],
};

export default function BannerList({ route, navigation }) {
  const { ctx, setCtx, ctxDil } = useContext(EmContext);
  const carouselRef = useRef(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [subLoading, setSubLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ulkeID, setUlkeID] = useState(0);

  const [state, setState] = useState({
    banners: DEFAULT_MARKET_DATA.banners,
    sliders: DEFAULT_MARKET_DATA.sliders,
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
        const img = item["img_" + ctxDil] || item.img_tr;
        if (img) {
          slides.push({
            id: item.id ? `api-slider-${item.id}` : `api-slider-${index}`,
            title: item["ad_" + ctxDil] || item.ad_tr || item.title || "Special Deals",
            ad: item["ad_" + ctxDil] || item.ad_tr || item.title || "Store",
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

  // Auto-slide effect
  useEffect(() => {
    if (!carouselSlides || carouselSlides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlideIndex(prev => {
        const next = (prev + 1) % carouselSlides.length;
        carouselRef.current?.scrollTo({
          x: next * width,
          animated: true,
        });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [carouselSlides.length]);

  const handleCarouselScroll = event => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / width);
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
    const matchingBanner = state.banners?.find(
      b =>
        b?.ad_tr?.toLowerCase().includes(store.id) ||
        b?.link?.toLowerCase().includes(store.id)
    );
    const targetUrl = matchingBanner?.link || store.url;
    navigation.navigate("Webview", {
      ad: store.name,
      url: targetUrl,
    });
  };

  const isDark = ctx?.isDark;
  const pageBg = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#1E293B";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";

  const imgRatio = 1684 / 777;
  const calculatedHeight = (width - 32) / imgRatio;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#F67922" }]}>
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
              {tr("Yükleniyor") || "Loading"}...
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

            {/* 1. Top Carousel Section */}
            <View style={styles.carouselContainer}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleCarouselScroll}
                scrollEventThrottle={16}>
                {carouselSlides.map(slide => (
                  <View key={slide.id} style={{ width: width, paddingHorizontal: 16 }}>
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

            {/* 2. Shop International Stores Section (Figma 2x2 Grid) */}
            <View style={styles.storesSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {tr("Shop International Stores") || "Shop International Stores"}
              </Text>

              <View style={styles.storesGrid}>
                {STORE_CARDS.map(store => (
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
                    <Image
                      source={store.image}
                      style={styles.storeCardImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 3. Country Filter Bar */}
            {state.ulkes && state.ulkes.length > 1 ? (
              <View style={styles.countrySection}>
                <View style={styles.countryHeaderRow}>
                  <Text style={[styles.subSectionTitle, { color: textColor }]}>
                    {tr("Ülkeye Göre Mağazalar") || "Stores by Country"}
                  </Text>
                </View>
                <UlkeBar
                  state={state}
                  ulkeID={ulkeID}
                  loading={state.loading}
                  setUlkeID={setUlkeID}
                />
              </View>
            ) : null}

            {/* 4. Middle Sliders from API */}
            {state.banners_orta && state.banners_orta.length > 0 ? (
              <View style={styles.middleSliderWrap}>
                <CustomSlider
                  ctxDil={ctxDil}
                  state={state}
                  navigation={navigation}
                  width={430}
                  height={241}
                  data={state.banners_orta}
                />
              </View>
            ) : null}

            {/* 5. Dynamic Banners from API */}
            {state.banners && state.banners.length > 0 ? (
              <View style={styles.bannersSection}>
                {state.banners.map((item, index) => {
                  const img = item["img_" + ctxDil] || item.img_tr;
                  if (!img) return null;

                  return (
                    <TouchableOpacity
                      key={item.id ? `banner-${item.id}` : `banner-${index}`}
                      activeOpacity={0.88}
                      onPress={() => {
                        navigation.navigate("Webview", {
                          ad: item.ad_tr || "Store",
                          url: item.link,
                        });
                      }}
                      style={[
                        styles.bannerCard,
                        {
                          height: calculatedHeight,
                          borderColor: isDark ? "#374151" : "#F1F5F9",
                        },
                      ]}>
                      <FastImage
                        style={styles.bannerImage}
                        source={{ uri: img }}
                        resizeMode={FastImage.resizeMode.contain}
                      />
                    </TouchableOpacity>
                  );
                })}
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
    marginBottom: 16,
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
  storesSection: {
    paddingHorizontal: 16,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  storesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
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
  countrySection: {
    marginTop: 20,
  },
  countryHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  middleSliderWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  bannersSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
});
