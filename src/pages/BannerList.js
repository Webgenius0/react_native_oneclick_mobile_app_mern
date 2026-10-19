import { Text, View, StyleSheet, TouchableOpacity, Dimensions, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from "react-native";
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { useCallback, useContext, useEffect, useState } from "react";
import { getToken, getUser } from "../helpers/auth";

import { EmContext } from "../contexts/EmContext";
import { IS_DEV } from "../helpers/common";
import ai from "../helpers/ai";
import FastImage from "react-native-fast-image";
import AuthHeader from "../components/AuthHeader";
import { useFocusEffect } from "@react-navigation/native";
import CustomSlider from "../components/CustomSlider";
import GlobalStyle from "../assets/GlobalStyle";
import Colors from "../assets/Colors";
import { tr } from "../translate/i18n";
import Dump from "../components/Dump";
import { storageGet, storageSet } from "../helpers/storage";
import UlkeBar from "../components/UlkeBar";
import StoryList from "../components/StoryList";


const DEFAULT_MARKET_DATA = {
  ulkes: [
    { id: 0, ad: 'Tümü', img: 'https://flagcdn.com/w80/tr.png', width: 45, height: 30 },
    { id: 1, ad: 'Türkiye', img: 'https://flagcdn.com/w80/tr.png', width: 45, height: 30 },
    { id: 2, ad: 'ABD', img: 'https://flagcdn.com/w80/us.png', width: 45, height: 30 },
    { id: 3, ad: 'İngiltere', img: 'https://flagcdn.com/w80/gb.png', width: 45, height: 30 },
    { id: 4, ad: 'Çin', img: 'https://flagcdn.com/w80/cn.png', width: 45, height: 30 },
  ],
  stories: [
    { id: 1, title: 'Trendyol', ad_tr: 'Trendyol', link: 'https://www.trendyol.com', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Trendyol_logo.svg/320px-Trendyol_logo.svg.png', img_tr: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Trendyol_logo.svg/320px-Trendyol_logo.svg.png' },
    { id: 2, title: 'Amazon', ad_tr: 'Amazon', link: 'https://www.amazon.com.tr', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png', img_tr: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/320px-Amazon_logo.svg.png' },
    { id: 3, title: 'SHEIN', ad_tr: 'SHEIN', link: 'https://www.shein.com', img: 'https://img.ltwebstatic.com/images3_pi/2021/04/20/1618899895697dbb8a0df7fc2256dfcf990e63faad.png', img_tr: 'https://img.ltwebstatic.com/images3_pi/2021/04/20/1618899895697dbb8a0df7fc2256dfcf990e63faad.png' },
    { id: 4, title: 'Zara', ad_tr: 'Zara', link: 'https://www.zara.com/tr', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/320px-Zara_Logo.svg.png', img_tr: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/320px-Zara_Logo.svg.png' },
    { id: 5, title: 'H&M', ad_tr: 'H&M', link: 'https://www2.hm.com/tr_tr', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/320px-H%26M-Logo.svg.png', img_tr: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/320px-H%26M-Logo.svg.png' },
  ],
  sliders: [
    {
      id: 1,
      ad_tr: 'Trendyol Fırsatları',
      img_tr: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
      link: 'https://www.trendyol.com',
    },
    {
      id: 2,
      ad_tr: 'Amazon İndirimleri',
      img_tr: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&auto=format&fit=crop&q=80',
      link: 'https://www.amazon.com.tr',
    },
  ],
  banners_orta: [],
  banners: [
    {
      id: 1,
      ad_tr: 'Trendyol',
      img_tr: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&auto=format&fit=crop&q=80',
      link: 'https://www.trendyol.com',
    },
    {
      id: 2,
      ad_tr: 'Amazon',
      img_tr: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&fit=crop&q=80',
      link: 'https://www.amazon.com.tr',
    },
    {
      id: 3,
      ad_tr: 'SHEIN',
      img_tr: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&auto=format&fit=crop&q=80',
      link: 'https://www.shein.com',
    },
    {
      id: 4,
      ad_tr: 'Zara',
      img_tr: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&auto=format&fit=crop&q=80',
      link: 'https://www.zara.com/tr',
    },
    {
      id: 5,
      ad_tr: 'H&M',
      img_tr: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&auto=format&fit=crop&q=80',
      link: 'https://www2.hm.com/tr_tr',
    },
  ],
};

export default function({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { ctx, setCtx, ctxDil, methods } = useContext(EmContext);
  const { width, height } = Dimensions.get("window");
  let imgWidth = 430;
  let imgHeight = 241;

  imgWidth = 1684;
  imgHeight = 777;
  let ratio = imgWidth / imgHeight;
  let calculatedHeight = width / ratio;


  const HOME_PASIF = false;

  const [state, setState] = useState({
    banners: [],
    sliders: [],
    stories: [],
    banners_orta: [],
    ulkes: [],
    kur: "",
    firstLoad: false,
    loading: true,
    hasError: false,
    token: "",
    storageAllKeys: {},
  });

  const [subLoading, setSubLoading] = useState(false);

  const [ulkeID, setUlkeID] = useState(0);

  const tokenLoad = async () => {
    if (state.firstLoad === false) {
      // console.log("home tokenLoad", +new Date());
      const token = await getToken();
      setState({ ...state, loading: false, token: token, firstLoad: true });
      setCtx({ ...ctx, token: token });
    }
  };

  const fetchNotif = async () => {
    await methods.fetchAllNotifications();
  };

  const resetStorage = async () => {
    await storageSet("notifications", []);
    await storageSet("lastNotifID", null);
    let localNotifications = await storageGet("notifications");
    let lastNotifID = await storageGet("lastNotifID");

    // setCtx({ ...ctx, notifications: localNotifications, lastNotifID: lastNotifID });
  };

  const fetchData = async () => {
    try {
      setSubLoading(true);
      console.log("BannerList fetchData:home ulkeID", ulkeID);
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
          stories: c.data.stories || [],
          ulkes: c.data.ulkes || [],
          kur: c.data?.kur ?? "",
          hasError: false,
        };
        try {
          await storageSet('cached_home_data', c.data);
        } catch (e) {}
      } else {
        const cached = await storageGet('cached_home_data');
        if (cached && (cached.banners?.length || cached.sliders?.length)) {
          ns = {
            ...ns,
            banners: cached.banners || [],
            sliders: cached.sliders || [],
            banners_orta: cached.banners_orta || [],
            stories: cached.stories || [],
            ulkes: cached.ulkes || [],
            kur: cached.kur ?? "",
            hasError: false,
          };
        } else {
          ns = {
            ...ns,
            ...DEFAULT_MARKET_DATA,
            hasError: false,
          };
        }
      }

      ns.loading = false;
      setState(ns);
    } catch (error) {
      console.log("BannerList fetchData error:", error?.message);
      const cached = await storageGet('cached_home_data');
      if (cached && (cached.banners?.length || cached.sliders?.length)) {
        setState(prev => ({
          ...prev,
          banners: cached.banners || [],
          sliders: cached.sliders || [],
          banners_orta: cached.banners_orta || [],
          stories: cached.stories || [],
          ulkes: cached.ulkes || [],
          kur: cached.kur ?? "",
          loading: false,
          hasError: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          ...DEFAULT_MARKET_DATA,
          loading: false,
          hasError: false,
        }));
      }
    } finally {
      setSubLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ulkeID]),
  );

  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('This will run every second!', +new Date());
      await fetchNotif();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

   */


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.backgroundColor,
      // alignItems: "center",
      // justifyContent: "center",
      flexDirection: "column",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 100,
      backgroundColor: ctx.backgroundColor,
      height: Dimensions.get("window").height - 200,
      width: "100%",
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      paddingTop: insets.top,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
      paddingVertical: 60,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 8,
      textAlign: "center",
    },
    errorSubtitle: {
      fontSize: 14,
      opacity: 0.7,
      marginBottom: 20,
      textAlign: "center",
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: "#FFF",
      fontSize: 15,
      fontWeight: "600",
    },
  });


  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>

        <AuthHeader navigation={navigation} route={route} />

        <View>
          <StoryList stories={state.stories} navigation={navigation} />
        </View>

        {
          state.loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 12, color: ctx.color }}>{tr("Yükleniyor")}...</Text>
            </View>
          ) : null
        }
        {
          HOME_PASIF && (
            <Dump ctx={ctx} />
          )
        }

        {
          <>
            {
              !state.loading && !HOME_PASIF && state.sliders.length > 0 ? (
                <CustomSlider
                  ctxDil={ctxDil}
                  state={state}
                  navigation={navigation}
                  data={state.sliders}
                />
              ) : null
            }
          </>
        }


        <UlkeBar
          state={state}
          ulkeID={ulkeID}
          loading={state.loading}
          setUlkeID={setUlkeID} />

        {
          !state.loading && !subLoading && state.hasError && state.banners.length === 0 && state.sliders.length === 0 && (
            <ScrollView
              contentContainerStyle={styles.errorContainer}
              refreshControl={
                <RefreshControl
                  refreshing={subLoading}
                  onRefresh={fetchData}
                  colors={[Colors.primary]}
                />
              }>
              <Text style={[styles.errorTitle, { color: ctx.color }]}>
                {tr("Bağlantı Hatası")}
              </Text>
              <Text style={[styles.errorSubtitle, { color: ctx.color }]}>
                {tr("İnternet bağlantınızı kontrol edin veya tekrar deneyin.")}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchData}>
                <Text style={styles.retryButtonText}>{tr("Tekrar Dene")}</Text>
              </TouchableOpacity>
            </ScrollView>
          )
        }

        {
          state.loading === false && !subLoading && !HOME_PASIF && (state.banners.length > 0 || state.sliders.length > 0 || state.banners_orta.length > 0) && (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={subLoading}
                  onRefresh={fetchData}
                  colors={[Colors.primary]}
                />
              }>
              {
                <>
                  {
                    state.banners_orta.length > 0 ? (
                      <CustomSlider
                        ctxDil={ctxDil}
                        state={state}
                        navigation={navigation}
                        width={430}
                        height={241}
                        data={state.banners_orta}
                      />
                    ) : null
                  }
                </>
              }

              {
                state.banners.length ?
                  (
                    <>

                      {
                        state.banners.map((item, index) => {
                          let img = item["img_" + ctxDil] ? item["img_" + ctxDil] : item.img_tr;

                          return (
                            <View
                              key={index} style={{
                              // padding: 10,
                              borderBottomWidth: 3,
                              borderBottomColor: "#EEE",
                              // flex: 1,
                            }}>

                              {
                                img !== null && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      navigation.navigate("Webview", { ad: item.ad_tr, url: item.link });
                                    }}>
                                    <FastImage
                                      style={{
                                        width: width,
                                        height: calculatedHeight,
                                        resizeMode: "contain",
                                      }}
                                      source={{ uri: img }}
                                    />
                                  </TouchableOpacity>
                                )
                              }

                            </View>
                          );
                        })}
                    </>
                  ) : null

              }
            </ScrollView>
          )
        }

      </View>
    </SafeAreaView>
  );
}
