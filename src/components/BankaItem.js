import { Image, View, StyleSheet, Text } from "react-native";
import CopyItem from "./CopyItem";
import Colors from "../assets/Colors";
import { EmContext } from "../contexts/EmContext";
import { Fragment, useContext } from "react";
import FastImage from "react-native-fast-image";


export default function BankaItem({ item }) {
  const ctx = useContext(EmContext);
  const styles = StyleSheet.create({

    paymentItem: {
      paddingTop: 10,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderColor: "#EEE",
      // backgroundColor: "#FA0",
      // borderRadius: 10,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      // justifyContent  : "space-between",
      flexDirection: "column",
    },
    paymentItemText: {
      color: ctx.color,
      fontSize: 16,
    },

    img: {
      width: 220,
      height: 125,
      // borderWidth: 1,
      // borderColor: "#EEE",
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    paymentMultiLine: {
      flexDirection: "row",
      width: '100%',
      justifyContent: "center",
    },

    imgContainer: {
      backgroundColor: "#FFF",
      paddingVertical: 0,
      paddingHorizontal: 0,
      marginBottom: 10,
      // borderRadius: 10,
    }
  });

  let lines = item.acik.split("\n");

  let copyList = [];
  for (let i = 0; i < lines.length; i++) {
    let icerik = [];
    if (lines[i].indexOf(":") > -1) {
      let parts = lines[i].split(":");
      icerik.push(<View style={styles.paymentMultiLine}>
        <Text style={styles.paymentItemText}>{parts[0]}:</Text>
        <CopyItem style={styles.paymentItemText}>{parts[1]}</CopyItem>
      </View>);
    } else {
      icerik.push(<CopyItem style={styles.paymentItemText}>{lines[i]}</CopyItem>);
    }

    copyList.push(<View key={i}  style={styles.paymentRow}>{icerik}</View>);
  }


  return (

    <View style={styles.paymentItem}>
      <View
        style={styles.imgContainer}>
        {
          item.img_tr && (
            <FastImage
              style={styles.img}
              resizeMode="contain"
              source={{
                uri: item.img_tr,
                // cache: FastImage.cacheControl.immutable,
              }}
            />)
        }
      </View>
      {copyList}
    </View>
  );
}
