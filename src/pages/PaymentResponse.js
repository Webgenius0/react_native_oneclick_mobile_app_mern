import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { tr } from "../translate/i18n";

import Success from "../assets/svg/success.svg";
import Error from "../assets/svg/error.svg";
import Warning from "../assets/svg/warning.svg";
import Colors from "../assets/Colors";
import { CommonActions } from "@react-navigation/native";
import { useCartStore } from "../store/useCartStore";
import { useOrderStore } from "../store/useOrderStore";

export default function PaymentResponse({navigation, route}){
    const {status} = route.params;
    const w = 100;
    const h = 100;

    React.useEffect(() => {
      if (status === 'success') {
        useCartStore.getState().clearCart();
        useOrderStore.getState().invalidateOrders();
      }
    }, [status]);

    const git = async (yer) => {
      // reset navigate
      /*navigation.reset({
        index: 0,
        routes: [{ name: yer }],
      });
      */
      let param = { name: "AuthAfter" };
      switch (yer){
        case "Balance":
          param = { name: "AuthAfter", params: { screen: "Balance" } };
          // param = {name: "PaymentStart", params: {tutar: 2}};
        break;
      }

      console.log('param', param);

      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [param],
      }));
    }

    return(
        <View style={styles.container}>
          <View>
            {
              status === "success" ?
                <Success width={w} height={h}/> : status === "error" ?
                  <Error /> : <Warning />
            }
          </View>
          <View>
            <Text style={styles.text}>
                {
                  status === "success" ? (tr("Payment Successful") || "Payment Successful") :
                  status === "error" ? (tr("Payment Failed") || "Payment Failed") :
                    (tr("Payment Cancelled") || "Payment Cancelled")
                }
            </Text>
          </View>

          <View>
            <TouchableOpacity onPress={() => git('Balance')} style={styles.btn}>
              <Text style={styles.btnText}>{tr('Balance') || 'Balance'}</Text>
            </TouchableOpacity>
          </View>
        </View>
    )
}

const styles = StyleSheet.create({
  container:{
    flex: 1,
    justifyContent: "flex-start",
    paddingVertical: 100,
    alignItems: "center",
    backgroundColor: "#fff"
  },
  text:{
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: '#333'
  },
  btn:{
    backgroundColor: Colors.btnColor,
    padding: 20,
    borderRadius: 5,
    marginTop: 20
  },
  btnText:{
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 20
  }
});

