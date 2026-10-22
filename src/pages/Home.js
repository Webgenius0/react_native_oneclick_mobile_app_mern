import React, { useCallback, useContext, useState } from "react";
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
import { getToken } from "../helpers/auth";
import { EmContext } from "../contexts/EmContext";
import ai from "../helpers/ai";
import FastImage from "react-native-fast-image";
import AuthHeader from "../components/AuthHeader";
import { useFocusEffect } from "@react-navigation/native";
import CustomSlider from "../components/CustomSlider";
import { tr } from "../translate/i18n";
import UlkeBar from "../components/UlkeBar";

const { width } = Dimensions.get("window");

const STORE_CARDS = [
  {
    id: "amazon",
    name: "Amazon",
    url: "https://www.amazon.com",
    bgColor: "#FEF3E1",
    image: require("../assets/img/home/store_amazon.png"),
    subtitle: "Millions of products across every category.",
  },
  {
    id: "iherb",
    name: "iHerb",
    url: "https://www.iherb.com",
    bgColor: "#E8F7E7",
    image: require("../assets/img/home/store_iherb.png"),
    subtitle: "Health, wellness & personal care products",
  },
  {
    id: "yesstyle",
    name: "YESSTYLE",
    url: "https://www.yesstyle.com",
    bgColor: "#EAF5EF",
    image: require("../assets/img/home/store_yesstyle.png"),
    subtitle: "Beauty, fashion and lifestyle products.",
  },
  {
    id: "shein",
    name: "SHEIN",
    url: "https://www.shein.com",
    bgColor: "#FCEFF5",
    image: require("../assets/img/home/store_shein.png"),
    subtitle: "Fashion, beauty and lifestyle products",
  },
];

export default function Home({ route, navigation }) {
  const { ctx, setCtx, ctxDil, methods } = useContext(EmContext);

  const imgWidth = 1684;
  const imgHeight = 777;
  const ratio = imgWidth / imgHeight;
  const calculatedHeight = (width - 32) / ratio;

  const [state, setState] = useState({
    banners: [],
    sliders: [],
    banners_orta: [],
    ulkes: [],
    kur: "",
    firstLoad: false,
    loading: true,
    token: "",
    storageAllKeys: {},
  });

  const [subLoading, setSubLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ulkeID, setUlkeID] = useState(0);

  const fetchData = async isRefresh => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setSubLoading(true);
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
      } else {
        ns = { ...ns, banners: [], sliders: [] };
      }

      ns.loading = false;
      setState(ns);
    } catch (error) {
      console.log("Home fetchData error:", error?.message);
      setState(prev => ({ ...prev, loading: false }));
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

  const handleStorePress = store => {
    // If there is a matching banner from backend, use that link if preferred
    const matchingBanner = state.banners.find(
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

  const isDark = ctx.isDark;
  const pageBg = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#252C34";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";

  const cardWidth = (width - 44) / 2;
  const cardHeight = cardWidth * 1.02;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#F67922" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#F67922" />

      {/* Header from Figma */}
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
            {/* Hero Section: CustomSlider or Figma Banner */}
            <View style={styles.heroWrap}>
              {state.sliders && state.sliders.length > 0 ? (
                <View style={styles.sliderContainer}>
                  <CustomSlider
                    ctxDil={ctxDil}
                    state={state}
                    navigation={navigation}
                    data={state.sliders}
                    width={430}
                    height={241}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("Webview", {
                      ad: "Summer Sale",
                      url: "https://www.amazon.com",
                    })
                  }
                  style={styles.heroBannerCard}>
                  <Image
                    source={require("../assets/img/home/home_hero_banner.png")}
                    style={styles.heroBannerImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Country Selector Bar */}
            <UlkeBar
              state={state}
              ulkeID={ulkeID}
              loading={state.loading}
              setUlkeID={setUlkeID}
            />

            {/* Shop International Stores Section (Figma: 37907:1538) */}
            <View style={styles.storesSection}>
              <View style={styles.storesHeaderRow}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {tr("Shop International Stores") || "Shop International Stores"}
                </Text>
              </View>

              <View style={styles.storesGrid}>
                {STORE_CARDS.map(store => (
                  <TouchableOpacity
                    key={store.id}
                    activeOpacity={0.85}
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

            {/* Middle Sliders */}
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

            {/* Dynamic Banners from API */}
            {state.banners && state.banners.length > 0 ? (
              <View style={styles.bannersSection}>
                {state.banners.map((item, index) => {
                  const img = item["img_" + ctxDil]
                    ? item["img_" + ctxDil]
                    : item.img_tr;
                  if (!img) return null;

                  return (
                    <TouchableOpacity
                      key={`banner-${index}`}
                      activeOpacity={0.88}
                      onPress={() => {
                        navigation.navigate("Webview", {
                          ad: item.ad_tr || "Store",
                          url: item.link,
                        });
                      }}
                      style={[
                        styles.bannerCard,
                        { height: calculatedHeight, borderColor: isDark ? "#374151" : "#F1F5F9" },
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
  heroWrap: {
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  sliderContainer: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBannerCard: {
    width: "100%",
    height: (width - 32) * (202 / 335),
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBannerImage: {
    width: "100%",
    height: "100%",
  },
  storesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  storesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#252C34",
    letterSpacing: -0.2,
  },
  storesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  storeCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  storeCardImage: {
    width: "100%",
    height: "100%",
  },
  middleSliderWrap: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  bannersSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  bannerCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
