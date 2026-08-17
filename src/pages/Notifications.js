import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useContext, useEffect, useState } from "react";
import Dump from "../components/Dump";
import { storageDelete, storageGet, storageSet } from "../helpers/storage";
import GlobalStyle from "../assets/GlobalStyle";
import { getToken } from "../helpers/auth";
import TrashIcon from "../assets/svg/trash.svg";
import Colors from "../assets/Colors";
import { EmContext } from "../contexts/EmContext";
import moment from "moment";
import { tr } from "../translate/i18n";
import ai from "../helpers/ai";
import { delay, IS_DEV, time } from "../helpers/common";
import {
  fetchAllNotifications,
  NOTIFICATION_COUNT_KEY,
  NOTIFICATION_KEY,
  setLocalNotifications,
} from "../helpers/notificationV2";

export default function({ route, navigation }) {

  const [state, setState] = useState({
    ss: [],
    loading: false,
    token: "not loaded",
  });

  const { ctx, setCtx, methods } = useContext(EmContext);


  const init = async () => {
    console.log("Notifications init");
    setState({ ...state, loading: true });
    await fetchAllNotifications(ctx, setCtx, true);
    setState({ ...state, loading: false });
  };


  const deleteNotifies = async () => {
    console.log('deleteNotifies');

    const r = await ai.post("notifications", { islem: 'delete' });
    console.log(r.data);
    if(r.data.error === false){
      console.log(NOTIFICATION_KEY+' siliniyor')
      // await storageDelete("notificationData");
      await storageSet(NOTIFICATION_KEY, { notifications: [], lastId: 0 });
      // setState({ ...state, ss: [] });
      setCtx({ ...ctx,
        [NOTIFICATION_COUNT_KEY]: 0,
        localNotifications: [],
        serverNotifications: [],
        notifications: []
      });

      await delay(1000);
      console.log('delay ctx', ctx);

    }else{
      console.log('Detele Error');
      console.log(r.data);
      console.log("\n\n\n");
    }

    delay(2000).then(async () => {
      let localData = await storageGet(NOTIFICATION_KEY);
      console.log('localData');
      console.log(localData);
      console.log("\n\n\n");
    });
  };

  const handleReadNotifications = async (c) => {
    let ss = [];
    for(let i = 0; i < c.notifications.length; i++){
      let elem = c.notifications[i];
      elem.read = true;
      ss.push(elem);
    }

    await setLocalNotifications({notifications: ss, lastId: c.notifications[0].id });
    setCtx({ ...c, notifications: ss, notificationCount: 0 });
  };

  useEffect(() => {
    init();

    return () => {
      if(ctx.notifications.length > 0){
        // handleReadNotifications(ctx);
      }
    };
  }, []);

  const notifications = ctx.notifications;


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ctx.bgColor,
      justifyContent: "center",
      padding: 15,
    },
    text: {
      textAlign: "center",
      fontSize: 20,
      fontWeight: "bold",
      color: Colors.primary,
    },

    item: {
      width: "100%",
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
      flexDirection: "row",
      justifyContent: "space-between",
    },

    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: Colors.primary,
    },
    date: {
      fontSize: 14,
      color: ctx.isLight ? "#8f8f8f" : "#d2d2d2",
    },
    body: {
      fontSize: 16,
      color: ctx.color,
    },
    safeArea:{
      flex: 1,
      backgroundColor: ctx.bgColor,
    },
  });


  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }}>

          {state.loading ? <Text style={styles.text}>{tr("Yükleniyor")}...</Text> : null}
          {notifications.length === 0 && !state.loading ? (
            <View>
              <Text style={styles.text}>{tr("Hiç bildirim yok")}...</Text>
            </View>
          ) : null}

          {
            /* IS_DEV && (
              <View style={{ flex: 1 }}>
                <Dump data={state} ctx={ctx} />
              </View>
            )*/
          }

          {
            !state.loading && notifications.length > 0 ? (
              notifications.map((item, index) => {
                return (
                  <View key={"a" + index} style={styles.item}>
                    <View style={{
                      flex: 1, flexDirection: "column",
                    }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.title}>{item.baslik}</Text>
                        <Text style={styles.date}>{item?.tarih ? moment(item.tarih).format("DD.MM.YYYY") : null}</Text>
                      </View>
                      <Text style={styles.body}>{item.mesaj}</Text>
                    </View>
                  </View>
                );
              })
            ) : null
          }

          {/*
            __DEV__ && (<View style={{ flex: 1 }}>
              <Text>DEV</Text>
              <Dump data={state} ctx={ctx} />
            </View>)
            */
          }

          {
            (
              <View style={{ flex: 1 }}>
                <Dump data={state} ctx={ctx} />
              </View>
            )
          }
        </ScrollView>

        {
          notifications.length > 0 ? (
            <View style={{  minHeight: 50, justifyContent: "center", alignItems: "center"}}>
              <TouchableOpacity onPress={() => deleteNotifies()}>
                <TrashIcon width={25} height={25} fill={"red"} />

              </TouchableOpacity>
            </View>
          ) : null
        }




      </View>
    </SafeAreaView>
  );
}
