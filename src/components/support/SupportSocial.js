import {Linking, TouchableOpacity, View} from 'react-native';
import FadeInBottom from '../FadeInBottom';
import Facebook from '../../assets/svg/facebook.svg';
import Instagram from '../../assets/svg/instagram.svg';
import Whatsapp from '../../assets/svg/whatsapp.svg';
import Youtube from '../../assets/svg/youtube.svg';
import Tiktok from '../../assets/svg/tiktok.svg';
import React from 'react';

export default function({loading, socialMedia, styles}){

  if(loading || socialMedia.length === 0){
    return null;
  }

  return (
    <View style={{marginTop: 30}}>
      <View style={{flexDirection: 'row', justifyContent: 'center'}}>
        {socialMedia.map((item, i) => (
          <FadeInBottom key={i} duration={(i + 1) * 500}>
            <TouchableOpacity
              onPress={() => Linking.openURL(item.url)}
              style={styles.touch}>
              {item.ad === 'Facebook' ? (
                <Facebook width={44} height={44} />
              ) : null}
              {item.ad === 'Instagram' ? (
                <Instagram width={44} height={44} />
              ) : null}
              {item.ad === 'Whatsapp' ? (
                <Whatsapp width={44} height={44} />
              ) : null}
              {item.ad === 'Youtube' ? (
                <Youtube width={44} height={44} />
              ) : null}
              {item.ad === 'Tiktok' ? (
                <Tiktok width={44} height={44} />
              ) : null}
            </TouchableOpacity>
          </FadeInBottom>
        ))}
      </View>
    </View>
  );
}
