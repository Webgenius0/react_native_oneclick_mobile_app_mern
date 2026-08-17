import { Text, View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from "react-native";
import { useCallback, useContext, useEffect, useState } from "react";
import GlobalStyle from "../assets/GlobalStyle";
import ai from "../helpers/ai";
import { formatDate, trDate } from "../helpers/common";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { tr } from "../translate/i18n";
import AuthHeader from "../components/AuthHeader";
import Colors from "../assets/Colors";
import { EmContext } from "../contexts/EmContext";
import { paymentTypes } from "../../config";

export default function({ route, navigation }) {

  const {ctx} = useContext(EmContext);

  const isFocused = useIsFocused();


  /*
    const turs = [
      {id: 1, ad: 'Nakit Tahsilat'},
      {id: 2, ad: 'Nakit Ödeme'},
      {id: 3, ad: 'Borç Dekontu'},
      {id: 4, ad: 'Alacak Dekontu'},
    ];*/
  const turs = [
    { id: 1, ad: tr("Tahsilat") }, // Payment
    { id: 2, ad: tr("Borç") }, // Debt
    { id: 3, ad: tr("Borç") },
    { id: 4, ad: tr("Tahsilat") },
  ];

  const d = new Date();


  const [state, setState] = useState({
    data: [],
    bakiye: "0.00",
    borc: "0.00",
    loading: true,
    bakiyesizOdeme: true,
  });

  const Item = (s) => {
    const turID = parseInt(s.turID);
    const ikon = turID === 3 || turID === 4 ? "-" : "+";
    const renk = ikon === "+" ? "green" : "red";
    return (
      <View style={styles.item} key={s.id}>
        <View style={styles.itemColumn}><Text style={styles.text}>{formatDate(s.tarih)}</Text></View>
        <View style={styles.itemColumn}><Text style={styles.text}>{s.tur}</Text></View>
        <View style={[styles.itemColumn]}><Text style={[styles.tutar, { color: renk }]}>{ikon}{s.tutar}</Text></View>
      </View>
    );
  };

  const fetchData = async () => {
    console.log("Balance fetchData", +new Date() +' '+ d.toLocaleTimeString());
    setState({ data: [], loading: true });
    const c = await ai.get("balance");
    let ns;
    if (c.data.error === false) {
      ns = { ...state, data: c.data.ss, bakiye: c.data.s.bakiye, borc: c.data.s.borc };
    } else {
      ns = { ...state, data: [], bakiye: 0, borc: 0 };
      alert(tr("Hata Oluştu"));
    }

    ns.loading = false;
    setState(ns);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );


  const styles = StyleSheet.create({
    safeArea:{
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
    odemeButton: {
      backgroundColor: Colors.btnColor,
      padding: 15,
      borderRadius: 5,
      margin: 15,
    },
    odemeButtonText: {
      color: ctx.bgColor,
      textAlign: "center",
      fontWeight: "bold",
    },

    empty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      height: 300,
    },
    emptyText: {
      color: "#666",
      fontSize: 16,
    },
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      alignItems: "center",
      justifyContent: "flex-start",

    },
    loading: {
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      color: "#666",
      fontSize: 20,
    },
    ust: {
      backgroundColor: ctx.isLight ? "#EEE" : "#666",
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      //  borderBottomWidth: 1,
      borderBottomColor: ctx.isLight  ? "#CCC" : "#333",
      paddingVertical: 40,
      borderBottomRightRadius: 30,
      borderBottomLeftRadius: 30,

    },
    text: {
      color: ctx.color,
      fontSize: 14,
    },
    balance: {
      fontSize: 30,
      fontWeight: "bold",
      color: "#333",
    },
    filter: {
      backgroundColor: ctx.bgColor,
      width: "100%",
      minHeight: 50,
      justifyContent: "space-between",
      alignItems: "center",
      flexDirection: "row",
      paddingHorizontal: 10,
      borderBottomColor: "#CCC",
      borderBottomWidth: 1,
    },
    filterText: {
      color: ctx.color,
      fontWeight: "bold",
      fontSize: 20,
    },
    content: {
      width: "100%",
      backgroundColor: ctx.bgColor,
    },
    item: {
      backgroundColor: ctx.bgColor,
      width: "100%",
      paddingVertical: 15,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      textAlign: "left",
      padding: 10,
      borderBottomColor: "#CCC",
      borderBottomWidth: 1,
    },
    itemColumn: {
      width: "33%",
      textAlign: "left",
    },

    tutar: {
      textAlign: "right",
      fontWeight: "bold",
      paddingHorizontal: 7,
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AuthHeader route={route} navigation={navigation} />
        {
          state.loading ? (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>{tr("Yükleniyor")}...</Text>
            </View>
          ) : (
            <>
              <View style={styles.ust}>
                <Text style={styles.text}>{tr("Bakiye")}</Text>
                <Text style={[styles.balance, GlobalStyle.mb15]}>${state.bakiye}</Text>
                <Text style={styles.text}>{tr("Toplam Satınalma")}:
                  ${state.borc > 0 ? state.borc : "0.00"}</Text>{/*Total Purchase*/}
              </View>
              <View style={styles.filter}>
                <Text style={styles.filterText}>{tr("Hareketler")}</Text>{/*Transactions*/}
                <Text style={{ color: "#666" }}>{/*Filter*/}</Text>
              </View>
              <ScrollView style={styles.content}>
                {
                  state.data.length === 0 && (
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>{tr("Hesap Hareketi Bulunamadı")}</Text>{/*No Transaction*/}
                    </View>
                  )
                }
                {
                  state.data.map((d) => Item(d))
                }
              </ScrollView>
              {
                (parseFloat(state.bakiye) < 0 || state.bakiyesizOdeme) && paymentTypes.length > 0 && (
                  <View>
                    <TouchableOpacity style={styles.odemeButton}
                                      onPress={() => navigation.navigate("PaymentStart")}>
                      <Text style={styles.odemeButtonText}>{tr("Ödeme Yap")}</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
            </>
          )
        }
      </View>
    </SafeAreaView>

  );
}



const generateData = () => {
  let data = [];
  for (let i = 0; i < 100; i++) {
    // random turID between 1,4

    let turID = Math.floor(Math.random() * 4) + 1;
    let randomDate = new Date(
      new Date().setDate(d.getDate() - Math.floor(Math.random() * 100)),
    );

    data.push({
      id: i,
      turID: turID,
      tur: turs.find((t) => t.id === turID).ad,
      tutar: Math.floor(Math.random() * 1000) + 1,
      tarih: randomDate.getDay() + "." + randomDate.getMonth() + "." + randomDate.getFullYear(),
    });
  }

  return data;
};
