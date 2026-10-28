import { Text, TouchableOpacity, View, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GlobalStyle from "../assets/GlobalStyle";

import { CommonActions } from "@react-navigation/native";
import { storageDelete } from "../helpers/storage";
import { useContext } from "react";
import { EmContext } from "../contexts/EmContext";
import * as RootNavigation from "../services/RootNavigation";

import { useUserStore } from "../store/useUserStore";
import { logoutUser } from "../helpers/auth";

export default function ({ navigation }) {
  const { setCtx } = useContext(EmContext);


  const menus = [
    'Login',
    'Register',
    'Home',
    'Webview',
    'CategoryList',
    'CategoryDetail',
    'Orders',
    'Cart',
  ];


  const getParam = (t) => {
    let obj = null;
    switch (t) {
      case 'Category':
        obj = { id: 1 };
        break;
      case 'Webview':
        obj = { url: 'https://www.trendyol.com/mango/relaxed-fit-pamuklu-tisort-p-251948038', ad: "Trendyol" };
        break;
      case 'Cart':
        obj = { url: 'https://www.trendyol.com/mango/relaxed-fit-pamuklu-tisort-p-251948038', ad: "Trendyol" };
        break;
    }
    return obj;
  }

  const handleLogout = async () => {
    await logoutUser(navigation, setCtx);
  };


  return (
    <SafeAreaView style={GlobalStyle.safeArea}>

      <ScrollView style={{ flex: 1, }}>
        {
          menus.map((text, index) => (
            <View style={styles.row} key={index}>
              <TouchableOpacity
                onPress={() => navigation.navigate(text, getParam(text))}
                style={styles.button}>
                <Text style={styles.text}>{text}</Text>
              </TouchableOpacity>
            </View>
          ))
        }

        <View style={styles.row}>
          <TouchableOpacity
            onPress={async () => handleLogout()}
            style={styles.button}>
            <Text style={styles.text}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "gray",
  },
  button: {
    backgroundColor: '#DDDDDD',
    width: '100%',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 20,
    color: '#000000',
  }
});
