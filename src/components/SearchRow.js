import SearchIcon from "../assets/svg/search.svg";
import { TextInput, View, StyleSheet } from "react-native";
import { tr } from "../translate/i18n";
import { useContext } from "react";
import { EmContext } from "../contexts/EmContext";


export default function({filter, setFilter}) {
  const {ctx} = useContext(EmContext);


  const styles = StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: "#DDD",
      padding: 10 ,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
      marginBottom: 10,
    },
    searchIcon:{
      marginRight: 10,
    },
    searchInput: {
      backgroundColor: ctx.bgColor,
      color: ctx.color,
      // placeholderTextColor: ctx.color,
      flex: 1,
      alignSelf: "center",

    },
  });

  return(
    <View style={styles.searchRow}>
      <SearchIcon width={24} height={24} fill={ctx.color} style={styles.searchIcon} />
      <TextInput placeholder={tr("Aramak istediğiniz kelimeyi girin")}
                 style={styles.searchInput}
                 placeholderTextColor={ctx.color}
                 onChangeText={(text) => setFilter(text)}
                 value={filter}
      />
    </View>
  )
}

