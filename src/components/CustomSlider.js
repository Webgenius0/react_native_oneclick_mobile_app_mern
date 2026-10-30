import React from "react";
import { Dimensions, View, Text } from "react-native";
import { ImageSlider } from "react-native-image-slider-banner";

export default function(props) {

  let { navigation, data, ctxDil } = props;
  if (data.length === 0) return null;

  let mapData = data.map(item => ({
    img:
      item['img_' + ctxDil] ||
      item.img_en ||
      item.image ||
      item.img ||
      item.img_tr,
    ad:
      item['ad_' + ctxDil] ||
      item.ad_en ||
      item.title ||
      item.name ||
      item.ad ||
      item.ad_tr,
    link: item.link,
  }));

  let defaultHeight = props.height || 80;
  let defaultWidth = props.width || 300;

  const {width, height} = Dimensions.get('window');
  const calculatedHeight = width / (defaultWidth/defaultHeight);
  // console.log('calculatedHeight', calculatedHeight);

  return (

<>
    <View style={{
      // backgroundColor: "blue",
      padding: 0,
      // flexDirection: "column",
      justifyContent: "flex-start",
      height: calculatedHeight+20,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",

    }}>
      <ImageSlider
        data={mapData}
        autoPlay={true}
        timer={3000}
        headerLeftComponent={false}
        headerRightComponent={false}
        headerCenterComponent={false}
        onClick={(item, index) => {
          // alert("hello" + index+' '+item.link);
          navigation.navigate("Webview", { ad: item.ad, url: item.link });
        }}
        onItemChanged={(item) => {
          // console.log("item changed", item)
        }}
        showHeader={false}
        caroselImageStyle={{
          padding: 0, margin: 0,
          resizeMode: "contain",
          maxHeight: calculatedHeight,
          // backgroundColor: "green",
        }}
        caroselImageContainerStyle={{
          // height: "auto",
          padding: 0,
          margin: 0,
          display: "flex",
          // backgroundColor: "red",

          // flex: 1,
          // justifyContent: "flex-start", alignItems: "flex-start",
        }}
        indicatorContainerStyle={{
          // height: 20,
          bottom: -20,
          // backgroundColor: "rgba(0,0,0,0.5)",
        }}
        activeIndicatorStyle={{
          backgroundColor: "#F67922",
          borderWidth: 0,
          width: 16,
          height: 6,
          borderRadius: 3,
        }}
        inActiveIndicatorStyle={{
          backgroundColor: "#DCDFE5",
          width: 6,
          height: 6,
          borderRadius: 3,
        }}
        // indicatorContainerStyle={{borderWidth: 1, borderColor: '#FFF'}}
        preview={false}
        closeIconColor="#fff"
      />
    </View>
</>

  );
}
