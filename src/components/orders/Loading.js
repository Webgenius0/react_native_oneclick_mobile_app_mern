import {Text, View} from 'react-native';
import {tr} from '../../translate/i18n';

export default function OrdersLoading({loading, gs}) {

  if(!loading) {
    return null;
  }

  return (
    <View
      style={[
        gs.justifyCenter,
        gs.alignCenter,
        {backgroundColor: '#FFF', flex: 5},
      ]}>
      <Text>{tr('Yükleniyor')}...</Text>
    </View>
  );
}
