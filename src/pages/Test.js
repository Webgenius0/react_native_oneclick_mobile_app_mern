import { SafeAreaView, View, StyleSheet } from "react-native";
import { useContext, useEffect, useState } from "react";
import { EmContext } from "../contexts/EmContext";
import Dump from "../components/Dump";
import GlobalStyle from "../assets/GlobalStyle";
import AuthHeader from "../components/AuthHeader";
import { fetchAllNotifications, getLocalNotifications } from "../helpers/notificationV2";

export default function({ route, navigation }) {
  const { ctx, setCtx, ctxDil, methods } = useContext(EmContext);

  const [state, setState] = useState({
    notifications: [],
    lastId: null,
  });

  const g = async () => {
    const s = await getLocalNotifications();

    console.log("s", s);

    setState({
      ...state,
      notifications: s.notifications,
      lastId: s.lastId,
    });
  };

  const fa = async () => {
    await fetchAllNotifications(ctx, setCtx);
    // console.log('s', s);
  };

  useEffect(() => {
    //g();
    // fetchAllNotifications(ctx, setCtx);
    // fa();
  }, []);


  return (
    <SafeAreaView style={GlobalStyle.safeArea}>

      <View style={styles.container}>

        <AuthHeader navigation={navigation} route={route} />
        <View style={{ backgroundColor: "#FFF", padding: 20 }}>
          <Dump ctx={ctx} />
          <Dump state={state} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
