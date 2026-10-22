import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { EmContext } from "../contexts/EmContext";
import moment from "moment";
import { tr } from "../translate/i18n";
import ai from "../helpers/ai";
import { delay, IS_DEV } from "../helpers/common";
import { storageGet, storageSet } from "../helpers/storage";
import {
  fetchAllNotifications,
  NOTIFICATION_COUNT_KEY,
  NOTIFICATION_KEY,
  setLocalNotifications,
} from "../helpers/notificationV2";
import AppHeader from "../components/common/AppHeader";
import NotificationBingIcon from "../assets/svg/notification_bing.svg";

export default function Notifications({ route, navigation }) {
  const { ctx, setCtx } = useContext(EmContext);

  const [state, setState] = useState({
    loading: false,
  });

  const handleBack = useCallback(() => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("AuthAfter");
    }
  }, [navigation]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const init = async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await fetchAllNotifications(ctx, setCtx, true);
    } catch (err) {
      console.log("Error fetching notifications:", err);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    init();
  }, []);

  const deleteNotifies = async () => {
    Alert.alert(
      tr("Bildirimleri Temizle") || "Clear All Notifications",
      tr("Tüm bildirimleri silmek istediğinize emin misiniz?") ||
        "Are you sure you want to clear all notifications?",
      [
        { text: tr("İptal") || "Cancel", style: "cancel" },
        {
          text: tr("Temizle") || "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const r = await ai.post("notifications", { islem: "delete" });
              if (r?.data?.error === false) {
                await storageSet(NOTIFICATION_KEY, { notifications: [], lastId: 0 });
                setCtx(prev => ({
                  ...prev,
                  [NOTIFICATION_COUNT_KEY]: 0,
                  localNotifications: [],
                  serverNotifications: [],
                  notifications: [],
                }));
              }
            } catch (err) {
              console.log("Delete notifications error:", err);
            }
          },
        },
      ]
    );
  };

  const handleItemPress = async (item, index) => {
    try {
      const list = [...(ctx.notifications || [])];
      if (list[index]) {
        list[index] = { ...list[index], read: true, okundu: 1 };
        setCtx(prev => ({
          ...prev,
          notifications: list,
          notificationCount: Math.max(0, (prev.notificationCount || 1) - 1),
        }));
        await setLocalNotifications({
          notifications: list,
          lastId: list[0]?.id || 0,
        });
      }

      if (item.link || item.url) {
        navigation.navigate("Webview", {
          ad: item.baslik || "Notification",
          url: item.link || item.url,
        });
      }
    } catch (e) {
      console.log("handleItemPress error:", e);
    }
  };

  const formatRelativeTime = tarih => {
    if (!tarih) return "";
    const m = moment(tarih);
    if (!m.isValid()) return "";
    const now = moment();
    const diffMinutes = now.diff(m, "minutes");
    const diffHours = now.diff(m, "hours");
    const diffDays = now.diff(m, "days");

    if (diffMinutes < 1) return tr("Az önce") || "Just now";
    if (diffMinutes < 60) return `${diffMinutes} ${tr("dakika önce") || "min ago"}`;
    if (diffHours < 24) return `${diffHours} ${tr("saat önce") || "hours ago"}`;
    if (diffDays === 1) return tr("Dün") || "Yesterday";
    if (diffDays < 7) return `${diffDays} ${tr("gün önce") || "days ago"}`;
    return m.format("DD.MM.YYYY");
  };

  const notifications = ctx.notifications || [];
  const unreadCount = notifications.filter(
    n => !n.read && n.read !== true && n.okundu !== 1 && n.okundu !== "1"
  ).length;

  const isDark = ctx.isDark;
  const bgColor = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#252C34";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";
  const borderColor = isDark ? "#1F2937" : "#F1F5F9";
  const itemBg = isDark ? "#111827" : "#FFFFFF";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bgColor}
      />

      {/* Header matching Figma */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        onBackPress={handleBack}
        title={tr("Notification") || "Notification"}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: bgColor,
        }}
      />

      {/* Subheader: Recent count badge & Clear All button */}
      <View style={[styles.subHeader, { borderBottomColor: borderColor }]}>
        <View style={styles.recentWrap}>
          <Text style={[styles.recentTitle, { color: textColor }]}>
            {tr("Recent") || "Recent"}
          </Text>
          {notifications.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {unreadCount > 0 ? unreadCount : notifications.length}
              </Text>
            </View>
          ) : null}
        </View>

        {notifications.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={deleteNotifies}
            style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>
              {tr("Clear All") || "Clear All"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main List */}
      <ScrollView
        style={[styles.container, { backgroundColor: bgColor }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.loading}
            onRefresh={init}
            colors={["#F67922"]}
            tintColor="#F67922"
          />
        }>
        {state.loading && notifications.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#F67922" />
            <Text style={[styles.loaderText, { color: subTextColor }]}>
              {tr("Yükleniyor") || "Loading"}...
            </Text>
          </View>
        ) : null}

        {notifications.length === 0 && !state.loading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <NotificationBingIcon
                width={36}
                height={36}
                stroke="#F67922"
              />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {tr("Hiç bildirim yok") || "No notifications yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
              {tr("Yeni bildirimleriniz burada görüntülenecektir.") ||
                "Your latest updates and alerts will appear here."}
            </Text>
          </View>
        ) : null}

        {notifications.map((item, index) => {
          const isUnread =
            !item.read &&
            item.read !== true &&
            item.okundu !== 1 &&
            item.okundu !== "1";

          return (
            <TouchableOpacity
              key={item.id ? `notif-${item.id}` : `notif-${index}`}
              activeOpacity={0.7}
              onPress={() => handleItemPress(item, index)}
              style={[
                styles.itemRow,
                {
                  backgroundColor: itemBg,
                  borderBottomColor: borderColor,
                },
              ]}>
              {/* Icon Container (Figma: 48x48 rounded 14px) */}
              <View
                style={[
                  styles.iconWrap,
                  isUnread
                    ? styles.iconWrapUnread
                    : [
                        styles.iconWrapRead,
                        { backgroundColor: isDark ? "#1F2937" : "#F8FAFC" },
                      ],
                ]}>
                <NotificationBingIcon
                  width={24}
                  height={24}
                  stroke={isUnread ? "#F67922" : isDark ? "#9CA3AF" : "#64748B"}
                />
              </View>

              {/* Text Content */}
              <View style={styles.itemContent}>
                <View style={styles.itemTopRow}>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: textColor },
                      isUnread && styles.itemTitleUnread,
                    ]}
                    numberOfLines={1}>
                    {item.baslik || tr("Bildirim") || "Notification"}
                  </Text>
                  {isUnread ? <View style={styles.unreadDot} /> : null}
                </View>

                {item.mesaj ? (
                  <Text
                    style={[styles.itemBody, { color: subTextColor }]}
                    numberOfLines={2}>
                    {item.mesaj}
                  </Text>
                ) : null}

                <Text style={[styles.itemTime, { color: subTextColor }]}>
                  {formatRelativeTime(item.tarih)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  subHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  recentWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#252C34",
    marginRight: 8,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F67922",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F67922",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconWrapUnread: {
    backgroundColor: "rgba(246, 121, 34, 0.12)",
  },
  iconWrapRead: {
    backgroundColor: "#F8FAFC",
  },
  itemContent: {
    flex: 1,
    justifyContent: "center",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#252C34",
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F67922",
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 4,
  },
  itemTime: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
  },
  loaderWrap: {
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(246, 121, 34, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#252C34",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
