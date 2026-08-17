import { StyleSheet, Platform } from "react-native";
import Colors from "./Colors";

// const isIos = Platform.OS === 'IOS';

export default StyleSheet.create({
  // btnColor: Platform.OS === 'IOS' ? '#007AFF' : '#2196F3',
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "column",
    padding: 20,
    justifyContent: "center",
  },
  containerStart: {
    flex: 1,
    flexDirection: "column",
    padding: 20,
    justifyContent: "flex-start",
  },
  beyazContainer: {
    flex: 1,
    flexDirection: "column",
    padding: 20,
    justifyContent: "center",
    backgroundColor: "white",
  },
  globalContainer: {
    flex: 1,
    flexDirection: "column",
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  displayFlex: {
    display: "flex",
  },
  justifyStart: {
    justifyContent: "flex-start",
  },
  justifyCenter: {
    justifyContent: "center",
  },
  justifyEnd: {
    justifyContent: "flex-end",
  },
  alignStart: {
    alignItems: "flex-start",
  },
  alignCenter: {
    alignItems: "center",
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  btnColor: {
    color: Platform.OS === "IOS" ? Colors.btnColor : Colors.btnColor,
  },
  btn: {
    backgroundColor: Colors.btnColor,
    padding: 18,
    alignItems: "center",
    borderRadius: 5,
  },
  btnActive: {
    backgroundColor: Colors.btnActiveColor,
    padding: 18,
    alignItems: "center",
    borderRadius: 5,
  },
  btnCancel: {
    backgroundColor: Colors.cancel,
    padding: 18,
    alignItems: "center",
    borderRadius: 5,
  },
  cancelText:{
    color: Colors.cancelText,
    fontSize: 16,
  },
  textInput: {
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#58492f",
    marginBottom: 10,
    backgroundColor: "#FFF",
    color: "#333333",
  },
  text: {
    color: "#333333",
    fontSize: 16,
  },
  textRed: {
    color: "red",
  },
  textWhite: {
    color: "#FFF",
  },
  textBlack: {
    color: "#000",
  },
  textGray: {
    color: "#999",
  },
  textRight: {
    textAlign: "right",
  },
  textLeft: {
    textAlign: "left",
  },
  textCenter: {
    textAlign: "center",
  },

  yukleniyor: {
    display: "flex",
    alignItems: "center",
  },
  noRecordText: {
    fontSize: 22,
    marginTop: 50,
    textAlign: "center",
    // paddingLeft: 30,
  },

  bold: {
    fontWeight: "bold",
  },

  w33: {
    width: "33.33333333333333%",
  },
  w50: { width: "50%" },
  w100: {
    width: "100%",
  },
  col6: {
    width: "50%",
  },


  flexColumn: {
    flexDirection: "column",
  },
  flexRow: {
    flexDirection: "row",
  },


  flex1: { flex: 1 },

  f14: { fontSize: 14 },
  f15: { fontSize: 15 },
  f16: { fontSize: 16 },
  f17: { fontSize: 17 },
  f18: { fontSize: 18 },
  f20: { fontSize: 20 },
  f22: { fontSize: 22 },
  f24: { fontSize: 24 },
  f26: { fontSize: 26 },
  f28: { fontSize: 28 },
  f30: { fontSize: 30 },
  f32: { fontSize: 32 },
  f36: { fontSize: 36 },
  f48: { fontSize: 48 },

  // Margin
  m5: { margin: 5 },
  m10: { margin: 10 },
  m15: { margin: 15 },
  m20: { margin: 20 },
  m25: { margin: 25 },
  m30: { margin: 30 },

  mr5: { marginRight: 5 },
  mr10: { marginRight: 10 },
  mr15: { marginRight: 15 },
  mr20: { marginRight: 20 },
  mr25: { marginRight: 25 },
  mr30: { marginRight: 30 },

  ml5: { marginLeft: 5 },
  ml10: { marginLeft: 10 },
  ml15: { marginLeft: 15 },
  ml20: { marginLeft: 20 },
  ml25: { marginLeft: 25 },
  ml30: { marginLeft: 30 },

  mb5: { marginBottom: 5 },
  mb10: { marginBottom: 10 },
  mb15: { marginBottom: 15 },
  mb20: { marginBottom: 20 },
  mb25: { marginBottom: 25 },
  mb30: { marginBottom: 30 },

  mt5: { marginTop: 5 },
  mt10: { marginTop: 10 },
  mt15: { marginTop: 15 },
  mt20: { marginTop: 20 },
  mt25: { marginTop: 25 },
  mt30: { marginTop: 30 },

  mh5: { marginHorizontal: 5 },
  mh10: { marginHorizontal: 10 },
  mh15: { marginHorizontal: 15 },
  mh20: { marginHorizontal: 20 },
  mh25: { marginHorizontal: 25 },
  mh30: { marginHorizontal: 30 },

  mv5: { marginVertical: 5 },
  mv10: { marginVertical: 10 },
  mv15: { marginVertical: 15 },
  mv20: { marginVertical: 20 },
  mv25: { marginVertical: 25 },
  mv30: { marginVertical: 30 },

  // Padding
  p0: { padding: 0 },
  p5: { padding: 5 },
  p10: { padding: 10 },
  p15: { padding: 15 },
  p20: { padding: 20 },
  p25: { padding: 25 },
  p30: { padding: 30 },

  pr5: { paddingRight: 5 },
  pr10: { paddingRight: 10 },
  pr15: { paddingRight: 15 },
  pr20: { paddingRight: 20 },
  pr25: { paddingRight: 25 },
  pr30: { paddingRight: 30 },

  pl5: { paddingLeft: 5 },
  pl10: { paddingLeft: 10 },
  pl15: { paddingLeft: 15 },
  pl20: { paddingLeft: 20 },
  pl25: { paddingLeft: 25 },
  pl30: { paddingLeft: 30 },

  pb5: { paddingBottom: 5 },
  pb10: { paddingBottom: 10 },
  pb15: { paddingBottom: 15 },
  pb20: { paddingBottom: 20 },
  pb25: { paddingBottom: 25 },
  pb30: { paddingBottom: 30 },

  pt5: { paddingTop: 5 },
  pt10: { paddingTop: 10 },
  pt15: { paddingTop: 15 },
  pt20: { paddingTop: 20 },
  pt25: { paddingTop: 25 },
  pt30: { paddingTop: 30 },

  ph5: { paddingHorizontal: 5 },
  ph10: { paddingHorizontal: 10 },
  ph15: { paddingHorizontal: 15 },
  ph20: { paddingHorizontal: 20 },
  ph25: { paddingHorizontal: 25 },
  ph30: { paddingHorizontal: 30 },

  pv5: { paddingVertical: 5 },
  pv10: { paddingVertical: 10 },
  pv15: { paddingVertical: 15 },
  pv20: { paddingVertical: 20 },
  pv25: { paddingVertical: 25 },
  pv30: { paddingVertical: 30 },

  mw10: { minWidth: 10 },
  mw20: { minWidth: 20 },
  mw30: { minWidth: 30 },
  mw40: { minWidth: 40 },
  mw50: { minWidth: 50 },
  mw60: { minWidth: 60 },
  mw70: { minWidth: 70 },
  mw80: { minWidth: 80 },
  mw90: { minWidth: 90 },
  mw100: { minWidth: 100 },
  mw110: { minWidth: 110 },
  mw120: { minWidth: 120 },
  mw130: { minWidth: 130 },
  mw140: { minWidth: 140 },
  mw150: { minWidth: 150 },

});
