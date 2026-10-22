import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
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
import { storageGet, storageSet } from "../helpers/storage";
import {
  fetchAllNotifications,
  NOTIFICATION_COUNT_KEY,
  NOTIFICATION_KEY,
  setLocalNotifications,
} from "../helpers/notificationV2";
import AppHeader from "../components/common/AppHeader";
import NotificationBingIcon from "../assets/svg/notification_bing.svg";

const FIGMA_SAMPLE_NOTIFICATIONS = [
  {
    id: "figma-sample-1",
    baslik: "Order Confirmed",
    mesaj: "Your order #1CLK-582941 has been confirmed successfully.",
    timeText: "10 min ago",
    read: false,
    okundu: 0,
  },
  {
    id: "figma-sample-2",
    baslik: "Order Processing",
    mesaj: "Your order is being prepared. We'll update you when it's shipped.",
    timeText: "2 hours ago",
    read: false,
    okundu: 0,
  },
  {
    id: "figma-sample-3",
    baslik: "Order Shipped",
    mesaj: "Your order #1CLK-582941 is on the way. Track your delivery for the latest updates.",
    timeText: "3 days ago",
    read: true,
    okundu: 1,
  },
];

export default function Notifications({ route, navigation }) {
  const { ctx, setCtx } = useContext(EmContext);
  const [loading, setLoading] = useState(false);
  const [clearedSamples, setClearedSamples] = useState(false);

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

  const init = useCallback(async () => {
    setLoading(true);
    try {
      await fetchAllNotifications(ctx, setCtx, true);
    } catch (err) {
      console.log("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [ctx, setCtx]);

  useEffect(() => {
    init();
  }, []);

  const rawNotifications = ctx.notifications || [];
  const displayNotifications = useMemo(() => {
    if (rawNotifications.length > 0) {
      return rawNotifications;
    }
    return clearedSamples ? [] : FIGMA_SAMPLE_NOTIFICATIONS;
  }, [rawNotifications, clearedSamples]);

  const unreadCount = useMemo(() => {
    return displayNotifications.filter(
      n => !n.read && n.read !== true && n.okundu !== 1 && n.okundu !== "1"
    ).length;
  }, [displayNotifications]);

  const deleteNotifies = () => {
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
            setClearedSamples(true);
            try {
              if (rawNotifications.length > 0) {
                await ai.post("notifications", { islem: "delete" });
              }
              await storageSet(NOTIFICATION_KEY, { notifications: [], lastId: 0 });
              if (setCtx) {
                setCtx(prev => ({
                  ...prev,
                  [NOTIFICATION_COUNT_KEY]: 0,
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

  const handleItemPress = useCallback(
    async (item, index) => {
      try {
        const list = [...displayNotifications];
        if (list[index]) {
          list[index] = { ...list[index], read: true, okundu: 1 };
          if (rawNotifications.length > 0 && setCtx) {
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
    },
    [displayNotifications, rawNotifications, setCtx, navigation]
  );

  const formatRelativeTime = useCallback(item => {
    if (item.timeText) return item.timeText;
    if (!item.tarih) return "";
    const m = moment(item.tarih);
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
  }, []);

  const isDark = ctx.isDark;
  const bgColor = isDark ? "#111827" : "#FFFFFF";
  const textColor = isDark ? "#F9FAFB" : "#1E293B";
  const subTextColor = isDark ? "#9CA3AF" : "#64748B";
  const borderColor = isDark ? "#1F2937" : "#F1F5F9";
  const timeColor = isDark ? "#6B7280" : "#94A3B8";

  const renderItem = useCallback(
    ({ item, index }) => {
      const isUnread =
        !item.read &&
        item.read !== true &&
        item.okundu !== 1 &&
        item.okundu !== "1";

      const timeStr = formatRelativeTime(item);

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleItemPress(item, index)}
          style={[
            styles.itemRow,
            {
              backgroundColor: bgColor,
              borderBottomColor: borderColor,
            },
          ]}>
          {/* Icon Container (Figma: 48x48 rounded 12px) */}
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
              width={22}
              height={22}
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
                {item.baslik || tr("Notification") || "Notification"}
              </Text>
              {isUnread ? <View style={styles.unreadDot} /> : null}
            </View>

            {item.mesaj ? (
              <Text
                style={[styles.itemBody, { color: subTextColor }]}
                numberOfLines={3}>
                {item.mesaj}
              </Text>
            ) : null}

            {timeStr ? (
              <Text style={[styles.itemTime, { color: timeColor }]}>
                {timeStr}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [bgColor, borderColor, isDark, textColor, subTextColor, timeColor, formatRelativeTime, handleItemPress]
  );

  const keyExtractor = useCallback(
    (item, index) => (item.id ? String(item.id) : String(index)),
    []
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={bgColor}
      />

      {/* Header matching Figma exactly (Title: "Notification") */}
      <AppHeader
        navigation={navigation}
        showBack={true}
        onBackPress={handleBack}
        title={tr("Notification") || "Notification"}
        style={{
          backgroundColor: bgColor,
        }}
      />

      {/* Subheader: Recent count badge & Clear All button matching Figma */}
      <View style={styles.subHeader}>
        <View style={styles.recentWrap}>
          <Text style={[styles.recentTitle, { color: textColor }]}>
            {tr("Recent") || "Recent"}
          </Text>
          {displayNotifications.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {unreadCount > 0 ? unreadCount : displayNotifications.length}
              </Text>
            </View>
          ) : null}
        </View>

        {displayNotifications.length > 0 ? (
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

      {/* High-Performance FlatList */}
      <FlatList
        data={displayNotifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={[styles.container, { backgroundColor: bgColor }]}
        contentContainerStyle={
          displayNotifications.length === 0 ? styles.emptyScrollContent : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={init}
            colors={["#F67922"]}
            tintColor="#F67922"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <NotificationBingIcon
                  width={34}
                  height={34}
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
          ) : null
        }
      />
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
  listContent: {
    paddingBottom: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  recentWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
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
    paddingVertical: 4,
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconWrapUnread: {
    backgroundColor: "#FFF7ED",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
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
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    marginTop: 4,
  },
  itemTime: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
