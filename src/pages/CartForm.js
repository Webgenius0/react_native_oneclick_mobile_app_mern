import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Linking,
  Keyboard,
} from "react-native";
import { useContext, useEffect, useState } from "react";
import DocumentPicker from "react-native-document-picker";
import GlobalStyle from "../assets/GlobalStyle";
import Colors from "../assets/Colors";
import NumberInput from "../components/NumberInput";
import Dump from "../components/Dump";
import ai from "../helpers/ai";
import { getToken, getUser } from "../helpers/auth";
import { ext, mimeType } from "../helpers/file";
import { tr } from "../translate/i18n";
import { EmContext } from "../contexts/EmContext";
import { getStoreName } from "../helpers/storeHelper";
import { useExchangeRateStore } from "../store/useExchangeRateStore";
import {
  calculateConvertedPrice,
  parsePrice,
  normalizeCurrency,
} from "../helpers/currencyHelper";

export default function({ route, navigation }) {

  const { ctx } = useContext(EmContext);
  const gs = GlobalStyle;

  useEffect(() => {
    navigation.setOptions({
      title: tr("Yeni Sipariş"),
    });
  }, []);

  const url = route.params?.url || "https://google.com";

  const { rates, inverseRates, fetchRates } = useExchangeRateStore();

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const [state, setState] = useState({
    link: url,
    img: route.params?.image || route.params?.img || "",
    size: route.params?.size || "",
    color: route.params?.color || "",
    price: route.params?.price || "",
    currency: route.params?.currency || "",
    qty: route.params?.qty || route.params?.count || 1,
    desc: route.params?.desc || "",
    showDump: false,
    loading: true,
    whatsapp_order: false,
    kur: "",
  });

  const [uploadFile, setUploadFile] = useState(null);

  const selectFile = async () => {
    // Opening Document Picker to select one file
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
        // mode: "import",
      });


      setUploadFile(res[0]);
      console.log("select file res : " + JSON.stringify(res[0]));
    } catch (err) {
      setUploadFile(null);
      console.log("catch", err);
      if (DocumentPicker.isCancel(err)) {
        alert(tr("İptal Edildi"));
      } else {
        alert("Unknown Error: " + JSON.stringify(err));
        throw err;
      }
    }
  };

  const handleQty = (value) => {
    let qty = parseInt(state.qty);
    setState({ ...state, qty: qty + value });
  };

  const fetchData = async () => {
    const response = await ai.post("cart-data", { url: state.link });
    console.log('FETCH DATA');
    console.log(response.data);

    if (response?.data?.error === false) {
      let img = response.data.img;
      // get image info
      setUploadFile({ uri: img, type: mimeType(img), name: "image." + ext(img) });
    }

    let whatsapp_order = response?.data?.whatsapp_order || false;
    setState({ ...state, loading: false, whatsapp_order: whatsapp_order, kur: response.data.kur.toString() });
  };

  const handleSubmit = async () => {

    if (state.whatsapp_order) {
      // open whatsapp
      // url encode link
      let user = await getUser();
      let url = "https://wa.me/+9647505374000?text=" + encodeURIComponent(`${user.kod}, New Order : ` + state.link);
      await Linking.openURL(url);
      return;
    }

    let postData = new FormData();
    let token = await getToken();
    console.log("token", token);

    const parsedPrice = parsePrice(state.price || route.params?.price);
    const normalizedCurr = normalizeCurrency(
      state.currency || route.params?.currency,
      state.price || route.params?.price,
    );
    const convertedPrice = calculateConvertedPrice(
      state.price || route.params?.price,
      state.currency || route.params?.currency,
      rates,
      inverseRates,
    );

    postData.append("link", state.link);
    postData.append("sayi", state.qty);
    postData.append("img", state.img);
    postData.append("size", state.size || "");
    postData.append("color", state.color || route.params?.color || "");
    postData.append("renk", state.color || route.params?.color || "");
    postData.append("acik", state.desc || "");

    const storeName = getStoreName(state.link);
    postData.append("store", storeName);
    postData.append("store_name", storeName);
    postData.append("magaza", storeName);
    postData.append("marketplace", storeName);
    postData.append("pazaryeri", storeName);
    postData.append("market", storeName);

    if (parsedPrice !== null) {
      postData.append("price", parsedPrice);
      postData.append("original_price", parsedPrice);
      postData.append("fiyat", parsedPrice);
    }
    if (normalizedCurr) {
      postData.append("currency", normalizedCurr);
      postData.append("original_currency", normalizedCurr);
      postData.append("pb", normalizedCurr);
    }
    if (convertedPrice !== null) {
      postData.append("converted_price", convertedPrice);
      postData.append("price_usd", convertedPrice);
      postData.append("fiyat_usd", convertedPrice);
      postData.append("converted_currency", "USD");
      postData.append("target_currency", "USD");
    }

    // console.log('mimeType(file.name)', mimeType(file.name));
    let ek = 1;
    if (uploadFile && ek) {
      // postData.append("file", file.uri, file.name);
      let imgData = {
        uri: uploadFile?.uri,
        type: uploadFile?.type, // or photo.type
        name: uploadFile?.name,
      };

      console.log("imgData", imgData);
      postData.append("file", imgData);
    }
    postData.append("token", token);

    console.log("postData", postData);

    const response = await ai.post("new-order", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.error === false) {
      console.log("Error false", response.data);
      const orderId = response.data.order_id || (response.data.order_ids && response.data.order_ids[0]);
      const orderIds = response.data.order_ids || (orderId ? [orderId] : []);
      const totalUsd = response.data.total_usd;

      if (totalUsd !== undefined && orderId) {
        navigation.navigate("PaymentStart", {
          quick: true,
          tutar: totalUsd,
          siparis_ids: orderIds,
          siparis_id: orderId,
        });
      } else {
        alert(tr("Sipariş Alındı"));
        setTimeout(function() {
          let d = +new Date();
          navigation.navigate("Orders", { refetch: d });
        }, 1000);
      }
    } else {
      alert(tr("Hata Oluştu"));
      console.log("Hata Oluştu", response.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const styles = StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
    container: {
      flex: 1,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: 10,
    },
    row: {
      flexDirection: "row",
      paddingHorizontal: 10,
    },
    col6: {
      width: "50%",
    },

    label: {
      fontSize: 14,
      fontWeight: "400",
      color: "#666",
      width: "100%",
    },
    input: {
      fontSize: 14,
      color: "#333",
      width: "100%",
      backgroundColor: "#EEEEEE",
      borderRadius: 5,
      padding: 10,
      minHeight: 40,
      textAlign: "left",
    },
    textarea: {
      fontSize: 14,
      color: "#333",
      width: "100%",
      backgroundColor: "#EEEEEE",
      borderRadius: 5,
      padding: 10,
      minHeight: 80,
      textAlign: "left",
      justifyContent: "flex-start",
      alignItems: "flex-start",
    },
    descCounter: {
      fontSize: 12,
      color: Colors.color,
      textAlign: "right",
      width: "100%",
    },
    uploadArea: {
      width: "100%",
      height: "100%",
      flex: 1,
      backgroundColor: "#FFF",
      borderRadius: 5,
      padding: 10,
      minHeight: 50,
      textAlign: "center",

      borderWidth: 1,
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
    },
    uploadText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
    },

    button: {
      borderRadius: 10,
      backgroundColor: Colors.btnColor,
      padding: 15,
    },
    buttonText: {
      color: Colors.btnTextColor,
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 16,
    },

    cancel: {
      color: Colors.renkliTextColor,
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 14,
    },

    qtyView: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#EEEEEE",
      borderRadius: 5,
      padding: 0,
      textAlign: "left",
    },
    qtyBtn: {
      width: 40,
      // backgroundColor: "#FAA",
      borderRadius: 5,
      padding: 10,
      textAlign: "center",
      justifyContent: "center",
      alignItems: "center",
    },
    qtyBtnText: {
      fontSize: 20,
      color: "#333",
      textAlign: "center",
    },
    qtyInput: {
      fontSize: 14,
      color: "#333",
      width: 50,
      // backgroundColor: "#FFF",
      borderRadius: 5,
      padding: 10,
      minHeight: 40,
      textAlign: "center",
    },
    textStyle: {
      backgroundColor: "#fff",
      fontSize: 15,
      marginTop: 16,
      marginLeft: 35,
      marginRight: 35,
      textAlign: "center",
    },
  });


  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>
        <View style={[styles.row]}>
          <Text style={styles.label}>{tr("Link")}</Text>
        </View>
        <View style={[styles.row, gs.mb10]}>
          <TextInput style={styles.input}
                     value={state.link}
                     onChangeText={text => setState({ ...state, link: text })}
          />
        </View>
        <View style={[gs.flexRow, gs.mb10]}>
          <View style={[gs.col6, gs.p10, gs.spaceBetween]}>
            <View style={gs.mb10}>
              <Text style={styles.label}>Size</Text>
              <TextInput style={styles.input}
                         value={state.size}
                         onChangeText={text => setState({ ...state, size: text })}
              />
            </View>
            <View>
              <Text style={styles.label}>{tr("Miktar")}</Text>
              <View style={styles.qtyView}>
                <TouchableOpacity style={styles.qtyBtn}
                                  onPress={() => handleQty(-1)}>
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>

                <NumberInput style={styles.qtyInput}
                             name="qty"
                             state={state}
                             value={state.qty}
                             setState={setState}
                />
                <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQty(1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>

          <View style={[gs.col6, gs.flexColumn, gs.p10, { minHeight: 160 }]}>
            <Text style={styles.label}>{tr("Resim")}</Text>

            {
              /*
              uploadFile ? (

                <Text style={styles.textStyle}>
                  File Name: {uploadFile ? uploadFile.fileCopyUri : ""}
                </Text>

              ) : null*/
            }
            <TouchableOpacity onPress={async () => selectFile()} style={styles.uploadArea}>
              <View>
                {
                  uploadFile ? <Image source={{ uri: uploadFile.uri }}
                                      style={{
                                        width: 100,
                                        height: 100,
                                        resizeMode: "contain",
                                      }} /> :
                    <Text style={styles.uploadText}>{tr("Yükle")}</Text>
                }
              </View>
            </TouchableOpacity>
          </View>

        </View>


        {
          state.showDump && uploadFile ? (
            <View style={[gs.flexRow, gs.mb10]}>
              <Text>{JSON.stringify(uploadFile, null, 2)}</Text>
            </View>
          ) : null
        }

        <View style={[styles.row]}>
          <Text style={styles.label}>{tr("Açıklama")}</Text>
        </View>
        <View style={[gs.mb10, gs.flexColumn, gs.w100, gs.pr10, gs.pb10, gs.pl10]}>

          <TextInput style={styles.textarea}
                     multiline={true}
                     textAlignVertical="top"

                     value={state.desc}
                     maxLength={500}
                     returnKeyType="done"
                     onKeyPress={(e) => {
                       if (e.nativeEvent.key === "Enter") {
                         Keyboard.dismiss();
                       }
                     }}
                     onChangeText={text => {
                       setState({ ...state, desc: text });
                     }}
          />
          <View style={{ width: "100%", flexDirection: "row", paddingHorizontal: 10, paddingVertical: 10 }}>
            <View style={{flex: 1, flexDirection: "row",}}>
              <Text style={{marginEnd: 15, color: ctx.color}}>{tr("Kur")}</Text>
              <Text style={{fontWeight: 'bold', color: ctx.color}}>{state.kur+" ₺"}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.descCounter}>{state.desc.length}/500</Text>
            </View>
          </View>
        </View>


        <View style={[gs.flex1, gs.w100, gs.justifyStart, gs.p10]}>
          <TouchableOpacity style={styles.button} onPress={() => handleSubmit()}>
            <Text style={styles.buttonText}>{tr("Sipariş Ver")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={gs.mt30} onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>{tr("İptal")}</Text>
          </TouchableOpacity>
        </View>


      </View>
    </SafeAreaView>
  );
}
