import {Image, Text, TouchableOpacity, View} from 'react-native';
import {tr} from '../../translate/i18n';
import FadeInBottom from '../FadeInBottom';
import GlobalStyle from '../../assets/GlobalStyle';

const gs = GlobalStyle;

export default function NoOrders({goToCategoryList, ctx}) {

  return (
    <View
      style={[
        gs.justifyCenter,
        gs.alignCenter,
        {
          backgroundColor: ctx.bgColor,
          flex: 5,
          paddingBottom: 50,
        },
      ]}>
      <Image
        source={require('../../assets/img/cart.png')}
        style={{width: 100, height: 100, marginBottom: 20}}
      />
      <Text style={[gs.f14, {color: ctx.color}]}>
        {tr('Hiç Sipariş Yok')}
      </Text>
      {/*You have no orders*/}

      <FadeInBottom>
        <TouchableOpacity
          style={[gs.btn, gs.p10, gs.mt10]}
          onPress={() => goToCategoryList()}>
          <Text style={[gs.bold, gs.textWhite]}>
            {tr('Alışverişe Başla')}
          </Text>
          {/*Start to order*/}
        </TouchableOpacity>
      </FadeInBottom>

      {/*<Dump data={state} />*/}
    </View>
  )
}
