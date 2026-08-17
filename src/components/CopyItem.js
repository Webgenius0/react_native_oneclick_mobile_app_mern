import Clipboard from "@react-native-clipboard/clipboard";
import { TouchableOpacity, StyleSheet, Text } from "react-native";
import Toast from "react-native-toast-message";

export default function(props) {
  const { children } = props;
  let style = [styles.text];
  if (props?.style) {
    style.push(props.style);
  }

  const copyToClipboard = (str) => {
    console.log("copying to clipboard", str);
    showToast();
    Clipboard.setString(str);
  };

  const showToast = () => {
    Toast.show({
      type: "success",
      text1: "Panoya Kopyalandı",
      position: "bottom",
    });
  };


  return (
    <>
      <TouchableOpacity onPress={() => copyToClipboard(children)}>
        <Text style={style}>{children}</Text>
      </TouchableOpacity>

    </>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#333",
  },
});
