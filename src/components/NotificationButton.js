import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import HomeBellIcon from "../assets/svg/home_bell.svg";
import cs from "../assets/Colors";

export default function NotificationButton({
  navigation,
  ctx,
  color,
  badgeBgColor,
  size = 28,
}) {
  const iconColor = color || cs.btnColor;
  const count = ctx?.notificationCount || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.container}
      onPress={() => navigation?.navigate("Notifications")}>
      <HomeBellIcon width={size} height={size} fill={iconColor} />
      {count > 0 ? (
        <View
          style={[
            styles.badge,
            badgeBgColor ? { backgroundColor: badgeBgColor } : null,
          ]}>
          <Text style={styles.badgeText}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FF3B30",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
