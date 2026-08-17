import {Text, TouchableOpacity, View, StyleSheet} from 'react-native';
import FadeInBottom from '../FadeInBottom';
import Whatsapp from '../../assets/svg/whatsapp.svg';
import Phone from '../../assets/svg/phone.svg';
import React from 'react';

export default function SupportList({iletisim, loading, diaCall, ctx }) {
  if (loading || iletisim.length === 0) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    item: {
      padding: 15,
      justifyContent: 'flex-start',
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
      width: '50%',
      maxWidth: 500,
    },
    touch:{
      justifyContent: 'flex-start',
      flexDirection: 'row',
      width: '100%',
      // backgroundColor: 'red',
    },
    tel: {
      textAlign: 'center',
      color: ctx.color,
      fontWeight: '500',
      fontSize: 16,
    },
    telColumnRow: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    phoneIcon: {
      marginEnd: 10,
      minWidth: 44,
    },
  });

  const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const iletisimChunks = chunkArray(iletisim, 2);

  return (
    <View style={styles.container}>
      {iletisimChunks.map((chunk, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {chunk.map((item, i) => (
            <FadeInBottom
              key={i}
              duration={(rowIndex * 2 + i + 1) * 1000}
              style={styles.item}
            >
              <TouchableOpacity
                style={styles.touch}
                onPress={() => diaCall(item)}>
                {item.hasOwnProperty('link') &&
                item.link &&
                item.link.includes('wa.me') ? (
                  <Whatsapp width={44} height={44} style={styles.phoneIcon} />
                ) : (
                  <Phone
                    width={30}
                    height={30}
                    fill={ctx.color}
                    style={styles.phoneIcon}
                  />
                )}

                <View style={styles.telColumnRow}>
                  {item.ad && <Text style={styles.tel}>{item.ad}</Text>}
                  {item.ad2 && <Text style={styles.tel}>{item.ad2}</Text>}
                </View>
              </TouchableOpacity>
            </FadeInBottom>
          ))}
        </View>
      ))}
    </View>
  );
}
