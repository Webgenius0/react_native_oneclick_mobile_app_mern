
import { storageGet, storageSet } from "./storage";
import ai from "./ai";
import { useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";


export const NOTIFICATION_KEY = 'notificationData';
export const NOTIFICATION_COUNT_KEY = 'notificationCount';

export const getLocalNotifications = async () => {

  // console.log('getLocalNotifications');
  let ss = await storageGet(NOTIFICATION_KEY);

  // console.log('getLocalNotifications Response', ss)

  if(typeof ss === 'object' && ss !== null) {
    //console.log('getLocalNotifications', ss);
    return ss;
  }

  return { notifications: [], lastId: 0};
};


export const getServerNotifications = async (id) => {
  if (id === null || id === "undefined" || isNaN(id)) id = 0;

  let n = [];

  try {
    let response = null;
    try {
      // API Guide v3.0: GET /api/notifications
      response = await ai.get("notifications");
    } catch (_getErr) {
      // Fallback to legacy POST /api/notifications
      response = await ai.post("notifications", { id: id });
    }

    if (response?.data?.error === false) {
      n = response.data.notifications || response.data.ss || [];
    }
  } catch (e) {
    console.log('getServerNotifications error', e);
  }

  return n;
};


export const mergeNotifications = (local, server, markAsRead) => {
  // console.log('mergeNotifications');
  let n = [], ids = []

  if(typeof local === 'object' && local !== null) {
    // console.log('merge local notifs', local.length);
    for (let i = 0; i < local.length; i++) {
      let v = local[i];
      n.push(v);
      ids.push(v.id);
    }
  }

  if(typeof server === 'object' && server !== null) {
  // console.log('merge server notifs', server.length);
   server = server.reverse();
    for (let i = 0; i < server.length; i++) {
      let v = server[i];
      if (!ids.includes(v.id)) {
        n.push(v);
        ids.push(v.id);
      }
    }
  }

  // sort by id
  n = n.sort((a, b) => {
    return b.id - a.id;
  });

  if(markAsRead && n.length > 0) {
    // console.log('fetchAllNotifications markAsRead'+ (+new Date()));
    n = n.map((v) => {
      v.read = true;
      return v;
    });
  }

  const merged = {
    notifications: n,
    unread: n.filter(isUnread).length,
    lastId: n.length > 0 ? n[0].id : 0
  };

  // console.log('merge end', merged);

  return merged;
};

export const setLocalNotifications = async (data) => {
  await storageSet(NOTIFICATION_KEY, data);
};

export const fetchAllNotifications = async (ctx, setCtx, markAsRead) => {

  let d = new Date();
  console.log('fetchAllNotifications', d.getHours()+':'+d.getMinutes()+':'+d.getSeconds());

  const logNotif = false;

  let local = await getLocalNotifications();
  let server = await getServerNotifications(local.lastId);
  let merged = mergeNotifications(local.notifications, server, markAsRead);

  if(logNotif) {
    console.log('-------------------------------\n');
    console.log('local', local?.notifications.length);
    console.log('server', server.length);
    console.log('merged', merged?.notifications.length);
  }

  if(JSON.stringify(merged) !== JSON.stringify(local)) {
    await setLocalNotifications({
      notifications: merged.notifications,
      lastId: merged.lastId
    });

    /*
     if(typeof route !== 'undefined' && route.name !== 'Notifications' && showNotif && merged.unread > 0){

       Toast.show({
         type: 'success',
         position: 'bottom',
         text1: merged.notifications[0].baslik,
         text2: merged.notifications[0].mesaj,
         visibilityTime: 4000,
         autoHide: true,
         topOffset: 30,
         bottomOffset: 40
       });
     }

        */
  }

  if(JSON.stringify(ctx.notifications) !== JSON.stringify(merged.notifications)) {
    setCtx({
      ...ctx,
      notifications: merged.notifications,
      notificationCount: merged.unread,
      nextFetchNotifications: Date.now() + 1000 * 60 * 5
    });
  }
  if(logNotif) console.log("Fetch Notifications End \n\n\n\n");

  // return merged;
};


export const isUnread = (v) => {
  return !v.hasOwnProperty('read');
}

