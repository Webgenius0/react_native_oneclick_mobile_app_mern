import { Text, TouchableOpacity, View, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GlobalStyle from "../assets/GlobalStyle";

import { CommonActions } from "@react-navigation/native";
import { storageDelete } from "../helpers/storage";
import { useContext } from "react";
import { EmContext } from "../contexts/EmContext";
import * as RootNavigation from "../services/RootNavigation";

import { useUserStore } from "../store/useUserStore";

export default function ({navigation}) {
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
    switch(t) {
      case 'Category':
        obj = {id: 1};
      break;
      case 'Webview':
        obj = {url: 'https://www.trendyol.com/mango/relaxed-fit-pamuklu-tisort-p-251948038', ad: "Trendyol"};
      break;
      case 'Cart':
        obj = {url: 'https://www.trendyol.com/mango/relaxed-fit-pamuklu-tisort-p-251948038', ad: "Trendyol"};
      break;
    }
    return obj;
  }

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user',
        'is_guest',
        'user-storage',
        'tokenSend',
        'has_seen_onboarding',
      ]);
      await storageDelete('user');
      await storageDelete('is_guest');
      await storageDelete('tokenSend');
      await storageDelete('has_seen_onboarding');
      try {
        useUserStore.getState().clearUser?.();
      } catch (e) {}
      if (setCtx) {
        setCtx(prev => ({
          ...prev,
          user: null,
          token: null,
        }));
      }
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      } catch (e1) {
        try {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            }),
          );
        } catch (e2) {
          try {
            RootNavigation.reset('Onboarding');
          } catch (e3) {
            navigation.navigate('Onboarding');
          }
        }
      }
    } catch (e) {
      navigation.navigate('Onboarding');
    }
  };


  return (
    <SafeAreaView style={GlobalStyle.safeArea}>

    <ScrollView style={{flex: 1,}}>
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
  button:{
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
