import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Colors from '../../assets/Colors';
import {isImage} from '../../helpers/file';
import NoImage from '../../assets/svg/no-image.svg';
import Truck from '../../assets/svg/truck.svg';
import Plane from '../../assets/svg/plane.svg';
import {formatDate} from '../../helpers/common';
import React from 'react';
import FastImage from 'react-native-fast-image';
import OrderImage from '../orders/OrderImage';
import Dump from '../Dump';
import {tr} from '../../translate/i18n';


export default function ({loading, siparisler, siparis_ids, setSiparisIds, grupID, grup}) {
  const styles = StyleSheet.create({
    scrollView: {
      width: '100%',
      borderBottomWidth: 1,
    },
    itemContainer: {
      flexDirection: 'row',
      marginBottom: 15,
      alignItems: 'center',
    },
    cbxContainer: {
      justifyContent: 'center',
    },
    cb: {
      color: Colors.btnColor,
      borderColor: Colors.btnColor,
    },
    imgContainer: {
      width: '30%', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#e0e0e0',
      minHeight: 60,
    },
    infoContainer: {flexDirection: 'column', paddingLeft: 10},
    title: {fontSize: 18, fontWeight: 'bold', color: '#000',},
  });


  const setToggleCheckBox = (value, checked) => {
    console.log(value, checked);
    let ns;
    let new_siparis_ids = Object.assign([], siparis_ids);

    if (checked) {
      // new_siparis_ids.push(value);
      if(grupID > 0){
        siparisler.forEach(item => {
          if(item.grupID === grupID){
            new_siparis_ids.push(item.id);
          }
        });
      }else{
        new_siparis_ids.push(value);
      }
    } else {
      let silinecek_ids = [];
      if(grupID > 0) {
        siparisler.forEach(item => {
          if (item.grupID === grupID) {
            silinecek_ids.push(item.id);
          }
        });
      }else{
        silinecek_ids.push(value);
      }

      new_siparis_ids = new_siparis_ids.filter(item => !silinecek_ids.includes(item));
    }


    // setTutar(tutarHesapla(siparisler, new_siparis_ids));
    setSiparisIds(new_siparis_ids);
  };



  return (
    <>
      {!loading && siparisler.length > 0 && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{padding: 20}}>
          {siparisler.map(item => {
            let checked = siparis_ids.includes(item.id);

            return (
              <View style={styles.itemContainer} key={item.id}>
                {/*<View style={styles.cbxContainer}>
                  <CheckBox
                    disabled={false}
                    checked={checked}
                    style={styles.cb}
                    tintColors={{ true: '#F15927', false: 'black' }}
                    value={siparis_ids.includes(item.id)}
                    onValueChange={newValue =>
                      setToggleCheckBox(item.id, newValue)
                    }
                  />
                </View>*/}
                <View style={styles.imgContainer}>
                    <OrderImage item={item} width={60} height={60} />
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.title}>
                      {formatDate(item.siparis_tarihi)}{' '} {item.ad}
                    </Text>
                    <Text style={styles.title}>${item.tutar} </Text>
                </View>
              </View>
            );
          })}

          {
            grup && grup.nakliye_usd > 0 && (
              <View style={styles.itemContainer}>
                <View style={styles.imgContainer}>
                  <Plane width={40} height={40} />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>{tr('Nakliye ücreti')}</Text>
                  <Text style={styles.title}>${grup.nakliye_usd}</Text>
                </View>
              </View>
            )
          }

          {/*<Dump siparis_ids={siparis_ids} />*/}
        </ScrollView>
      )}
    </>
  );
}
