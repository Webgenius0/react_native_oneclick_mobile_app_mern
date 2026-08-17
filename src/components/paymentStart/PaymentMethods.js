import {TouchableOpacity, View, StyleSheet, Text} from 'react-native';
import PaymentMethodIcon from './PaymentMethodIcon';
import React from 'react';
import {round} from '../../helpers/common';

export default function ({methods, siparis_ids, tutar, navigation, ctx}) {
  const tutarCheck = async () => {
    if (tutar < 1) {
    }
  };

  const prePaymentUrl = async t => {
    let enabled = Platform.select({
      ios: t.ios,
      android: t.android,
    });

    if (!enabled) {
      return;
    }

    await tutarCheck();

    const ana_tutar = parseFloat(tutar);
    let tutarNew = ana_tutar;
    let komisyon_tutar = 0;
    if (t.komisyonYuzde > 0) {
      let komisyonYuzde = parseFloat(t.komisyonYuzde);
      console.log('komisyonYuzde1 ', komisyonYuzde);
      komisyon_tutar = round(ana_tutar * (komisyonYuzde / 100));

      tutarNew = ana_tutar + komisyon_tutar;
    } else if (t.komisyonFixed > 0) {
      console.log('komisyonFixed1 ', t.komisyonFixed);
      komisyon_tutar = parseFloat(t.komisyonFixed);
      tutarNew = ana_tutar + komisyon_tutar;
    }

    tutarNew = round(tutarNew);

    const navigateParams = {
      tutar: tutarNew,
      komisyon_tutar: komisyon_tutar,
      ana_tutar: ana_tutar,
      siparis_ids: siparis_ids,
      komisyonYuzde: t.komisyonYuzde,
      komisyonFixed: t.komisyonFixed,
    };

    console.log(navigateParams);

    switch (t.ad) {
      case 'WaafiPay':
        navigation.navigate('WaafiPay', navigateParams);
        break;
      case 'eDahab':
        navigation.navigate('EDahab', navigateParams);
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.methodContainer}>
        {methods.map(item => {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.method}
              onPress={() => prePaymentUrl(item)}>
              <PaymentMethodIcon
                ctx={ctx}
                ad={item.ad}
                komisyonYuzde={item.komisyonYuzde}
                komisyonFixed={item.komisyonFixed}
                iosComingSoon={item.iosComingSoon}
                androidComingSoon={item.androidComingSoon}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 15},
  methodContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    columnGap: 10,
    justifyContent: 'center',
  },
  method: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
