import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import Colors from '../assets/Colors';
import {tr} from '../translate/i18n';
import OrderStatus from './OrderStatus';
import GlobalStyle from '../assets/GlobalStyle';
import ai from '../helpers/ai';
import {useNavigation} from '@react-navigation/native';
import {EmContext} from '../contexts/EmContext';
import {useContext} from 'react';
import {paymentTypes} from '../../config';
import {isImage} from '../helpers/file';
import OrderImage from './orders/OrderImage';
import Dump from './Dump';

const gs = GlobalStyle;

export default function ({
  item,
  data,
  setData,
  refetch,
  setRefetch,
  statusLoading,
  setStatusLoading,
}) {
  const {ctx} = useContext(EmContext);

  const navigation = useNavigation();
  const updateStatus = async (id, status) => {
    const c = await ai.post('order-status-update', {durum: status, id: id});
    if (c.data.error === false) {
      setRefetch(refetch + 1);
    } else {
      alert(tr('Error') || 'Error');
    }

    setStatusLoading(false);
  };

  const odenebilir_durums = [1, 2, 3, 4, 5, 11, 6, 9, 8, 16, 18, 21];

  const styles = StyleSheet.create({
    item: {
      backgroundColor: ctx.bgColor,
      borderBottomColor: ctx.isLight ? '#e0e0e0' : '#676767',
      borderBottomWidth: 1,
      paddingVertical: 10
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    imgColumn: {
      // backgroundColor: "#000",
      alignItems: 'center',
      minWidth: 80,
      borderWidth: 1,
      borderColor: ctx.isLight ? '#e0e0e0' : '#676767',
    },
    detailColumn: {
      flex: 2,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: 10,
      // backgroundColor: "gray",
    },
    detailCol1: {
      flex: 1,
      flexDirection: 'column',
      // backgroundColor: "blue",
      justifyContent: 'flex-start',
    },
    detailCol2: {flexDirection: 'row', justifyContent: 'space-between'},
    detailRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      // backgroundColor: 'red'
    },
    buttonRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-end',
    },
    detailLabel: {
      minWidth: 40,
      color: ctx.color,
    },
    img: {
      width: 100,
      height: 100,
      // borderRadius: 10,
    },

    acceptBtn: {
      backgroundColor: Colors.btnColor,
      borderWidth: 1,
      borderColor: Colors.btnColor,
      borderRadius: 5,
      marginRight: 10,
      paddingVertical: 5,
      paddingHorizontal: 5,
    },
    acceptBtnText: {
      color: ctx.isLight ? '#FFF' : '#000',
    },
    rejectBtn: {
      backgroundColor: 'transparent',
      borderColor: 'red',
      borderWidth: 1,
      paddingHorizontal: 5,
      paddingVertical: 5,
      borderRadius: 5,
    },
    rejectBtnText: {
      color: 'red',
    },
    detailBtn: {
      //backgroundColor: '#00BFA6',
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    detailBtnText: {
      color: Colors.btnColor,
      fontWeight: 'bold',
    },

    deliveredBtnText: {
      color: ctx.color,
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    text: {
      color: ctx.color,
    },
  });

  if (!item) {
    return <Dump item={item} />;
    // return null;
  }

  return (
    <View style={styles.item}>
      <View style={styles.itemRow}>
        <View style={styles.imgColumn}>
          <OrderImage item={item} width={80} height={80} />
        </View>
        <View style={styles.detailColumn}>
          <View style={gs.flexRow}>
            <View style={styles.detailCol1}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID</Text>
                <Text style={styles.text}>:</Text>
                <Text style={styles.text}>
                  {/*item.hasOwnProperty('grupID') && item.grupID > 0
                    ? item.grupID + '/'
                    : '' */ }
                  {item.id}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{tr('Price') || 'Price'}</Text>
                <Text style={styles.text}>:</Text>
                <Text style={styles.text}>
                  {item.fiyat_usd > 0
                    ? '$' + (item.fiyat_usd >0 ? item.fiyat_usd * 1 : 0)
                    : item.fiyat > 0
                    ? item.fiyat
                    : '-'}
                </Text>
              </View>
              {item.nakliye > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{tr('Shipping fee') || 'Shipping fee'}</Text>
                  <Text style={styles.text}>:</Text>
                  <Text style={styles.text}>
                    {item.nakliye > 0 ? '$'+(item.nakliye * 1) : '-'}
                  </Text>
                </View>
              )}
              {/*<View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{tr("Komisyon ücreti")}</Text>
                <Text style={styles.text}>:</Text>
                <Text style={styles.text}>{item.komisyon_usd > 0 ? '$'+item.komisyon_usd : '-'}</Text>
              </View>*/}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{tr('Quantity') || 'Quantity'}</Text>
                <Text style={styles.text}>:</Text>
                <Text style={styles.text}>{item.sayi}</Text>
              </View>
              <View style={[styles.detailRow]}>
                <Text style={styles.detailLabel}>{tr('Size') || 'Size'}</Text>
                <Text style={styles.text}>:</Text>
                <Text style={styles.text}>{item.size !== 'undefined' ? item.size : ''}</Text>
              </View>
              {item.note && item.note.length > 0 && (
                <View style={[styles.detailRow, gs.mb10]}>
                  <Text style={styles.detailLabel}>{tr('Note') || 'Note'}</Text>
                  <Text style={styles.text}>:</Text>
                  <Text style={styles.text}>{item.note}</Text>
                </View>
              )}
              {parseInt(item.durum) === 19 && (
                <View style={[styles.detailRow, gs.mb10]}>
                  <Text style={styles.text}>{item.acik}</Text>
                </View>
              )}
            </View>
            <View style={styles.detailCol2}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('OrderDetail', {s: item})}>
                <Text style={styles.detailBtnText}>{tr('Detail') || 'Detail'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={gs.flexRow}>
            <View style={[styles.detailRow, gs.mb10]}>
              <View>
                <Text style={styles.deliveredBtnText}>
                  {(tr('Status') || 'Status')} : &nbsp;
                  <OrderStatus durum={parseInt(item.durum)} />
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.itemRow}>
        <View style={[gs.flexRow]}>
          {/*<View style={styles.buttonRow}>
            {parseInt(item.durum) === 15 && (
              <>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => updateStatus(item.id, 16)}>
                  <Text style={styles.acceptBtnText}>{tr('KABUL ET')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => updateStatus(item.id, 17)}>
                  <Text style={styles.rejectBtnText}>{tr('REDDET')}</Text>
                </TouchableOpacity>
              </>
            )}

            {parseInt(item.durum) === 14 && (
              <>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => updateStatus(item.id, 17)}>
                  <Text style={styles.rejectBtnText}>{tr('İPTAL ET')}</Text>
                </TouchableOpacity>
              </>
            )}

            {!item.odendi &&
              !(parseInt(item.tahsilat_tid) > 1) &&
              odenebilir_durums.includes(parseInt(item.durum)) &&
              paymentTypes.length > 0 && (
                <TouchableOpacity
                  style={[styles.acceptBtn, gs.ml10]}
                  onPress={() =>
                    navigation.navigate('PaymentStart', {
                      tutar: item.tutar_usd,
                      quick: true,
                      siparis_id: item.id,
                      grupID: item.grupID,
                    })
                  }>
                  <Text style={styles.acceptBtnText}>
                    {tr('Ödeme Yap').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}
          </View>*/}
        </View>
      </View>
    </View>
  );
}
