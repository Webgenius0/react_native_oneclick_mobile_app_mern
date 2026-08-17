import {Text, TouchableOpacity, View, StyleSheet} from 'react-native';

export default function({item, onIncrease, onDecrease}) {

  const styles = StyleSheet.create({
    container:{
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 10,
    },
    miniBtn: {
      padding: 5,
      backgroundColor: '#ddd',
    },
    miniBtnText: {
      fontSize: 18,
      color: '#000',
    },
    text: {
      marginHorizontal: 10,
      width: 20,
      textAlign: 'center',
      color: '#000',

    },
  });

  return (
    <View
      style={styles.container}>
      <TouchableOpacity
        onPress={() => onDecrease(item.url)}
        style={styles.miniBtn}>
        <Text style={styles.miniBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.text}>{item.count}</Text>
      <TouchableOpacity
        onPress={() => onIncrease(item.url)}
        style={styles.miniBtn}>
        <Text style={styles.miniBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}
