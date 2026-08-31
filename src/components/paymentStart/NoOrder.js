import {Text, View} from 'react-native';
import {tr} from '../../translate/i18n';
import React from 'react';

export default function NoOrder({siparisler}) {
  return (
    <>
      {!siparisler || siparisler.length === 0 ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20, fontWeight: 'bold'}}>
            {tr('Siparişiniz bulunmamaktadır')}
          </Text>
        </View>
      ) : null}
    </>
  );
}
