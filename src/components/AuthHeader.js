import React, { useContext, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import ProfileIcon from "../assets/svg/profile1.svg";
import NotificationButton from "./NotificationButton";
import { EmContext } from "../contexts/EmContext";
import { fetchAllNotifications } from "../helpers/notificationV2";
import { IS_DEV } from "../helpers/common";

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
  }, []);

  let logoWidth = width > 500 ? 300 : width - 150;
  let logoHeight = logoWidth / logoRatio;

  if (props?.logoWidth) {
    logoWidth = props.logoWidth;
    logoHeight = props.logoHeight;
  }

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
            size={26}
          />
        </View>
      </View>
    );
  }

  // Standard Header Variant
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: ctx.isLight ? "#FFF" : "#000",
          borderBottomColor: ctx.isLight ? "#CCC" : "#333",
          maxHeight: logoChanged ? 140 : 100,
        },
      ]}>
      <View style={styles.col1}>
        {route?.name !== "Profile" && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Profile")}
            style={styles.profileAvatarBtn}>
            <Image
              source={require("../assets/img/account/default_avatar.png")}
              style={styles.profileAvatarImg}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.col2}>
        {logoImage && (
          <Image
            style={{ width: logoWidth, height: logoHeight }}
            source={logoImage}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.col3}>
        {rightBtn}
        {route?.name !== "Notifications" && (
          <NotificationButton navigation={navigation} ctx={ctx} />
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

  // Standard Header
  header: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  col1: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  col2: {
    flex: 6,
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  col3: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-start",
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
});
