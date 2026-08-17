import { Text, TextInput, View } from "react-native";
import { useState } from "react";

export default function(props) {

  const { state, setState, name, value, style } = props;

  const handleInputChange = (text) => {
    console.log('text', text);
    if (/^\d+$/.test(text)) {
      console.log('text2', text);

      setState({
        ...state,
        [name]: (text),
      });
    }
  };

  /*
  {
          backgroundColor: "white", color: "black",
          paddingHorizontal: 10,
          minWidth:50,
        }
   */
  return (
      <TextInput
        style={style}
        keyboardType="numeric"
        onChangeText={e => handleInputChange(e)}
        value={value.toString()}
        /*style={[{ height: 40, borderColor: 'gray', borderWidth: 1 }, props.style]}*/
      />
  );
}
