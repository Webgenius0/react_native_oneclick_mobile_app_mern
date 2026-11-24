import React, { useContext, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import NotificationButton from "./NotificationButton";
import { EmContext } from "../contexts/EmContext";
import { fetchAllNotifications } from "../helpers/notificationV2";
import { IS_DEV } from "../helpers/common";
import { resolveAvatarUrl } from "../helpers/auth";
import ProfileIcon from "../assets/svg/profile1.svg";

const { width } = Dimensions.get("window");
const logoRatio = 315 / 68;

export default function AuthHeader(props) {
  const { route, navigation, variant } = props;
  const rightBtn = props?.rightBtn || null;
  const defaultLogo = "../assets/img/horizontal-logo.jpg";

  let logoImage = null;
  let logoChanged = null;
  if (props?.logoImage) {
    logoImage = props.logoImage;
    logoChanged = true;
  } else {
    logoImage = require(defaultLogo);
    logoChanged = false;
  }

  const { ctx, setCtx } = useContext(EmContext);
  const [avatarError, setAvatarError] = React.useState(false);
  const userAvatarUri = resolveAvatarUrl(ctx?.user);
  const notifInterval = true;
  const notifTimeout = IS_DEV ? 1000 * 10 * 60 : 1000 * 60 * 3;

  useEffect(() => {
    if (notifInterval) {
      const intervalId = setInterval(async () => {
        await fetchAllNotifications(ctx, setCtx);
      }, notifTimeout);

      return () => {
        clearInterval(intervalId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoMaxHeight = 36;
  const logoMaxWidth = width - 130;

  // Figma Home Header Variant
  if (variant === "home") {
    return (
      <View style={styles.homeHeader}>
        <View style={styles.homeLogoWrap}>
          <Image
            source={require("../assets/img/home/home_header_logo.png")}
            style={styles.homeLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.homeRightWrap}>
          {rightBtn}
          <NotificationButton
            navigation={navigation}
            ctx={ctx}
            color="#FFFFFF"
            size={24}
          />
        </View>
      </View>
    );
  }

  const isDark = ctx?.isDark;
  const headerBg = isDark ? "#111827" : "#FFFFFF";
  const borderColor = isDark ? "#1F2937" : "#F1F5F9";

  // Standard Header Variant (Market / Categories / Top Nav)
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: headerBg,
          borderBottomColor: borderColor,
        },
      ]}>
      {/* Col 1: Left Profile Avatar Button */}
      <View style={styles.col1}>
        {route?.name !== "Profile" ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileAvatarBtn}>
            {userAvatarUri && !avatarError ? (
              <Image
                source={{ uri: userAvatarUri }}
                onError={() => setAvatarError(true)}
                style={styles.profileAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <ProfileIcon width={22} height={22} fill="#F67922" />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderBox} />
        )}
      </View>

      {/* Col 2: Center Brand Logo */}
      <View style={styles.col2}>
        {logoImage ? (
          <Image
            style={{
              width: logoMaxWidth,
              height: logoMaxHeight,
            }}
            source={logoImage}
            resizeMode="contain"
          />
        ) : null}
      </View>

      {/* Col 3: Right Notification Button */}
      <View style={styles.col3}>
        {rightBtn}
        {route?.name !== "Notifications" ? (
          <NotificationButton
            navigation={navigation}
            ctx={ctx}
            size={22}
            color={isDark ? "#F9FAFB" : "#1E293B"}
            containerStyle={[
              styles.notifBtnCircle,
              {
                borderColor: isDark ? "#374151" : "#F1F5F9",
                backgroundColor: isDark ? "#1F2937" : "#F8FAFC",
              },
            ]}
          />
        ) : (
          <View style={styles.placeholderBox} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Home Figma Header
  homeHeader: {
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: "#F67922",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeLogoWrap: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  homeLogo: {
    width: 115,
    height: 42,
  },
  homeRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // Standard Market Header with Center-Aligned 3 Items
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  col1: {
    minWidth: 44,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  col2: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  col3: {
    minWidth: 44,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  placeholderBox: {
    width: 36,
    height: 36,
  },
  profileAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#F67922",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E8",
  },
  profileAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  notifBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
