import React, { useContext, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import ProfileIcon from "../assets/svg/profile1.svg";
import NotifyIcon from "../assets/svg/notification.svg";
import NotificationButton from "./NotificationButton";
import { EmContext } from "../contexts/EmContext";
import DeviceInfo from "react-native-device-info";
import { fetchAllNotifications } from "../helpers/notificationV2";
import { IS_DEV } from "../helpers/common";


const { width, height } = Dimensions.get("window");
const logoRatio = 315 / 68;

export default function(props) {

  const { route, navigation } = props;
  const rightBtn = props?.rightBtn || null;
  const defaultLogo = "../assets/img/horizontal-logo.jpg";
  // We can't use dynamic requires in React Native, so we need to handle each case separately
  let logoImage = null;
  let logoChanged = null;
  if (props?.logoImage) {
    logoImage = props.logoImage;
    logoChanged = true;
  } else {
    logoImage = require(defaultLogo);
    logoChanged = false;
  }
  console.log('Using logo image:', logoImage ? 'Logo loaded' : 'No logo');
  const { ctx, setCtx } = useContext(EmContext);

  const notifInerval = true;
  let intervalId;
  let notifTimeout = IS_DEV ? 1000 * 10*60 : 1000 * 60 * 3;


  useEffect(() => {


    if (notifInerval) {
      console.log("header mounted" + (+new Date()));

      intervalId = setInterval(async () => {
        await fetchAllNotifications(ctx, setCtx);
      }, notifTimeout);

      return () => {
        clearInterval(intervalId);
      };
    }

  }, []);

  /*
  useEffect(() => {
    console.log("header mounted" + (+new Date()));
    // fetchAllNotifications(ctx, setCtx);
  }, []);
  */




  let logoWidth = (width > 500 ? 300 : width - 150);
  let logoHeight = logoWidth / logoRatio;

  if(props?.logoWidth){
    logoWidth = props.logoWidth;
    logoHeight = props.logoHeight;
  }

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 15,
      paddingVertical: 5,
      backgroundColor: ctx.isLight ? "#FFF" : "#000",
      flexDirection: "row",
      borderBottomColor: ctx.isLight ? "#CCC" : "#333",
      borderBottomWidth: 1,
      paddingBottom: 10,
      maxHeight: logoChanged ? 140 : 100,
    },
    logo: {
      width: logoWidth,
      height: logoHeight,
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
      // paddingVertical: 15,
    },
    text: {
      color: ctx.isDark ? "#FFF" : "#000",
      fontSize: 23,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.header}>

      <View style={styles.col1}>
        {
          route.name !== "Profile" && (
            <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
              <ProfileIcon fill={ctx.color} height={35} width={35} />
            </TouchableOpacity>
          )
        }
      </View>
      <View style={styles.col2}>
        { logoImage && (  
          <Image
            style={styles.logo}
            source={logoImage}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.col3}>
        {rightBtn}
        {
          route.name !== "Notifications" && <NotificationButton navigation={navigation} ctx={ctx} />
        }
      </View>
    </View>
  );


};



