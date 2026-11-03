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
import { useContext, useEffect, useRef, useState } from "react";
import DocumentPicker from "react-native-document-picker";
import GlobalStyle from "../assets/GlobalStyle";
import Colors from "../assets/Colors";
import NumberInput from "../components/NumberInput";
import Dump from "../components/Dump";
import ai from "../helpers/ai";
import { getToken, getUser } from "../helpers/auth";
import { ext, mimeType } from "../helpers/file";
import { tr } from "../translate/i18n";
import { delay } from "../helpers/common";
import { DATA_URL } from "../../config";
import { EmContext } from "../contexts/EmContext";
import { useOrderStore } from "../store/useOrderStore";

export default function({ route, navigation }) {

  const gs = GlobalStyle;
  const {ctx} = useContext(EmContext);

  useEffect(() => {
    navigation.setOptions({
      title: (tr("Order Form") || "Order Form") + " - " + route.params.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState({
    id: route.params.id,
    link: "",
    img: "",
    size: "",
    qty: 1,
    desc: "",
    loading: false,
    status_loading: false,
    refetch: null,
    showDump: false,
  });

  const [uploadFile, setUploadFile] = useState(null);

  const descRef = useRef(null);

  const selectFile = async () => {
    // Opening Document Picker to select one file
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });


      setUploadFile(res[0]);
      console.log("select file res : " + JSON.stringify(res[0]));
    } catch (err) {
      setUploadFile(null);
      console.log("catch", err);
      if (DocumentPicker.isCancel(err)) {
        alert(tr("Cancelled") || "Cancelled");
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


  const handleSubmit = async () => {

    if (state.whatsapp_order) {
      // open whatsapp
      // url encode link
      let user = await getUser();
      let url = "https://wa.me/+90?text=" + encodeURIComponent(`${user.kod}, New Order : ` + state.link);
      await Linking.openURL(url);
      return;
    }

    let postData = new FormData();
    let token = await getToken();
    console.log("token", token);

    console.log("\n\n");
    console.log("state.id", state.id);
    console.log("\n\n");

    postData.append("id", state.id);
    postData.append("link", state.link);
    postData.append("img", state.img);
    postData.append("size", state.size);
    postData.append("sayi", state.qty);
    postData.append("acik", state.desc);

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
      if(state.img !== uploadFile.uri) {
        postData.append("file", imgData);
        console.log("\n\n");
        console.log(state.img , uploadFile.uri);
        console.log("\n\n");
      }else{
        console.log("img aynı");
      }
    }
    postData.append("token", token);

    console.log("postData", postData);

    const response = await ai.post("order-update", postData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.error === false) {
      console.log("Error false", response.data);
      useOrderStore.getState().invalidateOrders();
      alert(tr("Order Received") || "Order Received");
      setTimeout(function() {
        let d = +new Date();
        //if(!__DEV__){
          navigation.navigate("Orders", { refetch: d });
        //}
      }, 1000);
    } else {
      alert(tr("Error") || "Error");
      console.log("Hata Oluştu", response.data);
    }
  };

  const fetchOrder = async () => {
    console.log('fetchOrder');
    let ns;
    let response;
    try {
      response = await ai.get("order-detail", { params: { id: route.params.id } });
      if (!response?.data || response.data.error !== false) {
        throw new Error('Fallback to post');
      }
    } catch (_) {
      response = await ai.post("order-detail", { id: route.params.id });
    }
    console.log(response.data);
    if (response.data && response.data.error === false) {
      let s = response.data.s || response.data.data || (Array.isArray(response.data.ordered_items) ? response.data.ordered_items[0] : null) || response.data;
      const imgUrl = s.img || s.image || s.resim;
      ns = {
        ...state,
        id: parseInt(s.id || route.params.id, 10),
        desc: s.acik || s.name || s.desc,
        qty: s.sayi || s.quantity || s.qty || 1,
        url: s.link || s.url,
        link: s.link || s.url,
        size: s.size,
        img: imgUrl,
        loading: false,
      };

      if (imgUrl) {
        setUploadFile({ uri: imgUrl, type: mimeType(imgUrl), name: "image." + ext(imgUrl) });
      }
    } else {
      ns = { ...state, loading: false };
    }

    setState(ns);
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
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
      color: ctx.isLight ? "#666" : "#e7e7e7",
      width: "100%",
    },
    input: {
      fontSize: 14,
      color: ctx.isLight ? "#333" : "#000",
      width: "100%",
      backgroundColor: ctx.isLight ? "#EEEEEE" : "#FFF",
      borderRadius: 5,
      padding: 10,
      minHeight: 40,
      textAlign: "left",
    },
    textarea: {
      fontSize: 14,
      color: ctx.isLight ? "#333" : "#000",
      width: "100%",
      backgroundColor: ctx.isLight ? "#EEEEEE" : "#FFF",
      borderRadius: 5,
      padding: 10,
      minHeight: 100,
      textAlign: "left",
      justifyContent: "flex-start",
      alignItems: "flex-start",
    },
    descCounter: {
      fontSize: 12,
      color: "#666",
      textAlign: "right",
      width: "100%",
      padding: 7,
    },
    uploadArea: {
      width: "100%",
      height: "100%",
      flex: 1,
      backgroundColor: ctx.bgColor,
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
      color: ctx.isLight ? "#666" : "#FFF",
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
      backgroundColor: ctx.isLight ? "#EEEEEE" : "#FFF",
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
      color: ctx.isLight ? "#333" : "#000",
      textAlign: "center",
    },
    qtyInput: {
      fontSize: 14,
      color: ctx.isLight ? "#333" : "#000",
      width: 50,
      // backgroundColor: "#FFF",
      borderRadius: 5,
      padding: 10,
      minHeight: 40,
      textAlign: "center",
    },
    textStyle: {
      backgroundColor: ctx.bgColor,
      fontSize: 15,
      marginTop: 16,
      marginLeft: 35,
      marginRight: 35,
      textAlign: "center",
    },

    safeArea:{
      flex: 1,
      backgroundColor: ctx.bgColor,
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
              <Text style={styles.label}>{tr("Quantity") || "Quantity"}</Text>
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
            <Text style={styles.label}>{tr("Image") || "Image"}</Text>
            <TouchableOpacity onPress={async () => selectFile()} style={styles.uploadArea}>
              <View>
                {
                  uploadFile ? <Image source={{ uri: uploadFile.uri }}
                                      style={{
                                        width: 100,
                                        height: 100,
                                        resizeMode: "contain",
                                      }} /> :
                    <Text style={styles.uploadText}>{tr("Upload") || "Upload"}</Text>
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
          <Text style={styles.label}>{tr("Description") || "Description"}</Text>
        </View>

        <View style={[gs.mb10, gs.flexColumn, gs.w100, gs.pr10, gs.pb10, gs.pl10]}>
          <TextInput style={styles.textarea}
                     keyboardType="default"
                     multiline={false}
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
          <Text style={styles.descCounter}>{state.desc.length}/500</Text>
        </View>

        {
         state.showDump && (
            <View style={[gs.flexRow, gs.mb10]}>
              <Text>{JSON.stringify(state, null, 2)}</Text>
            </View>
          )
        }


        <View style={[gs.flex1, gs.w100, gs.justifyStart, gs.p10]}>
          <TouchableOpacity style={styles.button} onPress={() => handleSubmit()}>
            <Text style={styles.buttonText}>{tr("Place Order") || "Place Order"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={gs.mt30} onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>{tr("Cancel") || "Cancel"}</Text>
          </TouchableOpacity>
        </View>


      </View>
    </SafeAreaView>
  );
}
