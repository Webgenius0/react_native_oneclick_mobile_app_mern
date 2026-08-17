import {
  Text,
  View,
  StyleSheet,
  Image,
  TouchableHighlight,
  Dimensions,
  ScrollView,
  TouchableOpacity, SafeAreaView, TextInput,
} from "react-native";
import { useContext, useEffect, useState, useMemo } from "react";
import Logo from "../components/Logo";
import ai from "../helpers/ai";
import { EmContext } from "../contexts/EmContext";
import FastImage from "react-native-fast-image";
import GlobalStyle from "../assets/GlobalStyle";
import StoryList from "../components/StoryList";
import { tr } from "../translate/i18n";
import SearchIcon from "../assets/svg/search.svg";
import SearchRow from "../components/SearchRow";
import UlkeBar from "../components/UlkeBar";
import { useStore } from 'zustand';

const { width, height } = Dimensions.get("window");
const imageWidth = parseInt((width - 100) / 2);
const imageHeight = parseInt(imageWidth * (100 / 130));
const logoMax = 175;
const logoMaxWidth = width > logoMax ? logoMax : width - 20;
import { useWebviewStore } from '../store/useWebviewStore';
import AuthHeader from '../components/AuthHeader';

export default function ({ navigation, route }) {


  const { ctx, ctxDil } = useContext(EmContext);
  const [ulkeID, setUlkeID] = useState(0);
  const [kur, setKur] = useState("");
  //const {translateApiServiceEnabled, setTranslateApiServiceEnabled} = useWebviewStore();


  const [state, setState] = useState({
    categories: [],
    stories: [],
    loading: false,
    ulkes: [],
    kur: "",
    deliveryMin: "",
    deliveryMax: "",
  });

  const [filter, setFilter] = useState("");

  /*

  let stories = [
    { id: 1, title: "Hikaye 1", img: "https://img.freepik.com/free-photo/_23-2150043120.jpg?size=240&ext=jpg" },
    { id: 2, title: "Hikaye 2", img: "https://img.freepik.com/free-photo/_52683-93821.jpg?size=240&ext=jpg" },
    { id: 3, title: "Hikaye 3", img: "https://img.freepik.com/free-photo/_23-2149996782.jpg?size=240&ext=jpg" },
    { id: 4, title: "Hikaye 1", img: "https://img.freepik.com/free-photo/_23-2150043120.jpg?size=240&ext=jpg" },
    { id: 5, title: "Hikaye 2", img: "https://img.freepik.com/free-photo/_52683-93821.jpg?size=240&ext=jpg" },
    { id: 6, title: "Hikaye 3", img: "https://img.freepik.com/free-photo/_23-2149996782.jpg?size=240&ext=jpg" },
    { id: 7, title: "Hikaye 1", img: "https://img.freepik.com/free-photo/_23-2150043120.jpg?size=240&ext=jpg" },
    { id: 8, title: "Hikaye 2", img: "https://img.freepik.com/free-photo/_52683-93821.jpg?size=240&ext=jpg" },
    { id: 9, title: "Hikaye 3", img: "https://img.freepik.com/free-photo/_23-2149996782.jpg?size=240&ext=jpg" },
  ];
   */

  const fetchData = async () => {
    setState({ ...state, loading: true });
    const c = await ai.post("/category-list", {
      ulkeID: ulkeID,
    });

    if (c.data.error === false) {
      let ctArr = [];
      c.data.ss.map((item, index) => {
        // console.log('item', item, ctxDil);

        ctArr.push({
          id: item.id,
          ad: item["ad_" + ctxDil] ? item["ad_" + ctxDil] : (
            item["ad_en"] ? item["ad_en"] : item["ad_tr"]
          ),
          img: item.img,
        });
      });

      setState({
        categories: ctArr,
        stories: c.data.stories,
        loading: false,
        ulkes: c.data.ulkes,
        kur: c.data?.kur || "",
        deliveryMin: c.data?.deliveryMin || "",
        deliveryMax: c.data?.deliveryMax || "",
      });



    }
  };

  useEffect(() => {
    fetchData();
  }, [ulkeID]);


  let q = filter.toLowerCase();

  const filteredData = state.categories.length > 0 ? state.categories.filter((s) => {
    // console.log("filtredCategory", s.ad);
    let ad = typeof s.ad === "string" ? s.ad : s.ad.toString();
    ad = ad.toLowerCase();


    return ad.includes(q);
  },
  ) : [];

  /*
  const [filteredData, setFilteredData] = useState([]);
  useEffect(() => {
    let q = filter.toLowerCase();
    setFilteredData(state.categories.filter((s) => {
      console.log("filtredCategory", s.ad);

      let ad = typeof s.ad === "string" ? s.ad : s.ad.toString();
      ad = ad.toLowerCase();
      return ad.includes(filter.toLowerCase());
    }));

  }, [filter])
  */



  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 10,
      paddingTop: 20,
      paddingBottom: 10,
      backgroundColor: ctx.bgColor,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 10,
      paddingHorizontal: 20,
    },
    categoryContainer: {
      flexWrap: "wrap",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    category: {
      width: "49%",
      marginVertical: 5,
    },
    categoryInner: {
      paddingHorizontal: 15,
      paddingTop: 15,
      paddingBottom: 10,
      backgroundColor: ctx.bgColor,
      borderWidth: 1,
      borderColor: "#DDD",
      borderRadius: 5,
    },
    text: {
      fontSize: 16,
      textAlign: "center",
      color: ctx.color,
      fontWeight: "bold",
      marginTop: 3,
      minHeight: 35,
    },


    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
  });


  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}>
        <View>
          <AuthHeader navigation={navigation} route={route} logoImage={require('../assets/img/logo.png')} logoWidth={120} logoHeight={120} />
        </View>

        <View>
          <StoryList stories={state.stories} navigation={navigation} />
        </View>

        {/*<SearchRow filter={filter} setFilter={setFilter} />*/}
        {/*<View>
          <Text style={{width: '100%', textAlign: 'center', fontWeight: 'bold', color: '#333'}}>{state.kur ?? ""}</Text>
        </View>*/}

        <UlkeBar
          state={state}
          ulkeID={ulkeID}
          setUlkeID={setUlkeID} />

        {!state.loading && <View>
          <Text style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', color: '#333' }}>Delivery from Turkey is between {state.deliveryMin} to {state.deliveryMax} days</Text>
        </View>}


        <View style={styles.categoryContainer}>
          {
            filteredData.map((s, index) => {
              // console.log('image widts', imageWidth, imageHeight);
              return (
                <View key={s.id} style={styles.category}>
                  <TouchableOpacity onPress={() => navigation.navigate("CategoryDetail", {
                    id: s.id,
                    ad: s.ad,
                    ulkeID: ulkeID,
                  })}>
                    <View style={styles.categoryInner}>
                      {
                        s.img ? (
                          <FastImage
                            style={{ width: imageWidth, height: imageHeight }}
                            resizeMode="contain"

                            /*onError={(e) => console.log(e)} */
                            source={{
                              // uri: `https://placeimg.com/${imageWidth}/${imageHeight}/any?${index}`,
                              uri: s.img,
                              cache: FastImage.cacheControl.immutable,
                            }}
                          />
                        ) : null
                      }
                      <Text style={styles.text}>{s.ad}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
