import React from 'react';
import {Dimensions, Image, StyleSheet, Text, View} from 'react-native';
import {tr} from '../../translate/i18n';

export default function PaymentMethodIcon({
  ad,
  komisyonYuzde,
  komisyonFixed,
  ctx,
  iosComingSoon,
  androidComingSoon,
}) {
  const {width, height} = Dimensions.get('window');

  const icon = {
    WaafiPay: require('../../assets/img/waafipay.png'),
    Fastpay: require('../../assets/img/fastpay.png'),
    eDahab: require('../../assets/img/edahab.png'),
  };

  if (!icon[ad]) {
    return <Text>Icon Bulunamadı {ad}</Text>;
  }

  const calculatedWidth = width > 300 ? 150 : width / 2;
  const ratio = 50 / 150;
  const calculatedHeight = calculatedWidth * ratio;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      // justifyContent: 'center',
    },
    icon: {
      width: calculatedWidth,
      height: calculatedHeight,
      resizeMode: 'contain',
    },
  });


  const comingSoon = Platform.select({
    ios: iosComingSoon,
    android: androidComingSoon,
  });


  return (
    <View style={styles.container}>
      <Image source={icon[ad]} style={styles.icon} />
      {komisyonYuzde > 0 && (
        <Text style={{color: '#333'}}>
          {tr('Komisyon')}: {komisyonYuzde}%
        </Text>)}

      {
        comingSoon ? (
          <Text style={{color: '#333'}}>{tr('Yakında')}</Text>
        ) : null
      }
    </View>
  );
}
