import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import NotifyIcon from "../assets/svg/notification.svg";
import cs from "../assets/Colors";
import gs from "../assets/GlobalStyle";

export default function({ navigation, notifyCount, ctx }) {



  return (
    <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>


      <NotifyIcon width={35} height={35} fill={cs.btnColor} />
      {ctx.notificationCount > 0 ? <Text style={styles.text}>{ctx.notificationCount}</Text> : null}
    </TouchableOpacity>
  )
}


const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: "#A20182",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A20182",
    overflow: 'hidden',
    width: 20,
    height: 20,
    textAlign: 'center',
    color: 'white',
    fontSize: 12
  }
})
