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
      } else {
        ns = { ...ns, banners: [], sliders: [], stories: [], hasError: true };
      }

      ns.loading = false;
      setState(ns);
    } catch (error) {
      console.log("BannerList fetchData error:", error?.message);
      setState(prev => ({ ...prev, loading: false, hasError: true }));
    } finally {
      setSubLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
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
