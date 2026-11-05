import {
  Text,
  View,
  StyleSheet,
  Image,
  TouchableHighlight,
  Dimensions,
  TouchableOpacity,
  TextInput, SafeAreaView, ScrollView,
} from "react-native";
import { useContext, useEffect, useState } from "react";
import ai from "../helpers/ai";
import FastImage from "react-native-fast-image";
import { tr } from "../translate/i18n";
import Colors from "../assets/Colors";
import NoImageIcon from "../assets/svg/no-image.svg";
import GlobalStyle from "../assets/GlobalStyle";
import { EmContext } from "../contexts/EmContext";
import SearchRow from "../components/SearchRow";

export default function({ props, route, navigation }) {

  const { ctx, setCtx } = useContext(EmContext);
  const [state, setState] = useState({
    data: [],
    loading: false,
    ulkeID: route.params?.ulkeID || 0,
  });
  const { width, height } = Dimensions.get("window");
  const minImageWidth = (width / 2) - 30;

  const headerRight = () => (
    <TouchableOpacity onPress={() => navigation.navigate("WebsiteSuggest")}>
      <Text style={{ color: Colors.primary }}>
        {tr('Suggest Website') || 'Suggest Website'}
      </Text>
    </TouchableOpacity>
  );
  const fetchData = async () => {
    setState({ ...state, loading: true });
    try {
      //const response = await ai.get("category-detail?id=" + route.params.id);
      const response = await ai.post("category-detail", {
        id: route.params.id,
        ulkeID: state.ulkeID,
      });

      if (response.data.error === false) {
        // console.log("cevap", response.data.ss);
        setState({
          data: response.data.ss,
          loading: false,
        });
      }
    } catch (error) {
      console.error(error);
      setState({ ...state, loading: false });
    }
  };

  useEffect(() => {

    navigation.setOptions({
      title: route.params?.ad,
      headerRight: headerRight,
    });

    fetchData();
  }, []);



  const [filter, setFilter] = useState("");


  let q = filter.toLowerCase();
  const filteredData = state.data.length > 0 ? state.data.filter((s) => {
      // console.log("s", s.ad);
      let ad = typeof s.ad === "string" ? s.ad : s.ad.toString();
      ad = ad.toLowerCase();
      return ad.includes(q);
    },
  ) : [];

  const CustomImage = ({ image }) => {

    // console.log("image wh", minImageWidth, 60);
    return (
      <FastImage
        style={{ width: minImageWidth, height: 60, backgroundColor: '#FFF' }}
        source={{
          uri: image,
          priority: FastImage.priority.low,
        }}
        resizeMode={FastImage.resizeMode.contain}
      />
    );

    /*
    return (
      <Image
        style={{  width: minImageWidth, height: 60 }}
        resizeMode="contain"
        onError={(e) => console.log(e)}
        source={{
          uri: image,
        }}
      />
    );*/
  };

  const NoImage = () => (
    <View style={{ width: minImageWidth, height: 60, justifyContent: "center", alignItems: "center" }}>
      <NoImageIcon width={30} height={30} fill={Colors.primary} />
    </View>
  );


  const styles = StyleSheet.create({
    safeArea:{
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
    container: {
      flex: 2,
      padding: 10,
      backgroundColor: ctx.bgColor,
    },
    searchInput: {
      height: 40,
      borderColor: "#DDD",
      backgroundColor: ctx.bgColor,
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
    },
    list: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    category: {
      flexDirection: "column", width: "50%",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 0,
      paddingVertical: 3,
    },
    categoryInner: {
      padding: 1,
      backgroundColor: ctx.bgColor,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 5,
      width: "100%",


    },
    text: {
      fontSize: 14,
      textAlign: "center",
      color: ctx.color,
    },
  });

  const handleNavigate = (item) => {

    let targetPage = item.link.indexOf('1clicktoshop.com') > -1 ? "WebviewLite" : "Webview";  

    if(__DEV__){
     //  targetPage = "WebviewLite";
    }

    navigation.navigate(targetPage, {
      id: item.id,
      ad: item.ad,
      url: item.link,
    });
  };

  return (
    <SafeAreaView style={GlobalStyle.safeArea}>
      <ScrollView>
        <View style={styles.container}>
          {/*<View>
            <TextInput placeholder={tr("Ara")}
                       style={styles.searchInput}
                       placeholderTextColor={ctx.color}
            />
          </View>*/}
          <SearchRow filter={filter} setFilter={setFilter} />
          <View style={styles.list}>
            {
              filteredData.map((s) => {

                if (s.img.length === 0) return null;

                return (
                  <View key={s.id} style={styles.category}>
                    <TouchableOpacity onPress={() => handleNavigate(s)}>
                      <View style={styles.categoryInner}>
                        <CustomImage image={s.img} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })
            }
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

